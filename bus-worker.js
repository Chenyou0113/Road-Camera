/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TDX 公車 Cloudflare Worker — 最終救贖旗艦版 (v27.0)           ║
 * ║  整合項目：全台分頁同步、D1快照、聯營合併、動態、時刻表、票價    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const CONFIG = {
    VERSION: "v27.0-Master-D1-Timetable-Fare",
    CITIES: ["Taipei", "NewTaipei", "Taoyuan", "Taichung", "Tainan", "Kaohsiung", "Keelung", "InterCity"],
    TOKEN_URL: "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token",
    BASE_API: "https://tdx.transportdata.tw/api/basic",
    CORS: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
};

// --- PDF 規範字典 (依據標準文件 Page 74-75) ---
const DICT = {
    TICKET_TYPE: { 1: "一般票", 2: "來回票", 3: "電子票證", 4: "回數票", 5: "定期票(30天)", 6: "定期票(60天)", 7: "早鳥票" },
    FARE_CLASS: { 1: "成人", 2: "學生", 3: "孩童", 4: "敬老", 5: "愛心", 6: "愛心孩童", 7: "愛心陪伴", 8: "團體", 9: "軍警" },
    PRICING_TYPE: { "SectionFare": "段次計費", "ODFares": "起迄站間計費", "StageFares": "計費站區間收費" }
};

// --- 工具函數：強型別與名稱淨化 ---
const getZh = (obj) => (typeof obj === 'object' ? (obj?.Zh_tw || "") : (obj || "")).toString().trim();

// 🌟 核心淨化：移除客運公司、調度贅字、往返資訊
const norm = (n) => {
    if (!n) return "";
    return n.replace(/[\(（][^\)）]*[\)）]/g, "")
            .replace(/(去程半|返程半|去程|返程|狗狗公車|動物園專車|夜間公車|區間車|區|繞駛|繞|延駛|延|調度站發車|發車|往[^\s]+|經[^\s]+)/g, "")
            .trim();
};

// 服務日格式化 (依據 PDF 文件 ServiceDay 結構)
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

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const params = url.searchParams;
        if (request.method === "OPTIONS") return new Response(null, { headers: CONFIG.CORS });

        const send = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: CONFIG.CORS });

        try {
            const token = await getAuthToken(env);
            const action = params.get("action");
            const route = params.get("route");
            const city = params.get("city") || "Taipei";
            const cat = params.get("category") || "CityBus";

            // ── 1. D1 資料表初始化 ────────────────────────
            if (action === "db_init") {
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS routes (uid TEXT PRIMARY KEY, city TEXT, name TEXT, departure TEXT, destination TEXT, type TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bus_snapshot (id INTEGER PRIMARY KEY AUTOINCREMENT, plate TEXT, route_name TEXT, lat REAL, lon REAL, time TEXT)`).run();
                return send({ status: "D1 Tables Initialized" });
            }

            // ── 2. 核心大掃除同步 ──────────────────────────
            if (action === "sync_db") {
                const startTime = Date.now();
                const targetCity = params.get("city");
                const list = targetCity ? [targetCity] : CONFIG.CITIES;

                let added = 0;
                for (const c of list) {
                    const syncVer = (c === "Tainan") ? "v3" : "v2";
                    const path = (c === "InterCity") ? "v2/Bus/StopOfRoute/InterCity" : `${syncVer}/Bus/StopOfRoute/City/${c}`;

                    const res = await fetch(`${CONFIG.BASE_API}/${path}?$format=JSON`, { headers: { Authorization: `Bearer ${token}` } });
                    const text = await res.text();
                    if (!res.ok) continue;

                    const data = JSON.parse(text);
                    if (Array.isArray(data)) {
                        const stmt = env.DB.prepare("INSERT OR REPLACE INTO routes (uid, city, name, departure, destination, type, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
                        let batch = [], seen = new Set();

                        data.forEach(r => {
                            if (!r.Stops || r.Stops.length < 2) return;
                            const rName = getZh(r.RouteName);
                            let finalName = norm(getZh(r.SubRouteName) || rName);
                            if (rName && !finalName.includes(norm(rName))) finalName = `${norm(rName)} ${finalName}`;

                            if (!seen.has(`${c}_${finalName}`)) {
                                seen.add(`${c}_${finalName}`);
                                batch.push(stmt.bind(r.SubRouteUID || r.RouteID, c, finalName, getZh(r.Stops[0].StopName), getZh(r.Stops[r.Stops.length - 1].StopName), (c === "InterCity" ? "InterCity" : "CityBus"), startTime));
                            }
                        });
                        if (batch.length) { await env.DB.batch(batch); added += batch.length; }
                    }
                }
                if (!targetCity) await env.DB.prepare("DELETE FROM routes WHERE updated_at < ?").bind(startTime).run();
                return send({ status: "success", added_or_updated: added });
            }

            // ── 3. 列表搜尋 ──────────────────────────────
            if (action === "list_all") {
                const search = params.get("search");
                let sql = "SELECT name, departure, destination, city, type FROM routes WHERE 1=1";
                let binds = [];
                if (search) { sql += " AND (name LIKE ? OR departure LIKE ? OR destination LIKE ?)"; binds.push(`%${search}%`, `%${search}%`, `%${search}%`); }
                if (params.get("city")) { sql += " AND city = ?"; binds.push(params.get("city")); }
                const { results } = await env.DB.prepare(sql + " ORDER BY name ASC LIMIT 1000").bind(...binds).all();
                return send(results || []);
            }

            // ── 4. 特定路線查詢 (動態、時刻表、票價) ────────────────────────
            if (route) {
                const isInter = cat === "InterCity";
                const ver = isInter ? "v2" : (city === "Tainan" ? "v3" : "v2");
                const path = isInter ? "InterCity" : `City/${city}`;
                const routePrefix = route.split(' ')[0];
                const filter = `?$filter=contains(RouteName/Zh_tw,'${encodeURIComponent(routePrefix)}')&$format=JSON`;
                const targetNorm = norm(route);
                const match = (i) => norm(getZh(i.SubRouteName) || getZh(i.RouteName)) === targetNorm;

                // 🔸 4A. 取得時刻表 (Schedule)
                if (action === "timetable") {
                    const res = await fetch(`${CONFIG.BASE_API}/${ver}/Bus/Schedule/${path}${filter}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) return send({ error: "Failed to fetch timetable" }, res.status);
                    const data = await res.json();

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
                    return send({ route, timetables });
                }

                // 🔸 4B. 取得票價資訊 (RouteFare)
                if (action === "fare") {
                    const res = await fetch(`${CONFIG.BASE_API}/${ver}/Bus/RouteFare/${path}${filter}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) return send({ error: "Failed to fetch fares" }, res.status);
                    const data = await res.json();

                    const fares = data.filter(match).map(r => {
                        const pricingType = DICT.PRICING_TYPE[r.FarePricingType] || r.FarePricingType;

                        const mapFares = (fareArray) => (fareArray || []).map(f => ({
                            type: DICT.TICKET_TYPE[f.TicketType] || `類別${f.TicketType}`,
                            class: DICT.FARE_CLASS[f.FareClass] || `對象${f.FareClass}`,
                            price: f.Price
                        }));

                        return {
                            route_name: getZh(r.SubRouteName) || getZh(r.RouteName),
                            pricing_type: pricingType,
                            is_free: r.IsFreeBus === 1,
                            section_fares: (r.SectionFare || []).map(sf => ({
                                direction: sf.Direction === 0 ? "去程" : "返程",
                                buffer_zones: (sf.BufferZones || []).map(bz => ({
                                    origin: getZh(bz.FareBufferZoneOrigin?.OriginStopName),
                                    destination: getZh(bz.FareBufferZoneDestination?.DestinationStopName)
                                })),
                                fares: mapFares(sf.Fares)
                            })),
                            od_fares: (r.ODFares || r.StageFares || []).map(od => ({
                                direction: od.Direction === 0 ? "去程" : "返程",
                                origin: getZh(od.OriginStop?.StopName || od.OriginStage?.StopName),
                                destination: getZh(od.DestinationStop?.StopName || od.DestinationStage?.StopName),
                                fares: mapFares(od.Fares)
                            }))
                        };
                    });
                    return send({ route, fares });
                }

                // 🔸 4C. 預設：取得即時動態 (RealTime & EstimatedTime)
                const [resPos, resEst] = await Promise.all([
                    fetch(`${CONFIG.BASE_API}/${ver}/Bus/RealTimeByFrequency/${path}${filter}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`${CONFIG.BASE_API}/${ver}/Bus/EstimatedTimeOfArrival/${path}${filter}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
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

            // ── 5. 首頁狀態檢查 ──────────────────────────────
            const { results } = await env.DB.prepare("SELECT COUNT(*) as total FROM routes").all();
            return send({ status: "running", version: CONFIG.VERSION, db_count: results[0].total });

        } catch (e) {
            return send({ error: e.message, hint: "請檢查 API Key 或網路連線。" }, 500);
        }
    }
};

// --- Token 取得 (強韌化版本) ---
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