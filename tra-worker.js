/**
 * ==============================================================================
 * 🚀 TRA Worker v9.3.6 (Masterpiece - Zero Cost & Standardized)
 * ==============================================================================
 * 1. 依照 TRA Inbound 標準 (PDF p.84-88) 優化即時動態抓取。
 * 2. 採用 JSON Blob 打包模式，徹底解決 $44 鎂帳單問題。
 * 3. 完整路由：看板、時刻表、站到站、票價、通阻、PIDS資產。
 */

const getTwDateString = (offsetDays = 0) => {
    const twTime = new Date(Date.now() + (8 * 3600000) + (offsetDays * 86400000));
    return twTime.toISOString().split('T')[0];
};

const getTdxToken = async (env) => {
    const now = Math.floor(Date.now() / 1000);
    try {
        const cached = await env.DB.prepare("SELECT Value, ExpiresAt FROM AppConfig WHERE Key = 'TDX_TOKEN'").first();
        if (cached && cached.ExpiresAt > (now + 600)) return cached.Value;
    } catch (e) {}
    const res = await fetch("https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.TDX_CLIENT_ID, client_secret: env.TDX_CLIENT_SECRET })
    });
    const data = await res.json();
    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES ('TDX_TOKEN', ?, ?)").bind(data.access_token, now + (data.expires_in || 86400)).run();
    return data.access_token;
};

// --- 核心同步：時刻表 Blob 化 ---
const syncDailyScheduleBlob = async (env) => {
    const token = await getTdxToken(env);
    const dates = [0, 1, 2, 3, 4].map(getTwDateString); 
    const expireTime = Math.floor(Date.now() / 1000) + (7 * 86400); 

    for (const date of dates) {
        const res = await fetch(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${date}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } });
        if (!res.ok) continue;
        const json = await res.json(), trains = json.TrainTimetables || [];
        if (!trains.length) continue;

        let stationMap = {}; let trainMap = {};   
        for (const t of trains) {
            const no = t.TrainInfo.TrainNo;
            const note = t.TrainInfo.Note?.Zh_tw || "";
            const tripLine = t.TrainInfo.TripLine || 0; 
            trainMap[no] = { Note: note, TripLine: tripLine, Stops: [] };

            for (const s of t.StopTimes) {
                const sid = s.StationID;
                trainMap[no].Stops.push({ Seq: s.StopSequence, SID: sid, Name: s.StationName?.Zh_tw, Arr: s.ArrivalTime, Dep: s.DepartureTime });
                if (!stationMap[sid]) stationMap[sid] = [];
                stationMap[sid].push({
                    No: no, Dir: t.TrainInfo.Direction || 0, Type: t.TrainInfo.TrainTypeName?.Zh_tw || "列車",
                    Dest: t.TrainInfo.EndingStationName?.Zh_tw, Arr: s.ArrivalTime, Dep: s.DepartureTime, Seq: s.StopSequence, Note: note, TripLine: tripLine 
                });
            }
        }
        let batch = [];
        for (const [sid, arr] of Object.entries(stationMap)) batch.push(env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)").bind(`SCH_STA_${sid}_${date}`, JSON.stringify(arr), expireTime));
        for (const [tno, obj] of Object.entries(trainMap)) batch.push(env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)").bind(`SCH_TRN_${tno}_${date}`, JSON.stringify(obj), expireTime));
        await env.DB.batch(batch);
    }
};

// --- 核心同步：即時動態 (符合 PDF 規範) ---
const syncTrainLiveBoard = async (env) => {
    const token = await getTdxToken(env);
    const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard?%24format=JSON", { headers: { "Authorization": `Bearer ${token}` } });
    if(!res.ok) return;
    const json = await res.json(), liveMap = {};
    (json.TrainLiveBoards || []).forEach(t => { 
        // 依照 PDF p.84 解析站名與狀態
        let curStation = t.StationName ? (t.StationName.Zh_tw || "") : (t.StationID || "");
        liveMap[t.TrainNo] = { 
            delay: Number(t.DelayTime) || 0, 
            status: Number(t.TrainStatus) || 0, // 0:準點, 1:誤點, 2:停駛
            station: curStation 
        }; 
    });
    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('LIVE_DATA', ?)").bind(JSON.stringify(liveMap)).run();
};

const syncTraAlerts = async (env) => {
    const token = await getTdxToken(env), res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Alert?%24format=JSON", { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return;
    const alerts = (await res.json()).Alerts.map(a => ({ 
        AlertID: a.AlertID, Title: a.Title, 
        Description: a.Description.replace(/([一-龥]+)\s*[=＝\s]\s*([一-龥]+)/g, '$1＜－－＞$2').trim(), Status: a.Status 
    }));
    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('ALERTS_DATA', ?)").bind(JSON.stringify(alerts)).run();
};

export default {
    async scheduled(event, env, ctx) {
        ctx.waitUntil(Promise.allSettled([syncTrainLiveBoard(env), syncTraAlerts(env)]));
        if (new Date().getUTCHours() === 20) ctx.waitUntil(syncDailyScheduleBlob(env));
    },
    async fetch(request, env) {
        const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
        if (request.method === "OPTIONS") return new Response(null, { headers: cors });
        const url = new URL(request.url);

        try {
            if (url.pathname === "/api/liveboard/station") {
                const sid = url.searchParams.get("station"), date = url.searchParams.get("date") || getTwDateString(0);
                const isToday = date === getTwDateString(0);
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_STA_${sid}_${date}`).first();
                let trains = row ? JSON.parse(row.Value) : [];
                const liveR = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'LIVE_DATA'").first();
                const liveM = liveR ? JSON.parse(liveR.Value) : {};
                const nowM = (new Date().getUTCHours() + 8) % 24 * 60 + new Date().getUTCMinutes();

                const res = trains.map(t => {
                    const l = liveM[t.No] || { delay: 0, status: 0, station: "" };
                    const [h, m] = (t.Dep || t.Arr).split(':').map(Number);
                    let act = (h * 60 + m) + (isToday ? l.delay : 0);
                    return { TrainNo: t.No, Direction: t.Dir, TrainTypeName: { Zh_tw: t.Type }, EndingStationName: t.Dest, ScheduledDepartureTime: t.Dep || t.Arr, DelayTime: isToday ? l.delay : 0, TrainStatus: isToday ? l.status : 0, Note: t.Note, TripLine: t.TripLine, _act: act };
                }).filter(t => !isToday || t._act >= nowM - 30 || t.TrainStatus === 2).sort((a,b) => a._act - b._act);
                return new Response(JSON.stringify(res), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            if (url.pathname === "/api/schedule") {
                const tno = url.searchParams.get("trainNo"), date = url.searchParams.get("date") || getTwDateString(0);
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_TRN_${tno}_${date}`).first();
                const trn = row ? JSON.parse(row.Value) : { Stops: [] };
                return new Response(JSON.stringify({ TrainNo: tno, Note: trn.Note, StopTimes: trn.Stops.map(s => ({ StationID: s.SID, StationName: { Zh_tw: s.Name }, ArrivalTime: s.Arr, DepartureTime: s.Dep })) }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            if (url.pathname === "/api/route") {
                const s = url.searchParams.get("start"), e = url.searchParams.get("end"), d = url.searchParams.get("date") || getTwDateString(0);
                const [sR, eR] = await env.DB.batch([env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_STA_${s}_${d}`), env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_STA_${e}_${d}`)]);
                const sT = sR.results[0] ? JSON.parse(sR.results[0].Value) : [], eT = eR.results[0] ? JSON.parse(eR.results[0].Value) : [];
                const eM = Object.fromEntries(eT.map(t => [t.No, t]));
                const res = sT.filter(st => eM[st.No] && st.Seq < eM[st.No].Seq).map(st => ({ TrainNo: st.No, TrainTypeName: st.Type, DepartureTime: st.Dep, ArrivalTime: eM[st.No].Arr, EndingStationName: st.Dest, Note: st.Note }));
                return new Response(JSON.stringify(res), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            if (url.pathname === "/api/live") {
                const tno = url.searchParams.get("trainNo"), row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'LIVE_DATA'").first();
                return new Response(JSON.stringify((row ? JSON.parse(row.Value) : {})[tno] || { delay: 0, status: 0, station: "" }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            if (url.pathname === "/api/fare") {
                const s = url.searchParams.get("start"), e = url.searchParams.get("end"), token = await getTdxToken(env);
                const res = await fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/ODFare/${s}/to/${e}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } });
                return new Response(JSON.stringify(await res.json()), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            if (url.pathname === "/api/alerts") {
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'ALERTS_DATA'").first();
                return new Response(row?.Value || "[]", { headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            if (url.pathname === "/api/pids/marquee") {
                const conf = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_TOP_MARQUEE'").first();
                const alR = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'ALERTS_DATA'").first();
                const als = JSON.parse(alR?.Value || "[]"), prop = conf?.Value || "歡迎搭乘臺鐵。";
                return new Response(JSON.stringify({ text: als.map(a=>`⚠️【${a.Title}】${a.Description}`).join(" ❖ ") + (als.length?" ❖ ":"") + prop }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            if (url.pathname === "/api/pids/assets") {
                const img = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_IMAGES'").first();
                const vid = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_VIDEO'").first();
                return new Response(JSON.stringify({ images: JSON.parse(img?.Value || "[]"), video: JSON.parse(vid?.Value || "[]") }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            if (url.pathname === "/api/sync") {
                const type = url.searchParams.get("type");
                if (type === 'live') await syncTrainLiveBoard(env); 
                else if (type === 'alerts') await syncTraAlerts(env);
                else if (type === 'schedule') await syncDailyScheduleBlob(env);
                return new Response(`✅ ${type} 同步成功！`, { headers: cors });
            }
            if (request.method === "POST") {
                const body = await request.json();
                if (url.pathname.includes("update-pids")) await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('PIDS_TOP_MARQUEE', ?, 9999999999)").bind(body.text).run();
                else if (url.pathname.includes("update-assets")) {
                    if (body.images) await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('PIDS_IMAGES', ?)").bind(JSON.stringify(body.images)).run();
                    if (body.video) await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('PIDS_VIDEO', ?)").bind(JSON.stringify(body.video)).run();
                }
                return new Response(JSON.stringify({ success: true }), { headers: cors });
            }
            return new Response("TRA Worker v9.3.6 Active", { headers: cors });
        } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors }); }
    }
};