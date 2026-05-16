/**
 * ==============================================================================
 * 🚀 TRA Worker v9.4.1 (Final Master Edition - Complete Codebase)
 * ==============================================================================
 * 1. 完整路由：/liveboard/station, /schedule, /route, /fare, /live, /alerts, /pids/marquee, /pids/assets, /sync
 * 2. 管理接口：支援 POST 更新 PIDS 文字與多媒體資產 (Images/Videos)
 * 3. 區間美化：[站名=站名] 轉換為 [站名＜－－＞站名]
 * 4. 帳單救星：JSON Blob 儲存模式，寫入次數極低，保證免費額度。
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
    const expireTime = now + (parseInt(data.expires_in) || 86400);
    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES ('TDX_TOKEN', ?, ?)").bind(data.access_token, expireTime).run();
    return data.access_token;
};

// --- 同步時刻表 (Blob 模式) ---
const syncDailyScheduleBlob = async (env, offsetDaysArray = [0]) => {
    const token = await getTdxToken(env);
    const dates = offsetDaysArray.map(getTwDateString); // 根據傳入的陣列取得日期
    const expireTime = Math.floor(Date.now() / 1000) + (7 * 86400); 
    for (const date of dates) {
        const res = await fetch(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${date}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } });
        if (!res.ok) continue;
        const json = await res.json(), trains = json.TrainTimetables || [];
        if (!trains.length) continue;
        let staMap = {}, trnMap = {};
        for (const t of trains) {
            const no = t.TrainInfo.TrainNo;
            const trainSuspended = t.TrainInfo.SuspendedFlag || 0;
            trnMap[no] = {
                Note: t.TrainInfo.Note?.Zh_tw || "",
                Type: t.TrainInfo.TrainTypeName?.Zh_tw || "",
                TripLine: t.TrainInfo.TripLine || 0,
                TrainSuspendedFlag: trainSuspended,
                Stops: t.StopTimes.map(s => ({
                    Seq: s.StopSequence,
                    SID: s.StationID,
                    Name: s.StationName?.Zh_tw,
                    Arr: s.ArrivalTime,
                    Dep: s.DepartureTime,
                    SuspendedFlag: s.SuspendedFlag || 0
                }))
            };
            for (const s of t.StopTimes) {
                if (!staMap[s.StationID]) staMap[s.StationID] = [];
                staMap[s.StationID].push({
                    No: no,
                    Dir: t.TrainInfo.Direction || 0,
                    Type: t.TrainInfo.TrainTypeName?.Zh_tw,
                    Dest: t.TrainInfo.EndingStationName?.Zh_tw,
                    Arr: s.ArrivalTime,
                    Dep: s.DepartureTime,
                    Seq: s.StopSequence,
                    Note: t.TrainInfo.Note?.Zh_tw,
                    TripLine: t.TrainInfo.TripLine || 0,
                    TrainSuspendedFlag: trainSuspended,
                    SuspendedFlag: s.SuspendedFlag || 0
                });
            }
        }
        let batch = [];
        for (const [k, v] of Object.entries(staMap)) batch.push(env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)").bind(`SCH_STA_${k}_${date}`, JSON.stringify(v), expireTime));
        for (const [k, v] of Object.entries(trnMap)) batch.push(env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)").bind(`SCH_TRN_${k}_${date}`, JSON.stringify(v), expireTime));
        await env.DB.batch(batch);
    }
};

// --- 同步即時動態 ---
const syncTrainLiveBoard = async (env) => {
    const token = await getTdxToken(env);
    const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard?%24format=JSON", { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return;
    const json = await res.json(), liveMap = {};
    (json.TrainLiveBoards || []).forEach(t => { 
        liveMap[t.TrainNo] = { delay: Number(t.DelayTime) || 0, status: Number(t.TrainStatus) || 0, station: t.StationName?.Zh_tw || t.StationID || "" }; 
    });
    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('LIVE_DATA', ?)").bind(JSON.stringify(liveMap)).run();
};

// --- 同步通阻 ---
const syncTraAlerts = async (env) => {
    const token = await getTdxToken(env);
    const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Alert?%24format=JSON", { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return;
    
    const alerts = (await res.json()).Alerts.map(a => {
        // 🚀 增強版：連續替換各種台鐵可能手打的醜醜符號
        let cleanDesc = a.Description
            .replace(/<-->|<->/g, '＜－－＞') // 攔截半形拼裝箭頭
            .replace(/([一-龥]+)\s*[=＝]\s*([一-龥]+)/g, '$1＜－－＞$2') // 攔截等號
            .replace(/([一-龥]+)\s*~\s*([一-龥]+)/g, '$1 至 $2') // 把波浪號換成"至"
            .trim();
            
        return { 
            AlertID: a.AlertID, 
            Title: a.Title, 
            Description: cleanDesc, 
            Status: a.Status 
        };
    });
    
    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('ALERTS_DATA', ?)").bind(JSON.stringify(alerts)).run();
};

export default {
    async scheduled(event, env, ctx) {
        const date = new Date();
        const m = date.getMinutes();
        const h = (date.getUTCHours() + 8) % 24; // 轉為台灣時間的小時

        // 任務包：所有排程都會執行的基礎任務 (即時誤點 + 跑馬燈警報)
        const tasks = [syncTrainLiveBoard(env), syncTraAlerts(env)];

        // 每 15 分鐘 (0, 15, 30, 45)：只更新「今天」的時刻表，用來抓突發停駛狀態！
        if (m % 15 === 0) {
            tasks.push(syncDailyScheduleBlob(env, [0]));
        }

        // 每天凌晨 2 點 0 分：更新「未來四天」的常態時刻表，確保預售票資料正確
        if (h === 2 && m === 0) {
            tasks.push(syncDailyScheduleBlob(env, [1, 2, 3, 4]));
        }

        ctx.waitUntil(Promise.allSettled(tasks));
    },

    async fetch(request, env) {
        // 🚀 升級 CORS 標頭，並對 preflight 明確回應 204
        const cors = { 
            "Access-Control-Allow-Origin": "*", 
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS", 
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
        };
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: cors });
        }
        const url = new URL(request.url);

        try {
            // 1. 車站看板
            if (url.pathname === "/api/liveboard/station") {
                const sid = url.searchParams.get("station"), date = url.searchParams.get("date") || getTwDateString(0);
                const isToday = (date === getTwDateString(0));
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_STA_${sid}_${date}`).first();
                const liveR = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'LIVE_DATA'").first();
                const liveM = liveR ? JSON.parse(liveR.Value) : {};
                const trains = row ? JSON.parse(row.Value) : [];
                const nowM = (new Date().getUTCHours() + 8) % 24 * 60 + new Date().getUTCMinutes();
                const res = trains.map(t => {
                    const l = liveM[t.No] || { delay: 0, status: 0, station: "" };
                    const [h, m] = (t.Dep || t.Arr).split(':').map(Number);
                    return {
                        ...t,
                        DelayTime: isToday ? l.delay : 0,
                        TrainStatus: isToday ? l.status : 0,
                        IsSuspended: t.SuspendedFlag === 1,
                        IsPartiallySuspended: t.TrainSuspendedFlag === 2,
                        _actual: (h * 60 + m) + (isToday ? l.delay : 0)
                    };
                }).filter(t => !isToday || t._actual >= nowM - 30 || t.TrainStatus === 2 || t.IsSuspended).sort((a,b) => a._actual - b._actual);
                return new Response(JSON.stringify(res), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 2. 車次追蹤
            if (url.pathname === "/api/schedule") {
                const tno = url.searchParams.get("trainNo"), date = url.searchParams.get("date") || getTwDateString(0);
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_TRN_${tno}_${date}`).first();
                const trn = row ? JSON.parse(row.Value) : { Stops: [] };
                return new Response(JSON.stringify({
                    TrainNo: tno,
                    TrainTypeName: trn.Type,
                    Note: trn.Note,
                    TripLine: trn.TripLine,
                    TrainSuspendedFlag: trn.TrainSuspendedFlag || 0,
                    StopTimes: trn.Stops.map(s => ({
                        StationID: s.SID,
                        StationName: { Zh_tw: s.Name },
                        ArrivalTime: s.Arr,
                        DepartureTime: s.Dep,
                        SuspendedFlag: s.SuspendedFlag || 0
                    }))
                }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 3. 站到站
            if (url.pathname === "/api/route") {
                const s = url.searchParams.get("start"), e = url.searchParams.get("end"), d = url.searchParams.get("date") || getTwDateString(0);
                const [sR, eR] = await env.DB.batch([env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_STA_${s}_${d}`), env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_STA_${e}_${d}`)]);
                const sT = sR.results[0] ? JSON.parse(sR.results[0].Value) : [], eT = eR.results[0] ? JSON.parse(eR.results[0].Value) : [];
                const eM = Object.fromEntries(eT.map(t => [t.No, t]));
                const res = sT
                    .filter(st => eM[st.No] && st.Seq < eM[st.No].Seq && st.SuspendedFlag !== 1 && eM[st.No].SuspendedFlag !== 1)
                    .map(st => ({
                        TrainNo: st.No,
                        TrainTypeName: st.Type,
                        DepartureTime: st.Dep,
                        ArrivalTime: eM[st.No].Arr,
                        EndingStationName: st.Dest,
                        Note: st.Note,
                        TrainSuspendedFlag: st.TrainSuspendedFlag || 0
                    }))
                    .sort((a,b) => a.DepartureTime.localeCompare(b.DepartureTime));
                return new Response(JSON.stringify(res), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 4. 票價
            if (url.pathname === "/api/fare") {
                const s = url.searchParams.get("start"), e = url.searchParams.get("end"), token = await getTdxToken(env);
                const res = await fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/ODFare/${s}/to/${e}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } });
                return new Response(JSON.stringify(await res.json()), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 5. 通阻
            if (url.pathname === "/api/alerts") {
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'ALERTS_DATA'").first();
                return new Response(row?.Value || "[]", { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 6. 即時位置 (支援單一車次查詢 & 全線列車查詢)
            if (url.pathname === "/api/live") {
                const tno = url.searchParams.get("trainNo");
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'LIVE_DATA'").first();
                const liveMap = row ? JSON.parse(row.Value) : {};

                // 狀況 A：有指定車次，回傳單一車次資料
                if (tno) {
                    const live = liveMap[tno] || { delay: 0, status: 0, station: "" };
                    const liveCompat = {
                        TrainNo: tno,
                        ...live,
                        DelayTime: Number(live.delay) || 0,
                        TrainStatus: Number(live.status) || 0,
                        StationName: live.station ? { Zh_tw: live.station } : null
                    };
                    return new Response(JSON.stringify(liveCompat), { headers: { ...cors, 'Content-Type': 'application/json' } });
                } 
                // 狀況 B：沒有指定車次，回傳全台所有有動態的列車陣列
                else {
                    const allLiveTrains = Object.keys(liveMap).map(key => {
                        const live = liveMap[key];
                        return {
                            TrainNo: key,
                            ...live,
                            DelayTime: Number(live.delay) || 0,
                            TrainStatus: Number(live.status) || 0,
                            StationName: live.station ? { Zh_tw: live.station } : null
                        };
                    });
                    return new Response(JSON.stringify(allLiveTrains), { headers: { ...cors, 'Content-Type': 'application/json' } });
                }
            }

            // 7. PIDS 管理
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

            // 8. 同步與管理
            if (url.pathname === "/api/sync") {
                const type = url.searchParams.get("type");
                if (type === 'live') await syncTrainLiveBoard(env); 
                else if (type === 'alerts') await syncTraAlerts(env);
                else if (type === 'schedule') await syncDailyScheduleBlob(env, [0, 1, 2, 3, 4]);
                return new Response(`✅ ${type} 同步成功！`, { headers: cors });
            }
            if (request.method === "POST") {
                const body = await request.json();
                if (url.pathname.includes("update-pids")) {
                    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES ('PIDS_TOP_MARQUEE', ?, ?)").bind(body.text || "", 9999999999).run();
                }
                else if (url.pathname.includes("update-assets")) {
                    if (body.images) await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('PIDS_IMAGES', ?)").bind(JSON.stringify(body.images)).run();
                    if (body.video) await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('PIDS_VIDEO', ?)").bind(JSON.stringify(body.video)).run();
                }
                return new Response(JSON.stringify({ success: true }), { headers: cors });
            }

            return new Response("TRA Worker v9.4.0 Final", { headers: cors });
        } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors }); }
    }
};
