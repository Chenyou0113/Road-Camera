/**
 * TRA Worker v7.5.11 - Estimated Time Sorting Fix
 * Sort Key now uses (Scheduled Time + Delay) for correct train ordering
 * 
 * Deploy to Cloudflare Workers
 * Bindings:
 * - D1 Database: DB
 * - Environment Variables:
 *   - TDX_CLIENT_ID
 *   - TDX_CLIENT_SECRET
 *   - CWA_API_KEY (optional)
 */

// ==========================================
// 1. 核心輔助函式定義 (必須在 export default 之前)
// ==========================================

const getTwDateString = (offsetDays) => {
    const now = new Date();
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000) + (offsetDays * 86400000));
    return twTime.toISOString().split('T')[0];
}

const getTdxToken = async (env) => {
    const now = Math.floor(Date.now() / 1000);
    try {
        const cached = await env.DB.prepare("SELECT Value, ExpiresAt FROM AppConfig WHERE Key = 'TDX_TOKEN'").first();
        if (cached && cached.ExpiresAt > (now + 600)) {
            return cached.Value;
        }
    } catch (e) {
        console.warn("讀取 Token 快取失敗:", e.message);
    }

    console.log("🔄 重新向 TDX 申請 Token...");
    const response = await fetch("https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: env.TDX_CLIENT_ID,
            client_secret: env.TDX_CLIENT_SECRET
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`TDX Auth Failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const token = data.access_token;

    if (!token) throw new Error("TDX 回傳了 200 OK 但沒有 access_token！");

    const expiresIn = parseInt(data.expires_in) || 86400;
    const expireTime = Math.floor(now + expiresIn);

    try {
        await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)").bind('TDX_TOKEN', String(token), expireTime).run();
        console.log("✅ Token 已快取至 D1");
    } catch (e) {
        console.error("寫入 Token 快取失敗:", e.message);
    }

    return token;
}

const processTrainDataFromD1 = (t, delayMap, isTomorrow) => {
    const delay = delayMap.get(t.TrainNo) || 0;
    return {
        TrainNo: t.TrainNo, 
        Direction: t.Direction, 
        TrainTypeName: { Zh_tw: t.TrainTypeName }, 
        TrainTypeID: t.TrainTypeID, 
        EndingStationName: t.EndingStationName, 
        ScheduledDepartureTime: t.DepartureTime || t.ArrivalTime,
        DelayTime: delay, 
        IsTomorrow: isTomorrow
    };
}

// ==========================================
// 2. Worker 主體
// ==========================================

export default {
    // Cron Triggers
    async scheduled(event, env, ctx) {
        try {
            const now = new Date();
            const hour = now.getUTCHours();   
            const minute = now.getUTCMinutes(); 

            ctx.waitUntil(syncTrainLiveBoard(env));

            if (minute % 10 === 0) {
                ctx.waitUntil(syncTraAlerts(env));
            }

            if (hour === 16 && minute === 0) {
                ctx.waitUntil(
                    (async () => {
                        await syncDailyScheduleV3(env);
                        await syncSpecificTrainTimetable(env);
                    })()
                );
            }
        } catch (err) {
            console.error("Scheduled Error:", err);
        }
    },

    // HTTP Request Handler
    async fetch(request, env) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        try {
            const url = new URL(request.url);

            if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET || !env.DB) {
                throw new Error("Worker 設定錯誤：缺少環境變數或未綁定 D1 資料庫");
            }

            // === API 路由 ===

            if (url.pathname === "/api/liveboard/station") return handleLiveBoardQuery(request, env, corsHeaders);
            if (url.pathname === "/api/station/live/direct") return handleProxyRequest(env, corsHeaders, `v3/Rail/TRA/StationLiveBoard/StationID/${url.searchParams.get("station")}`);
            if (url.pathname === "/api/station/schedule") return handleProxyRequest(env, corsHeaders, `v3/Rail/TRA/DailyTrainTimetable/Station/${url.searchParams.get("stationID")}/${getTwDateString(0)}`);
            if (url.pathname === "/api/schedule") return handleScheduleQuery(request, env, corsHeaders);
            if (url.pathname === "/api/live") return handleLiveQuery(request, env, corsHeaders);
            if (url.pathname === "/api/sync") return handleManualSync(request, env, corsHeaders);
            if (url.pathname === "/health") return handleHealthCheck(env, corsHeaders);

            if (url.pathname === "/api/pids/marquee") return handleGetMarquee(env, corsHeaders);
            if (url.pathname === "/api/admin/update-pids" && request.method === "POST") return handleUpdateMarquee(request, env, corsHeaders);
            if (url.pathname === "/api/alerts") return handleGetAlerts(env, corsHeaders);

            if (url.pathname === "/api/pids/assets") return handleGetAssets(env, corsHeaders);
            if (url.pathname === "/api/admin/update-assets" && request.method === "POST") return handleUpdateAssets(request, env, corsHeaders);

            return new Response("TRA Worker v7.5.10 Running (Marquee Fix + 7 Trains per Direction)", { status: 200, headers: corsHeaders });

        } catch (e) {
            return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
                status: 500,
                headers: corsHeaders
            });
        }
    }
};

// ==========================================
// 3. 函式實現
// ==========================================

const handleLiveBoardQuery = async (request, env, headers) => {
    const url = new URL(request.url);
    const stationID = url.searchParams.get("station");
    if (!stationID) return new Response(JSON.stringify({ error: '缺少 station 參數' }), { status: 400, headers });

    try {
        const now = new Date();
        const tstOffset = 8 * 60 * 60 * 1000;
        const tstNow = new Date(now.getTime() + tstOffset);

        const currentHours = tstNow.getUTCHours();
        const currentMinutes = tstNow.getUTCMinutes();
        const nowTotalMinutes = currentHours * 60 + currentMinutes; 

        const today = getTwDateString(0);
        const tomorrow = getTwDateString(1);
        
        let yesterdaySchedule = [];
        if (currentHours < 6) {
            const yesterday = getTwDateString(-1);
            try {
                const { results } = await env.DB.prepare(
                    `SELECT * FROM TrainSchedules WHERE StationID = ? AND TrainDate = ? ORDER BY DepartureTime ASC`
                ).bind(stationID, yesterday).all();
                yesterdaySchedule = results || [];
            } catch(e) { console.error("D1 Yesterday query failed:", e.message); }
        }

        let todaySchedule = [];
        let tomorrowSchedule = [];
        try {
            const { results: ts } = await env.DB.prepare(
                `SELECT * FROM TrainSchedules WHERE StationID = ? AND TrainDate = ? ORDER BY DepartureTime ASC`
            ).bind(stationID, today).all();
            todaySchedule = ts || [];
        } catch(e) { console.error("D1 Today query failed:", e.message); }
        
        try {
            const { results: tmrs } = await env.DB.prepare(
                `SELECT * FROM TrainSchedules WHERE StationID = ? AND TrainDate = ? ORDER BY DepartureTime ASC`
            ).bind(stationID, tomorrow).all();
            tomorrowSchedule = tmrs || [];
        } catch(e) { console.error("D1 Tomorrow query failed:", e.message); }

        const delayMap = new Map();
        try {
            const { results: liveStatusData } = await env.DB.prepare(`SELECT * FROM TrainLiveStatus`).all();
            if (liveStatusData) {
                liveStatusData.forEach(t => delayMap.set(t.TrainNo, parseInt(t.DelayTime) || 0));
            }
        } catch(e) { console.error("D1 LiveStatus query failed:", e.message); }

        const uniqueTrains = new Map();

        const addTrain = (t, dayOffset) => {
            if (uniqueTrains.has(t.TrainNo)) return;

            const timeStr = t.DepartureTime || t.ArrivalTime;
            const [h, m] = timeStr.split(':').map(Number);
            const schedMinutes = h * 60 + m; 
            const delay = delayMap.get(t.TrainNo) || 0;

            // 🔥 修正排序邏輯：使用 預計開車時間 (排定時間 + 延誤時間)
            const sortKey = (schedMinutes + delay) + (dayOffset * 1440); 
            
            const estimatedRelativeMinutes = (schedMinutes + delay) + (dayOffset * 1440);

            if (estimatedRelativeMinutes >= nowTotalMinutes) {
                const isTomorrow = (dayOffset === 1);
                const processed = processTrainDataFromD1(t, delayMap, isTomorrow);
                processed._sortKey = sortKey; // 使用修正後的 sortKey
                uniqueTrains.set(t.TrainNo, processed);
            }
        };

        if (yesterdaySchedule.length > 0) yesterdaySchedule.forEach(t => addTrain(t, -1));
        if (todaySchedule) todaySchedule.forEach(t => addTrain(t, 0));
        if (tomorrowSchedule) tomorrowSchedule.forEach(t => addTrain(t, 1));

        let allTrains = Array.from(uniqueTrains.values());
        allTrains.sort((a, b) => a._sortKey - b._sortKey);

        // 🔥 修正: 確保返回 7 班車 (每方向)
        const LIVEBOARD_COUNT = 7; 
        const trains0 = allTrains.filter(t => String(t.Direction) === '0').slice(0, LIVEBOARD_COUNT);
        const trains1 = allTrains.filter(t => String(t.Direction) === '1').slice(0, LIVEBOARD_COUNT);

        const clean = (list) => list.map(t => { delete t._sortKey; return t; });

        return new Response(JSON.stringify([...clean(trains0), ...clean(trains1)]), {
            headers: {
                ...headers,
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=30'
            }
        });

    } catch (e) {
        return new Response(JSON.stringify([]), { headers: { ...headers, 'Content-Type': 'application/json' } });
    }
}

const handleScheduleQuery = async (request, env, headers) => {
    const url = new URL(request.url);
    const trainNo = url.searchParams.get("trainNo");
    if (!trainNo) return new Response(JSON.stringify([]), { headers });

    try {
        const today = getTwDateString(0);
        let results = [];
        const { results: todayResults } = await env.DB.prepare(`SELECT * FROM TrainSchedules WHERE TrainNo = ? AND TrainDate = ? ORDER BY StopSequence ASC`).bind(trainNo, today).all();
        if (todayResults && todayResults.length > 0) {
            results = todayResults;
        } else {
            const { results: anyResults } = await env.DB.prepare(`SELECT * FROM TrainSchedules WHERE TrainNo = ? ORDER BY TrainDate DESC, StopSequence ASC`).bind(trainNo).all();
            results = anyResults;
        }

        if (!results || results.length === 0) return new Response(JSON.stringify([]), { headers });

        const first = results[0];
        const uniqueStops = results.filter((v, i, a) => a.findIndex(t => (t.StopSequence === v.StopSequence)) === i);

        const formattedData = [{
            TrainInfo: { 
                TrainNo: first.TrainNo, 
                Direction: first.Direction, 
                TrainTypeName: { Zh_tw: first.TrainTypeName },
                TrainTypeID: first.TrainTypeID 
            },
            StopTimes: uniqueStops.map(r => ({ StopSequence: r.StopSequence, StationID: r.StationID, StationName: { Zh_tw: r.StationName }, ArrivalTime: r.ArrivalTime || "", DepartureTime: r.DepartureTime || "" }))
        }];
        return new Response(JSON.stringify(formattedData), { headers });
    } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers }); }
}

const handleLiveQuery = async (request, env, headers) => {
    const url = new URL(request.url);
    const trainNo = url.searchParams.get("trainNo");
    try {
        let results;
        if (trainNo) {
            results = await env.DB.prepare("SELECT * FROM TrainLiveStatus WHERE TrainNo = ?").bind(trainNo).first();
            if (!results) return new Response(JSON.stringify({}), { headers });
        } else {
            const data = await env.DB.prepare("SELECT * FROM TrainLiveStatus").all();
            results = data.results;
        }
        const responseData = { TrainLiveBoards: trainNo ? [{ TrainNo: results.TrainNo, StationID: results.StationID, StationName: { Zh_tw: results.StationName }, DelayTime: results.DelayTime }] : results };
        return new Response(JSON.stringify(responseData), { headers });
    } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers }); }
}

const handleManualSync = async (request, env, headers) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    try {
        if (type === 'live') {
            const count = await syncTrainLiveBoard(env);
            return new Response(`✅ 即時動態 (Live V3) 同步成功 (共 ${count} 筆)`, { headers });
        }
        else if (type === 'schedule') {
            const count = await syncDailyScheduleV3(env);
            return new Response(`✅ 今日時刻表 (Schedule V3) 同步成功 (共寫入 ${count} 站)`, { headers });
        }
        else if (type === 'alerts') {
            const count = await syncTraAlerts(env);
            return new Response(`✅ 營運通阻公告同步成功 (共 ${count} 筆)`, { headers });
        }
        else if (type === 'specific') {
            const count = await syncSpecificTrainTimetable(env);
            return new Response(`✅ 特殊車次 (Specific V3) 同步成功 (共寫入 ${count} 站)`, { headers });
        }
        return new Response("請指定 ?type=live, ?type=schedule, ?type=alerts 或 ?type=specific", { headers });
    } catch (e) {
        return new Response(`❌ 同步失敗: ${e.message}`, { status: 500, headers });
    }
}

const handleHealthCheck = async (env, headers) => {
    try {
        const liveCount = await env.DB.prepare(`SELECT COUNT(*) as count FROM TrainLiveStatus`).first();
        const schedCount = await env.DB.prepare(`SELECT COUNT(*) as count FROM TrainSchedules`).first();
        return new Response(JSON.stringify({ status: "healthy", live_records: liveCount.count, schedule_records: schedCount.count }), { headers, status: 200 });
    } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers }); }
}

// 🔥 修正: 跑馬燈內容拼接確保宣導語出現
const handleGetMarquee = async (env, headers) => {
    try {
        const { results: alerts } = await env.DB.prepare(
            "SELECT Title, Description, Status FROM TraAlerts ORDER BY PublishTime DESC LIMIT 5" 
        ).all();

        let alertHtml = "";
        
        if (alerts && alerts.length > 0) {
            const importantAlerts = [];
            const seenTitles = new Set();
            for (const a of alerts) {
                const text = (a.Title + a.Description);
                if (text.includes("詐騙") || text.includes("平交道") || text.includes("徵才")) continue;
                if (seenTitles.has(a.Title)) continue;
                seenTitles.add(a.Title);
                importantAlerts.push(a);
            }
            
            const MAX_DESC_LENGTH = 50; 
            
            const alertList = importantAlerts.map(a => {
                // 移除 HTML 標籤、nbsp 實體、換行符
                let cleanDescription = a.Description
                    .replace(/<\/?[^>]+(>|$)/g, "") 
                    .replace(/&nbsp;+/g, " ")       
                    .replace(/[\r\n]+/g, " ")       
                    .trim();
                
                // 限制描述長度
                cleanDescription = cleanDescription.substring(0, MAX_DESC_LENGTH) + (cleanDescription.length > MAX_DESC_LENGTH ? '...' : '');
                
                return `⚠️ <b>【${a.Title}】</b> ${cleanDescription}`;
            });
            
            if (alertList.length > 0) {
                alertHtml = alertList.join("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"); 
            }
        }

        const config = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_TOP_MARQUEE'").first();
        const defaultPropaganda = "搭乘列車請全程配戴口罩 (建議)。請勿跨越軌道或在月台上奔跑。"; 
        const propagandaText = config?.Value || defaultPropaganda;

        let finalText = "";
        const Separator = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"; 

        if (alertHtml) {
            // Alert 內容 + 大空白分隔 + 宣導標語
            finalText = `${alertHtml}${Separator}${propagandaText}`;
        } else {
            // 如果沒有 Alert，只顯示宣導語
            finalText = propagandaText;
        }

        // 如果 finalText 還是空的，給予預設值
        if (finalText.trim() === '') {
            finalText = defaultPropaganda;
        }

        return new Response(JSON.stringify({ text: finalText }), {
            headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ text: "系統連線中..." }), { headers });
    }
}

const handleUpdateMarquee = async (request, env, headers) => {
    try {
        const body = await request.json();
        const newText = body.text;
        if (typeof newText !== 'string' || newText.trim() === "") return new Response(JSON.stringify({ error: "無效文字" }), { status: 400, headers });

        await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)").bind('PIDS_TOP_MARQUEE', newText, 9999999999).run();
        return new Response(JSON.stringify({ success: true, message: "PIDS 宣導文字已更新", text: newText }), { headers: { ...headers, 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
}

const handleGetAssets = async (env, headers) => {
    try {
        const imgRes = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_IMAGES'").first();
        const vidRes = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_VIDEO'").first();
        
        let images = [];
        let video = [];
        
        try { images = JSON.parse(imgRes?.Value || "[]"); } catch(e) {}
        
        try { video = JSON.parse(vidRes?.Value || "[]"); } catch(e) { 
            video = vidRes?.Value ? [vidRes.Value] : [];
        }
        
        if (images.length === 0) {
            images = [
                "https://www.railway.gov.tw/tra-tip-web/static/images/hero-bg-01.jpg",
                "https://www.railway.gov.tw/tra-tip-web/static/images/hero-bg-02.jpg",
                "https://www.railway.gov.tw/tra-tip-web/static/images/hero-bg-03.jpg"
            ];
        }

        if (video.length === 0) {
            video = ["https://www.youtube.com/watch?v=5k5x-8s81kQ"];
        }

        const data = {
            images: images,
            video: video, 
            marquee_speed: 40 
        };

        return new Response(JSON.stringify(data), {
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
}

const handleUpdateAssets = async (request, env, headers) => {
    try {
        const body = await request.json();
        
        const images = JSON.stringify(body.images || []);
        const video = JSON.stringify(body.video || []); 

        await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('PIDS_IMAGES', ?)").bind(images).run();
        await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('PIDS_VIDEO', ?)").bind(video).run();

        return new Response(JSON.stringify({ success: true, message: "多媒體設定已更新" }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
}

const handleGetAlerts = async (env, headers) => {
    try {
        const { results: alerts } = await env.DB.prepare("SELECT * FROM TraAlerts ORDER BY PublishTime DESC LIMIT 10").all();
        return new Response(JSON.stringify(alerts || []), { headers: { ...headers, 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify([]), { headers });
    }
}

const handleProxyRequest = async (env, headers, path) => {
    try {
        const token = await getTdxToken(env);
        const tdxUrl = `https://tdx.transportdata.tw/api/basic/${path}?%24format=JSON`;
        const response = await fetch(tdxUrl, { headers: { "Authorization": `Bearer ${token}` } });
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
}

const syncTrainLiveBoard = async (env) => {
    try {
        const tdxUrl = "https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard?%24format=JSON";
        const token = await getTdxToken(env);
        const response = await fetch(tdxUrl, { headers: { "Authorization": `Bearer ${token}` } });

        if (!response.ok) throw new Error(`TDX API Error: ${response.status}`);

        const json = await response.json();
        const trains = json.TrainLiveBoards || [];

        if (trains.length === 0) return 0;

        await env.DB.prepare("DELETE FROM TrainLiveStatus").run();

        const BATCH_SIZE = 50;
        let statements = [];

        for (const t of trains) {
            statements.push(
                env.DB.prepare(
                    `INSERT OR REPLACE INTO TrainLiveStatus (TrainNo, StationID, StationName, DelayTime, UpdateTimestamp) 
                     VALUES (?, ?, ?, ?, datetime('now'))`
                ).bind(
                    t.TrainNo,
                    t.StationID || "",
                    t.StationName?.Zh_tw || "",
                    parseInt(t.DelayTime) || 0
                )
            );

            if (statements.length >= BATCH_SIZE) {
                await env.DB.batch(statements);
                statements = [];
            }
        }

        if (statements.length > 0) await env.DB.batch(statements);
        return trains.length;

    } catch (e) {
        console.error("LiveSync Error", e);
        throw e;
    }
}

const syncDailyScheduleV3 = async (env) => {
    console.log("開始執行 V3 定期時刻表同步...");
    const token = await getTdxToken(env);
    const today = getTwDateString(0);
    const tdxUrl = `https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/Today?%24format=JSON`;

    const response = await fetch(tdxUrl, { headers: { "Authorization": `Bearer ${token}` } });
    if (!response.ok) throw new Error(`V3 Schedule Download Failed: ${response.status}`);
    
    const json = await response.json();
    const trains = json.TrainTimetables || [];

    if (trains.length === 0) return 0;

    console.log(`取得 ${trains.length} 筆列車資料，開始寫入 D1...`);
    await env.DB.prepare("DELETE FROM TrainSchedules WHERE TrainDate = ?").bind(today).run();

    const BATCH_SIZE = 100;
    let statements = [];
    let count = 0;

    for (const train of trains) {
        const info = train.TrainInfo;
        if (!info || !train.StopTimes) continue;
        const endingStationName = info.EndingStationName?.Zh_tw || "未知";
        for (const stop of train.StopTimes) {
            statements.push(
                env.DB.prepare(
                    `INSERT INTO TrainSchedules (TrainNo, Direction, TrainTypeName, StopSequence, StationID, StationName, ArrivalTime, DepartureTime, TrainDate, EndingStationName, TrainTypeID) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    info.TrainNo, 
                    info.Direction || 0, 
                    info.TrainTypeName?.Zh_tw || "列車", 
                    stop.StopSequence || 0, 
                    stop.StationID || "", 
                    stop.StationName?.Zh_tw || "", 
                    stop.ArrivalTime || "", 
                    stop.DepartureTime || "", 
                    today, 
                    endingStationName,
                    info.TrainTypeID || "" 
                )
            );
            count++;
            if (statements.length >= BATCH_SIZE) { await env.DB.batch(statements); statements = []; }
        }
    }
    
    if (statements.length > 0) await env.DB.batch(statements);
    return count;
}

const syncSpecificTrainTimetable = async (env) => {
    console.log("開始執行特殊車次同步...");
    const token = await getTdxToken(env);
    const tdxUrl = "https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/SpecificTrainTimetable?%24format=JSON";
    const response = await fetch(tdxUrl, { headers: { "Authorization": `Bearer ${token}` } });
    
    if (!response.ok) throw new Error(`Specific Schedule Failed: ${response.status}`);
    const json = await response.json();
    const trains = json.TrainTimetables || [];

    if (trains.length === 0) {
        console.log("目前無特殊車次資料");
        return 0;
    }

    const today = getTwDateString(0); 
    const BATCH_SIZE = 100;
    let statements = [];
    let count = 0;

    for (const train of trains) {
        const info = train.TrainInfo;
        const serviceDay = train.ServiceDay || train.SpecialDay;
        
        if (!info || !train.StopTimes || !serviceDay) continue;

        let runsToday = false;
        if (serviceDay.Dates && Array.isArray(serviceDay.Dates)) {
             if (serviceDay.Dates.some(d => (d.Date === today || d === today))) runsToday = true;
        }
        if (!runsToday && serviceDay.DatePeriod) {
            const start = serviceDay.DatePeriod.StartDate;
            const end = serviceDay.DatePeriod.EndDate;
            if (start && end && today >= start && today <= end) runsToday = true;
        }

        if (!runsToday) continue;

        const endingStationName = info.EndingStationName?.Zh_tw || "加班車";

        for (const stop of train.StopTimes) {
            statements.push(
                env.DB.prepare(
                    `INSERT INTO TrainSchedules (TrainNo, Direction, TrainTypeName, StopSequence, StationID, StationName, ArrivalTime, DepartureTime, TrainDate, EndingStationName, TrainTypeID) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    info.TrainNo, 
                    info.Direction || 0, 
                    info.TrainTypeName?.Zh_tw || "列車", 
                    stop.StopSequence || 0, 
                    stop.StationID || "", 
                    stop.StationName?.Zh_tw || "", 
                    stop.ArrivalTime || "", 
                    stop.DepartureTime || "", 
                    today, 
                    endingStationName,
                    info.TrainTypeID || "" 
                )
            );
            count++;
            if (statements.length >= BATCH_SIZE) { await env.DB.batch(statements); statements = []; }
        }
    }

    if (statements.length > 0) await env.DB.batch(statements);
    console.log(`✅ 特殊車次同步完成，共寫入 ${count} 筆停靠站資料`);
    return count;
}

const syncTraAlerts = async (env) => {
    try {
        const tdxUrl = "https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Alert?%24format=JSON";
        const token = await getTdxToken(env);
        const response = await fetch(tdxUrl, { headers: { "Authorization": `Bearer ${token}` } });

        if (!response.ok) throw new Error(`TDX Alert API Error: ${response.status}`);
        
        const json = await response.json();
        const alerts = json.Alerts || [];

        await env.DB.prepare("DELETE FROM TraAlerts").run();

        if (alerts.length === 0) return 0;

        const BATCH_SIZE = 50;
        let statements = [];

        for (const a of alerts) {
            statements.push(
                env.DB.prepare(`INSERT INTO TraAlerts (AlertID, Title, Description, Status, Scope, PublishTime) VALUES (?, ?, ?, ?, ?, ?)`)
                .bind(a.AlertID, a.Title || "通阻公告", a.Description || "", a.Status || "Unknown", JSON.stringify(a.Scope || {}), a.PublishTime || new Date().toISOString())
            );

            if (statements.length >= BATCH_SIZE) {
                await env.DB.batch(statements);
                statements = [];
            }
        }

        if (statements.length > 0) await env.DB.batch(statements);
        console.log(`✅ 已同步 ${alerts.length} 筆營運公告`);
        return alerts.length;

    } catch (e) {
        console.error("Sync Alerts Error:", e);
    }
}
