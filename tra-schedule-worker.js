/**
 * ==============================================================================
 * 🚀 TRA Worker v9.5.0 (Data-Retention & 60-Day Extended Master Edition)
 * ==============================================================================
 */

const getTwDateString = (offsetDays = 0) => {
    const twTime = new Date(Date.now() + (8 * 3600000) + (offsetDays * 86400000));
    return twTime.toISOString().split('T')[0];
};

const patchTrainType = (no, originalType, note = "", start = "", dest = "") => {
    const n = parseInt(no, 10);
    const noteStr = String(note || "");
    const startStr = String(start || "");
    const destStr = String(dest || "");
    
    if (n === 4666 || n === 4667) return "蒸汽火車";

    const isYiLanTaipei = (startStr.includes("宜蘭") && destStr.includes("臺北")) || 
                          (startStr.includes("臺北") && destStr.includes("宜蘭")) ||
                          (startStr.includes("宜蘭") && destStr.includes("台北")) ||
                          (startStr.includes("台北") && destStr.includes("宜蘭"));
    if (String(no).startsWith("661") && isYiLanTaipei) {
        return "慧燈專車";
    }
    
    if (n === 6652 || n === 6655) return "海風號";
    if (n === 6631 || n === 6632 || n === 6633) return "山嵐號";

    if (noteStr.includes("莒光(專車)") || (String(originalType).includes("莒光") && noteStr.includes("專車"))) {
        return "莒光(專車)";
    }
    
    if ((n >= 6001 && n <= 6099) || (n >= 6701 && n <= 6799)) return "鳴日號";
    
    if ((n >= 6501 && n <= 6599) || (n >= 6601 && n <= 6699)) {
        if (noteStr.includes("自強(專列)")) {
            return "自強(專列)";
        }
        return "區間(專車)";
    }
    
    if (n === 1 || n === 2) return "環島之星";
    if (n >= 6801 && n <= 6899) return "入伍專車";
    return originalType;
};

// 🚄 雙鐵共構車站代碼
const THSR_TRA_MAPPING = {
    "0990": "1006", "1000": "1008", "1010": "1011", "1030": "2214", "1040": "1324", "1060": "5102", "1070": "1242"
};
const TRA_THSR_MAPPING = Object.fromEntries(Object.entries(THSR_TRA_MAPPING).map(([k, v]) => [v, k]));

const isThsrStationCode = (code) => {
    if (!code || code.length !== 4) return false;
    const n = parseInt(code, 10);
    return Number.isFinite(n) && n >= 990 && n <= 1070;
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

// 確保 D1 資料庫結構完整
const verifySchema = async (env) => {
    await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS TrainLiveLogs (
            TrainNo TEXT,
            Timestamp INTEGER,
            StationName TEXT,
            DelayTime INTEGER,
            PRIMARY KEY (TrainNo, Timestamp)
        )
    `).run();
    await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_live_logs_time ON TrainLiveLogs(Timestamp)
    `).run();
    await env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_live_logs_train ON TrainLiveLogs(TrainNo)
    `).run();
};

// --- 同步時刻表 (Blob 模式) ---
const syncDailyScheduleBlob = async (env, offsetDaysArray = [0]) => {
    const token = await getTdxToken(env);
    const dates = offsetDaysArray.map(getTwDateString); 
    // 配合 60 天查詢，將快取過期時間延長為 70 天，避免被快取清除機制提早釋放
    const expireTime = Math.floor(Date.now() / 1000) + (70 * 86400); 
    
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
                    Start: t.TrainInfo.StartingStationName?.Zh_tw,
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

// --- 同步高鐵時刻表 (Blob 模式) ---
const syncThsrDailyScheduleBlob = async (env, offsetDaysArray = [0]) => {
    const token = await getTdxToken(env);
    const expireTime = Math.floor(Date.now() / 1000) + (70 * 86400); // 同步延長高鐵保存期限

    for (const offset of offsetDaysArray) {
        const date = getTwDateString(offset);
        const res = await fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/DailyTimetable/TrainDate/${date}?%24format=JSON`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) continue;
        const trains = await res.json();
        const staMap = {};
        const trnMap = {};

        for (const t of trains) {
            const no = t.DailyTrainInfo.TrainNo;
            trnMap[no] = {
                Note: t.DailyTrainInfo.Note?.Zh_tw || "",
                Type: "高鐵",
                TripLine: 0,
                TrainSuspendedFlag: 0,
                Stops: t.StopTimes.map(s => ({
                    Seq: s.StopSequence,
                    SID: s.StationID,
                    Name: s.StationName?.Zh_tw,
                    Arr: s.ArrivalTime,
                    Dep: s.DepartureTime,
                    SuspendedFlag: 0
                }))
            };

            for (const s of t.StopTimes) {
                if (!staMap[s.StationID]) staMap[s.StationID] = [];
                staMap[s.StationID].push({
                    No: no,
                    Dir: t.DailyTrainInfo.Direction || 0,
                    Type: "高鐵",
                    Dest: t.DailyTrainInfo.EndingStationName?.Zh_tw,
                    Arr: s.ArrivalTime,
                    Dep: s.DepartureTime,
                    Seq: s.StopSequence,
                    Note: t.DailyTrainInfo.Note?.Zh_tw,
                    SuspendedFlag: 0
                });
            }
        }

        const batch = [];
        for (const [k, v] of Object.entries(staMap)) {
            batch.push(env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)").bind(`SCH_THSR_STA_${k}_${date}`, JSON.stringify(v), expireTime));
        }
        for (const [k, v] of Object.entries(trnMap)) {
            batch.push(env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)").bind(`SCH_THSR_TRN_${k}_${date}`, JSON.stringify(v), expireTime));
        }

        for (let i = 0; i < batch.length; i += 90) {
            await env.DB.batch(batch.slice(i, i + 90));
        }
    }
};

// --- 同步即時動態與背景全線紀錄模組 ---
const syncTrainLiveBoard = async (env) => {
    await verifySchema(env);
    const token = await getTdxToken(env);
    const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard?%24format=JSON", { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return;
    
    const json = await res.json(), liveMap = {};
    const timestampSec = Math.floor(Date.now() / 1000);
    
    // 兩週過期界限清理 (14天 = 14 * 86400 秒 = 1209600 秒)
    const logCutoffSec = timestampSec - 1209600;
    await env.DB.prepare("DELETE FROM TrainLiveLogs WHERE Timestamp < ?").bind(logCutoffSec).run();

    const trains = json.TrainLiveBoards || [];
    const batchStatements = [];

    trains.forEach(t => { 
        const tno = String(t.TrainNo);
        const delay = Number(t.DelayTime) || 0;
        const station = t.StationName?.Zh_tw || t.StationID || "";
        liveMap[tno] = { delay, status: Number(t.TrainStatus) || 0, station }; 

        // 即使沒人看，後端每分鐘背景收集定位，寫入 D1 SQLite 中
        if (station) {
            batchStatements.push(
                env.DB.prepare("INSERT OR REPLACE INTO TrainLiveLogs (TrainNo, Timestamp, StationName, DelayTime) VALUES (?, ?, ?, ?)")
                    .bind(tno, timestampSec, station, delay)
            );
        }
    });

    // 批次快速將當分鐘數據落盤保存
    const chunkSize = 80;
    for (let i = 0; i < batchStatements.length; i += chunkSize) {
        await env.DB.batch(batchStatements.slice(i, i + chunkSize));
    }

    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('LIVE_DATA', ?)").bind(JSON.stringify(liveMap)).run();
};

const syncMrtLiveBoard = async (env) => {
    const token = await getTdxToken(env);
    const res = await fetch("https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TRTC?%24format=JSON", { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return;
    const json = await res.json(), liveMap = {};
    (json.StationLiveBoards || []).forEach(t => { 
        const key = `${t.StationID}_${t.DestinationStationID}`;
        liveMap[key] = { estimate: t.EstimateTime, status: t.ServiceStatus }; 
    });
    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('MRT_LIVE_TRTC', ?)").bind(JSON.stringify(liveMap)).run();
};

const syncTraAlerts = async (env) => {
    const token = await getTdxToken(env);
    const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Alert?%24format=JSON", { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return;
    const alerts = (await res.json()).Alerts.map(a => {
        let cleanDesc = (a.Description || "")
            .replace(/<-->|<->/g, '＜－－＞')
            .replace(/([一-龥]+)\s*[=＝]\s*([一-龥]+)/g, '$1＜－－＞$2')
            .replace(/([一-龥]+)\s*~\s*([一-龥]+)/g, '$1 至 $2')
            .trim();
        return { AlertID: a.AlertID || "", Title: a.Title || "", Description: cleanDesc, Status: a.Status };
    });
    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('ALERTS_DATA', ?)").bind(JSON.stringify(alerts)).run();
};

export default {
    async scheduled(event, env, ctx) {
        const date = new Date();
        const m = date.getMinutes();
        const h = (date.getUTCHours() + 8) % 24;

        const tasks = [syncTrainLiveBoard(env), syncTraAlerts(env), syncMrtLiveBoard(env)];

        if (m % 15 === 0) {
            tasks.push(syncDailyScheduleBlob(env, [0]));
        }

        // 每日凌晨 2 點 0 分：背景全自動抓取並建立「未來 60 天」的台鐵/高鐵全部時刻表
        if (h === 2 && m === 0) {
            const traOffsets = Array.from({ length: 60 }, (_, i) => i + 1); 
            const thsrOffsets = Array.from({ length: 61 }, (_, i) => i);     
            tasks.push(syncDailyScheduleBlob(env, traOffsets));
            tasks.push(syncThsrDailyScheduleBlob(env, thsrOffsets));
        }

        ctx.waitUntil(Promise.allSettled(tasks));
    },

    async fetch(request, env) {
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
                    const patchedType = patchTrainType(t.No, t.Type, t.Note, t.Start, t.Dest);
                    return {
                        ...t,
                        Type: patchedType,
                        TrainTypeName: patchedType,
                        DelayTime: isToday ? l.delay : 0,
                        TrainStatus: isToday ? l.status : 0,
                        IsSuspended: t.SuspendedFlag === 1,
                        IsPartiallySuspended: t.TrainSuspendedFlag === 2,
                        _actual: (h * 60 + m) + (isToday ? l.delay : 0)
                    };
                }).filter(t => {
                    if (!isToday) return true;
                    const [h, m] = (t.Dep || t.Arr).split(':').map(Number);
                    const schedMins = h * 60 + m;
                    if (t.TrainStatus === 2 || t.IsSuspended || t.IsPartiallySuspended) { return schedMins >= nowM - 60; }
                    return t._actual >= nowM - 30;
                }).sort((a,b) => a._actual - b._actual);
                return new Response(JSON.stringify(res), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 2. 車次追蹤
            if (url.pathname === "/api/schedule") {
                const tno = url.searchParams.get("trainNo"), date = url.searchParams.get("date") || getTwDateString(0);
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_TRN_${tno}_${date}`).first();
                const trn = row ? JSON.parse(row.Value) : { Stops: [] };
                const start = trn.Stops && trn.Stops.length > 0 ? (trn.Stops[0].Name || "") : "";
                const dest = trn.Stops && trn.Stops.length > 0 ? (trn.Stops[trn.Stops.length - 1].Name || "") : "";
                const patchedType = patchTrainType(tno, trn.Type, trn.Note, start, dest);
                return new Response(JSON.stringify({
                    TrainNo: tno,
                    TrainTypeName: patchedType,
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
                const s = url.searchParams.get("start");
                const e = url.searchParams.get("end");
                const d = url.searchParams.get("date") || getTwDateString(0);
                
                const targetTime = parseInt(url.searchParams.get("time") || 0);
                const minWait = parseInt(url.searchParams.get("minWait") || 5);
                const maxWait = parseInt(url.searchParams.get("maxWait") || 120);

                const parseTimeMins = (t) => {
                    if (!t) return null;
                    const [h, m] = t.slice(0, 5).split(':').map(Number);
                    return h * 60 + m;
                };

                const [sR, eR, liveR] = await env.DB.batch([
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_STA_${s}_${d}`),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_STA_${e}_${d}`),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'LIVE_DATA'")
                ]);

                const sT = sR.results[0] ? JSON.parse(sR.results[0].Value) : [];
                const eT = eR.results[0] ? JSON.parse(eR.results[0].Value) : [];
                const liveMap = liveR.results[0] ? JSON.parse(liveR.results[0].Value) : {};
                const eM = Object.fromEntries(eT.map(t => [t.No, t]));

                const directRoutes = [];
                const leg1Candidates = [];
                const leg2Candidates = [];

                sT.forEach(st => {
                    if (st.SuspendedFlag === 1) return;
                    const depMins = parseTimeMins(st.Dep);
                    if (depMins !== null && depMins < targetTime) return; 

                    if (eM[st.No] && st.Seq < eM[st.No].Seq && eM[st.No].SuspendedFlag !== 1) {
                        const delay = Number(liveMap[st.No]?.delay || 0);
                        const patchedType = patchTrainType(st.No, st.Type, st.Note, st.Start, st.Dest);
                        directRoutes.push({
                            trainNo: String(st.No),
                            rawType: patchedType,
                            typeName: patchedType, 
                            dep: st.Dep.slice(0, 5),
                            arr: eM[st.No].Arr.slice(0, 5),
                            dest: st.Dest,
                            status: (liveMap[st.No]?.status === 2 || st.TrainSuspendedFlag === 1) ? 2 : 0,
                            DelayTime: delay,
                            TrainSuspendedFlag: st.TrainSuspendedFlag || 0
                        });
                    } else {
                        leg1Candidates.push(st);
                    }
                });

                eT.forEach(et => {
                    if (et.SuspendedFlag === 1) return;
                    const arrMins = parseTimeMins(et.Arr);
                    if (arrMins !== null && arrMins >= targetTime && !eM[et.No]) {
                        leg2Candidates.push(et);
                    }
                });

                const topLeg1 = leg1Candidates.sort((a, b) => parseTimeMins(a.Dep) - parseTimeMins(b.Dep)).slice(0, 45);
                const topLeg2 = leg2Candidates.sort((a, b) => parseTimeMins(a.Arr) - parseTimeMins(b.Arr)).slice(0, 45);
                const uniqueTrainNos = [...new Set([...topLeg1.map(t => t.No), ...topLeg2.map(t => t.No)])];

                const scheduleMap = {};
                if (uniqueTrainNos.length > 0) {
                    const stmts = uniqueTrainNos.map(no => 
                        env.DB.prepare("SELECT Key, Value FROM AppConfig WHERE Key = ?").bind(`SCH_TRN_${no}_${d}`)
                    );
                    
                    const chunkSize = 90;
                    for (let i = 0; i < stmts.length; i += chunkSize) {
                        const batchRes = await env.DB.batch(stmts.slice(i, i + chunkSize));
                        batchRes.forEach((r, idx) => {
                            if (r.results[0]) {
                                const trainNo = uniqueTrainNos[i + idx];
                                scheduleMap[trainNo] = JSON.parse(r.results[0].Value).Stops;
                            }
                        });
                    }
                }

                const transferCandidates = [];
                const seenPairs = new Set();

                for (const leg1 of topLeg1) {
                    const stops1 = scheduleMap[leg1.No];
                    if (!stops1) continue;
                    const idxA = stops1.findIndex(x => x.SID === s);
                    if (idxA === -1) continue;
                    const depA = parseTimeMins(stops1[idxA].Dep);

                    for (let i = idxA + 1; i < stops1.length; i++) {
                        const transStop = stops1[i];
                        if (transStop.SuspendedFlag === 1) continue;
                        const arrTrans1 = parseTimeMins(transStop.Arr || transStop.Dep);

                        for (const leg2 of topLeg2) {
                            if (leg1.No === leg2.No) continue;
                            const pairKey = `${leg1.No}_${leg2.No}`;
                            if (seenPairs.has(pairKey)) continue;

                            const stops2 = scheduleMap[leg2.No];
                            if (!stops2) continue;

                            const idxTrans2 = stops2.findIndex(x => x.SID === transStop.SID);
                            const idxB = stops2.findIndex(x => x.SID === e);

                            if (idxTrans2 === -1 || idxB === -1 || idxTrans2 >= idxB) continue;
                            if (stops2[idxTrans2].SuspendedFlag === 1 || stops2[idxB].SuspendedFlag === 1) continue;

                            let depTrans2 = parseTimeMins(stops2[idxTrans2].Dep || stops2[idxTrans2].Arr);
                            let arrB = parseTimeMins(stops2[idxB].Arr || stops2[idxB].Dep);

                            while (depTrans2 < arrTrans1 - 180) { depTrans2 += 1440; arrB += 1440; }

                            const schedWait = depTrans2 - arrTrans1;
                            if (schedWait < minWait || schedWait > maxWait) continue;

                            const delay1 = Number(liveMap[leg1.No]?.delay || 0);
                            const actualWait = schedWait - delay1;

                            if (actualWait >= 1) {
                                seenPairs.add(pairKey);
                                transferCandidates.push({
                                    transferStationCode: transStop.SID,
                                    transferStation: transStop.Name,
                                    schedWaitMinutes: schedWait,
                                    actualWaitMinutes: actualWait,
                                    leg1Delay: delay1,
                                    totalMinutes: (arrB - depA),
                                    endArrTimeAbs: arrB,
                                    leg1: {
                                        trainNo: leg1.No,
                                        typeName: patchTrainType(leg1.No, leg1.Type, leg1.Note, leg1.Start, leg1.Dest),
                                        depTime: stops1[idxA].Dep.slice(0, 5),
                                        arrTime: (transStop.Arr || transStop.Dep).slice(0, 5)
                                    },
                                    leg2: {
                                        trainNo: leg2.No,
                                        typeName: patchTrainType(leg2.No, leg2.Type, leg2.Note, leg2.Start, leg2.Dest),
                                        depTime: (stops2[idxTrans2].Dep || stops2[idxTrans2].Arr).slice(0, 5),
                                        arrTime: (stops2[idxB].Arr || stops2[idxB].Dep).slice(0, 5)
                                    }
                                });
                            }
                        }
                    }
                }

                transferCandidates.sort((a, b) => {
                    if (a.endArrTimeAbs !== b.endArrTimeAbs) return a.endArrTimeAbs - b.endArrTimeAbs;
                    return a.totalMinutes - b.totalMinutes;
                });

                const finalTransfers = [];
                const seenFirstLegs = new Set();
                for (const c of transferCandidates) {
                    if (!seenFirstLegs.has(c.leg1.trainNo)) {
                        finalTransfers.push(c);
                        seenFirstLegs.add(c.leg1.trainNo);
                    }
                }

                return new Response(JSON.stringify({
                    direct: directRoutes.sort((a, b) => a.dep.localeCompare(b.dep)),
                    transfers: finalTransfers.slice(0, 12)
                }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 4. 票價
            if (url.pathname === "/api/fare") {
                const s = url.searchParams.get("start");
                const e = url.searchParams.get("end");
                const via = url.searchParams.get("via");
                const token = await getTdxToken(env);

                if (via) {
                    const [res1, res2] = await Promise.all([
                        fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/ODFare/${s}/to/${via}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } }),
                        fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/ODFare/${via}/to/${e}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } })
                    ]);
                    const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
                    return new Response(JSON.stringify({ isTransfer: true, leg1: data1, leg2: data2 }), { headers: { ...cors, 'Content-Type': 'application/json' } });
                }

                const isThsr = isThsrStationCode(s) && isThsrStationCode(e);
                const fetchUrl = isThsr
                    ? `https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/ODFare/${s}/to/${e}?%24format=JSON`
                    : `https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/ODFare/${s}/to/${e}?%24format=JSON`;

                const res = await fetch(fetchUrl, { headers: { "Authorization": `Bearer ${token}` } });
                const data = await res.json();

                if (isThsr && Array.isArray(data) && data.length > 0) {
                    const standardFare = data[0].Fares?.find(f => f.TicketType === 1 && f.CabinClass === 1)?.Price || 0;
                    return new Response(JSON.stringify({ isTHSR: true, price: standardFare }), { headers: { ...cors, 'Content-Type': 'application/json' } });
                }

                return new Response(JSON.stringify(data), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 5. 通阻
            if (url.pathname === "/api/alerts") {
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'ALERTS_DATA'").first();
                return new Response(row?.Value || "[]", { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 6. 即時位置與【D1 歷史快照端點重構】
            if (url.pathname === "/api/live") {
                const tno = url.searchParams.get("trainNo");
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'LIVE_DATA'").first();
                const liveMap = row ? JSON.parse(row.Value) : {};

                if (tno) {
                    const live = liveMap[tno] || { delay: 0, status: 0, station: "" };
                    
                    // 🆕 全自動查詢後端記錄的 2 週歷史路徑與延誤事件，而不再依賴前端本地 LocalStorage
                    let historyLogs = [];
                    try {
                        await verifySchema(env);
                        const dbResult = await env.DB.prepare("SELECT Timestamp, StationName, DelayTime FROM TrainLiveLogs WHERE TrainNo = ? ORDER BY Timestamp DESC LIMIT 35").bind(tno).all();
                        historyLogs = (dbResult.results || []).map(r => ({
                            ts: r.Timestamp * 1000, // 轉回毫秒供前端相容渲染
                            station: r.StationName,
                            delay: r.DelayTime
                        }));
                    } catch (err) {
                        console.error("無法加載 D1 歷史軌跡：", err);
                    }

                    const liveCompat = {
                        TrainNo: tno,
                        ...live,
                        DelayTime: Number(live.delay) || 0,
                        TrainStatus: Number(live.status) || 0,
                        StationName: live.station ? { Zh_tw: live.station } : null,
                        History: historyLogs // 將 2 週背景自動收集的軌跡，直接封包返給前端
                    };
                    return new Response(JSON.stringify(liveCompat), { headers: { ...cors, 'Content-Type': 'application/json' } });
                } else {
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
                const als = JSON.parse(alR?.Value || "[]");
                const prop = conf?.Value || "歡迎搭乘臺鐵。";
                const marqueeText = als.map(a => {
                    const title = String(a.Title || '');
                    const description = String(a.Description || '');
                    const isNormal = String(a.Status) === '1';
                    const icon = isNormal ? 'ℹ️' : '⚠️';
                    return `${icon}【${title}】${description}`;
                }).join(" ❖ ") + (als.length ? " ❖ " : "") + prop;
                return new Response(JSON.stringify({ text: marqueeText }), { headers: { ...cors, 'Content-Type': 'application/json' } });
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
                else if (type === 'schedule') {
                    // 手動同步亦同步拉取 60 天範圍
                    const traOffsets = Array.from({ length: 61 }, (_, i) => i); 
                    await syncDailyScheduleBlob(env, traOffsets);
                }
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

            return new Response("TRA Worker v9.5.0", { headers: cors });
        } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors }); }
    }
};