/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TDX 公車 Cloudflare Worker — 最終救贖旗艦版 (v26.0)           ║
 * ║  整合項目：全台分頁同步、D1歷史快照、聯營合併、自動大掃除        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const CONFIG = {
    VERSION: "v26.0-Master-D1",
    CITIES: ["Taipei", "NewTaipei", "Taoyuan", "Taichung", "Tainan", "Kaohsiung", "Keelung", "InterCity"],
    TOKEN_URL: "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token",
    BASE_API: "https://tdx.transportdata.tw/api/basic",
    CORS: { 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Methods": "GET, OPTIONS", 
        "Access-Control-Allow-Headers": "Content-Type, Authorization" 
    }
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

            // ── 1. D1 資料表初始化 (呼叫一次即可) ────────────────────────
            if (action === "db_init") {
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS routes (uid TEXT PRIMARY KEY, city TEXT, name TEXT, departure TEXT, destination TEXT, type TEXT, updated_at INTEGER)`).run();
                await env.DB.prepare(`CREATE TABLE IF NOT EXISTS bus_snapshot (id INTEGER PRIMARY KEY AUTOINCREMENT, plate TEXT, route_name TEXT, lat REAL, lon REAL, time TEXT)`).run();
                return send({ status: "D1 Tables Initialized" });
            }

            // ── 2. 核心大掃除同步 (分段抓取，防 30s 超時) ──────────────────
            if (action === "sync_db") {
                const startTime = Date.now();
                const targetCity = params.get("city"); // 支援單一城市同步 ?city=Taipei
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
                            // 合併邏輯：307莒光 -> 307
                            if (rName && !finalName.includes(norm(rName))) finalName = `${norm(rName)} ${finalName}`;

                            if (!seen.has(`${c}_${finalName}`)) {
                                seen.add(`${c}_${finalName}`);
                                batch.push(stmt.bind(r.SubRouteUID || r.RouteID, c, finalName, getZh(r.Stops[0].StopName), getZh(r.Stops[r.Stops.length-1].StopName), (c==="InterCity"?"InterCity":"CityBus"), startTime));
                            }
                        });
                        if (batch.length) { await env.DB.batch(batch); added += batch.length; }
                    }
                }
                // 只有全量同步時才刪除幽靈路線
                if (!targetCity) await env.DB.prepare("DELETE FROM routes WHERE updated_at < ?").bind(startTime).run();
                return send({ status: "success", added_or_updated: added });
            }

            // ── 3. 列表搜尋 (list_all) ──────────────────────────────
            if (action === "list_all") {
                const search = params.get("search");
                let sql = "SELECT name, departure, destination, city, type FROM routes WHERE 1=1";
                let binds = [];
                if (search) { sql += " AND (name LIKE ? OR departure LIKE ? OR destination LIKE ?)"; binds.push(`%${search}%`, `%${search}%`, `%${search}%`); }
                if (params.get("city")) { sql += " AND city = ?"; binds.push(params.get("city")); }
                const { results } = await env.DB.prepare(sql + " ORDER BY name ASC LIMIT 1000").bind(...binds).all();
                return send(results || []);
            }

            // ── 4. 即時動態與代理 (最核心：解決 265, 307 合併問題) ──────────────
            if (route) {
                const isInter = cat === "InterCity";
                const ver = isInter ? "v2" : (city === "Tainan" ? "v3" : "v2");
                const path = isInter ? "InterCity" : `City/${city}`;
                // 關鍵：使用包含搜尋，讓 265區、265夜 同步出現
                const filter = `?$filter=contains(RouteName/Zh_tw,'${encodeURIComponent(route.split(' ')[0])}')&$format=JSON`;

                // 處理 A1 位置與 N1 預估
                const [resPos, resEst] = await Promise.all([
                    fetch(`${CONFIG.BASE_API}/${ver}/Bus/RealTimeByFrequency/${path}${filter}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`${CONFIG.BASE_API}/${ver}/Bus/EstimatedTimeOfArrival/${path}${filter}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
                ]);

                const target = norm(route);
                const match = (i) => norm(getZh(i.SubRouteName) || getZh(i.RouteName)) === target;

                const buses = (Array.isArray(resPos) ? resPos : []).filter(b => b.BusStatus === 0 && match(b));
                const ests = (Array.isArray(resEst) ? resEst : []).filter(e => match(e));

                return send({
                    buses: buses.map(b => ({ plate: b.PlateNumb, lat: b.BusPosition?.PositionLat, lon: b.BusPosition?.PositionLon, azi: b.Azimuth, dir: b.Direction })),
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

            // 預設回應：檢查資料庫狀態
            const { results } = await env.DB.prepare("SELECT COUNT(*) as total FROM routes").all();
            return send({ status: "running", version: CONFIG.VERSION, db_count: results[0].total });

        } catch (e) {
            return send({ error: e.message, hint: "請檢查 TDX_CLIENT_ID 是否正確設定於環境變數中。" }, 500);
        }
    }
};

// --- Token 取得 (強韌化版本：報錯會顯示 TDX 的原始回應) ---
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
        throw new Error(text);
    } catch (e) {
        throw new Error(`TDX 授權失敗！請檢查 API Key。回應內容：${text.substring(0, 100)}`);
    }
}