export async function onRequest(context) {
  const { env, request } = context;
  
  // ⚡️ 升級版號 v4 (確保讀取新邏輯)
  const CACHE_KEY = 'wra_cctv_v4';       
  const CACHE_TTL = 300 * 1000;       

  // 🔒 白名單檢查
  const origin = request.headers.get('Origin');
  const ALLOWED_ORIGINS = [
    'http://127.0.0.1:8788',
    'http://localhost:8788',
    'https://camera-2wq.pages.dev' 
  ];
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "*",
    "Content-Type": "application/json"
  };

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
    try {
      console.log(`🔄 [${CACHE_KEY}] 開始更新...`);
      
      const SOURCE_URL = 'https://opendata.wra.gov.tw/api/v2/f71b74eb-cbe5-42c6-8be5-7500450e7db0?sort=_importdate%20asc&format=JSON';
      
      const res = await fetch(SOURCE_URL, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!res.ok) throw new Error(`水利署 API 錯誤: ${res.status}`);
      
      const rawData = await res.json();

      // 🛡️ 欄位對應：大小寫通吃大法
      const cleanData = rawData.map(item => {
        return {
            // ID: CameraID 或 cameraid
            id: item.CameraID || item.cameraid || item.StationNo,
            
            // 名稱: CameraName 或 cameraname
            name: item.CameraName || item.cameraname || item.VideoSurveillanceStationName || item.videosurveillancestationname,
            
            // 縣市: 超級長的欄位名
            city: item.CountiesAndCitiesWhereTheMonitoringPointsAreLocated || item.countiesandcitieswherethemonitoringpointsarelocated,
            
            // 鄉鎮區
            town: item.AdministrativeDistrictWhereTheMonitoringPointIsLocated || item.administrativedistrictwherethemonitoringpointislocated,
            
            // 河流
            river: item.BasinName || item.basinname || item.Tributary || item.tributary,
            
            // 圖片網址
            url: item.ImageURL || item.imageurl,
            
            // 經緯度 (注意 _4326)
            lat: parseFloat(item.latitude_4326 || item.Latitude_4326),
            lon: parseFloat(item.longitude_4326 || item.Longitude_4326),
            
            // 狀態
            status: item.Status || item.status
        };
      }).filter(item => {
        // 過濾掉無效資料
        return item.url && 
               !isNaN(item.lat) && item.lat > 0 &&
               !isNaN(item.lon) && item.lon > 0;
      });

      if (cleanData.length === 0) throw new Error("解析後資料為空 (0筆)");

      // 寫入 D1
      await env.DB.prepare(`
        INSERT INTO api_cache (key, data, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
      `).bind(CACHE_KEY, JSON.stringify(cleanData), now).run();
      
      console.log(`✅ [${CACHE_KEY}] 更新成功: ${cleanData.length} 筆`);
      return cleanData;
      
    } catch (e) {
      console.error(`❌ [${CACHE_KEY}] 更新失敗`, e);
      throw e; 
    }
  };

  // 3. 決策層
  try {
    if (!hasData) {
      await updateData();
      cachedRecord = await env.DB.prepare('SELECT data FROM api_cache WHERE key = ?').bind(CACHE_KEY).first();
    } 
    else if (isStale) {
      context.waitUntil(updateData());
    }
    
    const finalData = cachedRecord?.data || "[]";
    return new Response(finalData, { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ 
        error: "Internal Server Error", 
        details: err.message 
    }), { status: 500, headers: corsHeaders });
  }
}
