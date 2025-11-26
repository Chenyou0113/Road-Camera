// ============================================================
//  核心功能 1：從氣象署抓取警特報並寫入 D1 (背景執行用)
// ============================================================
async function updateWarningsInBackground(env) {
    const apiKey = env.CWA_API_KEY;
    if (!apiKey) return console.error("Missing API Key");

    // 警特報 URL (使用 File API)
    const cwaUrl = `https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/W-C0033-002?Authorization=${apiKey}&downloadType=WEB&format=JSON`;
    
    try {
        console.log("開始背景更新警特報...");
        const response = await fetch(cwaUrl, { 
            cf: { cacheTtl: 0 } // 強制不使用 Cloudflare 快取
        });

        if (!response.ok) throw new Error(`CWA API Error: ${response.status}`);
        
        const jsonData = await response.text();
        
        // 寫入 D1 (ID 固定為 1)
        await env.DB.prepare(`
            INSERT OR REPLACE INTO weather_warnings (id, json_data, updated_at) 
            VALUES (1, ?, ?)
        `).bind(jsonData, Date.now()).run();

        console.log("警特報背景更新完成");
        return true;
    } catch (e) {
        console.error(`背景更新失敗: ${e.message}`);
        return false;
    }
}

// ============================================================
//  核心功能 2：儲存氣象站資料 (維持原樣)
// ============================================================
async function saveStationDataToD1(env) {
    const apiKey = env.CWA_API_KEY;
    if (!apiKey) throw new Error("找不到 API Key");

    const cwaUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${apiKey}&format=JSON&StationStatus=OPEN`;
    
    try {
        const response = await fetch(cwaUrl);
        if (!response.ok) throw new Error(`氣象署 API 回傳錯誤: ${response.status}`);
        
        const data = await response.json();
        const stations = data.records?.Station || [];

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

            let tempVal = parseFloat(we.AirTemperature);
            if (isNaN(tempVal) || tempVal < -50) continue;

            let humdVal = parseFloat(we.RelativeHumidity);
            if (humdVal !== null && humdVal <= 1 && humdVal > 0) humdVal *= 100;
            if (isNaN(humdVal)) humdVal = null;

            let rainVal = we.Now && we.Now.Precipitation ? parseFloat(we.Now.Precipitation) : 0;
            if (isNaN(rainVal) || rainVal < 0) rainVal = 0;

            const weatherVal = we.Weather || null;

            let lat = null, lon = null;
            if (s.GeoInfo?.Coordinates) {
                const coord = s.GeoInfo.Coordinates.find(c => c.CoordinateName === 'WGS84') || s.GeoInfo.Coordinates[1];
                if (coord) {
                    lat = parseFloat(coord.StationLatitude);
                    lon = parseFloat(coord.StationLongitude);
                }
            }

            currentBatch.push(stmtStation.bind(s.StationId, s.StationName, s.GeoInfo.CountyName, s.GeoInfo.TownName, lat, lon));
            currentBatch.push(stmtLog.bind(s.StationId, timestamp, tempVal, humdVal, rainVal, weatherVal));

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
        return `成功同步 ${totalSaved} 個測站`;
    } catch (e) {
        console.error("Save Station Error:", e);
        return `同步失敗: ${e.message}`;
    }
}

// ============================================================
//  主入口 (Main Handler)
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. 設定 CORS (必須放在最前面)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // ========================================================
    // 🔥 修正重點：這裡先檢查 force_update，不檢查 dataset
    // ========================================================
    if (url.searchParams.get("force_update") === "true") {
        // 使用 waitUntil 讓更新在背景執行，前端不用等
        ctx.waitUntil(Promise.all([
            updateWarningsInBackground(env),
            saveStationDataToD1(env)
        ]));

        return new Response("✅ 已觸發背景更新！請等待 5~10 秒後重新整理首頁。", { 
            headers: { ...corsHeaders, "Content-Type": "text/plain;charset=UTF-8" } 
        });
    }

    // ========================================================
    // 2. 現在才檢查 dataset 參數
    // ========================================================
    const dataset = url.searchParams.get("dataset");

    // 警特報 (W-C0033-002) 邏輯
    if (dataset === 'W-C0033-002') {
        try {
            // 優先從 D1 讀取
            const record = await env.DB.prepare("SELECT json_data, updated_at FROM weather_warnings WHERE id = 1").first();
            
            // 判斷是否過期 (10分鐘 = 600000ms)
            const isStale = !record || !record.json_data || (Date.now() - record.updated_at > 600000);
            
            if (isStale) {
                console.log("資料陳舊或不存在，觸發背景更新...");
                ctx.waitUntil(updateWarningsInBackground(env));
            }

            // 如果資料庫完全沒資料 (第一次跑)，回傳假資料避免前端報錯
            let responseData = record && record.json_data ? record.json_data : JSON.stringify({
                cwaopendata: {
                    dataset: {
                        datasetInfo: { datasetDescription: "系統初始化中..." },
                        contents: { content: { contentText: "正在同步警特報資料，請稍候..." } }
                    }
                }
            });

            return new Response(responseData, {
                headers: { 
                    ...corsHeaders, 
                    "Content-Type": "application/json;charset=UTF-8",
                    "X-Source": isStale ? "D1-Stale" : "D1-Hit"
                }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: "DB Error: " + e.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 一般氣象資料 (Proxy) 邏輯
    if (dataset) {
        try {
            const cwaUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataset}?Authorization=${env.CWA_API_KEY}&format=JSON&StationStatus=OPEN`;
            const response = await fetch(cwaUrl);
            const data = await response.json();
            return new Response(JSON.stringify(data), { 
                headers: { ...corsHeaders, "Content-Type": "application/json;charset=UTF-8", "Cache-Control": "public, max-age=60" } 
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // 如果沒有 force_update 也沒有 dataset，才回傳錯誤
    return new Response("錯誤：缺少資料集參數 (dataset missing)", { status: 400, headers: corsHeaders });
  },

  // 3. 排程觸發 (Cron Job)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([saveStationDataToD1(env), updateWarningsInBackground(env)]));
  }
};
