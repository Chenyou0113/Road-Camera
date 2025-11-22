export async function onRequest(context) {
  const { env } = context;
  
  // ⚡️ 升級版本號 v8 (確保讀到新邏輯)
  const CACHE_KEY = 'moenv_air_quality_v8'; 
  const CACHE_TTL = 600 * 1000; 

  // 1. D1 讀取
  let cachedRecord = null;
  try {
    cachedRecord = await env.DB.prepare('SELECT data, updated_at FROM api_cache WHERE key = ?').bind(CACHE_KEY).first();
  } catch (e) {}

  const now = Date.now();
  const hasData = cachedRecord && cachedRecord.data;
  const isStale = !cachedRecord || (now - cachedRecord.updated_at > CACHE_TTL);

  // 2. 更新邏輯
  const updateData = async () => {
    try {
      console.log(`🔄 [${CACHE_KEY}] 開始更新...`);
      
      // 使用你的專屬 Key
      const TARGET_URL = "https://data.moenv.gov.tw/api/v2/aqx_p_432?api_key=94650864-6a80-4c58-83ce-fd13e7ef0504&limit=1000&sort=ImportDate%20desc&format=JSON";
      
      const res = await fetch(TARGET_URL);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      
      const data = await res.json();
      const records = data.records;

      // ⚡️ 關鍵修正：全部改用小寫欄位名稱！
      const stations = records.map(item => ({
        name: item.sitename,       // JSON 是 sitename
        county: item.county,       // JSON 是 county
        aqi: parseInt(item.aqi),   // JSON 是 aqi
        status: item.status,       // JSON 是 status
        pm25: item["pm2.5"],       // JSON 是 pm2.5 (注意這裡要用中括號)
        lat: parseFloat(item.latitude),  // JSON 是 latitude
        lon: parseFloat(item.longitude), // JSON 是 longitude
        time: item.publishtime     // JSON 是 publishtime
      })).filter(s => !isNaN(s.aqi)); // 過濾掉無效數值

      // 防呆：如果是空的，拋出錯誤
      if (stations.length === 0) {
        throw new Error(`解析後資料為空！原始筆數: ${records.length}`);
      }

      // 寫入 D1
      await env.DB.prepare(`
        INSERT INTO api_cache (key, data, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
      `).bind(CACHE_KEY, JSON.stringify(stations), now).run();
      
      console.log(`✅ 成功更新 ${stations.length} 筆`);
    } catch (e) {
      console.error("更新失敗", e);
      // 把錯誤寫入 D1 方便除錯
      const errorData = [{ error: e.message }];
      await env.DB.prepare(`INSERT INTO api_cache (key, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`)
            .bind(CACHE_KEY, JSON.stringify(errorData), now).run();
    }
  };

  // 3. 決策層
  if (!hasData) await updateData();
  else if (isStale) context.waitUntil(updateData());

  if (!hasData) cachedRecord = await env.DB.prepare('SELECT data FROM api_cache WHERE key = ?').bind(CACHE_KEY).first();

  return new Response(cachedRecord?.data || "[]", {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
