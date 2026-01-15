/**
 * CWA Weather Monitor Worker (V17.73 - Syntax Fix)
 * 
 * 修正重點：
 * 1. [修復] 解決 V17.72 因過度壓縮導致的 SyntaxError。
 * 2. [還原] 將所有函式展開為標準格式，確保執行穩定。
 */

const CWA_API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore";
const TABLE_CACHE = "api_cache";
const TABLE_HISTORY = "weather_history";

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };
        
        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
        
        try {
            if (url.pathname.startsWith("/api/weather/history")) return await handleHistoryChartQuery(env, corsHeaders, url.searchParams.get("station_id"));
            if (url.pathname.startsWith("/api/weather/summary")) return await handleSummaryQuery(env, corsHeaders);
            if (url.pathname.startsWith("/api/weather/alert")) return await handleCombinedAlertQuery(env, corsHeaders);
            
            if (url.pathname.startsWith("/api/check")) {
                if (!env.CWA_API_KEY) return new Response(JSON.stringify({ status: "error", msg: "API Key is MISSING" }), { headers: corsHeaders });
                return new Response(JSON.stringify({ status: "ok", msg: "API Key is set", key_prefix: env.CWA_API_KEY.substring(0,4) }), { headers: corsHeaders });
            }

            if (url.pathname.startsWith("/api/debug")) {
                const code = url.searchParams.get("code");
                if (!code || !env.CWA_API_KEY) return new Response(JSON.stringify({ error: "Missing code" }), { headers: corsHeaders });
                const r = await fetch(`${CWA_API_URL}/${code}?Authorization=${env.CWA_API_KEY}&format=JSON`);
                const data = await r.json();
                return new Response(JSON.stringify(data, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            if (url.pathname.startsWith("/api/sync")) {
                const target = url.searchParams.get("target");
                if (target) {
                    const result = await runTargetUpdateVerbose(env, target);
                    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
                return new Response(JSON.stringify({ error: "Use /api/sync?target=auto" }), { headers: corsHeaders });
            }

            let dataset = (url.searchParams.get("dataset") || "").trim();
            if (dataset) {
                if (dataset.startsWith('E-')) return new Response(JSON.stringify({ error: "Disabled" }), { headers: corsHeaders });
                return await getCachedData(env, dataset, corsHeaders);
            }
        
            return new Response(JSON.stringify({ status: "running", version: "V17.73" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (e) {
            return new Response(JSON.stringify({error: e.message, stack: e.stack}), { status: 500, headers: corsHeaders });
        }
    },
    
    async scheduled(event, env, ctx) {
        const m = new Date(event.scheduledTime).getMinutes(); 
        const tasks = [];

        // 1. 每小時 00 分
        if (m === 0) {
            tasks.push(updateWeatherDataVerbose(env, 'O-A0003-001'));
            tasks.push(updateGenericCache(env, 'O-A0003-001', true));
            tasks.push(updateGenericCache(env, 'W-C0033-002', true));
            tasks.push(updateGenericCache(env, 'W-C0033-004', true));
        }

        // 2. 每小時 10 分
        if (m === 10) {
            const charts1 = ['O-A0058-001', 'O-A0058-003', 'O-A0084-001', 'O-A0084-002', 'O-A0084-003', 'O-A0059-001', 'F-C0035-003'];
            for (const c of charts1) tasks.push(updateGenericCache(env, c, true));
        }

        // 3. 每小時 20 分
        if (m === 20) {
            const charts2 = ['O-B0032-001', 'O-B0032-003', 'O-B0032-004', 'O-C0042-001', 'O-C0042-002', 'O-C0042-003', 'O-C0042-004', 'O-C0042-005', 'O-C0042-006', 'O-C0042-007', 'O-C0042-008'];
            for (const c of charts2) tasks.push(updateGenericCache(env, c, true));
        }

        // 4. 每小時 30 分 (自動站)
        if (m === 30) {
            tasks.push(updateWeatherDataVerbose(env, 'O-A0001-001'));
            tasks.push(updateGenericCache(env, 'O-A0001-001', true));
        }

        // 5. 每小時 40 分 (雨量站)
        if (m === 40) {
            tasks.push(updateWeatherDataVerbose(env, 'O-A0002-001'));
            tasks.push(updateGenericCache(env, 'O-A0002-001', true));
            tasks.push(updateGenericCache(env, 'O-A0040-001', true));
        }

        // 6. 每小時 50 分 (預報)
        if (m === 50) {
            const charts3 = ['F-C0035-015', 'F-C0035-017', 'F-C0035-023', 'F-C0035-024'];
            for (const c of charts3) tasks.push(updateGenericCache(env, c, true));
        }

        if (tasks.length > 0) ctx.waitUntil(Promise.all(tasks));
    }
};

// --- 獵犬搜尋 ---
function findImageInObject(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const res = findImageInObject(item);
            if (res) return res; 
        }
        return null;
    }
    if (obj.uri && typeof obj.uri === 'string' && obj.uri.startsWith('http')) return obj.uri;
    if (obj.ProductURL && typeof obj.ProductURL === 'string' && obj.ProductURL.startsWith('http')) return obj.ProductURL;
    if (obj.web && typeof obj.web === 'string' && obj.web.startsWith('http')) return obj.web;
    
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const val = obj[key];
            if (typeof val === 'string' && val.startsWith('http') && (val.includes('.jpg') || val.includes('.png') || val.includes('.pdf'))) return val;
            if (typeof val === 'object') {
                const res = findImageInObject(val);
                if (res) return res;
            }
        }
    }
    return null;
}

// --- Cache 更新邏輯 ---
async function updateGenericCache(env, id, force) {
    if (!env.CWA_API_KEY || !env.DB) return;
    try {
        const isObsData = ['O-A0001', 'O-A0002', 'O-A0003'].some(p => id.startsWith(p));
        const isFileApi = !isObsData && ['F-', 'O-A', 'O-B', 'O-C'].some(prefix => id.startsWith(prefix));
        const baseUrl = isFileApi ? 
            `https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/${id}?downloadType=WEB&format=JSON` : 
            `${CWA_API_URL}/${id}?format=JSON`;
            
        const r = await fetch(`${baseUrl}&Authorization=${env.CWA_API_KEY}`);
        if (!r.ok) return;
        
        let data = await r.json();
        
        if (isFileApi) {
            let imgUrl = findImageInObject(data);
            // 特化修正
            if (id === 'O-A0059-001' && !imgUrl && data.cwaopendata?.dataset?.resource?.web) {
                imgUrl = data.cwaopendata.dataset.resource.web;
            }
            
            let time = new Date().toISOString();
            if (data.cwaopendata?.dataset?.obsTime) time = data.cwaopendata.dataset.obsTime;
            else if (data.cwaopendata?.dataset?.resource?.published) time = data.cwaopendata.dataset.resource.published;

            data = {
                cwaopendata: {
                    dataset: {
                        resource: { uri: imgUrl || "", url: imgUrl || "", ProductURL: imgUrl || "" },
                        obsTime: time
                    }
                }
            };
        }
        await env.DB.prepare(`INSERT OR REPLACE INTO ${TABLE_CACHE} (api_key, json_data, updated_at) VALUES (?, ?, ?)`).bind(id, JSON.stringify(data), Date.now()).run();
    } catch(e) { console.error(`Cache Error ${id}:`, e); }
}

// --- 手動更新 ---
async function runTargetUpdateVerbose(env, target) {
    let result = { status: "success", target, count: 0, errors: [] };
    try {
        if (target === 'manned') {
            const r = await updateWeatherDataVerbose(env, 'O-A0003-001');
            if (r.error) result.errors.push(r.error);
            result.count += r.count;
            await updateGenericCache(env, 'O-A0003-001', true);
        }
        else if (target === 'auto') {
            const r = await updateWeatherDataVerbose(env, 'O-A0001-001');
            if (r.error) result.errors.push(r.error);
            result.count += r.count;
            await updateGenericCache(env, 'O-A0001-001', true);
        }
        else if (target === 'rain') {
            const r = await updateWeatherDataVerbose(env, 'O-A0002-001');
            if (r.error) result.errors.push(r.error);
            result.count += r.count;
            await updateGenericCache(env, 'O-A0002-001', true);
        }
        else if (target === 'chart') {
            const charts = [
                'O-A0058-001', 'O-A0058-003', 'O-A0084-001', 'O-A0040-001', 'O-A0059-001',
                'O-A0038-001', 'F-C0035-003',
                'O-B0032-001', 'O-B0032-003', 'O-B0032-004',
                'O-C0042-001', 'O-C0042-002', 'O-C0042-003', 'O-C0042-004',
                'O-C0042-005', 'O-C0042-006', 'O-C0042-007', 'O-C0042-008',
                'F-C0035-015', 'F-C0035-017', 'F-C0035-023', 'F-C0035-024'
            ];
            for (const c of charts) await updateGenericCache(env, c, true);
            result.count = charts.length;
        }
        else if (target === 'alert') {
            await updateGenericCache(env, 'W-C0033-002', true);
            await updateGenericCache(env, 'W-C0033-004', true);
            result.count = 1;
        }
        else if (target === 'forecast') {
            const r = await fetch(`${CWA_API_URL}/F-C0032-001?Authorization=${env.CWA_API_KEY}&format=JSON`);
            const data = await r.json();
            await env.DB.prepare(`INSERT OR REPLACE INTO ${TABLE_CACHE} (api_key, json_data, updated_at) VALUES (?, ?, ?)`).bind('F-C0032-001', JSON.stringify(data), Date.now()).run();
            result.count = 1;
        }
        
        if (result.errors.length > 0) result.status = "partial_error";
        return result;
    } catch (e) { return { status: "error", message: e.message }; }
}

// --- 資料庫寫入 ---
async function updateWeatherDataVerbose(env, datasetId) {
    if (!env.CWA_API_KEY) return { count: 0, error: "Missing API Key" };
    if (!env.DB) return { count: 0, error: "Missing DB Binding" };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const url = `${CWA_API_URL}/${datasetId}?Authorization=${env.CWA_API_KEY}&format=JSON`;
    
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) return { count: 0, error: `CWA API Error: ${response.status}` };
        
        const json = await response.json();
        const stations = json.records?.Station || json.records?.station || [];
        
        if (stations.length === 0) return { count: 0, error: "Empty Data" };

        const now = Date.now();
        const stmt = env.DB.prepare(`
            INSERT OR IGNORE INTO ${TABLE_HISTORY} 
            (station_id, station_name, timestamp, temperature, wind_speed, rain, humidity) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const batch = [];
        for (const s of stations) {
            let temp = -99, wind = -99, rain = 0, hum = 0;
            
            if (s.WeatherElement) {
                const we = s.WeatherElement;
                if (Array.isArray(we)) {
                    const g = (k) => { const e = we.find(x => x.ElementName === k); const v = e ? parseFloat(e.ElementValue) : -99; return isNaN(v) ? -99 : v; };
                    temp = g('TEMP'); if (temp === -99) temp = g('AirTemperature'); 
                    wind = g('WDSD');
                    rain = g('NOW'); if (rain === -99) rain = g('RAIN'); if (rain === -99) rain = g('H_24R'); if (rain === -99) rain = 0;
                    hum = g('HUMD'); if (hum > 0 && hum <= 1) hum = Math.round(hum * 100); if (hm === -99) hm = 0;
                } else if (typeof we === 'object') {
                    temp = parseFloat(we.AirTemperature) || -99; 
                    wind = parseFloat(we.WindSpeed) || -99; 
                    hum = parseInt(we.RelativeHumidity) || 0;
                    if (we.Now && we.Now.Precipitation) rain = parseFloat(we.Now.Precipitation);
                }
            } else if (s.RainfallElement) {
                const re = s.RainfallElement;
                if (re.Now && re.Now.Precipitation) rain = parseFloat(re.Now.Precipitation);
                if (isNaN(rain) || rain < 0) rain = 0;
            }

            if (rain < 0) rain = 0;
            batch.push(stmt.bind(s.StationId, s.StationName, now, temp, wind, rain, hum));
        }

        const chunkSize = 50;
        for (let i = 0; i < batch.length; i += chunkSize) { 
            await env.DB.batch(batch.slice(i, i + chunkSize)); 
        }
        
        try { await env.DB.prepare(`DELETE FROM ${TABLE_HISTORY} WHERE timestamp < ?`).bind(now - 93600000).run(); } catch(e) {}

        return { count: stations.length, error: null };

    } catch (e) { 
        return { count: 0, error: `System Error: ${e.message}` };
    }
}

// --- 警報處理 ---
async function handleCombinedAlertQuery(env, headers) {
    try {
        if (!env.DB) return new Response("{}", { headers });
        
        const getJson = async (id) => {
            const res = await env.DB.prepare(`SELECT json_data FROM ${TABLE_CACHE} WHERE api_key = ?`).bind(id).first();
            return res?.json_data ? JSON.parse(res.json_data) : null;
        };
        
        const [data002, data004] = await Promise.all([getJson('W-C0033-002'), getJson('W-C0033-004')]);
        const uniqueAlerts = new Set();
        
        const formatTime = (t) => {
            if (!t) return "";
            try { 
                const parts = t.split(' ');
                const dateParts = parts[0].split('-');
                const timeParts = parts[1].split(':');
                return `${dateParts[1]}/${dateParts[2]} ${timeParts[0]}:${timeParts[1]}`;
            } catch (e) { return t; }
        };

        const processDataset = (data) => {
            if (!data || !data.records || !data.records.record) return;
            
            for (const rec of data.records.record) {
                const info = rec.datasetInfo;
                let content = "";
                if (rec.contents?.content?.contentText) {
                    content = rec.contents.content.contentText;
                } else if (rec.contents?.content) {
                     content = rec.contents.content;
                }

                if (!info || !content) continue;

                const title = info.datasetDescription;
                const issueTime = formatTime(info.issueTime);
                const endTime = info.validTime?.endTime ? formatTime(info.validTime.endTime) : "";

                let cleanContent = String(content)
                    .replace(/一、概述：/g, "")
                    .replace(/[\r\n]+/g, "") 
                    .split("二、")[0]
                    .trim();

                const alertStr = `【${title} ${issueTime}】${cleanContent} (~${endTime})`;
                uniqueAlerts.add(alertStr);
            }
        };

        processDataset(data002);
        processDataset(data004);

        const alertList = Array.from(uniqueAlerts);
        
        return new Response(JSON.stringify({ 
            count: alertList.length, 
            alerts: alertList, 
            feed_string: alertList.join("   📢   ") 
        }), { headers: { ...headers, "Content-Type": "application/json" } });

    } catch (e) {
        return new Response(JSON.stringify({ error: "Alert process failed", msg: e.message }), { headers });
    }
}

// --- 快取讀取 ---
const getCachedData = async (env, apiKey, headers) => { 
    try { 
        if (env.DB) { 
            const c = await env.DB.prepare(`SELECT json_data FROM ${TABLE_CACHE} WHERE api_key = ?`).bind(apiKey).first(); 
            if (c?.json_data && c.json_data.length > 20) {
                return new Response(c.json_data, { headers: { ...headers, "Content-Type": "application/json" } }); 
            }
        } 
    } catch (e) {} 
    return new Response(JSON.stringify({ cwaopendata: { dataset: { resource: { uri: "", url: "" }, obsTime: new Date().toISOString() } }, records: [] }), { headers: { ...headers, "Content-Type": "application/json" } }); 
};

// --- 摘要 ---
async function handleSummaryQuery(env, headers) {
    try {
        if (!env.DB) throw new Error("DB not binding");
        const timeThreshold = Date.now() - 7200000;
        const stmt = `
            SELECT 
                COUNT(DISTINCT station_id) as total_count,
                AVG(CASE WHEN temperature > -50 THEN temperature END) as avg_temp,
                MAX(CASE WHEN temperature > -50 THEN temperature END) as max_temp,
                MIN(CASE WHEN temperature > -50 THEN temperature END) as min_temp,
                COUNT(DISTINCT CASE WHEN rain > 0 THEN station_id END) as rain_count,
                MAX(rain) as max_rain,
                COUNT(DISTINCT CASE WHEN temperature <= -50 THEN station_id END) as error_count
            FROM ${TABLE_HISTORY}
            WHERE timestamp > ?
        `;
        const result = await env.DB.prepare(stmt).bind(timeThreshold).first();
        const data = {
            station_count: result.total_count || 0,
            avg_temp: result.avg_temp ? parseFloat(result.avg_temp.toFixed(1)) : 0,
            max_temp: result.max_temp || 0,
            min_temp: result.min_temp || 0,
            raining_stations: result.rain_count || 0,
            max_rainfall: result.max_rain || 0,
            abnormal_count: result.error_count || 0
        };
        return new Response(JSON.stringify(data), { headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } });
    } catch (e) { 
        return new Response(JSON.stringify({ error: "Summary failed" }), { status: 500, headers: headers }); 
    }
}

// --- 歷史資料 ---
async function handleHistoryChartQuery(env, headers, stationId) {
    try {
        if (!env.DB) throw new Error("DB not binding");
        let stmt, params;
        
        if (stationId) {
            stmt = `SELECT timestamp, temperature, rain, wind_speed, humidity FROM ${TABLE_HISTORY} WHERE station_id = ? ORDER BY timestamp ASC`;
            params = [stationId];
        } else {
            stmt = `
                SELECT 
                    (timestamp / 3600000) * 3600000 as time_bucket,
                    AVG(CASE WHEN temperature > -50 THEN temperature END) as temperature,
                    MAX(rain) as rain,
                    AVG(CASE WHEN humidity > 0 THEN humidity END) as humidity,
                    AVG(CASE WHEN wind_speed >= 0 THEN wind_speed END) as wind_speed
                FROM ${TABLE_HISTORY}
                WHERE timestamp > ?
                GROUP BY time_bucket
                ORDER BY time_bucket ASC
            `;
            params = [Date.now() - (26 * 3600000)];
        }
        
        const { results } = await env.DB.prepare(stmt).bind(...params).all();
        
        const formatted = (results || []).map(r => ({
            timestamp: r.timestamp || r.time_bucket,
            temperature: r.temperature,
            rain: r.rain,
            humidity: r.humidity,
            wind_speed: r.wind_speed
        }));
        
        return new Response(JSON.stringify(formatted), { 
            headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } 
        });

    } catch (e) { 
        return new Response("[]", { headers: { ...headers, "Content-Type": "application/json" } }); 
    }
}