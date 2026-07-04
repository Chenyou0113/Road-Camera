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

const patchTrainType = (no, originalType) => {
    const n = parseInt(no, 10);
    if ((n >= 6001 && n <= 6099) || (n >= 6701 && n <= 6799)) return "鳴日號";
    if (n >= 6501 && n <= 6599) return "山嵐號";
    if (n >= 6601 && n <= 6699) return "海風號";
    if (n === 1 || n === 2) return "環島之星";
    if (n >= 6801 && n <= 6899) return "入伍專車";
    return originalType;
};

// 🚄 雙鐵共構/共線車站代碼對照表 (資料來源：高鐵標準說明文件 P.48)
// 格式： { '高鐵代碼': '台鐵代碼', ... }
const THSR_TRA_MAPPING = {
    "0990": "1006", // 南港
    "1000": "1008", // 臺北
    "1010": "1011", // 板橋
    "1030": "2214", // 新竹(高鐵) <-> 六家(台鐵)
    "1040": "1324", // 臺中(高鐵) <-> 新烏日(台鐵)
    "1060": "5102", // 臺南(高鐵) <-> 沙崙(台鐵)
    "1070": "1242"  // 左營(高鐵) <-> 新左營(台鐵)
};

// 建立反向查詢表 { '台鐵代碼': '高鐵代碼' }
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

// --- 🚄 同步高鐵時刻表 (Blob 模式) ---
const syncThsrDailyScheduleBlob = async (env, offsetDaysArray = [0]) => {
    const token = await getTdxToken(env);
    const expireTime = Math.floor(Date.now() / 1000) + (7 * 86400);

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

// --- 🆕 新增：同步捷運即時動態 (依據 PDF 第 16 章規格) ---
const syncMrtLiveBoard = async (env) => {
    const token = await getTdxToken(env);
    // 以台北捷運為例
    const res = await fetch("https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/TRTC?%24format=JSON", { 
        headers: { "Authorization": `Bearer ${token}` } 
    });
    if (!res.ok) return;
    const json = await res.json();
    const liveMap = {};
    // 依據 PDF 規範，捷運使用的是 StationID 與 EstimateTime
    (json.StationLiveBoards || []).forEach(t => { 
        // 使用 StationID + DestinationStationID 作為 Key
        const key = `${t.StationID}_${t.DestinationStationID}`;
        liveMap[key] = { estimate: t.EstimateTime, status: t.ServiceStatus }; 
    });
    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value) VALUES ('MRT_LIVE_TRTC', ?)").bind(JSON.stringify(liveMap)).run();
};

// --- 同步通阻 ---
const syncTraAlerts = async (env) => {
    const token = await getTdxToken(env);
    const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/Alert?%24format=JSON", { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return;
    
    const alerts = (await res.json()).Alerts.map(a => {
        // 🚀 增強版：連續替換各種台鐵可能手打的醜醜符號
        // 使用 (a.Description || "") 防止 Description 不存在時報錯
        let cleanDesc = (a.Description || "")
            .replace(/<-->|<->/g, '＜－－＞') // 攔截半形拼裝箭頭
            .replace(/([一-龥]+)\s*[=＝]\s*([一-龥]+)/g, '$1＜－－＞$2') // 攔截等號
            .replace(/([一-龥]+)\s*~\s*([一-龥]+)/g, '$1 至 $2') // 把波浪號換成"至"
            .trim();
            
        return { 
            AlertID: a.AlertID || "", 
            Title: a.Title || "", 
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
        const tasks = [syncTrainLiveBoard(env), syncTraAlerts(env), syncMrtLiveBoard(env)];

        // 每 15 分鐘 (0, 15, 30, 45)：只更新「今天」的時刻表，用來抓突發停駛狀態！
        if (m % 15 === 0) {
            tasks.push(syncDailyScheduleBlob(env, [0]));
        }

        // 每天凌晨 2 點 0 分：更新「未來四天」的常態時刻表，確保預售票資料正確
        if (h === 2 && m === 0) {
            tasks.push(syncDailyScheduleBlob(env, [1, 2, 3, 4]));
            tasks.push(syncThsrDailyScheduleBlob(env, [0, 1, 2, 3, 4]));
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
                    const patchedType = patchTrainType(t.No, t.Type);
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
                    // 停駛車次：只保留到表定時間後 60 分鐘
                    if (t.TrainStatus === 2 || t.IsSuspended || t.IsPartiallySuspended) {
                        return schedMins >= nowM - 60;
                    }
                    // 正常車次：依據實際時間(含延誤)過後 30 分鐘才消失
                    return t._actual >= nowM - 30;
                }).sort((a,b) => a._actual - b._actual);
                return new Response(JSON.stringify(res), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 2. 車次追蹤
            if (url.pathname === "/api/schedule") {
                const tno = url.searchParams.get("trainNo"), date = url.searchParams.get("date") || getTwDateString(0);
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`SCH_TRN_${tno}_${date}`).first();
                const trn = row ? JSON.parse(row.Value) : { Stops: [] };
                const patchedType = patchTrainType(tno, trn.Type);
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

            // 3. 站到站 (進化版：包含 D1 批次高效能轉乘演算法)
            if (url.pathname === "/api/route") {
                const s = url.searchParams.get("start");
                const e = url.searchParams.get("end");
                const d = url.searchParams.get("date") || getTwDateString(0);
                
                // 接收前端傳來的時間與過濾參數 (若無則給預設值)
                const targetTime = parseInt(url.searchParams.get("time") || 0);
                const minWait = parseInt(url.searchParams.get("minWait") || 5);
                const maxWait = parseInt(url.searchParams.get("maxWait") || 120);

                // Helper：時間轉分鐘
                const parseTimeMins = (t) => {
                    if (!t) return null;
                    const [h, m] = t.slice(0, 5).split(':').map(Number);
                    return h * 60 + m;
                };

                // [Step 1] 抓取起站、迄站的當日清單，以及全線即時誤點資料 (只需 1 次 Batch 查詢)
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

                // [Step 2] 分離直達車與轉乘候選車次
                sT.forEach(st => {
                    if (st.SuspendedFlag === 1) return;
                    const depMins = parseTimeMins(st.Dep);
                    if (depMins !== null && depMins < targetTime) return; // 濾掉時間已過的車

                    if (eM[st.No] && st.Seq < eM[st.No].Seq && eM[st.No].SuspendedFlag !== 1) {
                        // 找到直達車
                        const delay = Number(liveMap[st.No]?.delay || 0);
                        const patchedType = patchTrainType(st.No, st.Type);
                        directRoutes.push({
                            trainNo: String(st.No),
                            rawType: patchedType,
                            typeName: patchedType, // 前端會再 Normalize
                            dep: st.Dep.slice(0, 5),
                            arr: eM[st.No].Arr.slice(0, 5),
                            dest: st.Dest,
                            status: (liveMap[st.No]?.status === 2 || st.TrainSuspendedFlag === 1) ? 2 : 0,
                            DelayTime: delay,
                            TrainSuspendedFlag: st.TrainSuspendedFlag || 0
                        });
                    } else {
                        // 加入第一段轉乘候選清單
                        leg1Candidates.push(st);
                    }
                });

                eT.forEach(et => {
                    if (et.SuspendedFlag === 1) return;
                    const arrMins = parseTimeMins(et.Arr);
                    if (arrMins !== null && arrMins >= targetTime && !eM[et.No] /*非直達*/) {
                        leg2Candidates.push(et);
                    }
                });

                // [Step 3] 蒐集需要查完整時刻表的火車 (取起迄站最接近目標時間的前 45 班車)
                const topLeg1 = leg1Candidates.sort((a, b) => parseTimeMins(a.Dep) - parseTimeMins(b.Dep)).slice(0, 45);
                const topLeg2 = leg2Candidates.sort((a, b) => parseTimeMins(a.Arr) - parseTimeMins(b.Arr)).slice(0, 45);
                const uniqueTrainNos = [...new Set([...topLeg1.map(t => t.No), ...topLeg2.map(t => t.No)])];

                // [Step 4] D1 Batch 查詢火力展示：瞬間抓取所有火車的完整停靠站
                const scheduleMap = {};
                if (uniqueTrainNos.length > 0) {
                    const stmts = uniqueTrainNos.map(no => 
                        env.DB.prepare("SELECT Key, Value FROM AppConfig WHERE Key = ?").bind(`SCH_TRN_${no}_${d}`)
                    );
                    
                    // Cloudflare D1 每個 Batch 最多 100 句，做個分塊策畧
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

                // [Step 5] 記憶體內極速圖論交集比對 (Graph Intersection)
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

                            // 跨日處理
                            while (depTrans2 < arrTrans1 - 180) { depTrans2 += 1440; arrB += 1440; }

                            const schedWait = depTrans2 - arrTrans1;
                            if (schedWait < minWait || schedWait > maxWait) continue;

                            const delay1 = Number(liveMap[leg1.No]?.delay || 0);
                            const actualWait = schedWait - delay1;

                            // 轉乘時間充裕才列入
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
                                        typeName: patchTrainType(leg1.No, leg1.Type),
                                        depTime: stops1[idxA].Dep.slice(0, 5),
                                        arrTime: (transStop.Arr || transStop.Dep).slice(0, 5)
                                    },
                                    leg2: {
                                        trainNo: leg2.No,
                                        typeName: patchTrainType(leg2.No, leg2.Type),
                                        depTime: (stops2[idxTrans2].Dep || stops2[idxTrans2].Arr).slice(0, 5),
                                        arrTime: (stops2[idxB].Arr || stops2[idxB].Dep).slice(0, 5)
                                    }
                                });
                            }
                        }
                    }
                }

                // 排序並取最佳 12 筆轉乘方案
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

                // 回傳整理好的漂亮 JSON
                return new Response(JSON.stringify({
                    direct: directRoutes.sort((a, b) => a.dep.localeCompare(b.dep)),
                    transfers: finalTransfers.slice(0, 12)
                }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 4. 票價 (支援台鐵與高鐵)
            if (url.pathname === "/api/fare") {
                const s = url.searchParams.get("start");
                const e = url.searchParams.get("end");
                const via = url.searchParams.get("via");
                const token = await getTdxToken(env);

                if (via) {
                    // 保留既有轉乘票價邏輯（目前先用台鐵 ODFare）
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
                    return new Response(JSON.stringify({
                        isTHSR: true,
                        price: standardFare
                    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
                }

                return new Response(JSON.stringify(data), { headers: { ...cors, 'Content-Type': 'application/json' } });
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