export async function onRequest(context) {
  const { env, request } = context;
  
  // ⚡️ 升級版號 v6
  const CACHE_KEY = 'wra_cctv_v6';       
  const CACHE_TTL = 300 * 1000;       

  const origin = request.headers.get('Origin');
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "*",
    "Content-Type": "application/json"
  };

  try {
    if (!env.DB) throw new Error("D1 資料庫未綁定 (env.DB is null)");

    // 1. D1 讀取
    let cachedRecord = null;
    try {
      cachedRecord = await env.DB.prepare('SELECT data, updated_at FROM api_cache WHERE key = ?').bind(CACHE_KEY).first();
    } catch (e) {}

    const now = Date.now();
    const hasData = cachedRecord && cachedRecord.data;
    const isStale = !cachedRecord || (now - cachedRecord.updated_at > CACHE_TTL);

    // 2. 資料更新層
    const updateData = async () => {
      console.log(`🔄 [${CACHE_KEY}] 開始抓取水利署資料...`);
      
      // 這是目前使用的網址
      const SOURCE_URL = 'https://opendata.wra.gov.tw/api/v2/f71b74eb-cbe5-42c6-8be5-7500450e7db0?sort=_importdate%20asc&format=JSON';
      
      const res = await fetch(SOURCE_URL, {
        headers: {
            // 模擬真實瀏覽器
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
      });

      // 🛑 偵錯點 A: 檢查狀態碼
      if (!res.ok) {
        throw new Error(`水利署 API HTTP 錯誤: ${res.status} ${res.statusText}`);
      }

      // 🛑 偵錯點 B: 先讀成文字，檢查是不是 HTML
      const textData = await res.text();
      
      // 如果開頭是 < (代表是 HTML 標籤，如 <!DOCTYPE html> 或 <html>)
      if (textData.trim().startsWith("<")) {
        // 把 HTML 的前 200 個字印出來，讓我們知道發生什麼事
        console.error("API 回傳了 HTML:", textData.substring(0, 200));
        throw new Error(`API 回傳了 HTML 網頁而非 JSON (可能是網址錯誤或被擋): ${textData.substring(0, 100)}...`);
      }

      // 嘗試解析 JSON
      let rawData;
      try {
        rawData = JSON.parse(textData);
      } catch (e) {
        throw new Error(`JSON 解析失敗: ${e.message}`);
      }

      // 🛡️ 欄位對應 (v4 的邏輯)
      const cleanData = rawData.map(item => {
        return {
            id: item.CameraID || item.cameraid || item.StationNo,
            name: item.CameraName || item.cameraname || item.VideoSurveillanceStationName || item.videosurveillancestationname || "未命名",
            city: item.CountiesAndCitiesWhereTheMonitoringPointsAreLocated || item.countiesandcitieswherethemonitoringpointsarelocated || "",
            town: item.AdministrativeDistrictWhereTheMonitoringPointIsLocated || item.administrativedistrictwherethemonitoringpointislocated || "",
            river: item.BasinName || item.basinname || item.Tributary || item.tributary || "",
            url: item.ImageURL || item.imageurl || item.Url,
            lat: parseFloat(item.latitude_4326 || item.Latitude_4326 || item.Latitude || 0),
            lon: parseFloat(item.longitude_4326 || item.Longitude_4326 || item.Longitude || 0),
            time: item.RecTime || item.recTime
        };
      }).filter(item => item.url && !isNaN(item.lat) && item.lat !== 0);

      if (cleanData.length === 0) throw new Error("解析後資料為 0 筆");

      // 寫入 D1
      await env.DB.prepare(`
        INSERT INTO api_cache (key, data, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
      `).bind(CACHE_KEY, JSON.stringify(cleanData), now).run();
      
      console.log(`✅ 更新成功: ${cleanData.length} 筆`);
      return cleanData;
    };

    // 3. 決策層
    if (!hasData) {
      const freshData = await updateData();
      return new Response(JSON.stringify(freshData), { headers: corsHeaders });
    } else if (isStale) {
      context.waitUntil(updateData().catch(e => console.error("背景更新失敗:", e)));
    }
    
    return new Response(cachedRecord.data, { headers: corsHeaders });

  } catch (err) {
    // 🚨 回傳詳細錯誤給前端，方便除錯
    return new Response(JSON.stringify({ 
        error: "Internal Server Error", 
        details: err.message
    }), { status: 500, headers: corsHeaders });
  }
}
