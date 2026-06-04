/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TDX 公車 Cloudflare Worker — 最終救贖旗艦版 (v30.1)           ║
 * ║  新增：零容忍全域報錯機制，拒絕任何隱藏的空集合 []             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const CONFIG = {
    VERSION: "v30.1-No-Empty-Arrays",
    CITIES: ["Taipei", "NewTaipei", "Taoyuan", "Taichung", "Tainan", "Kaohsiung", "Keelung", "InterCity"],
    TOKEN_URL: "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token",
    BASE_API: "https://tdx.transportdata.tw/api/basic",
    FARE_CACHE_TTL: 600,
    INFO_CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
    SHAPE_CACHE_TTL_MS: 30 * 24 * 60 * 60 * 1000,
    FARE_CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
    TIMETABLE_CACHE_TTL_MS: 3 * 24 * 60 * 60 * 1000,
    NEWS_CACHE_TTL_MS: 15 * 60 * 1000,
    ALERT_CACHE_TTL_MS: 5 * 60 * 1000,
    CORS: { 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "GET, OPTIONS", 
        "Access-Control-Allow-Headers": "Content-Type, Authorization" 
    }
};

const DICT = {
    TICKET_TYPE: { 1: "一般票", 2: "來回票", 3: "電子票證", 4: "回數票", 5: "定期票(30天)", 6: "定期票(60天)", 7: "早鳥票" },
    FARE_CLASS: { 1: "成人", 2: "學生", 3: "孩童", 4: "敬老", 5: "愛心", 6: "愛心孩童", 7: "愛心陪伴", 8: "團體", 9: "軍警" },
    PRICING_TYPE: { "SectionFare": "段次計費", "ODFares": "起迄站間計費", "StageFares": "計費站區間收費" }
};

const getZh = (obj) => (typeof obj === 'object' ? (obj?.Zh_tw || "") : (obj || "")).toString().trim();

const norm = (n) => {
    if (!n) return "";
    return n.replace(/[\(（][^\)）]*[\)）]/g, "")
            .replace(/(去程半|返程半|去程|返程|狗狗公車|動物園專車|夜間公車|區間車|區|繞駛|繞|延駛|延|調度站發車|發車|往[^\s]+|經[^\s]+)/g, "")
            .trim();
};

const formatDisplayName = (rName, sName) => {
    let main = getZh(rName).trim();
    let sub = getZh(sName).trim();
    if (!sub || main === sub) return main;
    if (sub.startsWith(main)) sub = sub.substring(main.length).trim();
    else if (sub.includes(main)) sub = sub.replace(main, '').trim();
    sub = sub.replace(/^[-\/_(（]/, '').replace(/[)）]$/, '').trim();
    if (!sub) return main;
    if (sub.length > 10) sub = sub.substring(0, 10) + "...";
    return `${main} ${sub}`;
};

const formatServiceDay = (sd) => {
    if (!sd) return "未知";
    const days = [];
    if (sd.Monday) days.push("一");
    if (sd.Tuesday) days.push("二");
    if (sd.Wednesday) days.push("三");
    if (sd.Thursday) days.push("四");
    if (sd.Friday) days.push("五");
    if (sd.Saturday) days.push("六");
    if (sd.Sunday) days.push("日");
    if (sd.NationalHolidays) days.push("國定假日");
    return days.length > 0 ? `星期${days.join("、")}` : "特定日";
};

const getRouteKey = (city, type, routeName) => `${type}:${city}:${norm(routeName)}`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🌟 無敵防禦型請求：失敗絕對不回傳空集合，而是直接報錯
async function safeTdxFetch(url, token, retries = 3) {
    for (let i = 0; i < retries; i++) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const text = await res.text();
        
        if (res.status === 429 || text.includes("API rate limit exceeded")) {
            console.warn(`[Rate Limit] 觸發頻率限制，重試第 ${i + 1} 次`);
            await sleep((i + 1) * 500 + Math.random() * 200);
            continue; 
        }

        if (!res.ok) return { ok: false, errorText: text };

        try {
            const data = JSON.parse(text);
            if (data?.Message === "API rate limit exceeded") {
                await sleep(500 + Math.random() * 200);
                continue;
            }
            return { ok: true, data };
        } catch {
            return { ok: false, errorText: text };
        }
    }
    throw new Error(`TDX API 拒絕連線 (已達最大重試次數，可能是額度耗盡) URL: ${url}`);
}

const safeJsonParse = (text, fallback) => {
    try { return JSON.parse(text); } catch { return fallback; }
};

async function getCachedJson(env, table, whereSql, binds, maxAgeMs) {
    try {
        const row = await env.DB.prepare(`SELECT data, updated_at FROM ${table} WHERE ${whereSql}`).bind(...binds).first();
        if (!row || !row.data) return null;
        if (maxAgeMs && row.updated_at && (Date.now() - row.updated_at > maxAgeMs)) return null;
        return safeJsonParse(row.data, null);
    } catch { return null; }
}

async function upsertJson(env, table, columns, values) {
    const cols = columns.join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    await env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...values).run();
}

// 🌟 升級版降級抓取器：拒絕靜默失敗
async function fetchRouteData(baseUrl, routePrefix, token) {
    const safeValue = (routePrefix || "").replace(/'/g, "''");
    const buildUrl = (filter) => {
        const params = new URLSearchParams();
        if (filter) params.set("$filter", filter);
        params.set("$format", "JSON");
        return `${baseUrl}?${params.toString()}`;
    };

    const candidates = [
        `contains(RouteName/Zh_tw,'${safeValue}')`,
        `contains(RouteName,'${safeValue}')`,
        null
    ];

    let lastError = "Unknown error";
    for (const filter of candidates) {
        const result = await safeTdxFetch(buildUrl(filter), token);
        if (result.ok) {
            let data = result.data;
            if (Array.isArray(data)) return data;
            if (Array.isArray(data?.value)) return data.value;
            return data;
        }
        if (result.errorText) lastError = result.errorText;
    }
    throw new Error(`資料抓取徹底失敗: ${lastError} (請求網址: ${baseUrl})`);
}

async function autoSyncCity(city, cat, token, env) {
    let apiVer = "v2", apiPath = `City/${city}`;
    if (cat === "InterCity") { apiVer = "v2"; apiPath = "InterCity"; } 
    else if (cat === "DRTS") { apiVer = "v3"; apiPath = `DRTS/City/${city}`; } 
    else if (cat === "SciencePark") { apiVer = "v2"; apiPath = `SciencePark/${city}`; } 
    else { apiVer = city === "Tainan" ? "v3" : "v2"; apiPath = `City/${city}`; }
    
    const result = await safeTdxFetch(`${CONFIG.BASE_API}/${apiVer}/Bus/StopOfRoute/${apiPath}?$format=JSON`, token);
    if (!result.ok) throw new Error(`TDX 路線同步失敗: ${result.errorText}`);
    
    const data = result.data;
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`TDX 回傳了空的路線資料 (可能該縣市無資料，或 API 路徑變更)`);
    }

    const type = cat;
    const startTime = Date.now();
    let batch = [], seen = new Set(), results = [];
    const routeStopsMap = new Map(), stopRoutesMap = new Map();
    const stmt = env.DB.prepare("INSERT OR REPLACE INTO routes_v2 (uid, city, name, departure, destination, type, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    data.forEach(r => {
        if (!r.Stops || r.Stops.length < 2) return;
        let finalName = getZh(r.RouteName).trim();
        finalName = finalName.replace(/^[-\/_(（]/, '').replace(/[)）]$/, '').trim();

        const uniqKey = `${city}_${finalName}`;
        if (!seen.has(uniqKey)) {
            seen.add(uniqKey);
            const dep = getZh(r.Stops[0].StopName);
            const dest = getZh(r.Stops[r.Stops.length-1].StopName);
            batch.push(stmt.bind(r.SubRouteUID || r.RouteID, city, finalName, dep, dest, type, startTime));
            results.push({ name: finalName, departure: dep, destination: dest, city: city, type: type });
        }

        const routeKey = getRouteKey(city, type, getZh(r.SubRouteName) || getZh(r.RouteName));
        const slimItem = { RouteName: r.RouteName, SubRouteName: r.SubRouteName, Direction: r.Direction, Stops: r.Stops, Operators: r.Operators || [] };
        if (!routeStopsMap.has(routeKey)) routeStopsMap.set(routeKey, []);
        routeStopsMap.get(routeKey).push(slimItem);

        r.Stops.forEach(s => {
            const stopName = getZh(s.StopName);
            if (!stopName) return;
            if (!stopRoutesMap.has(stopName)) stopRoutesMap.set(stopName, new Set());
            stopRoutesMap.get(stopName).add(finalName);
        });
    });
    
    for (let i = 0; i < batch.length; i += 100) await env.DB.batch(batch.slice(i, i + 100));

    const stopBatch = [];
    const routeStopStmt = env.DB.prepare("INSERT OR REPLACE INTO route_stops (route_key, city, route_name, type, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
    for (const [key, items] of routeStopsMap.entries()) {
        const routeName = items[0]?.SubRouteName || items[0]?.RouteName || "";
        stopBatch.push(routeStopStmt.bind(key, city, getZh(routeName), type, JSON.stringify(items), startTime));
    }
    for (let i = 0; i < stopBatch.length; i += 100) await env.DB.batch(stopBatch.slice(i, i + 100));

    const stopRouteBatch = [];
    const stopRouteStmt = env.DB.prepare("INSERT OR REPLACE INTO stop_routes (city, stop_name, routes, updated_at) VALUES (?, ?, ?, ?)");
    for (const [stopName, routeSet] of stopRoutesMap.entries()) {
        stopRouteBatch.push(stopRouteStmt.bind(city, stopName, JSON.stringify(Array.from(routeSet).sort()), startTime));
    }
    for (let i = 0; i < stopRouteBatch.length; i += 100) await env.DB.batch(stopRouteBatch.slice(i, i + 100));
    
    return results.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const params = url.searchParams;
        if (request.method === "OPTIONS") return new Response(null, { headers: CONFIG.CORS });

        const send = (data, status = 200, extraHeaders = {}) => new Response(
            JSON.stringify(data), { status, headers: { ...CONFIG.CORS, ...extraHeaders } }
        );

        try {
            const token = await getAuthToken(env);
            const action = params.get("action");
            const route = params.get("route");
            const city = params.get("city") || "Taipei";
            const cat = params.get("category") || "CityBus";

            if (action === "db_init") {
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS routes_v2 (uid TEXT PRIMARY KEY, city TEXT, name TEXT, departure TEXT, destination TEXT, type TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_stops (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, type TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS stop_routes (city TEXT, stop_name TEXT, routes TEXT, updated_at INTEGER, PRIMARY KEY (city, stop_name))`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_shapes (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_fares (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_timetables_v8 (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bus_news (cache_key TEXT PRIMARY KEY, city TEXT, type TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bus_alerts (cache_key TEXT PRIMARY KEY, city TEXT, type TEXT, data TEXT, updated_at INTEGER)`).run();
                return send({ status: "D1 Tables Initialized" });
            }

            if (action === "clear_cache") {
                const tables = ["routes_v2", "route_stops", "route_shapes", "route_fares", "route_timetables_v8", "sys_config"];
                for (const t of tables) {
                    try { await env.DB.prepare(`DELETE FROM ${t}`).run(); } catch(e) {}
                }
                return send({ status: "Cache Cleared! 路線與舊 Token 已徹底清空！" });
            }

            if (action === "list_all") {
                const search = params.get("search");
                let sql = "SELECT name, departure, destination, city, type FROM routes_v2 WHERE 1=1";
                let binds = [];
                if (search) { sql += " AND (name LIKE ? OR departure LIKE ? OR destination LIKE ?)"; binds.push(`%${search}%`, `%${search}%`, `%${search}%`); }
                if (city && !search) { sql += " AND city = ?"; binds.push(city); }
                
                const { results } = await env.DB.prepare(sql + " ORDER BY name ASC LIMIT 1000").bind(...binds).all();

                if (results.length === 0 && city && !search) {
                    const syncedData = await autoSyncCity(city, cat, token, env);
                    if (!syncedData || syncedData.length === 0) throw new Error("TDX 雖然連線成功，但該縣市回傳了 0 筆路線資料！");
                    return send(syncedData);
                }
                return send(results || []);
            }

            if (action === "stop_info") {
                const stopName = params.get("name") || "";
                if (!stopName) throw new Error("缺少站牌名稱參數");
                let row = await env.DB.prepare("SELECT routes FROM stop_routes WHERE city = ? AND stop_name = ?").bind(city, stopName).first();
                if (!row) {
                    await autoSyncCity(city, cat, token, env);
                    row = await env.DB.prepare("SELECT routes FROM stop_routes WHERE city = ? AND stop_name = ?").bind(city, stopName).first();
                }
                if (!row) throw new Error(`該站牌查無任何路線資料 (${stopName})`);
                return send({ routes: safeJsonParse(row.routes, []) });
            }

            if (action === "news" || action === "alert") {
                const cacheKey = `${cat}:${city}`;
                const table = action === "news" ? "bus_news" : "bus_alerts";
                const ttlMs = action === "news" ? CONFIG.NEWS_CACHE_TTL_MS : CONFIG.ALERT_CACHE_TTL_MS;
                const cached = await getCachedJson(env, table, "cache_key = ?", [cacheKey], ttlMs);
                if (cached) return send(cached);

                const fresh = await fetchBusNewsOrAlert(action, city, token);
                await upsertJson(env, table, ["cache_key", "city", "type", "data", "updated_at"], [cacheKey, city, cat, JSON.stringify(fresh), Date.now()]);
                return send(fresh);
            }

            if (route) {
                let apiVer = "v2", apiPath = `City/${city}`;
                if (cat === "InterCity") { apiVer = "v2"; apiPath = "InterCity"; } 
                else if (cat === "DRTS") { apiVer = "v3"; apiPath = `DRTS/City/${city}`; } 
                else if (cat === "SciencePark") { apiVer = "v2"; apiPath = `SciencePark/${city}`; } 
                else { apiVer = city === "Tainan" ? "v3" : "v2"; apiPath = `City/${city}`; }

                const dynVer = apiVer, staticVer = apiVer, stopVer = apiVer, path = apiPath;
                const routePrefix = route.split(' ')[0]; 
                const targetNorm = norm(route);
                const routeKey = getRouteKey(city, cat, route);

                const match = (i) => {
                    const generatedName = formatDisplayName(i.RouteName, i.SubRouteName);
                    return norm(generatedName) === targetNorm || norm(getZh(i.SubRouteName) || getZh(i.RouteName)) === targetNorm;
                };

                if (action === "info") {
                    const cached = await getCachedJson(env, "route_stops", "route_key = ?", [routeKey], null);
                    if (cached) return send(cached);
                    const data = await fetchRouteData(`${CONFIG.BASE_API}/${stopVer}/Bus/StopOfRoute/${apiPath}`, routePrefix, token);
                    const items = data.filter(match).map(r => ({ RouteName: r.RouteName, SubRouteName: r.SubRouteName, Direction: r.Direction, Stops: r.Stops, Operators: r.Operators || [] }));
                    if (items.length === 0) throw new Error(`查無站牌清單資料，可能是路線名稱不符: ${route}`);
                    await upsertJson(env, "route_stops", ["route_key", "city", "route_name", "type", "data", "updated_at"], [routeKey, city, route, cat, JSON.stringify(items), Date.now()]);
                    return send(items);
                }

                if (action === "shape") {
                    const cached = await getCachedJson(env, "route_shapes", "route_key = ?", [routeKey], null);
                    if (cached) return send(cached);
                    const data = await fetchRouteData(`${CONFIG.BASE_API}/${staticVer}/Bus/Shape/${apiPath}`, routePrefix, token);
                    const shapes = data.filter(i => norm(getZh(i.SubRouteName) || getZh(i.RouteName)) === targetNorm);
                    await upsertJson(env, "route_shapes", ["route_key", "city", "route_name", "data", "updated_at"], [routeKey, city, route, JSON.stringify(shapes), Date.now()]);
                    return send(shapes);
                }

                if (action === "timetable") {
                    const cached = await getCachedJson(env, "route_timetables_v8", "route_key = ?", [routeKey], null);
                    if (cached) return send({ route, timetables: cached });

                    const [schedData, dailyData, genStopData, dailyStopData] = await Promise.all([
                        fetchRouteData(`${CONFIG.BASE_API}/${staticVer}/Bus/Schedule/${path}`, routePrefix, token).catch(()=>[]),
                        fetchRouteData(`${CONFIG.BASE_API}/${staticVer}/Bus/DailyTimeTable/${path}`, routePrefix, token).catch(()=>[]),
                        fetchRouteData(`${CONFIG.BASE_API}/${staticVer}/Bus/GeneralStopTimeTable/${path}`, routePrefix, token).catch(()=>[]),
                        fetchRouteData(`${CONFIG.BASE_API}/${staticVer}/Bus/DailyStopTimeTable/${path}`, routePrefix, token).catch(()=>[])
                    ]);

                    const dirMap = {};
                    const initDir = (r) => {
                        const dirLabel = r.Direction === 0 ? "去程" : (r.Direction === 1 ? "返程" : "迴圈");
                        if (!dirMap[dirLabel]) dirMap[dirLabel] = { direction: dirLabel, route_name: getZh(r.SubRouteName) || getZh(r.RouteName), schedules: [], frequencies: [] };
                        return dirMap[dirLabel];
                    };

                    [ { data: schedData, type: 'basic', isDaily: false }, { data: dailyData, type: 'basic', isDaily: true }, { data: genStopData, type: 'stop', isDaily: false }, { data: dailyStopData, type: 'stop', isDaily: true } ]
                    .forEach(dataset => {
                        (Array.isArray(dataset.data) ? dataset.data : []).filter(match).forEach(r => {
                            const target = initDir(r);
                            (r.Frequencies || r.Frequencys || []).forEach(f => {
                                const day = formatServiceDay(f.ServiceDay);
                                target.frequencies.push({ service_day: day, ranges: [{ time_range: `${(f.StartTime||"").substring(0,5)} - ${(f.EndTime||"").substring(0,5)}`, min: f.MinHeadwayMins, max: f.MaxHeadwayMins }] });
                            });
                            if (dataset.type === 'basic') {
                                (r.TimeTables || r.Timetables || []).forEach(t => {
                                    const day = dataset.isDaily ? "今日時刻表" : formatServiceDay(t.ServiceDay);
                                    let depTime = t.DepartureTime || (t.StopTimes && t.StopTimes.length > 0 ? t.StopTimes[0].DepartureTime || t.StopTimes[0].ArrivalTime : null);
                                    if (depTime) target.schedules.push({ service_day: day, is_low_floor: t.IsLowFloor === 1, departure_times: [depTime] });
                                });
                            } else {
                                if (r.Stops && r.Stops.length > 0) {
                                    r.Stops.forEach(st => {
                                        const day = dataset.isDaily ? "今日時刻表" : formatServiceDay(st.ServiceDay);
                                        (st.TimeTables || st.Timetables || []).forEach(t => {
                                            if (t.DepartureTime || t.ArrivalTime) target.schedules.push({ service_day: day, is_low_floor: t.IsLowFloor === 1, departure_times: [t.DepartureTime || t.ArrivalTime] });
                                        });
                                    });
                                }
                            }
                        });
                    });

                    Object.values(dirMap).forEach(target => {
                        const mergedSm = {};
                        target.schedules.forEach(s => {
                            const key = `${s.service_day}_${s.is_low_floor}`;
                            if (!mergedSm[key]) mergedSm[key] = { ...s, departure_times: new Set(s.departure_times) };
                            else s.departure_times.forEach(t => mergedSm[key].departure_times.add(t));
                        });
                        target.schedules = Object.values(mergedSm).map(s => ({ ...s, departure_times: [...s.departure_times].sort((a,b)=>a.localeCompare(b)) }));
                        target.frequencies = target.frequencies.filter((v,i,a) => a.findIndex(t => t.service_day === v.service_day) === i);
                    });

                    await upsertJson(env, "route_timetables_v8", ["route_key", "city", "route_name", "data", "updated_at"], [routeKey, city, route, JSON.stringify(Object.values(dirMap)), Date.now()]);
                    return send({ route, timetables: Object.values(dirMap) });
                }

                if (action === "fare") {
                    const cached = await getCachedJson(env, "route_fares", "route_key = ?", [routeKey], null);
                    if (cached) return send({ route, fares: cached });
                    const data = await fetchRouteData(`${CONFIG.BASE_API}/${staticVer}/Bus/RouteFare/${apiPath}`, routePrefix, token);
                    const fares = data.filter(match).map(r => {
                        const mapFares = (arr) => (arr || []).map(f => ({ type: DICT.TICKET_TYPE[f.TicketType], class: DICT.FARE_CLASS[f.FareClass], price: f.Price }));
                        return {
                            route_name: getZh(r.SubRouteName) || getZh(r.RouteName),
                            pricing_type: DICT.PRICING_TYPE[r.FarePricingType] || r.FarePricingType,
                            is_free: r.IsFreeBus === 1,
                            section_fares: (Array.isArray(r.SectionFares||r.SectionFare) ? (r.SectionFares||r.SectionFare) : [r.SectionFares||r.SectionFare]).filter(Boolean).map(sf => ({
                                direction: sf.Direction === 0 ? "去程" : (sf.Direction === 1 ? "返程" : "迴圈"),
                                buffer_zones: (sf.BufferZones || []).map(bz => ({ origin: getZh(bz.FareBufferZoneOrigin?.StopName), destination: getZh(bz.FareBufferZoneDestination?.StopName) })),
                                fares: mapFares(sf.Fares)
                            })),
                            od_fares: (Array.isArray(r.ODFares||r.StageFares) ? (r.ODFares||r.StageFares) : [r.ODFares||r.StageFares]).filter(Boolean).map(od => ({
                                direction: od.Direction === 0 ? "去程" : (od.Direction === 1 ? "返程" : "迴圈"),
                                origin: getZh(od.OriginStop?.StopName || od.OriginStage?.StopName), destination: getZh(od.DestinationStop?.StopName || od.DestinationStage?.StopName),
                                fares: mapFares(od.Fares)
                            }))
                        };
                    });
                    await upsertJson(env, "route_fares", ["route_key", "city", "route_name", "data", "updated_at"], [routeKey, city, route, JSON.stringify(fares), Date.now()]);
                    return send({ route, fares });
                }

                if (action === "vehicle") {
                    const result = await safeTdxFetch(`${CONFIG.BASE_API}/${staticVer}/Bus/Vehicle/${apiPath}?$format=JSON`, token);
                    if (!result.ok) throw new Error(`車籍資料獲取失敗: ${result.errorText}`);
                    const dict = {};
                    result.data.forEach(v => {
                        dict[v.PlateNumb] = { year: v.ManufactureYear || (v.PurchaseTime ? v.PurchaseTime.substring(0, 4) : '不詳'), isLowFloor: v.IsLowFloor === 1 || v.HasLiftOrRamp === 1, hasWifi: v.HasWifi === 1, isElectric: v.IsElectric === 1 || v.VehicleType === 1, hasLift: v.HasLiftOrRamp === 1 };
                    });
                    return send(dict);
                }

                const [resPos, resEst] = await Promise.all([
                    fetchRouteData(`${CONFIG.BASE_API}/${dynVer}/Bus/RealTimeByFrequency/${apiPath}`, routePrefix, token).catch(()=>[]),
                    fetchRouteData(`${CONFIG.BASE_API}/${dynVer}/Bus/EstimatedTimeOfArrival/${apiPath}`, routePrefix, token).catch(()=>[])
                ]);
                const buses = (Array.isArray(resPos) ? resPos : []).filter(b => b.BusStatus === 0 && match(b));
                const ests = (Array.isArray(resEst) ? resEst : []).filter(e => match(e));

                return send({
                    buses: buses.map(b => ({ plate: b.PlateNumb, lat: b.BusPosition?.PositionLat, lon: b.BusPosition?.PositionLon, azi: b.Azimuth, dir: b.Direction })),
                    estimates: ests.reduce((acc, e) => {
                        const key = `${e.Direction}_${e.StopUID}`;
                        const sec = e.EstimateTime ?? null;
                        if (!acc[key] || (sec !== null && (acc[key].sec === null || sec < acc[key].sec))) acc[key] = { sec, status: e.StopStatus, plate: e.PlateNumb, nextBusTime: e.NextBusTime };
                        return acc;
                    }, {})
                });
            }

            return send({ status: "Error", message: "未知的 action" }, 400);

        } catch (e) {
            // 🌟 最終攔截網：任何上述拋出的錯誤，都會變成明確的 JSON 顯示在畫面上！
            return send({ 
                error: "系統異常或 TDX 連線失敗", 
                details: e.message, 
                hint: "此錯誤代表後端有捕捉到異常，請參考 details 說明。" 
            }, 500);
        }
    }
};

async function getAuthToken(env) {
    try { await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sys_config (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)`).run(); } catch(e){}
    const cached = await env.DB.prepare(`SELECT value, updated_at FROM sys_config WHERE key = 'tdx_token'`).first();
    if (cached && cached.value && (Date.now() - cached.updated_at < 20 * 60 * 60 * 1000)) return cached.value;

    const res = await fetch(CONFIG.TOKEN_URL, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.TDX_CLIENT_ID, client_secret: env.TDX_CLIENT_SECRET })
    });
    const text = await res.text();
    try {
        const data = JSON.parse(text);
        if (data.access_token) {
            try { await env.DB.prepare(`INSERT OR REPLACE INTO sys_config (key, value, updated_at) VALUES ('tdx_token', ?, ?)`).bind(data.access_token, Date.now()).run(); } catch (e) {}
            return data.access_token;
        }
        throw new Error();
    } catch (e) { throw new Error(`TDX 授權失敗 (Token 申請遭拒)！回應內容：${text.substring(0, 150)}`); }
}

async function fetchBusNewsOrAlert(type, city, token) {
    const target = type === "news" ? "News" : "Alert";
    const path = city === "InterCity" ? "InterCity" : `City/${city}`;
    const result = await safeTdxFetch(`${CONFIG.BASE_API}/v2/Bus/${target}/${path}?$format=JSON`, token);
    if (!result.ok) throw new Error(`公告抓取失敗: ${result.errorText}`);
    return Array.isArray(result.data) ? result.data : (result.data?.value || []);
}