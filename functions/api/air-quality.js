/**
 * 🌤️ 台灣空品監測 API
 * 
 * 功能：
 * - 從環境部開放資料平台讀取全台空氣品質數據
 * - 自動快取 10 分鐘 (D1 資料庫)，保護 API 額度
 * - 清洗資料，只回傳前端需要的欄位
 * - 過濾掉無效資料 (維修中的測站)
 * - 🛡️ 防呆鎖：如果資料為空，拒絕寫入資料庫
 * 
 * 環境變數：(已棄用，改用私屬 Key)
 * - MOENV_API_KEY: 環境部 API 金鑰
 * 
 * 回應格式：
 * [
 *   {
 *     name: "板橋",
 *     county: "新北市",
 *     aqi: 78,
 *     status: "普通",
 *     pm25: 25.5,
 *     lat: 25.0092,
 *     lon: 121.4605,
 *     time: "2025-11-22T10:30:00Z"
 *   },
 *   ...
 * ]
 */

export async function onRequest(context) {
  const { env } = context;

  // ===== 設定區 =====
  const CACHE_KEY = 'moenv_air_quality_v5';           // D1 資料庫的 Key (防呆鎖版本++)
  const CACHE_TTL = 10 * 60 * 1000;                   // 10 分鐘更新一次 (600秒)

  // ===== A. D1 讀取層 =====
  let cachedRecord = null;
  try {
    cachedRecord = await env.DB
      .prepare('SELECT data, updated_at FROM api_cache WHERE key = ?')
      .bind(CACHE_KEY)
      .first();
  } catch (e) {
    console.error("D1 Read Error", e);
  }

  const now = Date.now();
  const hasData = cachedRecord && cachedRecord.data;
  const isStale = !cachedRecord || (now - cachedRecord.updated_at > CACHE_TTL);

  // ===== B. 資料更新層 =====
  const updateData = async () => {
    try {
      console.log(`🔄 [${CACHE_KEY}] 開始更新...`);

      // 使用私屬 API Key (保護額度)
      const TARGET_URL = "https://data.moenv.gov.tw/api/v2/aqx_p_432?api_key=94650864-6a80-4c58-83ce-fd13e7ef0504&limit=1000&sort=ImportDate%20desc&format=JSON";
      
      const res = await fetch(TARGET_URL);
      if (!res.ok) {
        throw new Error(`環境部 API 錯誤: HTTP ${res.status}`);
      }

      const data = await res.json();

      if (!data.records || !Array.isArray(data.records)) {
        throw new Error("無效的環境部 API 回應格式");
      }

      // ===== 資料清洗 =====
      const stations = data.records
        .map((item) => ({
          name: item.SiteName || "未知",              // 測站名稱
          county: item.County || "未知",              // 縣市
          aqi: parseInt(item.AQI) || null,            // AQI 數值
          status: item.Status || "無資料",             // 狀態
          pm25: parseFloat(item["PM2.5"]) || null,    // PM2.5 濃度
          lat: parseFloat(item.Latitude) || null,     // 緯度
          lon: parseFloat(item.Longitude) || null,    // 經度
          time: item.PublishTime                       // 發布時間
        }))
        .filter((s) => s.aqi !== null && !isNaN(s.aqi)); // 過濾無效資料

      // 🛡️ 防呆鎖：如果是空的，不要存！
      if (stations.length === 0) {
        throw new Error("抓取到的空品資料為空，放棄寫入資料庫");
      }

      // ===== 寫入 D1 =====
      await env.DB
        .prepare(
          `INSERT INTO api_cache (key, data, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
        )
        .bind(CACHE_KEY, JSON.stringify(stations), now)
        .run();

      console.log(`✅ [${CACHE_KEY}] 更新成功，共 ${stations.length} 筆資料`);
      return stations;

    } catch (error) {
      console.error(`❌ [${CACHE_KEY}] 更新失敗:`, error);
      return null;
    }
  };

  // ===== C. 決策層 =====
  // 如果沒有快取資料，立即更新 (冷啟動)
  if (!hasData) {
    await updateData();
  }
  // 如果資料過期，背景更新 (不阻擋回傳)
  else if (isStale) {
    context.waitUntil(updateData());
  }

  // 再次讀取資料 (以防冷啟動還是沒資料，用空陣列代替)
  if (!hasData) {
    cachedRecord = await env.DB
      .prepare('SELECT data FROM api_cache WHERE key = ?')
      .bind(CACHE_KEY)
      .first();
  }

  // ===== D. 回應層 =====
  return new Response(cachedRecord?.data || '[]', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'X-Cache-TTL': CACHE_TTL.toString()
    }
  });
}

/**
 * 處理 OPTIONS 請求 (CORS preflight)
 */
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
