/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TDX 公車 Cloudflare Worker — 最終救贖旗艦版 (v30.0)           ║
 * ║  新增：智慧按需同步 (Self-Healing) - 徹底解決其他縣市空白問題    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const CONFIG = {
    VERSION: "v30.0-Master-SelfHealing",
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

const safeJsonParse = (text, fallback) => {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
};

async function getCachedJson(env, table, whereSql, binds, maxAgeMs) {
    const row = await env.DB.prepare(`SELECT data, updated_at FROM ${table} WHERE ${whereSql}`).bind(...binds).first();
    if (!row || !row.data) return null;
    if (maxAgeMs && row.updated_at && (Date.now() - row.updated_at > maxAgeMs)) return null;
    return safeJsonParse(row.data, null);
}

async function upsertJson(env, table, columns, values) {
    const cols = columns.join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    await env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...values).run();
}

// 🌟 智能 OData 降級抓取器 (解決 TDX RouteName 型別錯亂問題)
async function fetchRouteData(baseUrl, routePrefix, token) {
    const safeValue = (routePrefix || "").replace(/'/g, "''");
    const buildUrl = (filter) => {
        const params = new URLSearchParams();
        if (filter) params.set("$filter", filter);
        params.set("$format", "JSON");
        return `${baseUrl}?${params.toString()}`;
    };
    const tryFetch = async (filter) => {
        const res = await fetch(buildUrl(filter), { headers: { Authorization: `Bearer ${token}` } });
        const text = await res.text();
        if (!res.ok) return { ok: false, errorText: text };
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            return { ok: false, errorText: text };
        }
        if (Array.isArray(data)) return { ok: true, data };
        if (Array.isArray(data?.value)) return { ok: true, data: data.value };
        if (data?.Message || data?.error) return { ok: false, errorText: text };
        return { ok: true, data };
    };

    const candidates = [
        `contains(RouteName/Zh_tw,'${safeValue}')`,
        `contains(RouteName,'${safeValue}')`,
        null
    ];

    let lastError = "Unknown error";
    for (const filter of candidates) {
        const result = await tryFetch(filter);
        if (result.ok) return result.data;
        if (result.errorText) lastError = result.errorText;
    }

    throw new Error(lastError);
}

// 🌟 智慧按需同步功能 (當 D1 沒有該縣市資料時，立刻去 TDX 抓下來存檔)
async function autoSyncCity(city, token, env) {
    const syncVer = (city === "Tainan") ? "v3" : "v2";
    const path = (city === "InterCity") ? "v2/Bus/StopOfRoute/InterCity" : `${syncVer}/Bus/StopOfRoute/City/${city}`;
    
    const res = await fetch(`${CONFIG.BASE_API}/${path}?$format=JSON`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    
    const data = await res.json();
    const type = city === "InterCity" ? "InterCity" : "CityBus";
    const startTime = Date.now();
    let batch = [], seen = new Set(), results = [];
    const routeStopsMap = new Map();
    const stopRoutesMap = new Map();
    const stmt = env.DB.prepare("INSERT OR REPLACE INTO routes (uid, city, name, departure, destination, type, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    if (Array.isArray(data)) {
        data.forEach(r => {
            if (!r.Stops || r.Stops.length < 2) return;
            const rName = getZh(r.RouteName);
            let finalName = norm(getZh(r.SubRouteName) || rName);
            if (rName && !finalName.includes(norm(rName))) finalName = `${norm(rName)} ${finalName}`;

            const uniqKey = `${city}_${finalName}`;
            if (!seen.has(uniqKey)) {
                seen.add(uniqKey);
                const dep = getZh(r.Stops[0].StopName);
                const dest = getZh(r.Stops[r.Stops.length-1].StopName);
                
                batch.push(stmt.bind(r.SubRouteUID || r.RouteID, city, finalName, dep, dest, type, startTime));
                results.push({ name: finalName, departure: dep, destination: dest, city: city, type: type });
            }

            const routeKey = getRouteKey(city, type, getZh(r.SubRouteName) || getZh(r.RouteName));
            const slimItem = {
                RouteName: r.RouteName,
                SubRouteName: r.SubRouteName,
                Direction: r.Direction,
                Stops: r.Stops,
                Operators: r.Operators || []
            };
            if (!routeStopsMap.has(routeKey)) routeStopsMap.set(routeKey, []);
            routeStopsMap.get(routeKey).push(slimItem);

            r.Stops.forEach(s => {
                const stopName = getZh(s.StopName);
                if (!stopName) return;
                if (!stopRoutesMap.has(stopName)) stopRoutesMap.set(stopName, new Set());
                stopRoutesMap.get(stopName).add(finalName);
            });
        });
        
        // 批次寫入 D1 (每 100 筆為一單位，防止超過 Cloudflare 限制)
        for (let i = 0; i < batch.length; i += 100) {
            await env.DB.batch(batch.slice(i, i + 100));
        }

        const stopBatch = [];
        const routeStopStmt = env.DB.prepare("INSERT OR REPLACE INTO route_stops (route_key, city, route_name, type, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
        for (const [key, items] of routeStopsMap.entries()) {
            const routeName = items[0]?.SubRouteName || items[0]?.RouteName || "";
            stopBatch.push(routeStopStmt.bind(key, city, getZh(routeName), type, JSON.stringify(items), startTime));
        }
        for (let i = 0; i < stopBatch.length; i += 100) {
            await env.DB.batch(stopBatch.slice(i, i + 100));
        }

        const stopRouteBatch = [];
        const stopRouteStmt = env.DB.prepare("INSERT OR REPLACE INTO stop_routes (city, stop_name, routes, updated_at) VALUES (?, ?, ?, ?)");
        for (const [stopName, routeSet] of stopRoutesMap.entries()) {
            const routeList = Array.from(routeSet).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
            stopRouteBatch.push(stopRouteStmt.bind(city, stopName, JSON.stringify(routeList), startTime));
        }
        for (let i = 0; i < stopRouteBatch.length; i += 100) {
            await env.DB.batch(stopRouteBatch.slice(i, i + 100));
        }
    }
    
    results.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
    return results;
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const params = url.searchParams;
        if (request.method === "OPTIONS") return new Response(null, { headers: CONFIG.CORS });

        const send = (data, status = 200, extraHeaders = {}) => new Response(
            JSON.stringify(data),
            { status, headers: { ...CONFIG.CORS, ...extraHeaders } }
        );

        try {
            const token = await getAuthToken(env);
            const action = params.get("action");
            const route = params.get("route");
            const city = params.get("city") || "Taipei";
            const cat = params.get("category") || "CityBus";

            if (action === "db_init") {
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS routes (uid TEXT PRIMARY KEY, city TEXT, name TEXT, departure TEXT, destination TEXT, type TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bus_snapshot (id INTEGER PRIMARY KEY AUTOINCREMENT, plate TEXT, route_name TEXT, lat REAL, lon REAL, time TEXT)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_stops (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, type TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS stop_routes (city TEXT, stop_name TEXT, routes TEXT, updated_at INTEGER, PRIMARY KEY (city, stop_name))`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_shapes (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_fares (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_timetables (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bus_news (cache_key TEXT PRIMARY KEY, city TEXT, type TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bus_alerts (cache_key TEXT PRIMARY KEY, city TEXT, type TEXT, data TEXT, updated_at INTEGER)`).run();
                return send({ status: "D1 Tables Initialized" });
            }

            if (action === "sync_db") {
                const startTime = Date.now();
                const targetCity = params.get("city");
                const list = targetCity ? [targetCity] : CONFIG.CITIES;
                
                let added = 0;
                for (const c of list) {
                    const results = await autoSyncCity(c, token, env);
                    added += results.length;
                }
                if (!targetCity) await env.DB.prepare("DELETE FROM routes WHERE updated_at < ?").bind(startTime).run();
                return send({ status: "success", added_or_updated: added });
            }

            if (action === "list_all") {
                const search = params.get("search");
                const targetCity = params.get("city");
                
                let sql = "SELECT name, departure, destination, city, type FROM routes WHERE 1=1";
                let binds = [];
                if (search) { sql += " AND (name LIKE ? OR departure LIKE ? OR destination LIKE ?)"; binds.push(`%${search}%`, `%${search}%`, `%${search}%`); }
                if (targetCity) { sql += " AND city = ?"; binds.push(targetCity); }
                
                const { results } = await env.DB.prepare(sql + " ORDER BY name ASC LIMIT 1000").bind(...binds).all();

                // 🌟 核心魔法：如果 D1 裡沒資料，且用戶是選擇了特定縣市，自動觸發即時同步修復！
                if (results.length === 0 && targetCity && !search) {
                    try {
                        const syncedData = await autoSyncCity(targetCity, token, env);
                        return send(syncedData);
                    } catch (e) {
                        console.error("Auto Sync Error:", e);
                    }
                }

                return send(results || []);
            }

            if (action === "stop_info") {
                const stopName = params.get("name") || "";
                if (!stopName) return send({ routes: [] });
                let routes = await getCachedJson(env, "stop_routes", "city = ? AND stop_name = ?", [city, stopName], null);
                if (!routes) {
                    await autoSyncCity(city, token, env);
                    routes = await getCachedJson(env, "stop_routes", "city = ? AND stop_name = ?", [city, stopName], null);
                }
                return send({ routes: Array.isArray(routes) ? routes : [] });
            }

            if (action === "news" || action === "alert") {
                const cacheKey = `${cat}:${city}`;
                const table = action === "news" ? "bus_news" : "bus_alerts";
                const ttlMs = action === "news" ? CONFIG.NEWS_CACHE_TTL_MS : CONFIG.ALERT_CACHE_TTL_MS;
                const cached = await getCachedJson(env, table, "cache_key = ?", [cacheKey], ttlMs);
                if (cached) return send(cached);

                try {
                    const fresh = await fetchBusNewsOrAlert(action, city, token);
                    await upsertJson(env, table, ["cache_key", "city", "type", "data", "updated_at"], [cacheKey, city, cat, JSON.stringify(fresh), Date.now()]);
                    return send(fresh);
                } catch (err) {
                    const stale = await getCachedJson(env, table, "cache_key = ?", [cacheKey], null);
                    if (stale) return send(stale);
                    return send({ error: "Failed to fetch bus alerts/news", details: err.message }, 500);
                }
            }

            if (route) {
                const isInter = cat === "InterCity";
                const dynVer = isInter ? "v2" : (city === "Tainan" ? "v3" : "v2");
                const staticVer = "v2"; 
                const stopVer = (city === "Tainan") ? "v3" : "v2";
                
                const path = isInter ? "InterCity" : `City/${city}`;
                const routePrefix = route.split(' ')[0]; 
                const targetNorm = norm(route);
                const routeKey = getRouteKey(city, cat, route);
                const match = (i) => norm(getZh(i.SubRouteName) || getZh(i.RouteName)) === targetNorm;

                // 🔸 4A-1. 取得路線站牌 (StopOfRoute)
                if (action === "info") {
                    const cached = await getCachedJson(env, "route_stops", "route_key = ?", [routeKey], null);
                    if (cached) return send(cached);

                    try {
                        const data = await fetchRouteData(`${CONFIG.BASE_API}/${stopVer}/Bus/StopOfRoute/${path}`, routePrefix, token);
                        const items = data.filter(match).map(r => ({
                            RouteName: r.RouteName,
                            SubRouteName: r.SubRouteName,
                            Direction: r.Direction,
                            Stops: r.Stops,
                            Operators: r.Operators || []
                        }));

                        if (items.length > 0) {
                            await upsertJson(env, "route_stops", ["route_key", "city", "route_name", "type", "data", "updated_at"], [routeKey, city, route, cat, JSON.stringify(items), Date.now()]);

                            const stopRoutesMap = new Map();
                            items.forEach(item => {
                                (item.Stops || []).forEach(s => {
                                    const stopName = getZh(s.StopName);
                                    if (!stopName) return;
                                    if (!stopRoutesMap.has(stopName)) stopRoutesMap.set(stopName, new Set());
                                    stopRoutesMap.get(stopName).add(route);
                                });
                            });
                            const stopRouteStmt = env.DB.prepare("INSERT OR REPLACE INTO stop_routes (city, stop_name, routes, updated_at) VALUES (?, ?, ?, ?)");
                            const stopRouteBatch = [];
                            for (const [stopName, routeSet] of stopRoutesMap.entries()) {
                                const routeList = Array.from(routeSet).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
                                stopRouteBatch.push(stopRouteStmt.bind(city, stopName, JSON.stringify(routeList), Date.now()));
                            }
                            for (let i = 0; i < stopRouteBatch.length; i += 100) {
                                await env.DB.batch(stopRouteBatch.slice(i, i + 100));
                            }
                        }

                        return send(items);
                    } catch (err) {
                        return send({ error: "Failed to fetch route info", details: err.message }, 500);
                    }
                }

                // 🔸 4A-2. 取得路線形狀 (Shape)
                if (action === "shape") {
                    const cached = await getCachedJson(env, "route_shapes", "route_key = ?", [routeKey], null);
                    if (cached) return send(cached);

                    try {
                        const data = await fetchRouteData(`${CONFIG.BASE_API}/${staticVer}/Bus/Shape/${path}`, routePrefix, token);
                        const shapes = data.filter(i => {
                            const n = norm(getZh(i.SubRouteName) || getZh(i.RouteName));
                            return n === targetNorm;
                        });
                        await upsertJson(env, "route_shapes", ["route_key", "city", "route_name", "data", "updated_at"], [routeKey, city, route, JSON.stringify(shapes), Date.now()]);
                        return send(shapes);
                    } catch (err) {
                        return send({ error: "Failed to fetch shapes", details: err.message }, 500);
                    }
                }

                // 🔸 4B. 取得時刻表 (Schedule)
                if (action === "timetable") {
                    const cached = await getCachedJson(env, "route_timetables", "route_key = ?", [routeKey], null);
                    if (cached) return send({ route, timetables: cached });

                    try {
                        const data = await fetchRouteData(`${CONFIG.BASE_API}/${staticVer}/Bus/Schedule/${path}`, routePrefix, token);
                        const timetables = data.filter(match).map(r => ({
                            direction: r.Direction === 0 ? "去程" : (r.Direction === 1 ? "返程" : "迴圈"),
                            route_name: getZh(r.SubRouteName) || getZh(r.RouteName),
                            schedules: (r.TimeTables || []).map(t => ({
                                service_day: formatServiceDay(t.ServiceDay),
                                is_low_floor: t.IsLowFloor === 1,
                                departure_times: (t.StopTimes || [])
                                    .filter(st => st.StopSequence === 1)
                                    .map(st => st.DepartureTime)
                            })),
                            frequencies: (r.Frequencies || []).map(f => ({
                                service_day: formatServiceDay(f.ServiceDay),
                                time_range: `${f.StartTime} - ${f.EndTime}`,
                                min_headway: f.MinHeadwayMins,
                                max_headway: f.MaxHeadwayMins
                            }))
                        }));
                        await upsertJson(env, "route_timetables", ["route_key", "city", "route_name", "data", "updated_at"], [routeKey, city, route, JSON.stringify(timetables), Date.now()]);
                        return send({ route, timetables });
                    } catch (err) {
                        return send({ error: "Failed to fetch timetable", details: err.message }, 500);
                    }
                }

                // 🔸 4C. 取得票價資訊 (RouteFare)
                if (action === "fare") {
                    const cached = await getCachedJson(env, "route_fares", "route_key = ?", [routeKey], null);
                    if (cached) return send({ route, fares: cached });

                    try {
                        const data = await fetchRouteData(`${CONFIG.BASE_API}/${staticVer}/Bus/RouteFare/${path}`, routePrefix, token);
                        const fares = data.filter(match).map(r => {
                            const pricingType = DICT.PRICING_TYPE[r.FarePricingType] || r.FarePricingType;
                            const mapFares = (fareArray) => (fareArray || []).map(f => ({
                                type: DICT.TICKET_TYPE[f.TicketType] || `類別${f.TicketType}`,
                                class: DICT.FARE_CLASS[f.FareClass] || `對象${f.FareClass}`,
                                price: f.Price
                            }));

                            const sectionData = r.SectionFares || r.SectionFare || [];
                            const odData = r.ODFares || r.StageFares || [];

                            return {
                                route_name: getZh(r.SubRouteName) || getZh(r.RouteName),
                                pricing_type: pricingType,
                                is_free: r.IsFreeBus === 1,
                                section_fares: (Array.isArray(sectionData) ? sectionData : [sectionData]).map(sf => ({
                                    direction: sf.Direction === 0 ? "去程" : (sf.Direction === 1 ? "返程" : "迴圈"),
                                    buffer_zones: (sf.BufferZones || []).map(bz => ({
                                        origin: getZh(bz.FareBufferZoneOrigin?.StopName || bz.FareBufferZoneOrigin?.OriginStopName),
                                        destination: getZh(bz.FareBufferZoneDestination?.StopName || bz.FareBufferZoneDestination?.DestinationStopName)
                                    })),
                                    fares: mapFares(sf.Fares)
                                })),
                                od_fares: (Array.isArray(odData) ? odData : [odData]).map(od => ({
                                    direction: od.Direction === 0 ? "去程" : (od.Direction === 1 ? "返程" : "迴圈"),
                                    origin: getZh(od.OriginStop?.StopName || od.OriginStage?.StopName),
                                    destination: getZh(od.DestinationStop?.StopName || od.DestinationStage?.StopName),
                                    fares: mapFares(od.Fares)
                                }))
                            };
                        });
                        await upsertJson(env, "route_fares", ["route_key", "city", "route_name", "data", "updated_at"], [routeKey, city, route, JSON.stringify(fares), Date.now()]);
                        return send({ route, fares });
                    } catch (err) {
                        const details = err?.message || "Unknown error";
                        return send({ error: "Failed to fetch fares", details }, 500);
                    }
                }

                // 🔸 4D. 取得公車車籍資料 (供首頁與地圖解析使用)
                if (action === "vehicle") {
                    try {
                        const res = await fetch(`${CONFIG.BASE_API}/${staticVer}/Bus/Vehicle/${path}?$format=JSON`, { headers: { Authorization: `Bearer ${token}` } });
                        if (!res.ok) return send({});
                        const data = await res.json();
                        const dict = {};
                        data.forEach(v => {
                            dict[v.PlateNumb] = {
                                year: v.ManufactureYear || (v.PurchaseTime ? v.PurchaseTime.substring(0, 4) : '不詳'),
                                isLowFloor: v.IsLowFloor === 1 || v.HasLiftOrRamp === 1,
                                hasWifi: v.HasWifi === 1,
                                isElectric: v.IsElectric === 1 || v.VehicleType === 1,
                                hasLift: v.HasLiftOrRamp === 1
                            };
                        });
                        return send(dict);
                    } catch (err) {
                        return send({});
                    }
                }

                // 🔸 4E. 預設：取得即時動態 (RealTime & EstimatedTime)
                const [resPos, resEst] = await Promise.all([
                    fetchRouteData(`${CONFIG.BASE_API}/${dynVer}/Bus/RealTimeByFrequency/${path}`, routePrefix, token),
                    fetchRouteData(`${CONFIG.BASE_API}/${dynVer}/Bus/EstimatedTimeOfArrival/${path}`, routePrefix, token)
                ]);

                const buses = (Array.isArray(resPos) ? resPos : []).filter(b => b.BusStatus === 0 && match(b));
                const ests = (Array.isArray(resEst) ? resEst : []).filter(e => match(e));

                return send({
                    buses: buses.map(b => ({ 
                        plate: b.PlateNumb, 
                        lat: b.BusPosition?.PositionLat, 
                        lon: b.BusPosition?.PositionLon, 
                        azi: b.Azimuth, 
                        dir: b.Direction 
                    })),
                    estimates: ests.reduce((acc, e) => {
                        const key = `${e.Direction}_${e.StopUID}`;
                        const sec = e.EstimateTime ?? null;
                        if (!acc[key] || (sec !== null && (acc[key].sec === null || sec < acc[key].sec))) {
                            acc[key] = { sec, status: e.StopStatus, plate: e.PlateNumb, nextBusTime: e.NextBusTime };
                        }
                        return acc;
                    }, {})
                });
            }

            const { results } = await env.DB.prepare("SELECT COUNT(*) as total FROM routes").all();
            return send({ status: "running", version: CONFIG.VERSION, db_count: results[0].total });

        } catch (e) {
            return send({ error: e.message, hint: "請檢查 API Key 或網路連線。" }, 500);
        }
    }
};

async function getAuthToken(env) {
    const res = await fetch(CONFIG.TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.TDX_CLIENT_ID, client_secret: env.TDX_CLIENT_SECRET })
    });
    const text = await res.text();
    try {
        const data = JSON.parse(text);
        if (data.access_token) return data.access_token;
        throw new Error();
    } catch (e) {
        throw new Error(`TDX 授權失敗！回應內容：${text.substring(0, 100)}`);
    }
}

async function fetchBusNewsOrAlert(type, city, token) {
    const isInter = city === "InterCity";
    const target = type === "news" ? "News" : "Alert";
    const path = isInter ? "InterCity" : `City/${city}`;
    const url = `${CONFIG.BASE_API}/v2/Bus/${target}/${path}?$format=JSON`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.value || []);
}