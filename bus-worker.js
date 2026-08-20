/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TDX 公車 Cloudflare Worker — 旗艦相容升級版 (v30.16)           ║
 * ║  修復：完整解析 TDX SubRoutes 結構與 ABCD 支線過濾問題        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const CONFIG = {
    VERSION: "v30.16",
    CITIES: ["Taipei", "NewTaipei", "Taoyuan", "Taichung", "Tainan", "Kaohsiung", "Keelung", "InterCity"],
    TOKEN_URL: "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token",
    BASE_API: "https://tdx.transportdata.tw/api/basic",
    FARE_CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
    INFO_CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
    SHAPE_CACHE_TTL_MS: 30 * 24 * 60 * 60 * 1000,
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
    TICKET_TYPE: { 1: "一般票", 2: "來回票", 3: "電子票證", 4: "回數票", 5: "定期票(30天)", 6: "定期票(60天)", 7: "早鳥票", 8: "定期票(90天)" },
    FARE_CLASS: { 1: "成人", 2: "學生", 3: "孩童", 4: "敬老", 5: "愛心", 6: "愛心孩童", 7: "愛心陪伴", 8: "團體", 9: "軍警", 10: "半票" },
    PRICING_TYPE: { "SectionFare": "段次計費", "ODFares": "起迄站間計費", "StageFares": "計費站區間收費" }
};

const getZh = (obj) => {
    if (obj == null) return '';
    if (typeof obj === 'object') {
        return String(
            obj.Zh_tw ??
            obj.Zhtw ??
            obj.ZhTW ??
            obj['zh-TW'] ??
            obj.Name ??
            ''
        ).trim();
    }
    return String(obj).trim();
};

// 溫和正規化：保留支線字母 (ABCD)、括號、副線、區間，僅轉大寫並去除全半形空白
const norm = (n) => {
    if (!n) return "";
    return String(n).trim().toUpperCase().replace(/\s+/g, "");
};

// 提取基礎前綴（例如 300A -> 300，紅56區 -> 紅56）用於 TDX API 兩階段 fallback 查詢
const getBasePrefix = (n) => {
    if (!n) return "";
    const clean = String(n).trim();
    const m = clean.match(/^([\u4e00-\u9fa5A-Za-z0-9]+?)(?:[A-Za-z]|區|副|繞|延|支|\s|$)/);
    return (m && m[1]) ? m[1] : clean;
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

const extractArray = (d) => {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.value)) return d.value;

    let bestArr = [];
    for (let k in d) {
        if (Array.isArray(d[k]) && d[k].length > bestArr.length) {
            bestArr = d[k];
        }
    }
    return bestArr;
};

async function safeTdxFetch(url, token, retries = 3) {
    for (let i = 0; i < retries; i++) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const text = await res.text();

        if (res.status === 429 || text.includes("API rate limit exceeded")) {
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
    throw new Error(`TDX API 拒絕連線 (已達最大重試次數) URL: ${url}`);
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

async function fetchRouteData(baseUrl, routeQuery, token) {
    const rawVal = String(routeQuery || "").trim().replace(/'/g, "''");
    const prefixVal = getBasePrefix(routeQuery).replace(/'/g, "''");

    const buildUrl = (filter) => {
        const params = new URLSearchParams();
        if (filter) params.set("$filter", filter);
        params.set("$format", "JSON");
        return `${baseUrl}?${params.toString()}`;
    };

    // 1. 優先精準搜尋 (傳入完整名稱/支線名/ID)
    // 2. 若傳入 ABCD 支線未命中，Fallback 回退主路線前綴搜尋 (例如 300A -> 300)
    const candidateFilters = [
        `contains(RouteName/Zh_tw,'${rawVal}') or contains(SubRouteName/Zh_tw,'${rawVal}') or contains(RouteID,'${rawVal}') or contains(SubRouteID,'${rawVal}')`
    ];
    if (prefixVal && prefixVal !== rawVal) {
        candidateFilters.push(`contains(RouteName/Zh_tw,'${prefixVal}') or contains(SubRouteName/Zh_tw,'${prefixVal}') or contains(RouteID,'${prefixVal}')`);
    }

    for (const filter of candidateFilters) {
        const result = await safeTdxFetch(buildUrl(filter), token);
        if (result.ok) {
            let arr = extractArray(result.data);
            if (arr.length > 0) return arr;
        }
    }
    return [];
}

async function autoSyncCity(city, cat, token, env) {
    let fetchUrl = "";
    if (cat === "DRTS") {
        fetchUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/StopOfRoute/City/${city}?$format=JSON`;
    } else if (cat === "InterCity") {
        fetchUrl = `${CONFIG.BASE_API}/v2/Bus/StopOfRoute/InterCity?$format=JSON`;
    } else if (cat === "SciencePark") {
        fetchUrl = `${CONFIG.BASE_API}/v2/Bus/StopOfRoute/SciencePark/${city}?$format=JSON`;
    } else {
        const apiVer = city === "Tainan" ? "v3" : "v2";
        fetchUrl = `${CONFIG.BASE_API}/${apiVer}/Bus/StopOfRoute/City/${city}?$format=JSON`;
    }

    const result = await safeTdxFetch(fetchUrl, token);
    if (!result.ok) throw new Error(`TDX 路線同步失敗: ${result.errorText}`);

    const data = extractArray(result.data);
    if (data.length === 0) {
        throw new Error(`TDX 回傳了空的路線資料`);
    }

    const type = cat;
    const startTime = Date.now();
    let batch = [], seen = new Set(), results = [];
    const routeStopsMap = new Map(), stopRoutesMap = new Map();
    const stmt = env.DB.prepare("INSERT OR REPLACE INTO routes_v2 (uid, city, name, departure, destination, type, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");

    data.forEach(r => {
        if (!r.Stops || r.Stops.length < 2) return;
        
        const mainRouteName = getZh(r.RouteName).trim();
        const subRouteName = getZh(r.SubRouteName).trim();
        const subRouteShort = subRouteName.split(/\s+/)[0].trim();

        // 同時記錄主路線、完整附屬路線與縮寫名稱 (確保搜尋 300A, 300B, 藍1區 等支線均能查到)
        const candidateNames = new Set();
        if (mainRouteName) candidateNames.add(mainRouteName);
        if (subRouteName) candidateNames.add(subRouteName);
        if (subRouteShort) candidateNames.add(subRouteShort);

        const dep = getZh(r.Stops[0].StopName);
        const dest = getZh(r.Stops[r.Stops.length - 1].StopName);
        const baseUid = r.SubRouteUID || r.RouteUID || r.RouteID || `${city}_${mainRouteName}`;

        for (const name of candidateNames) {
            if (!name) continue;
            const uniqKey = `${city}_${norm(name)}_${r.Direction ?? 0}`;
            if (!seen.has(uniqKey)) {
                seen.add(uniqKey);
                const uid = `${baseUid}_${norm(name)}_${r.Direction ?? 0}`;
                batch.push(stmt.bind(uid, city, name, dep, dest, type, startTime));
                results.push({ name, departure: dep, destination: dest, city, type });
            }

            const routeKey = getRouteKey(city, type, name);
            const slimItem = { RouteName: r.RouteName, SubRouteName: r.SubRouteName, Direction: r.Direction, Stops: r.Stops, Operators: r.Operators || [] };
            if (!routeStopsMap.has(routeKey)) routeStopsMap.set(routeKey, []);
            routeStopsMap.get(routeKey).push(slimItem);

            r.Stops.forEach(s => {
                const stopName = getZh(s.StopName);
                if (!stopName) return;
                if (!stopRoutesMap.has(stopName)) stopRoutesMap.set(stopName, new Set());
                stopRoutesMap.get(stopName).add(name);
            });
        }
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

            if (action === "version") {
                return send({ version: CONFIG.VERSION, deployed: true });
            }

            if (action === "ping") {
                return send({ ok: true, version: CONFIG.VERSION, action });
            }

            if (action === "db_init" || action === "dbinit") {
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS routes_v2 (uid TEXT PRIMARY KEY, city TEXT, name TEXT, departure TEXT, destination TEXT, type TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_stops (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, type TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS stop_routes (city TEXT, stop_name TEXT, routes TEXT, updated_at INTEGER, PRIMARY KEY (city, stop_name))`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_shapes (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_fares (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_timetables_v8 (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_booking_rules (route_key TEXT PRIMARY KEY, city TEXT, route_name TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS route_locations (city TEXT PRIMARY KEY, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bus_news (cache_key TEXT PRIMARY KEY, city TEXT, type TEXT, data TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bus_alerts (cache_key TEXT PRIMARY KEY, city TEXT, type TEXT, data TEXT, updated_at INTEGER)`).run();
                return send({ status: "D1 Tables Initialized" });
            }

            if (action === "clear_cache") {
                const tables = ["routes_v2", "route_stops", "route_shapes", "route_fares", "route_timetables_v8", "route_booking_rules", "route_locations", "sys_config"];
                for (const t of tables) {
                    try { await env.DB.prepare(`DELETE FROM ${t}`).run(); } catch (e) { }
                }
                return send({ status: "Cache Cleared! 路線與舊快取已清空！" });
            }

            if (action === "list_all") {
                const search = params.get("search");
                let sql = "SELECT name, departure, destination, city, type FROM routes_v2 WHERE 1=1";
                let binds = [];
                if (search) { 
                    sql += " AND (name LIKE ? OR departure LIKE ? OR destination LIKE ?)"; 
                    binds.push(`%${search}%`, `%${search}%`, `%${search}%`); 
                }
                if (city && !search) { 
                    sql += " AND city = ?"; 
                    binds.push(city); 
                }

                const { results } = await env.DB.prepare(sql + " ORDER BY name ASC LIMIT 2000").bind(...binds).all();

                if ((!results || results.length === 0) && city && !search) {
                    const syncedData = await autoSyncCity(city, cat, token, env);
                    return send(syncedData || []);
                }
                return send(results || []);
            }

            if (action === "stop_info" || action === "stopinfo") {
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

            if (action === "location") {
                const cached = await getCachedJson(env, "route_locations", "city = ?", [city], null);
                if (cached) return send(cached);

                const result = await safeTdxFetch(`${CONFIG.BASE_API}/v3/Bus/DRTS/Location/City/${city}?$format=JSON`, token);
                if (!result.ok) return send([]);
                const data = extractArray(result.data).map(loc => ({
                    id: loc.LocationID,
                    name: loc.LocationName?.Zh_tw || loc.LocationName || "",
                    desc: loc.LocationDescription || "",
                    geometry: loc.Geometry || ""
                }));

                await upsertJson(env, "route_locations", ["city", "data", "updated_at"], [city, JSON.stringify(data), Date.now()]);
                return send(data);
            }

            if (action === "news" || action === "alert") {
                const cacheKey = `${cat}:${city}`;
                const table = action === "news" ? "bus_news" : "bus_alerts";
                const ttlMs = action === "news" ? CONFIG.NEWS_CACHE_TTL_MS : CONFIG.ALERT_CACHE_TTL_MS;
                const cached = await getCachedJson(env, table, "cache_key = ?", [cacheKey], ttlMs);
                if (cached) return send(cached);

                const fresh = await fetchBusNewsOrAlert(action, city, token, cat);
                await upsertJson(env, table, ["cache_key", "city", "type", "data", "updated_at"], [cacheKey, city, cat, JSON.stringify(fresh), Date.now()]);
                return send(fresh);
            }

            if (action === "vehicle") {
                const sixCities = ["Taipei", "NewTaipei", "Taoyuan", "Taichung", "Tainan", "Kaohsiung"];
                let vehicleUrl = "";

                if (cat === "InterCity" || city === "InterCity") {
                    vehicleUrl = `${CONFIG.BASE_API}/v2/Bus/Vehicle/InterCity?$format=JSON`;
                } else if (cat === "DRTS") {
                    vehicleUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/Vehicle/City/${city}?$format=JSON`;
                } else if (cat === "SciencePark") {
                    vehicleUrl = `${CONFIG.BASE_API}/v2/Bus/Vehicle/SciencePark/${city}?$format=JSON`;
                } else if (sixCities.includes(city)) {
                    const apiVer = city === "Tainan" ? "v3" : "v2";
                    vehicleUrl = `${CONFIG.BASE_API}/${apiVer}/Bus/Vehicle/City/${city}?$format=JSON`;
                } else {
                    vehicleUrl = `${CONFIG.BASE_API}/v2/Bus/Vehicle?$format=JSON`;
                }

                const result = await safeTdxFetch(vehicleUrl, token);
                if (!result.ok) {
                    console.warn(`[TDX 車籍警告] ${city} 抓取失敗:`, result.errorText);
                    return send({});
                }

                const dict = {};
                const arr = extractArray(result.data);
                arr.forEach(v => {
                    dict[v.PlateNumb] = {
                        year: v.ManufactureYear || (v.PurchaseTime ? v.PurchaseTime.substring(0, 4) : '不詳'),
                        isLowFloor: v.IsLowFloor === 1 || v.HasLiftOrRamp === 1 || v.VehicleType === 2,
                        hasWifi: v.HasWifi === 1,
                        isElectric: v.IsElectric === 1 || v.IsElectric === true,
                        hasLift: v.HasLiftOrRamp === 1,
                        vehicleClass: v.VehicleClass,
                        vehicleType: v.VehicleType
                    };
                });
                return send(dict);
            }

            if (route) {
                let apiVer = "v2", apiPath = `City/${city}`;
                if (cat === "InterCity" || city === "InterCity") { apiVer = "v2"; apiPath = "InterCity"; }
                else if (cat === "DRTS") { apiVer = "v3"; apiPath = `DRTS/City/${city}`; }
                else if (cat === "SciencePark") { apiVer = "v2"; apiPath = `SciencePark/${city}`; }
                else { apiVer = city === "Tainan" ? "v3" : "v2"; apiPath = `City/${city}`; }

                const dynVer = apiVer, staticVer = apiVer, stopVer = apiVer, path = apiPath;
                const routeKey = getRouteKey(city, cat, route);
                const targetNorm = norm(route);

                // 🌟 寬鬆且精準的比對器：完美支援 300A, 300B, 藍1區 等附屬支線
                const match = (item) => {
                    const rName = norm(getZh(item?.RouteName));
                    const sName = norm(getZh(item?.SubRouteName));
                    const rID = norm(item?.RouteID);
                    const sID = norm(item?.SubRouteID);
                    const rUID = norm(item?.RouteUID);
                    const sUID = norm(item?.SubRouteUID);

                    if (!targetNorm) return true;

                    // 1. 完全相等比對 (名稱、支線名、UID、ID)
                    if (rName === targetNorm || sName === targetNorm || rID === targetNorm || sID === targetNorm || rUID === targetNorm || sUID === targetNorm) {
                        return true;
                    }

                    // 2. 支線比對 (例如查詢 "300A"，比對包含 300A 的記錄)
                    if (sName && (sName.startsWith(targetNorm) || targetNorm.startsWith(sName) || sName.includes(targetNorm))) {
                        return true;
                    }

                    // 3. 主路線比對 (例如查詢 "300"，比對屬於 300 主路線的附屬路線紀錄)
                    if (rName && (rName === targetNorm || targetNorm.startsWith(rName))) {
                        return true;
                    }

                    return false;
                };

                if (action === "info") {
                    const cached = await getCachedJson(env, "route_stops", "route_key = ?", [routeKey], null);
                    if (cached) return send(cached);

                    let stopUrl = `${CONFIG.BASE_API}/${stopVer}/Bus/StopOfRoute/${apiPath}`;
                    if (cat === "DRTS") stopUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/StopOfRoute/City/${city}`;
                    const data = await fetchRouteData(stopUrl, route, token);
                    const items = data.filter(match).map(r => ({
                        RouteName: r.RouteName,
                        SubRouteName: r.SubRouteName,
                        Direction: r.Direction,
                        Stops: r.Stops,
                        Operators: r.Operators || []
                    }));

                    if (items.length === 0) throw new Error(`查無站牌清單資料: ${route}`);
                    await upsertJson(env, "route_stops", ["route_key", "city", "route_name", "type", "data", "updated_at"], [routeKey, city, route, cat, JSON.stringify(items), Date.now()]);
                    return send(items);
                }

                if (action === "shape") {
                    const cached = await getCachedJson(env, "route_shapes", "route_key = ?", [routeKey], null);
                    if (cached) return send(cached);

                    let shapeUrl = `${CONFIG.BASE_API}/${staticVer}/Bus/Shape/${apiPath}`;
                    if (cat === "DRTS") shapeUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/Shape/City/${city}`;
                    const data = await fetchRouteData(shapeUrl, route, token);
                    const shapes = data.filter(match);

                    await upsertJson(env, "route_shapes", ["route_key", "city", "route_name", "data", "updated_at"], [routeKey, city, route, JSON.stringify(shapes), Date.now()]);
                    return send(shapes);
                }

                if (action === "timetable") {
                    const cached = await getCachedJson(env, "route_timetables_v8", "route_key = ?", [routeKey], null);
                    if (cached) return send({ route, timetables: cached });

                    let schedUrl = `${CONFIG.BASE_API}/${staticVer}/Bus/Schedule/${path}`;
                    let dailyUrl = `${CONFIG.BASE_API}/${staticVer}/Bus/DailyTimeTable/${path}`;
                    let genStopUrl = `${CONFIG.BASE_API}/${staticVer}/Bus/GeneralStopTimeTable/${path}`;
                    let dailyStopUrl = `${CONFIG.BASE_API}/${staticVer}/Bus/DailyStopTimeTable/${path}`;

                    if (cat === "DRTS") {
                        schedUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/Schedule/City/${city}`;
                        dailyUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/DailyTimeTable/City/${city}`;
                        genStopUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/GeneralStopTimeTable/City/${city}`;
                        dailyStopUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/DailyStopTimeTable/City/${city}`;
                    }

                    const [schedData, dailyData, genStopData, dailyStopData] = await Promise.all([
                        fetchRouteData(schedUrl, route, token).catch(() => []),
                        fetchRouteData(dailyUrl, route, token).catch(() => []),
                        fetchRouteData(genStopUrl, route, token).catch(() => []),
                        fetchRouteData(dailyStopUrl, route, token).catch(() => [])
                    ]);

                    const dirMap = {};
                    const initDir = (r) => {
                        const dirLabel = r.Direction === 0 ? "去程" : (r.Direction === 1 ? "返程" : "迴圈");
                        if (!dirMap[dirLabel]) dirMap[dirLabel] = { direction: dirLabel, route_name: getZh(r.SubRouteName) || getZh(r.RouteName), schedules: [], frequencies: [] };
                        return dirMap[dirLabel];
                    };

                    [{ data: schedData, type: 'basic', isDaily: false }, { data: dailyData, type: 'basic', isDaily: true }, { data: genStopData, type: 'stop', isDaily: false }, { data: dailyStopData, type: 'stop', isDaily: true }]
                        .forEach(dataset => {
                            (Array.isArray(dataset.data) ? dataset.data : []).filter(match).forEach(r => {
                                const target = initDir(r);
                                (r.Frequencies || r.Frequencys || []).forEach(f => {
                                    const day = formatServiceDay(f.ServiceDay);
                                    target.frequencies.push({ service_day: day, ranges: [{ time_range: `${(f.StartTime || "").substring(0, 5)} - ${(f.EndTime || "").substring(0, 5)}`, min: f.MinHeadwayMins, max: f.MaxHeadwayMins }] });
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
                        target.schedules = Object.values(mergedSm).map(s => ({ ...s, departure_times: [...s.departure_times].sort((a, b) => a.localeCompare(b)) }));
                        target.frequencies = target.frequencies.filter((v, i, a) => a.findIndex(t => t.service_day === v.service_day) === i);
                    });

                    await upsertJson(env, "route_timetables_v8", ["route_key", "city", "route_name", "data", "updated_at"], [routeKey, city, route, JSON.stringify(Object.values(dirMap)), Date.now()]);
                    return send({ route, timetables: Object.values(dirMap) });
                }

                if (action === "fare") {
                    const cached = await getCachedJson(env, "route_fares", "route_key = ?", [routeKey], CONFIG.FARE_CACHE_TTL_MS);
                    if (cached) return send({ route, fares: cached });

                    let data = [];
                    if (cat === "DRTS") {
                        const r = await safeTdxFetch(`${CONFIG.BASE_API}/v3/Bus/DRTS/RouteFare/City/${city}?$format=JSON`, token);
                        if (r.ok) data = extractArray(r.data);
                    } else {
                        const farePath = (cat === 'InterCity' || city === 'InterCity')
                            ? `InterCity/${encodeURIComponent(route)}`
                            : `City/${city}/${encodeURIComponent(route)}`;
                        const r = await safeTdxFetch(`${CONFIG.BASE_API}/${staticVer}/Bus/RouteFare/${farePath}?$format=JSON`, token);
                        if (r.ok) data = extractArray(r.data);
                    }

                    const fares = data.filter(match).map(r => {
                        const mapFares = (arr) => (arr || []).map(f => ({
                            type: DICT.TICKET_TYPE[f.TicketType] || f.FareName || '其他',
                            class: DICT.FARE_CLASS[f.FareClass] || (f.FareName ? f.FareName.split('_')[0] : '其他'),
                            price: f.Price
                        })).filter(f => f.price >= 0);
                        const engPricingType = ["SectionFare", "ODFares", "StageFares"][r.FarePricingType] ?? r.FarePricingType;
                        const pricingTypeVal = DICT.PRICING_TYPE[engPricingType] || engPricingType;

                        return {
                            route_name: getZh(r.SubRouteName) || getZh(r.RouteName),
                            pricing_type: pricingTypeVal,
                            is_free: r.IsFreeBus === 1,
                            section_fares: (Array.isArray(r.SectionFares || r.SectionFare) ? (r.SectionFares || r.SectionFare) : [r.SectionFares || r.SectionFare]).filter(Boolean).map(sf => ({
                                direction: sf.Direction === 0 ? "去程" : (sf.Direction === 1 ? "返程" : "迴圈"),
                                buffer_zones: (sf.BufferZones || []).map(bz => ({ origin: getZh(bz.FareBufferZoneOrigin?.StopName), destination: getZh(bz.FareBufferZoneDestination?.StopName) })),
                                fares: mapFares(sf.Fares)
                            })),
                            od_fares: (Array.isArray(r.ODFares || r.StageFares) ? (r.ODFares || r.StageFares) : [r.ODFares || r.StageFares]).filter(Boolean).map(od => ({
                                direction: od.Direction === 0 ? "去程" : (od.Direction === 1 ? "返程" : "迴圈"),
                                origin: getZh(od.OriginStop?.StopName || od.OriginStage?.StopName), destination: getZh(od.DestinationStop?.StopName || od.DestinationStage?.StopName),
                                fares: mapFares(od.Fares)
                            }))
                        };
                    });

                    if (fares.length > 0) {
                        await upsertJson(env, "route_fares", ["route_key", "city", "route_name", "data", "updated_at"], [routeKey, city, route, JSON.stringify(fares), Date.now()]);
                    }
                    return send({ route, fares });
                }

                // 預設或即時動態查詢 (realtime / eta / 未指定 action 時)
                if (action === "realtime" || action === "eta" || !action) {
                    let rtfUrl = `${CONFIG.BASE_API}/${dynVer}/Bus/RealTimeByFrequency/${apiPath}`;
                    let etaUrl = `${CONFIG.BASE_API}/${dynVer}/Bus/EstimatedTimeOfArrival/${apiPath}`;

                    if (cat === 'DRTS') {
                        rtfUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/RealTimeByFrequency/City/${city}`;
                        etaUrl = `${CONFIG.BASE_API}/v3/Bus/DRTS/EstimatedTimeOfArrival/City/${city}`;
                    }

                    const [posResult, etaResult] = await Promise.all([
                        safeTdxFetch(`${rtfUrl}?$format=JSON`, token).catch(() => ({ ok: false })),
                        safeTdxFetch(`${etaUrl}?$format=JSON`, token).catch(() => ({ ok: false }))
                    ]);

                    const resPos = posResult.ok ? extractArray(posResult.data) : [];
                    const resEst = etaResult.ok ? extractArray(etaResult.data) : [];

                    const buses = resPos.filter(b => {
                        if (!match(b)) return false;
                        // 1. BusStatus 必須為 0 (0: 正常)
                        if (b.BusStatus !== 0) return false;
                        // 2. DutyStatus 不得為 2 (2: 結束勤務/下班)
                        if (b.DutyStatus === 2) return false;
                        // 3. 點位更新時間過濾：若點位時間戳記超過 10 分鐘則捨棄
                        const posTimeStr = b.GPSTime || b.SrcUpdateTime || b.DataTime;
                        if (posTimeStr) {
                            const posTime = new Date(posTimeStr).getTime();
                            if (!isNaN(posTime) && (Date.now() - posTime > 10 * 60 * 1000)) {
                                return false;
                            }
                        }
                        return true;
                    });
                    const ests = resEst.filter(e => match(e));

                    return send({
                        buses: buses.map(b => ({
                            plate: b.PlateNumb,
                            lat: b.BusPosition?.PositionLat,
                            lon: b.BusPosition?.PositionLon,
                            azi: b.Azimuth,
                            dir: b.Direction,
                            time: b.DataTime || b.SrcUpdateTime
                        })),
                        estimates: ests.reduce((acc, e) => {
                            const key = `${e.Direction}_${e.StopUID}`;
                            const sec = e.EstimateTime ?? null;

                            if (acc[key] && sec !== null && acc[key].sec !== null) {
                                acc[key].sec = Math.min(acc[key].sec, sec);
                            } else {
                                acc[key] = {
                                    sec,
                                    status: e.StopStatus ?? null,
                                    plate: e.PlateNumb && e.PlateNumb !== '-1' ? e.PlateNumb : null,
                                    isLastBus: e.IsLastBus === true,
                                    stopCountDown: e.StopCountDown ?? null,
                                    nextBusTime: e.NextBusTime ?? null,
                                    scheduledTime: e.ScheduledTime ?? null,
                                    subsequent: Array.isArray(e.Estimates)
                                        ? e.Estimates.map(sub => ({
                                            plate: sub.PlateNumb,
                                            sec: sub.EstimateTime,
                                            isLastBus: sub.IsLastBus === true,
                                            stopStatus: sub.VehicleStopStatus
                                        }))
                                        : []
                                };
                            }
                            return acc;
                        }, {})
                    });
                }
            }

            return send({
                status: "Error",
                message: "未知的 action",
                receivedAction: action,
                version: CONFIG.VERSION
            }, 400);

        } catch (e) {
            return send({
                error: "系統異常或 TDX 連線失敗",
                details: e.message,
                hint: "此錯誤代表後端有捕捉到異常，請參考 details 說明。"
            }, 500);
        }
    }
};

async function getAuthToken(env) {
    try { await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sys_config (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)`).run(); } catch (e) { }
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
            try { await env.DB.prepare(`INSERT OR REPLACE INTO sys_config (key, value, updated_at) VALUES ('tdx_token', ?, ?)`).bind(data.access_token, Date.now()).run(); } catch (e) { }
            return data.access_token;
        }
        throw new Error();
    } catch (e) { throw new Error(`TDX 授權失敗 (Token 申請遭拒)！回應內容：${text.substring(0, 150)}`); }
}

async function fetchBusNewsOrAlert(type, city, token, cat = "CityBus") {
    if (cat === "DRTS") {
        if (type === "news") return [];
        try {
            const result = await safeTdxFetch(`${CONFIG.BASE_API}/v3/Bus/DRTS/Alert/City/${city}?$format=JSON`, token);
            if (!result.ok) return [];
            return extractArray(result.data);
        } catch (e) { return []; }
    }

    const target = type === "news" ? "News" : "Alert";
    const path = city === "InterCity" ? "InterCity" : `City/${city}`;

    try {
        const result = await safeTdxFetch(`${CONFIG.BASE_API}/v2/Bus/${target}/${path}?$format=JSON`, token);

        if (!result.ok) {
            console.warn(`[TDX 公告警告] ${city} 抓取失敗:`, result.errorText);
            return [];
        }

        return extractArray(result.data);
    } catch (e) {
        console.warn(`[TDX 公告異常]`, e);
        return [];
    }
}