/**
 * ==============================================================================
 * 🚀 TRA Worker v9.6.0 (Data-Retention & Ultra-Fast 3-Min Schedule Sync Edition)
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
    if (String(no).startsWith("661") && isYiLanTaipei) return "慧燈專車";
    
    if (n === 6652 || n === 6655) return "海風號";
    if (n === 6631 || n === 6632 || n === 6633) return "山嵐號";

    if (noteStr.includes("莒光(專車)") || (String(originalType).includes("莒光") && noteStr.includes("專車"))) return "莒光(專車)";
    if ((n >= 6001 && n <= 6099) || (n >= 6701 && n <= 6799)) return "鳴日號";
    
    if ((n >= 6501 && n <= 6599) || (n >= 6601 && n <= 6699)) {
        if (noteStr.includes("自強(專列)")) return "自強(專列)";
        return "區間(專車)";
    }
    
    if (n === 1 || n === 2) return "環島之星";
    if (n >= 6801 && n <= 6899) return "入伍專車";
    return originalType;
};

// 輔助函數定義
const normalizeStationName = name => String(name || "").replace(/台/g, "臺").replace(/站$/g, "").trim();

const getTrainClassGroup = (typeName) => {
    const t = String(typeName || '');
    if (t.includes('區間') || t.includes('普快') || t.includes('復興')) return 'local';
    return 'reserved';
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

// 🤖 自動分析通阻公告 API
const parseRulesFromAlerts = (alerts) => {
    const rules = [];
    for (const alert of alerts) {
        const desc = String(alert.Description || "");
        if (desc.includes("恢復行駛") || desc.includes("恢復通車") || desc.includes("已正常通車") || desc.includes("雙線通車")) continue;

        // 1. 自動定位區段中斷 (例如："瑞芳=猴硐間路線中斷" 或 "瑞芳至猴硐間")
        // 修正：排除 |和 分隔符以免將和仁的和誤判
        const segmentRegex = /([\u4e00-\u9fff]+)\s*(?:至|＝|=|與|⇄)\s*([\u4e00-\u9fff]+)\s*間/g;
        let segmentMatch;
        while ((segmentMatch = segmentRegex.exec(desc)) !== null) {
            const start = normalizeStationName(segmentMatch[1]);
            const end = normalizeStationName(segmentMatch[2]);
            if (desc.includes("不通") || desc.includes("中斷") || desc.includes("停駛") || desc.includes("坍方") || desc.includes("封閉")) {
                rules.push({ type: "segment", startStation: start, endStation: end, scope: "all" });
            }
        }

        // 2. 自動匹配車次號碼 (例如："408次停駛" 或 "511、513次停駛")
        const trainNoRegex = /(\d+)\s*次/g;
        let trainMatch;
        const foundTrainNos = [];
        while ((trainMatch = trainNoRegex.exec(desc)) !== null) {
            foundTrainNos.push(trainMatch[1]);
        }
        if (foundTrainNos.length > 0 && (desc.includes("停駛") || desc.includes("取消"))) {
            for (const tNo of foundTrainNos) {
                rules.push({ type: "train", trainNo: tNo, startStation: "", endStation: "" });
            }
        }
    }
    return rules;
};

// 判斷套用停駛規則 (不更動備註，僅調整 Flag)
const applySuspensionRules = (trainNo, typeName, stops, trainSuspendedFlag, note, rules) => {
    let updatedStops = JSON.parse(JSON.stringify(stops || []));
    let updatedSuspendedFlag = Number(trainSuspendedFlag || 0);
    let updatedNote = String(note || "").trim();
    const trnClass = getTrainClassGroup(typeName);

    for (const rule of rules) {
        const normRuleStart = normalizeStationName(rule.startStation);
        const normRuleEnd = normalizeStationName(rule.endStation);

        if (rule.type === 'train' && String(rule.trainNo).trim() === String(trainNo).trim()) {
            if (!normRuleStart && !normRuleEnd) {
                updatedSuspendedFlag = 1;
                updatedStops.forEach(s => s.SuspendedFlag = 1);
            } else {
                const idxStart = updatedStops.findIndex(s => normalizeStationName(s.Name || s.StationName?.Zh_tw) === normRuleStart);
                const idxEnd = updatedStops.findIndex(s => normalizeStationName(s.Name || s.StationName?.Zh_tw) === normRuleEnd);
                if (idxStart !== -1 && idxEnd !== -1) {
                    const minIdx = Math.min(idxStart, idxEnd);
                    const maxIdx = Math.max(idxStart, idxEnd);
                    for (let i = minIdx; i <= maxIdx; i++) updatedStops[i].SuspendedFlag = 1;
                    if (updatedSuspendedFlag !== 1) updatedSuspendedFlag = 2;
                }
            }
        } else if (rule.type === 'segment') {
            const matchesScope = rule.scope === 'all' || rule.scope === trnClass || !rule.scope;
            if (matchesScope && normRuleStart && normRuleEnd) {
                const idxStart = updatedStops.findIndex(s => normalizeStationName(s.Name || s.StationName?.Zh_tw) === normRuleStart);
                const idxEnd = updatedStops.findIndex(s => normalizeStationName(s.Name || s.StationName?.Zh_tw) === normRuleEnd);
                if (idxStart !== -1 && idxEnd !== -1) {
                    const minIdx = Math.min(idxStart, idxEnd);
                    const maxIdx = Math.max(idxStart, idxEnd);
                    for (let i = minIdx; i <= maxIdx; i++) updatedStops[i].SuspendedFlag = 1;
                    if (updatedSuspendedFlag !== 1) updatedSuspendedFlag = 2;
                }
            }
        }
    }
    return { stops: updatedStops, trainSuspendedFlag: updatedSuspendedFlag, note: updatedNote };
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

// ⚡ 輕量化時刻表同步函數 (僅花費幾毫秒即可完成寫入)
const syncDailyScheduleBlobSingle = async (env, offsetDays = 0) => {
    const token = await getTdxToken(env);
    const date = getTwDateString(offsetDays);
    const expireTime = Math.floor(Date.now() / 1000) + (70 * 86400);

    const res = await fetch(`https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/DailyTrainTimetable/TrainDate/${date}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return;

    const json = await res.json(), timetables = json.TrainTimetables || [];
    if (!timetables.length) return;

    const compactTimetable = timetables.map(t => ({
        No: t.TrainInfo.TrainNo,
        Type: t.TrainInfo.TrainTypeName?.Zh_tw || "",
        Note: t.TrainInfo.Note?.Zh_tw || "",
        Line: t.TrainInfo.TripLine || 0,
        Susp: t.TrainInfo.SuspendedFlag || 0,
        Dir: t.TrainInfo.Direction || 0,
        Start: t.TrainInfo.StartingStationName?.Zh_tw || "",
        Dest: t.TrainInfo.EndingStationName?.Zh_tw || "",
        Stops: t.StopTimes.map(s => ({
            Seq: s.StopSequence,
            SID: s.StationID,
            Name: s.StationName?.Zh_tw,
            Arr: s.ArrivalTime,
            Dep: s.DepartureTime,
            Susp: s.SuspendedFlag || 0
        }))
    }));

    await env.DB.prepare("INSERT OR REPLACE INTO AppConfig (Key, Value, ExpiresAt) VALUES (?, ?, ?)")
        .bind(`TIMETABLE_BLOB_${date}`, JSON.stringify(compactTimetable), expireTime)
        .run();
};

const syncDailyScheduleBlob = async (env, offsetDaysArray = [0]) => {
    for (const offset of offsetDaysArray) {
        await syncDailyScheduleBlobSingle(env, offset);
    }
};

const syncTrainLiveBoard = async (env) => {
    const token = await getTdxToken(env);
    const res = await fetch("https://tdx.transportdata.tw/api/basic/v3/Rail/TRA/TrainLiveBoard?%24format=JSON", { headers: { "Authorization": `Bearer ${token}` } });
    if (!res.ok) return;
    
    const json = await res.json(), liveMap = {};
    const timestampSec = Math.floor(Date.now() / 1000);
    const logCutoffSec = timestampSec - 1209600;
    
    try {
        await env.DB.prepare("DELETE FROM TrainLiveLogs WHERE Timestamp < ?").bind(logCutoffSec).run();
    } catch (_) {}

    const trains = json.TrainLiveBoards || [];
    const batchStatements = [];

    trains.forEach(t => { 
        const tno = String(t.TrainNo);
        const delay = Number(t.DelayTime) || 0;
        const station = t.StationName?.Zh_tw || t.StationID || "";
        liveMap[tno] = { delay, status: Number(t.TrainStatus) || 0, station }; 

        if (station) {
            batchStatements.push(
                env.DB.prepare("INSERT OR REPLACE INTO TrainLiveLogs (TrainNo, Timestamp, StationName, DelayTime) VALUES (?, ?, ?, ?)")
                    .bind(tno, timestampSec, station, delay)
            );
        }
    });

    const chunkSize = 80;
    for (let i = 0; i < batchStatements.length; i += chunkSize) {
        try { await env.DB.batch(batchStatements.slice(i, i + chunkSize)); } catch(_) {}
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

        // 🟢 每 3 分鐘更新「今天」與「明天」的輕量化 Blob，完整捕捉每日時刻表中的即時變動與停駛狀態！
        if (m % 3 === 0) {
            tasks.push(syncDailyScheduleBlobSingle(env, 0));
            tasks.push(syncDailyScheduleBlobSingle(env, 1));
        }

        // 每日凌晨 2 點：預先下載未來 60 天的時刻表 Blob
        if (h === 2 && m === 0) {
            const traOffsets = Array.from({ length: 60 }, (_, i) => i + 1);
            tasks.push(syncDailyScheduleBlob(env, traOffsets));
        }

        ctx.waitUntil(Promise.allSettled(tasks));
    },

    async fetch(request, env) {
        const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
        if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
        const url = new URL(request.url);

        try {
            // 1. 車站看板
            if (url.pathname === "/api/liveboard/station") {
                const sid = url.searchParams.get("station"), date = url.searchParams.get("date") || getTwDateString(0);
                const isToday = (date === getTwDateString(0));
                
                const [blobRow, liveR, rulesRow, alertsRow] = await env.DB.batch([
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`TIMETABLE_BLOB_${date}`),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'LIVE_DATA'"),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'SUSPENSION_RULES'"),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'ALERTS_DATA'")
                ]);

                const liveM = liveR.results[0] ? JSON.parse(liveR.results[0].Value) : {};
                const manualRules = rulesRow.results[0] ? JSON.parse(rulesRow.results[0].Value) : [];
                const alerts = alertsRow.results[0] ? JSON.parse(alertsRow.results[0].Value) : [];
                const parsedAlertRules = parseRulesFromAlerts(alerts);
                const rules = [...manualRules, ...parsedAlertRules];

                const timetable = blobRow.results[0] ? JSON.parse(blobRow.results[0].Value) : [];
                const nowM = (new Date().getUTCHours() + 8) % 24 * 60 + new Date().getUTCMinutes();

                const trains = [];
                timetable.forEach(t => {
                    const stop = t.Stops.find(s => s.SID === sid);
                    if (stop) {
                        trains.push({
                            No: t.No, Dir: t.Dir, Type: t.Type, Start: t.Start, Dest: t.Dest,
                            Arr: stop.Arr, Dep: stop.Dep, Seq: stop.Seq, Note: t.Note,
                            TripLine: t.Line, TrainSuspendedFlag: t.Susp, SuspendedFlag: stop.Susp,
                            fullStops: t.Stops
                        });
                    }
                });

                const res = trains.map(t => {
                    const l = liveM[t.No] || { delay: 0, status: 0, station: "" };
                    const [h, m] = (t.Dep || t.Arr).split(':').map(Number);
                    const patchedType = patchTrainType(t.No, t.Type, t.Note, t.Start, t.Dest);
                    
                    const ruleResult = applySuspensionRules(t.No, patchedType, t.fullStops, t.TrainSuspendedFlag, t.Note, rules);
                    const targetStopSuspended = ruleResult.stops.find(s => s.SID === sid)?.SuspendedFlag === 1;

                    return {
                        No: t.No, TrainNo: t.No, Dir: t.Dir, Type: patchedType, TrainTypeName: patchedType,
                        Start: t.Start, Dest: t.Dest, Arr: t.Arr, Dep: t.Dep,
                        DelayTime: isToday ? l.delay : 0, TrainStatus: isToday ? l.status : 0,
                        Note: ruleResult.note, TrainSuspendedFlag: ruleResult.trainSuspendedFlag,
                        SuspendedFlag: targetStopSuspended ? 1 : 0,
                        IsSuspended: targetStopSuspended || ruleResult.trainSuspendedFlag === 1,
                        IsPartiallySuspended: ruleResult.trainSuspendedFlag === 2,
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
                
                const [blobRow, rulesRow, alertsRow] = await env.DB.batch([
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`TIMETABLE_BLOB_${date}`),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'SUSPENSION_RULES'"),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'ALERTS_DATA'")
                ]);

                const timetable = blobRow.results[0] ? JSON.parse(blobRow.results[0].Value) : [];
                const trnData = timetable.find(t => String(t.No) === String(tno));
                const trn = trnData ? {
                    Type: trnData.Type, Note: trnData.Note, Line: trnData.Line, TrainSuspendedFlag: trnData.Susp,
                    Stops: trnData.Stops.map(s => ({
                        Seq: s.Seq, SID: s.SID, Name: s.Name, Arr: s.Arr, Dep: s.Dep, SuspendedFlag: s.Susp
                    }))
                } : { Stops: [] };

                const manualRules = rulesRow.results[0] ? JSON.parse(rulesRow.results[0].Value) : [];
                const alerts = alertsRow.results[0] ? JSON.parse(alertsRow.results[0].Value) : [];
                const parsedAlertRules = parseRulesFromAlerts(alerts);
                const rules = [...manualRules, ...parsedAlertRules];
                
                const start = trn.Stops && trn.Stops.length > 0 ? (trn.Stops[0].Name || "") : "";
                const dest = trn.Stops && trn.Stops.length > 0 ? (trn.Stops[trn.Stops.length - 1].Name || "") : "";
                const patchedType = patchTrainType(tno, trn.Type, trn.Note, start, dest);

                const ruleResult = applySuspensionRules(tno, patchedType, trn.Stops, trn.TrainSuspendedFlag, trn.Note, rules);

                return new Response(JSON.stringify({
                    TrainNo: tno, TrainTypeName: patchedType, Note: ruleResult.note, TripLine: trn.Line,
                    TrainSuspendedFlag: ruleResult.trainSuspendedFlag,
                    StopTimes: ruleResult.stops.map(s => ({
                        StationID: s.SID, StationName: { Zh_tw: s.Name },
                        ArrivalTime: s.Arr, DepartureTime: s.Dep, SuspendedFlag: s.SuspendedFlag || 0
                    }))
                }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 3. 起訖查詢
            if (url.pathname === "/api/route") {
                const s = url.searchParams.get("start"), e = url.searchParams.get("end"), d = url.searchParams.get("date") || getTwDateString(0);
                const targetTime = parseInt(url.searchParams.get("time") || 0);
                const minWait = parseInt(url.searchParams.get("minWait") || 5), maxWait = parseInt(url.searchParams.get("maxWait") || 120);

                const parseTimeMins = (t) => {
                    if (!t) return null;
                    const [h, m] = t.slice(0, 5).split(':').map(Number);
                    return h * 60 + m;
                };

                const [blobRow, liveR, rulesRow, alertsRow] = await env.DB.batch([
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = ?").bind(`TIMETABLE_BLOB_${d}`),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'LIVE_DATA'"),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'SUSPENSION_RULES'"),
                    env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'ALERTS_DATA'")
                ]);

                const timetable = blobRow.results[0] ? JSON.parse(blobRow.results[0].Value) : [];
                const liveMap = liveR.results[0] ? JSON.parse(liveR.results[0].Value) : {};
                const manualRules = rulesRow.results[0] ? JSON.parse(rulesRow.results[0].Value) : [];
                const alerts = alertsRow.results[0] ? JSON.parse(alertsRow.results[0].Value) : [];
                const parsedAlertRules = parseRulesFromAlerts(alerts);
                const rules = [...manualRules, ...parsedAlertRules];

                const directRoutes = [], leg1Candidates = [], leg2Candidates = [];

                timetable.forEach(t => {
                    const patchedType = patchTrainType(t.No, t.Type, t.Note, t.Start, t.Dest);
                    const ruleResult = applySuspensionRules(t.No, patchedType, t.Stops, t.Susp, t.Note, rules);
                    const stops = ruleResult.stops;

                    const idxStart = stops.findIndex(x => x.SID === s);
                    const idxEnd = stops.findIndex(x => x.SID === e);

                    if (idxStart !== -1) {
                        const startStop = stops[idxStart];
                        if (startStop.SuspendedFlag !== 1) {
                            const depMins = parseTimeMins(startStop.Dep);
                            if (depMins !== null && depMins >= targetTime) {
                                if (idxEnd !== -1 && idxStart < idxEnd && stops[idxEnd].SuspendedFlag !== 1) {
                                    const endStop = stops[idxEnd];
                                    directRoutes.push({
                                        trainNo: String(t.No), rawType: patchedType, typeName: patchedType, 
                                        dep: startStop.Dep.slice(0, 5), arr: endStop.Arr.slice(0, 5), dest: t.Dest,
                                        status: (liveMap[t.No]?.status === 2 || ruleResult.trainSuspendedFlag === 1) ? 2 : 0,
                                        DelayTime: Number(liveMap[t.No]?.delay || 0), TrainSuspendedFlag: ruleResult.trainSuspendedFlag
                                    });
                                } else {
                                    leg1Candidates.push({ t, startStop, idxStart, stops });
                                }
                            }
                        }
                    }

                    if (idxEnd !== -1) {
                        const endStop = stops[idxEnd];
                        if (endStop.SuspendedFlag !== 1) {
                            const arrMins = parseTimeMins(endStop.Arr);
                            if (arrMins !== null && arrMins >= targetTime && idxStart === -1) {
                                leg2Candidates.push({ t, endStop, idxEnd, stops });
                            }
                        }
                    }
                });

                const transferCandidates = [], seenPairs = new Set();

                for (const leg1 of leg1Candidates) {
                    const stops1 = leg1.stops;
                    const depA = parseTimeMins(leg1.startStop.Dep);

                    for (let i = leg1.idxStart + 1; i < stops1.length; i++) {
                        const transStop = stops1[i];
                        if (transStop.SuspendedFlag === 1) continue;
                        const arrTrans1 = parseTimeMins(transStop.Arr || transStop.Dep);

                        for (const leg2 of leg2Candidates) {
                            if (leg1.t.No === leg2.t.No) continue;
                            const pairKey = `${leg1.t.No}_${leg2.t.No}`;
                            if (seenPairs.has(pairKey)) continue;

                            const stops2 = leg2.stops;
                            const idxTrans2 = stops2.findIndex(x => x.SID === transStop.SID);

                            if (idxTrans2 === -1 || idxTrans2 >= leg2.idxEnd) continue;
                            if (stops2[idxTrans2].SuspendedFlag === 1 || stops2[leg2.idxEnd].SuspendedFlag === 1) continue;

                            let depTrans2 = parseTimeMins(stops2[idxTrans2].Dep || stops2[idxTrans2].Arr);
                            let arrB = parseTimeMins(stops2[leg2.idxEnd].Arr || stops2[leg2.idxEnd].Dep);

                            while (depTrans2 < arrTrans1 - 180) { depTrans2 += 1440; arrB += 1440; }

                            const schedWait = depTrans2 - arrTrans1;
                            if (schedWait < minWait || schedWait > maxWait) continue;

                            const delay1 = Number(liveMap[leg1.t.No]?.delay || 0);
                            const actualWait = schedWait - delay1;

                            if (actualWait >= 1) {
                                seenPairs.add(pairKey);
                                transferCandidates.push({
                                    transferStationCode: transStop.SID, transferStation: transStop.Name,
                                    schedWaitMinutes: schedWait, actualWaitMinutes: actualWait, leg1Delay: delay1,
                                    totalMinutes: (arrB - depA), endArrTimeAbs: arrB,
                                    leg1: {
                                        trainNo: leg1.t.No, typeName: patchTrainType(leg1.t.No, leg1.t.Type, leg1.t.Note, leg1.t.Start, leg1.t.Dest),
                                        depTime: leg1.startStop.Dep.slice(0, 5), arrTime: (transStop.Arr || transStop.Dep).slice(0, 5)
                                    },
                                    leg2: {
                                        trainNo: leg2.t.No, typeName: patchTrainType(leg2.t.No, leg2.t.Type, leg2.t.Note, leg2.t.Start, leg2.t.Dest),
                                        depTime: (stops2[idxTrans2].Dep || stops2[idxTrans2].Arr).slice(0, 5), arrTime: (stops2[leg2.idxEnd].Arr || stops2[leg2.idxEnd].Dep).slice(0, 5)
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
                const s = url.searchParams.get("start"), e = url.searchParams.get("end"), via = url.searchParams.get("via");
                const token = await getTdxToken(env);

                if (via) {
                    const [res1, res2] = await Promise.all([
                        fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/ODFare/${s}/to/${via}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } }),
                        fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/ODFare/${via}/to/${e}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } })
                    ]);
                    return new Response(JSON.stringify({ isTransfer: true, leg1: await res1.json(), leg2: await res2.json() }), { headers: { ...cors, 'Content-Type': 'application/json' } });
                }

                const res = await fetch(`https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/ODFare/${s}/to/${e}?%24format=JSON`, { headers: { "Authorization": `Bearer ${token}` } });
                return new Response(JSON.stringify(await res.json()), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 5. 通阻
            if (url.pathname === "/api/alerts") {
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'ALERTS_DATA'").first();
                return new Response(row?.Value || "[]", { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 6. 即時位置與歷史紀錄
            if (url.pathname === "/api/live") {
                const tno = url.searchParams.get("trainNo");
                const row = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'LIVE_DATA'").first();
                const liveMap = row ? JSON.parse(row.Value) : {};

                if (tno) {
                    const live = liveMap[tno] || { delay: 0, status: 0, station: "" };
                    let historyLogs = [];
                    try {
                        const dbResult = await env.DB.prepare("SELECT Timestamp, StationName, DelayTime FROM TrainLiveLogs WHERE TrainNo = ? ORDER BY Timestamp DESC LIMIT 35").bind(tno).all();
                        historyLogs = (dbResult.results || []).map(r => ({ ts: r.Timestamp * 1000, station: r.StationName, delay: r.DelayTime }));
                    } catch (_) {}

                    return new Response(JSON.stringify({
                        TrainNo: tno, ...live, DelayTime: Number(live.delay) || 0, TrainStatus: Number(live.status) || 0,
                        StationName: live.station ? { Zh_tw: live.station } : null, History: historyLogs
                    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
                } else {
                    const allLive = Object.keys(liveMap).map(k => ({
                        TrainNo: k, ...liveMap[k], DelayTime: Number(liveMap[k].delay) || 0, TrainStatus: Number(liveMap[k].status) || 0,
                        StationName: liveMap[k].station ? { Zh_tw: liveMap[k].station } : null
                    }));
                    return new Response(JSON.stringify(allLive), { headers: { ...cors, 'Content-Type': 'application/json' } });
                }
            }

            // 7. PIDS 管理與設定
            if (url.pathname === "/api/pids/marquee") {
                const conf = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_TOP_MARQUEE'").first();
                const alR = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'ALERTS_DATA'").first();
                const als = JSON.parse(alR?.Value || "[]");
                const prop = conf?.Value || "歡迎搭乘臺鐵。";
                const marqueeText = als.map(a => `⚠️【${a.Title}】${a.Description}`).join(" ❖ ") + (als.length ? " ❖ " : "") + prop;
                return new Response(JSON.stringify({ text: marqueeText }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }
            if (url.pathname === "/api/pids/assets") {
                const img = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_IMAGES'").first();
                const vid = await env.DB.prepare("SELECT Value FROM AppConfig WHERE Key = 'PIDS_VIDEO'").first();
                return new Response(JSON.stringify({ images: JSON.parse(img?.Value || "[]"), video: JSON.parse(vid?.Value || "[]") }), { headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            // 8. 同步
            if (url.pathname === "/api/sync") {
                const type = url.searchParams.get("type");
                if (type === 'live') await syncTrainLiveBoard(env); 
                else if (type === 'alerts') await syncTraAlerts(env);
                else if (type === 'schedule') {
                    await syncDailyScheduleBlobSingle(env, 0);
                    await syncDailyScheduleBlobSingle(env, 1);
                }
                return new Response(`✅ ${type} 同步成功！`, { headers: cors });
            }

        } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors }); }
        return new Response("TRA Worker v9.6.0", { headers: cors });
    }
};
