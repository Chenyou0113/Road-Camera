export async function onRequest(context) {
  const { env } = context;

  // ⚡️ 升級快取版本至 v4，確保部署後立即抓取新資料
  const CACHE_KEY = 'moenv_air_quality_v4'; 
  const CACHE_TTL = 600 * 1000; // 10 分鐘更新一次

  // ------------------------------------------------------
  // A. D1 讀取層
  // ------------------------------------------------------
  let cachedRecord = null;
  try {
    cachedRecord = await env.DB.prepare('SELECT data, updated_at FROM api_cache WHERE key = ?').bind(CACHE_KEY).first();
  } catch (e) {
    // D1 連線或查詢失敗時忽略，繼續往下走
  }

  const now = Date.now();
  const hasData = cachedRecord && cachedRecord.data;
  const isStale = !cachedRecord || (now - cachedRecord.updated_at > CACHE_TTL);

  // ------------------------------------------------------
  // B. 資料更新層 (背景執行)
  // ------------------------------------------------------
  const updateData = async () => {
    try {
      console.log(`🔄 [${CACHE_KEY}] 使用專屬 Key 更新資料...`);
      
      // ✅ 使用專屬連結 (含 limit=1000)
      const TARGET_URL = "https://data.moenv.gov.tw/api/v2/aqx_p_432?api_key=94650864-6a80-4c58-83ce-fd13e7ef0504&limit=1000&sort=ImportDate%20desc&format=JSON";
      
      const res = await fetch(TARGET_URL);
      if (!res.ok) throw new Error(`環境部 API 錯誤: ${res.status}`);
      
      const data = await res.json();

      // 資料清洗
      const stations = data.records.map(item => ({
        name: item.SiteName,       // 站名
        county: item.County,       // 縣市
        aqi: parseInt(item.AQI),   // AQI 數值
        status: item.Status,       // 狀態
        pm25: item["PM2.5"],       // PM2.5
        lat: parseFloat(item.Latitude),
        lon: parseFloat(item.Longitude),
        time: item.PublishTime
      })).filter(s => !isNaN(s.aqi)); // 過濾無效數值

      // 寫入 D1
      await env.DB.prepare(`
        INSERT INTO api_cache (key, data, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
      `).bind(CACHE_KEY, JSON.stringify(stations), now).run();
      
      console.log(`✅ [${CACHE_KEY}] 更新成功，共取得 ${stations.length} 筆資料`);
    } catch (e) {
      console.error(`❌ [${CACHE_KEY}] 更新失敗`, e);
    }
  };

  // ------------------------------------------------------
  // C. 決策與回應層
  // ------------------------------------------------------
  
  // 冷啟動 (完全沒資料) -> 等待更新
  if (!hasData) {
    await updateData();
    cachedRecord = await env.DB.prepare('SELECT data FROM api_cache WHERE key = ?').bind(CACHE_KEY).first();
  } 
  // 資料舊了 -> 先給舊的，背景更新
  else if (isStale) {
    context.waitUntil(updateData());
  }

  return new Response(cachedRecord?.data || "[]", {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60"
    }
  });
}
