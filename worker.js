// === 核心功能：寫入 D1 資料庫 (保持不變) ===
async function saveWeatherToD1(env) {
  const apiKey = env.CWA_API_KEY;
  if (!apiKey) throw new Error("找不到 API Key");

  // 抓取自動氣象站 (O-A0001-001)
  const cwaUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${apiKey}&format=JSON&StationStatus=OPEN`;
  
  const response = await fetch(cwaUrl);
  if (!response.ok) throw new Error(`氣象署 API 回傳錯誤: ${response.status}`);
  
  const data = await response.json();
  if (!data.records || !data.records.Station) throw new Error("API 資料結構異常");

  const stations = data.records.Station;

  // 準備 SQL
  const stmtStation = env.DB.prepare(`
    INSERT OR REPLACE INTO stations (station_id, name, county, town, lat, lon)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const stmtLog = env.DB.prepare(`
    INSERT INTO weather_logs (station_id, obs_time, temperature, humidity, rain, weather)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let currentBatch = [];
  const BATCH_SIZE = 20;
  const timestamp = Date.now();
  let totalSaved = 0;

  for (const s of stations) {
    if (!s.WeatherElement) continue;

    const we = s.WeatherElement;

    // 1. 溫度
    let tempVal = parseFloat(we.AirTemperature);
    if (isNaN(tempVal)) tempVal = -99;

    // 2. 濕度
    let humdVal = parseFloat(we.RelativeHumidity);
    if (humdVal !== null && humdVal <= 1 && humdVal > 0) humdVal *= 100;
    if (isNaN(humdVal)) humdVal = null;

    // 3. 雨量
    let rainVal = 0;
    if (we.Now && we.Now.Precipitation) {
        rainVal = parseFloat(we.Now.Precipitation);
    }
    if (isNaN(rainVal) || rainVal < 0) rainVal = 0;

    // 4. 天氣
    const weatherVal = we.Weather || null;

    // 地理資訊解析
    let lat = null, lon = null;
    if (s.GeoInfo && s.GeoInfo.Coordinates) {
        const coord = s.GeoInfo.Coordinates.find(c => c.CoordinateName === 'WGS84') || s.GeoInfo.Coordinates[1];
        if (coord) {
            lat = parseFloat(coord.StationLatitude);
            lon = parseFloat(coord.StationLongitude);
        }
    }

    // 寫入條件
    if (tempVal !== null && tempVal > -50) {
      
      currentBatch.push(stmtStation.bind(
          s.StationId,
          s.StationName,
          s.GeoInfo.CountyName,
          s.GeoInfo.TownName,
          lat,
          lon
      ));

      currentBatch.push(stmtLog.bind(
        s.StationId, 
        timestamp, 
        tempVal, 
        humdVal, 
        rainVal, 
        weatherVal
      ));
    }

    if (currentBatch.length >= BATCH_SIZE * 2) {
      await env.DB.batch(currentBatch);
      totalSaved += (currentBatch.length / 2);
      currentBatch = [];
    }
  }

  if (currentBatch.length > 0) {
    await env.DB.batch(currentBatch);
    totalSaved += (currentBatch.length / 2);
  }

  return `成功！已全數同步 ${totalSaved} 個自動測站資料 (解析模式：物件)`;
}

// === 主要入口點 ===
export default {
  // 1. 處理網頁請求 (Proxy 功能)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 🔥 測試後門 (手動觸發寫入 D1)
    if (url.searchParams.get("test_save") === "true") {
      try {
        const result = await saveWeatherToD1(env);
        return new Response(`測試結果：${result}`);
      } catch (err) {
        return new Response(`測試錯誤：${err.message}`, { status: 500 });
      }
    }

    // 設定 CORS 標頭 (允許跨網域存取)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 取得 dataset 參數 (例如 O-A0001-001 或 W-C0033-002)
    const dataset = url.searchParams.get("dataset");
    if (!dataset) return new Response("Error: Missing dataset parameter", { status: 400, headers: corsHeaders });

    try {
      // ★ 修改重點：區分一般 API 與 警特報 File API ★
      let cwaUrl = '';
      
      if (dataset === 'W-C0033-002') {
        // 警特報使用的是 File API
        cwaUrl = `https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/${dataset}?Authorization=${env.CWA_API_KEY}&downloadType=WEB&format=JSON`;
      } else {
        // 其他氣象資料 (如 O-A0001) 使用的是 Datastore API
        cwaUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataset}?Authorization=${env.CWA_API_KEY}&format=JSON&StationStatus=OPEN`;
      }

      // 向氣象署發送請求
      const response = await fetch(cwaUrl);
      const data = await response.json();
      
      // 將資料回傳給前端
      return new Response(JSON.stringify(data), { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json;charset=UTF-8",
          // 建議加入 Cache-Control 減少對氣象署的請求 (例如快取 60 秒)
          "Cache-Control": "public, max-age=60"
        } 
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 2. 自動排程 (Cron Job)
  async scheduled(event, env, ctx) {
    try {
      const result = await saveWeatherToD1(env);
      console.log("排程執行:", result);
    } catch (error) {
      console.error("排程錯誤:", error.message);
    }
  }
};
