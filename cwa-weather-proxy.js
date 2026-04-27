/**
 * CWA Weather Monitor Worker (V18.85 - The Disaster Prevention Hub)
 * 
 * 最終整合清單：
 * 1. [海嘯監測] 新增 E-A0014-001 監測，自動置頂於跑馬燈。
 * 2. [地震詳情] 支援點擊顯示規模、深度與報告圖 URL，解決前端 Modal 需求。
 * 3. [警報全集] 整合大雨、強風、低溫(W-C0033-004)、高溫(W-C0033-005)、颱風(W-C0034-001)。
 * 4. [排程優化] 署屬站 10 分鐘同步 / 其餘資料（預報、地震、圖資） 1 小時同步。
 * 5. [故障判定] 全自動將 -99, -99.0, X 轉為 "故障" 文字。
 * 6. [混合儲存] KV 負責極速讀取與大型 JSON / D1 負責 24 小時歷史數值。
 */

const CWA_API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore";
const TABLE_HISTORY = "weather_history";

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = { 
            "Access-Control-Allow-Origin": "*", 
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS", 
            "Access-Control-Allow-Headers": "Content-Type" 
        };
        
        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        try {
            // === [路由 1] 即時觀測、預報、警報、地震、海嘯 (從 KV 讀取) ===
            if (url.pathname.startsWith("/api/weather/now")) {
                const data = await env.WEATHER_KV.get("CURRENT_NOW");
                return new Response(data || "[]", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            if (url.pathname.startsWith("/api/weather/forecast")) {
                const county = (url.searchParams.get("county") || "臺北市").replace('台', '臺');
                const data = await env.WEATHER_KV.get(`FC_${county}`);
                return new Response(data || "{}", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            if (url.pathname.startsWith("/api/weather/alert")) {
                const data = await env.WEATHER_KV.get("CURRENT_ALERT");
                return new Response(data || '{"count":0,"alerts":[],"feed_string":"連線中..."}', { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            if (url.pathname.startsWith("/api/weather/earthquake")) {
                const data = await env.WEATHER_KV.get("EQ_REPORT");
                return new Response(data || "{}", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            if (url.pathname.startsWith("/api/weather/tsunami")) {
                const data = await env.WEATHER_KV.get("TSUNAMI_REPORT");
                return new Response(data || "{}", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // === [路由 2] 歷史紀錄 (從 D1 讀取) ===
            if (url.pathname.startsWith("/api/weather/history")) {
                const stationId = url.searchParams.get("station_id");
                const cutoff = Date.now() - 93600000; // 26 小時
                const { results } = await env.DB.prepare(`SELECT timestamp, temperature, rain, wind_speed, humidity FROM ${TABLE_HISTORY} WHERE station_id = ? AND timestamp > ? ORDER BY timestamp ASC`).bind(stationId, cutoff).all();
                return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // === [路由 3] 手動同步路由 ===
            if (url.pathname.startsWith("/api/sync")) {
                const target = url.searchParams.get("target");
                ctx.waitUntil(runSync(env, target));
                return new Response(JSON.stringify({ status: "sync_triggered", target }), { headers: corsHeaders });
            }

            // === [路由 4] 萬用 Proxy 與天文、圖資 ===
            let dataset = (url.searchParams.get("dataset") || "").trim();
            if (dataset) {
                // 天文資料直接轉發
                if (dataset.startsWith('A-B')) {
                    const targetUrl = `${CWA_API_URL}/${dataset}?Authorization=${env.CWA_API_KEY}&CountyName=${encodeURIComponent(url.searchParams.get('CountyName'))}&Date=${url.searchParams.get('Date')}&format=JSON`;
                    const r = await fetch(targetUrl);
                    return new Response(JSON.stringify(await r.json()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
                // 圖資優先讀 KV
                const kvChart = await env.WEATHER_KV.get(`CHART_${dataset}`);
                if (kvChart) return new Response(kvChart, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                
                // 若無快取則即時抓取一份
                const fresh = await updateCacheItem(env, dataset);
                return new Response(JSON.stringify(fresh || {}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            return new Response(JSON.stringify({ status: "running", version: "V18.85" }), { headers: corsHeaders });
        } catch (e) { 
            return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders }); 
        }
    },

    // 🚀 [排程更新邏輯]
    async scheduled(event, env, ctx) {
        const m = new Date(event.scheduledTime).getMinutes();
        // 每 10 分鐘更新一次署屬氣象站
        if (m % 10 === 0) ctx.waitUntil(runSync(env, 'manned')); 
        // 每小時 00 分更新所有主要資料
        if (m === 0) {
            ctx.waitUntil(Promise.allSettled([
                runSync(env, 'auto'),
                runSync(env, 'forecast'),
                runSync(env, 'alert'),
                runSync(env, 'chart')
            ]));
        }
    }
};

// === 🚀 核心：故障判定解析器 ===
const parseValue = (v) => {
    if (v === 'X' || v === -99 || v === '-99' || v === -999 || v === '-99.0' || v === null || v === undefined) return { val: null, str: '故障' };
    if (v === 'T') return { val: 0, str: '雨跡' };
    const n = parseFloat(v);
    return (isNaN(n) || n <= -50) ? { val: null, str: '故障' } : { val: n, str: n.toString() };
};

// === 🚀 核心：同步引擎 ===
async function runSync(env, target) {
    if (!env.CWA_API_KEY) return;
    
    // 1. 同步觀測站 (署屬 manned / 無人 auto)
    if (target === 'manned' || target === 'auto') {
        const id = (target === 'manned') ? 'O-A0003-001' : 'O-A0001-001';
        const freshData = await updateCacheItem(env, id);
        await updateHistoryToD1(env, id);

        let existing = JSON.parse(await env.WEATHER_KV.get("CURRENT_NOW") || "[]");
        const newIds = new Set(freshData.map(s => s.stationId));
        // 合併新舊資料並寫入 KV
        const combined = existing.filter(s => !newIds.has(s.stationId)).concat(freshData || []);
        await env.WEATHER_KV.put("CURRENT_NOW", JSON.stringify(combined));
    }

    // 2. 同步預報
    if (target === 'forecast') await updateCacheItem(env, 'F-C0032-001');

    // 3. 災難與警報同步 (包含海嘯、地震詳情、五合一特報)
    if (target === 'alert' || target === 'auto' || target === 'earthquake') {
        const alerts = [];
        
        // A. 抓取海嘯警報 (E-A0014-001)
        const tsu = await updateCacheItem(env, 'E-A0014-001');
        if (tsu && tsu.msg && (Date.now() - new Date(tsu.obsTime).getTime() < 86400000)) {
            alerts.push(`🌊【海嘯警報】${tsu.msg}`);
        }

        // B. 抓取地震報告 (E-A0015/16)
        const eq = await updateCacheItem(env, 'E-A0015-001'); await updateCacheItem(env, 'E-A0016-001');
        if (eq && eq.msg && (Date.now() - new Date(eq.obsTime).getTime() < 86400000)) {
            alerts.push(`🚨【最新地震報告】${eq.msg} (點此查看詳圖)`);
        }

        // C. 抓取氣象警報 (W-C0033 全系列 + W-C0034 颱風)
        const alertIDs = ['W-C0033-001', 'W-C0033-002', 'W-C0033-004', 'W-C0033-005', 'W-C0034-001'];
        for (let id of alertIDs) {
            try {
                const r = await fetch(`${CWA_API_URL}/${id}?Authorization=${env.CWA_API_KEY}&format=JSON`);
                if (!r.ok) continue;
                const d = await r.json();
                if (d.records?.record) {
                    const recs = Array.isArray(d.records.record) ? d.records.record : [d.records.record];
                    const fmt = (t) => { if(!t) return ""; const p=t.split(' '); const dp=p[0].split('-'); return `${dp[1]}/${dp[2]} ${p[1].substring(0,5)}`; };
                    recs.forEach(rec => {
                        const info = rec.datasetInfo;
                        const content = rec.contents?.content?.contentText || rec.contents?.content || rec.hazardConditions?.hazards?.hazard?.info?.description || "";
                        if (!info || !content) return;
                        const issue = fmt(info.issueTime); const end = info.validTime?.endTime ? fmt(info.validTime.endTime) : "";
                        const msg = String(content).replace(/一、概述：/g,"").replace(/[\r\n]+/g," ").split("二、")[0].trim();
                        alerts.push(`【${info.datasetDescription} ${issue}】${msg}${end ? `（～ ${end}）` : ""}`);
                    });
                }
            } catch (e) {}
        }
        
        const finalAlerts = Array.from(new Set(alerts));
        const alertPayload = {
            count: finalAlerts.length,
            alerts: finalAlerts,
            feed_string: finalAlerts.length > 0 ? finalAlerts.join("   📢   ") : "目前全臺無發布氣象警特報"
        };
        await env.WEATHER_KV.put("CURRENT_ALERT", JSON.stringify(alertPayload));
    }

    // 4. 圖資同步 (圖資獵犬)
    if (target === 'chart') {
        const charts = ['O-A0058-001', 'O-A0058-003', 'O-A0084-001', 'O-A0084-002', 'O-A0084-003', 'O-A0059-001', 'O-A0038-001', 'O-A0040-001', 'F-C0035-003', 'F-C0035-015', 'F-C0035-017', 'F-C0035-023', 'F-C0035-024'];
        for (let c of charts) await updateCacheItem(env, c);
    }
}

// === 🚀 核心資料處理與清洗工具 ===
async function updateCacheItem(env, id) {
    try {
        const isRest = ['O-A0001', 'O-A0003', 'F-C0032', 'W-C0033', 'W-C0034', 'E-A0014', 'E-A0015', 'E-A0016'].some(p => id.startsWith(p));
        const url = isRest ? `${CWA_API_URL}/${id}?format=JSON` : `https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/${id}?downloadType=WEB&format=JSON`;
        const r = await fetch(`${url}&Authorization=${env.CWA_API_KEY}`);
        if (!r.ok) return null;
        const json = await r.json();

        // A. 海嘯處理 (E-A0014)
        if (id.startsWith('E-A0014')) {
            const report = json.records?.Tsunami?.[0];
            if(!report) return null;
            const tsunamiInfo = report.TsunamiInfo || {};
            const res = {
                msg: report.ReportContent || tsunamiInfo.ReportContent || "",
                obsTime: report.IssueTime || report.EarthquakeInfo?.OriginTime || tsunamiInfo.OriginTime || null,
                img: report.ReportImageURI || report.Web || ""
            };
            await env.WEATHER_KV.put("TSUNAMI_REPORT", JSON.stringify(res));
            return res;
        }

        // B. 地震處理 (E-A0015 / E-A0016)
        if (id.startsWith('E-A0015') || id.startsWith('E-A0016')) {
            if (id === 'E-A0015-001') {
                const report = json.records?.Earthquake?.[0] || json.records?.earthquake?.[0];
                if(report) {
                    const info = report.EarthquakeInfo || {};
                    const epicenter = info.Epicenter || {};
                    const magnitudeInfo = info.EarthquakeMagnitude || {};
                    const magnitudeValue = magnitudeInfo.MagnitudeValue ?? "--";
                    const location = epicenter.Location || "位置未知";
                    const res = { 
                        msg: `規模 ${magnitudeValue}，位於 ${location}`,
                        img: report.ReportImageURI || report.Web || "", 
                        obsTime: info.OriginTime || report.ReportTime || null,
                        depth: info.FocalDepth ?? null,
                        magnitude: magnitudeValue,
                        location
                    };
                    await env.WEATHER_KV.put("EQ_REPORT", JSON.stringify(res));
                }
            }
            await env.WEATHER_KV.put(`CHART_${id}`, JSON.stringify(json));
            return json;
        }

        // C. 預報處理 (碎片化 KV 儲存)
        if (id === 'F-C0032-001') {
            const locs = json.records?.location || [];
            for (let l of locs) {
                const g = (n) => l.weatherElement?.find(e => e.elementName === n)?.time[0]?.parameter?.parameterName || "--";
                const slim = { county: l.locationName, wx: g('Wx'), minT: g('MinT'), maxT: g('MaxT'), pop: g('PoP') };
                await env.WEATHER_KV.put(`FC_${l.locationName.replace('台', '臺')}`, JSON.stringify(slim));
            }
            const overview = { records: { location: locs.map(l => ({ locationName: l.locationName, weatherElement: l.weatherElement.map(e => ({ elementName: e.elementName, time: [e.time[0]] })) })) } };
            await env.WEATHER_KV.put(id, JSON.stringify(overview));
            return overview;
        }

        // D. 測站清洗 (O-A0001/3)
        if (id.startsWith('O-A0001') || id.startsWith('O-A0003')) {
            const st = json.records?.Station || json.records?.station || [];
            return st.map(s => {
                const we = s.WeatherElement; const getRaw = (key) => Array.isArray(we) ? we.find(e => e.ElementName === key)?.ElementValue : we?.[key];
                return {
                    stationId: s.StationId, stationName: s.StationName, county: s.GeoInfo?.CountyName || s.CountyName,
                    lat: s.GeoInfo?.Coordinates?.find(c => c.CoordinateName === 'WGS84')?.StationLatitude || s.StationLatitude,
                    lon: s.GeoInfo?.Coordinates?.find(c => c.CoordinateName === 'WGS84')?.StationLongitude || s.StationLongitude,
                    temp: parseValue(getRaw('AirTemperature') || getRaw('TEMP')),
                    rain: parseValue(s.RainfallElement?.Now?.Precipitation || getRaw('Precipitation') || '0'),
                    wind: parseValue(getRaw('WindSpeed') || getRaw('WDSD') || '0'),
                    hum: parseValue(getRaw('RelativeHumidity') || getRaw('HUMD')),
                    weather: getRaw('Weather') || '', obsTime: s.ObsTime?.DateTime || s.DateTime
                };
            });
        }
        
        // E. 圖資搜圖獵犬 (遞迴搜尋任何網址)
        const findImg = (obj) => {
            if(!obj || typeof obj !== 'object') return null;
            if (obj.web && typeof obj.web === 'string' && obj.web.startsWith('http')) return obj.web;
            if (obj.uri || obj.ProductURL) return obj.uri || obj.ProductURL;
            if (Array.isArray(obj)) { for (let i of obj) { const res = findImg(i); if (res) return res; } }
            for (let k in obj) { if (typeof obj[k] === 'string' && obj[k].startsWith('http')) return obj[k]; if (typeof obj[k] === 'object'){ const res = findImg(obj[k]); if(res) return res; } }
            return null;
        };
        const imgUrl = findImg(json); const time = json.cwaopendata?.dataset?.obsTime || new Date().toISOString();
        const final = id.startsWith('W-C') ? json : { cwaopendata: { dataset: { resource: { uri: imgUrl || "" }, obsTime: time } } };
        await env.WEATHER_KV.put(`CHART_${id}`, JSON.stringify(final));
        return final;
    } catch(e) { return null; }
}

// === 🚀 歷史資料寫入 D1 ===
async function updateHistoryToD1(env, id) {
    const r = await fetch(`${CWA_API_URL}/${id}?Authorization=${env.CWA_API_KEY}&format=JSON`);
    if(!r.ok) return;
    const json = await r.json(); const st = json.records?.Station || json.records?.station || [];
    const now = Date.now();
    const stmt = env.DB.prepare(`INSERT OR IGNORE INTO ${TABLE_HISTORY} (station_id, station_name, timestamp, temperature, wind_speed, rain, humidity) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (let i = 0; i < st.length; i += 50) {
        const batch = st.slice(i, i+50).map(s => {
            const we = s.WeatherElement; const getRaw = (key) => Array.isArray(we) ? we.find(e => e.ElementName === key)?.ElementValue : we?.[key];
            const g = (k) => { const v = parseFloat(getRaw(k)); return (isNaN(v) || v < -50) ? null : v; };
            return stmt.bind(s.StationId, s.StationName, now, g('AirTemperature')||g('TEMP'), g('WindSpeed')||g('WDSD'), g('Precipitation')||g('NOW'), g('RelativeHumidity')||g('HUMD'));
        });
        await env.DB.batch(batch);
    }
    await env.DB.prepare(`DELETE FROM ${TABLE_HISTORY} WHERE timestamp < ?`).bind(now - 93600000).run();
}