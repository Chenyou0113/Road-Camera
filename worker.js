/**
 * CWA Weather Monitor Worker (V18.70 - Earthquake Details Pro)
 */

const CWA_API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore";
const TABLE_HISTORY = "weather_history";

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
        try {
            if (url.pathname.startsWith("/api/weather/now")) return new Response(await env.WEATHER_KV.get("CURRENT_NOW") || "[]", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            if (url.pathname.startsWith("/api/weather/forecast")) return new Response(await env.WEATHER_KV.get(`FC_${(url.searchParams.get("county") || "臺北市").replace('台', '臺')}`) || "{}", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            if (url.pathname.startsWith("/api/weather/alert")) return new Response(await env.WEATHER_KV.get("CURRENT_ALERT") || '{"count":0,"alerts":[]}', { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            
            // 🚀 地震報告：回傳包含完整原始資料的物件
            if (url.pathname.startsWith("/api/weather/earthquake")) return new Response(await env.WEATHER_KV.get("EQ_REPORT") || "{}", { headers: { ...corsHeaders, "Content-Type": "application/json" } });

            if (url.pathname.startsWith("/api/weather/history")) {
                const sid = url.searchParams.get("station_id");
                const { results } = await env.DB.prepare(`SELECT timestamp, temperature, rain FROM ${TABLE_HISTORY} WHERE station_id = ? AND timestamp > ? ORDER BY timestamp ASC`).bind(sid, Date.now()-93600000).all();
                return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            if (url.pathname.startsWith("/api/sync")) {
                ctx.waitUntil(runSync(env, url.searchParams.get("target")));
                return new Response(JSON.stringify({ status: "sync_triggered" }), { headers: corsHeaders });
            }
            let dataset = (url.searchParams.get("dataset") || "").trim();
            if (dataset) {
                if (dataset.startsWith('A-B')) {
                    const r = await fetch(`${CWA_API_URL}/${dataset}?Authorization=${env.CWA_API_KEY}&CountyName=${encodeURIComponent(url.searchParams.get('CountyName'))}&Date=${url.searchParams.get('Date')}&format=JSON`);
                    return new Response(JSON.stringify(await r.json()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
                const kvChart = await env.WEATHER_KV.get(`CHART_${dataset}`);
                if (kvChart) return new Response(kvChart, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                return new Response(JSON.stringify(await updateCacheItem(env, dataset) || {}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify({ status: "running", version: "V18.70" }), { headers: corsHeaders });
        } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders }); }
    },
    async scheduled(event, env, ctx) { ctx.waitUntil(runSync(env, 'auto')); }
};

const parseValue = (v) => { if (v==='X'||v===-99||v==='-99.0'||v===null||v===undefined) return {val:null,str:'故障'}; const n=parseFloat(v); return (isNaN(n)||n<=-50)?{val:null,str:'故障'}:{val:n,str:n.toString()}; };

async function runSync(env, target) {
    if (!env.CWA_API_KEY) return;
    if (target === 'auto' || target === 'manned') {
        const f1 = await updateCacheItem(env, 'O-A0001-001'); const f3 = await updateCacheItem(env, 'O-A0003-001');
        let existing = JSON.parse(await env.WEATHER_KV.get("CURRENT_NOW") || "[]");
        const newIds = new Set((f1||[]).concat(f3||[]).map(s => s.stationId));
        await env.WEATHER_KV.put("CURRENT_NOW", JSON.stringify(existing.filter(s => !newIds.has(s.stationId)).concat((f1||[]).concat(f3||[]))));
        await updateHistoryToD1(env, (target === 'manned') ? 'O-A0003-001' : 'O-A0001-001');
    }
    if (target === 'forecast' || target === 'auto') await updateCacheItem(env, 'F-C0032-001');
    if (target === 'alert' || target === 'auto' || target === 'earthquake') {
        const eq = await updateCacheItem(env, 'E-A0015-001'); await updateCacheItem(env, 'E-A0016-001');
        const alerts = [];
        // 🚀 修改跑馬燈內的地震文字，加上引導語
        if (eq && eq.msg && (Date.now() - new Date(eq.obsTime).getTime() < 86400000)) {
            alerts.push(`🚨【最新地震報告】${eq.msg} (點此查看詳圖)`);
        }
        const alertIDs = ['W-C0033-001', 'W-C0033-002', 'W-C0033-004', 'W-C0033-005', 'W-C0034-001'];
        for (let id of alertIDs) {
            const r = await fetch(`${CWA_API_URL}/${id}?Authorization=${env.CWA_API_KEY}&format=JSON`);
            if (!r.ok) continue;
            const d = await r.json();
            if (d.records?.record) {
                const recs = Array.isArray(d.records.record) ? d.records.record : [d.records.record];
                const fmt = (t) => { if(!t) return ""; const p=t.split(' '); const dp=p[0].split('-'); return `${dp[1]}/${dp[2]} ${p[1].substring(0,5)}`; };
                recs.forEach(rec => {
                    const info = rec.datasetInfo; const content = rec.contents?.content?.contentText || rec.contents?.content || ""; if (!info || !content) return;
                    alerts.push(`【${info.datasetDescription} ${fmt(info.issueTime)}】${String(content).replace(/一、概述：/g,"").replace(/[\r\n]+/g," ").split("二、")[0].trim()}${info.validTime?.endTime ? `（～ ${fmt(info.validTime.endTime)}）` : ""}`);
                });
            }
        }
        const finalAlerts = Array.from(new Set(alerts));
        await env.WEATHER_KV.put("CURRENT_ALERT", JSON.stringify({ count: finalAlerts.length, alerts: finalAlerts, feed_string: finalAlerts.length > 0 ? finalAlerts.join("   📢   ") : "目前全臺無發布氣象警特報" }));
    }
}

async function updateCacheItem(env, id) {
    try {
        const isRest = ['O-A0001', 'O-A0003', 'F-C0032', 'W-C0033', 'W-C0034', 'E-A0015', 'E-A0016'].some(p => id.startsWith(p));
        const url = isRest ? `${CWA_API_URL}/${id}?format=JSON` : `https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/${id}?downloadType=WEB&format=JSON`;
        const r = await fetch(`${url}&Authorization=${env.CWA_API_KEY}`);
        if (!r.ok) return null;
        const json = await r.json();

        if (id.startsWith('E-A0015')) {
            const report = json.records?.Earthquake?.[0];
            if(report) {
                const info = report.EarthquakeInfo;
                // 🚀 存入更豐富的資訊
                const res = { 
                    msg: `發震：${info.OriginTime.substring(11,16)}，規模 ${info.EarthquakeMagnitude.MagnitudeValue}，位於 ${info.Epicenter.Location}`,
                    img: report.ReportImageURI, 
                    obsTime: info.OriginTime,
                    depth: info.FocalDepth,
                    magnitude: info.EarthquakeMagnitude.MagnitudeValue,
                    location: info.Epicenter.Location,
                    raw: json // 完整原始資料
                };
                await env.WEATHER_KV.put("EQ_REPORT", JSON.stringify(res));
                return res;
            }
        }

        if (id === 'F-C0032-001') {
            const locs = json.records?.location || [];
            for (let l of locs) {
                const g = (n) => l.weatherElement?.find(e => e.elementName === n)?.time[0]?.parameter?.parameterName;
                await env.WEATHER_KV.put(`FC_${l.locationName.replace('台', '臺')}`, JSON.stringify({ county: l.locationName, wx: g('Wx'), minT: g('MinT'), maxT: g('MaxT'), pop: g('PoP') }));
            }
            await env.WEATHER_KV.put(id, JSON.stringify({ records: { location: locs.map(l => ({ locationName: l.locationName, weatherElement: l.weatherElement.map(e => ({ elementName: e.elementName, time: [e.time[0]] })) })) } }));
            return json;
        }

        if (id.startsWith('O-A0001') || id.startsWith('O-A0003')) {
            const st = json.records?.Station || json.records?.station || [];
            return st.map(s => {
                const we = s.WeatherElement; const getRaw = (key) => Array.isArray(we) ? we.find(e => e.ElementName === key)?.ElementValue : we?.[key];
                return { stationId: s.StationId, stationName: s.StationName, county: s.GeoInfo?.CountyName || s.CountyName, temp: parseValue(getRaw('AirTemperature') || getRaw('TEMP')), weather: getRaw('Weather') || '', obsTime: s.ObsTime?.DateTime || s.DateTime };
            });
        }
        
        const findImg = (obj) => { if(!obj||typeof obj!=='object') return null; if (obj.web || obj.uri || obj.ProductURL) return obj.web || obj.uri || obj.ProductURL; if (Array.isArray(obj)) { for (let i of obj) { let r = findImg(i); if(r) return r; } } for (let k in obj) { if (typeof obj[k] === 'string' && obj[k].startsWith('http')) return obj[k]; if (typeof obj[k] === 'object'){ let r = findImg(obj[k]); if(r) return r; } } return null; };
        const img = findImg(json); const final = id.startsWith('W-C') ? json : { cwaopendata: { dataset: { resource: { uri: img || "" }, obsTime: json.cwaopendata?.dataset?.obsTime || new Date().toISOString() } } };
        await env.WEATHER_KV.put(`CHART_${id}`, JSON.stringify(final));
        return final;
    } catch(e) { return null; }
}

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
}
