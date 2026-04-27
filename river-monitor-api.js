// ============================================================
//  River Monitor Worker (V9.18 IoT Core + D1 Storage)
//  功能：以 IoT 平台為核心來源，並支援 D1 歷史紀錄寫入
// ============================================================

const COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://iot.wra.gov.tw/",
    "Accept": "application/json"
};

// 工具：ID 正規化 (去除空白、轉大寫)
const normalizeID = (id) => id ? String(id).trim().toUpperCase() : "";

// 核心功能：更新河川水位 (從 IoT 抓取並寫入 D1)
async function updateRiverDataWithLog(env) {
    const logs = [];
    try {
        logs.push("🚀 開始執行 updateRiverData (v9.18 - IoT Source)...");

        // 1. 抓取 IoT 平台資料 (這是目前最穩定的來源)
        const iotUrl = "https://iot.wra.gov.tw/river/stations?radius=0";
        logs.push(`📡 正在請求: ${iotUrl}`);
        
        const response = await fetch(iotUrl, { headers: COMMON_HEADERS });
        if (!response.ok) throw new Error(`IoT API Error: ${response.status}`);
        
        const rawData = await response.json();
        logs.push(`📦 取得 IoT 資料: ${rawData.length} 筆`);

        const stations = [];
        const historyBatch = [];
        const riverSet = new Set(); 
        const now = Date.now();

        // 準備寫入歷史紀錄的 SQL
        const stmtHistory = env.DB.prepare(`INSERT OR IGNORE INTO river_history (station_id, record_time, level) VALUES (?, ?, ?)`);

        // 2. 資料轉換與處理
        rawData.forEach(item => {
            // 防呆讀取欄位
            const rawId = item.StationID || item.StationId;
            const name = item.StationName || item.Name || "未知測站";
            const river = item.BasinName || "其他河川";
            const town = (item.CountyName || "") + (item.TownName || "");
            
            // 座標 (IoT 已經是 WGS84，不用轉)
            const lat = parseFloat(item.Latitude || item.Lat);
            const lon = parseFloat(item.Longitude || item.Lon || item.Longtiude);

            // 數值 (從 Measurements 陣列或直接欄位讀取)
            let level = item.WaterLevel;
            let timeStr = item.Time || item.RecordTime;

            // 如果外層沒值，嘗試從 Measurements 找
            if ((level === undefined || level === null) && item.Measurements && item.Measurements.length > 0) {
                const m = item.Measurements.find(x => x.Name === "水位" || x.IoWPhysicalQuantityId === "WaterLevel") || item.Measurements[0];
                level = m.Value;
                timeStr = m.TimeStamp;
            }

            // 確保 ID 存在
            if (!rawId) return;
            const stationId = normalizeID(rawId);

            // 處理時間字串轉 Timestamp
            let recordTime = now;
            if (timeStr) {
                const t = new Date(timeStr).getTime();
                if (!isNaN(t)) recordTime = t;
            }

            // 寫入歷史紀錄陣列 (數值必須有效)
            if (level !== null && level !== undefined && !isNaN(level)) {
                historyBatch.push(stmtHistory.bind(stationId, recordTime, parseFloat(level)));
            }

            // 收集河川名稱
            if (river && river !== "其他河川") riverSet.add(river.trim());

            // 整理給前端 UI 用的格式
            stations.push({
                id: stationId,
                name: name.trim(),
                river: river.trim(),
                town: town,
                lat: lat,
                lon: lon,
                level: level !== null ? parseFloat(level) : null,
                time: timeStr,
                status: 0, // IoT 來源無警戒值，預設正常 (綠燈)
                alert1: null,
                alert2: null,
                alert3: null
            });
        });

        if (stations.length === 0) {
            logs.push("⚠️ 警告: 解析後測站數量為 0");
            return { success: false, logs };
        }

        // 3. 寫入 D1 資料庫 (即時資料)
        // 這裡會覆蓋舊的 river_data，讓前端讀取到最新的 IoT 數據
        const jsonString = JSON.stringify(stations);
        
        // 確保表存在
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS river_data (id INTEGER PRIMARY KEY, json_data TEXT, updated_at INTEGER)`).run();
        
        // 寫入
        await env.DB.prepare(`INSERT OR REPLACE INTO river_data (id, json_data, updated_at) VALUES (1, ?, ?)`)
            .bind(jsonString, now).run();

        // 4. 寫入歷史紀錄 (分批寫入)
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS river_history (station_id TEXT, record_time INTEGER, level REAL, PRIMARY KEY (station_id, record_time))`).run();
        
        if (historyBatch.length > 0) {
            logs.push(`💾 寫入歷史紀錄: ${historyBatch.length} 筆`);
            const chunkSize = 20; // 避免 D1 Timeout
            for (let i = 0; i < historyBatch.length; i += chunkSize) {
                await env.DB.batch(historyBatch.slice(i, i + chunkSize));
            }
        }

        // 5. 更新河川清單
        logs.push(`🌊 更新河川清單: ${riverSet.size} 條`);
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS river_list (code TEXT PRIMARY KEY, name TEXT, json_data TEXT, updated_at INTEGER)`).run();
        
        const listBatch = [];
        const stmtList = env.DB.prepare(`INSERT OR REPLACE INTO river_list (code, name, json_data, updated_at) VALUES (?, ?, ?, ?)`);
        
        Array.from(riverSet).sort().forEach(river => {
            listBatch.push(stmtList.bind(river, river, JSON.stringify({name: river}), now));
        });

        if (listBatch.length > 0) {
            await env.DB.batch(listBatch);
        }

        // 6. 清理過期歷史資料 (保留 7 天)
        await env.DB.prepare("DELETE FROM river_history WHERE record_time < ?").bind(now - 7 * 86400000).run();

        logs.push(`✅ 更新成功: ${stations.length} 站`);
        return { success: true, logs };

    } catch (e) {
        logs.push(`❌ 錯誤: ${e.message}`);
        return { success: false, logs };
    }
}

// 4. 主入口 (Router)
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-Worker-Version": "v9.18-IoT-Hybrid"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 手動觸發更新 (Debug 用)
    if (url.searchParams.get("force_update") === "true") {
        const result = await updateRiverDataWithLog(env);
        return new Response(JSON.stringify({
            status: result.success ? "OK" : "ERROR",
            river_logs: result.logs
        }, null, 2), { 
            headers: { ...corsHeaders, "Content-Type": "application/json;charset=UTF-8" } 
        });
    }

    // 取得即時資料 (前端地圖主要呼叫這個)
    if (url.searchParams.get("dataset") === "river") {
        try {
            const record = await env.DB.prepare("SELECT json_data FROM river_data WHERE id = 1").first();
            // 如果資料庫是空的，嘗試即時抓取一次
            if (!record) {
                await updateRiverDataWithLog(env);
                const newRecord = await env.DB.prepare("SELECT json_data FROM river_data WHERE id = 1").first();
                return new Response(newRecord ? newRecord.json_data : "[]", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            return new Response(record.json_data, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (e) { return new Response(JSON.stringify({error: e.message}), {status: 500, headers: corsHeaders}); }
    }
    
    // 取得歷史資料 (圖表用)
    if (url.searchParams.get("history") === "true") {
        const stationId = url.searchParams.get("stationId");
        try {
            const normId = stationId ? String(stationId).trim().toUpperCase() : "";
            // 抓取最近 24 小時的資料
            const limitTime = Date.now() - 24 * 60 * 60 * 1000;
            const results = await env.DB.prepare("SELECT record_time, level FROM river_history WHERE station_id = ? AND record_time > ? ORDER BY record_time ASC").bind(normId, limitTime).all();
            return new Response(JSON.stringify(results.results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (e) { return new Response(JSON.stringify({error: e.message}), {status: 500, headers: corsHeaders}); }
    }

    // 取得河川列表 (篩選用)
    if (url.searchParams.get("dataset") === "river_list") {
        try {
            const results = await env.DB.prepare("SELECT name FROM river_list ORDER BY code ASC").all();
            return new Response(JSON.stringify(results.results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (e) { return new Response(JSON.stringify({error: e.message}), {status: 500, headers: corsHeaders}); }
    }

    return new Response("River Monitor API V9.18 (IoT Powered)", { headers: corsHeaders });
  },

  // 定時排程 (建議每 10 分鐘一次)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(updateRiverDataWithLog(env));
  }
};