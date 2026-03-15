/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  TDX 公車 Cloudflare Worker — 全台版 + D1                    ║
 * ║                                                              ║
 * ║  Bindings 設定：                                             ║
 * ║    Secrets : TDX_CLIENT_ID, TDX_CLIENT_SECRET                ║
 * ║    KV      : BUS_META, BUS_RT                                ║
 * ║    D1      : BUS_DB  （路線/站牌靜態 + 歷史快照）             ║
 * ║    Cron    : "* * * * *"  和  "0 * * * *"                    ║
 * ║                                                              ║
 * ║  D1 資料表（初始化 SQL 見檔案底部）：                         ║
 * ║    bus_routes   - 路線靜態資料                               ║
 * ║    bus_stops    - 站牌靜態資料                               ║
 * ║    bus_snapshot - A1 即時位置快照（歷史）                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ================================================================
// 設定區
// ================================================================

const ALL_CITIES_V2 = [
  "Taipei", "NewTaipei", "Taoyuan", "Taichung", "Tainan", "Kaohsiung",
  "Keelung", "Hsinchu", "HsinchuCounty",
  "MiaoliCounty", "ChanghuaCounty", "NantouCounty",
  "YunlinCounty", "ChiayiCounty", "Chiayi",
  "PingtungCounty", "YilanCounty", "HualienCounty",
  "TaitungCounty", "PenghuCounty",
];

const USE_V3_TAINAN = false;
const BATCH_SIZE    = 5;   // 每分鐘抓幾個縣市的即時資料

/** 歷史快照保留天數（D1 自動清除舊資料） */
const SNAPSHOT_RETAIN_DAYS = 7;

/** 每次快照最多寫幾筆（避免 D1 單次寫入過多） */
const SNAPSHOT_BATCH_INSERT = 500;

const A1_SELECT = [
  "PlateNumb", "RouteUID", "RouteID", "RouteName",
  "SubRouteUID", "Direction", "BusPosition",
  "Speed", "Azimuth", "DutyStatus", "BusStatus",
  "GPSTime", "TransTime",
].join(",");

const ETA_SELECT = [
  "PlateNumb", "StopUID", "StopID", "StopName",
  "RouteUID", "RouteID", "RouteName", "SubRouteUID",
  "Direction", "EstimateTime", "StopStatus", "StopCountDown",
  "CurrentStop", "DestinationStop",
  "IsLastBus", "DataTime", "UpdateTime", "NextBusTime",
].join(",");

const TTL = { REALTIME: 60, ETA: 60 };

const TDX_BASE  = "https://tdx.transportdata.tw";
const TOKEN_URL = `${TDX_BASE}/auth/realms/TDXConnect/protocol/openid-connect/token`;
const TOKEN_KEY = "tdx:access_token";

const CORS = {
  "Access-Control-Allow-Origin" : "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ================================================================
// Token 管理（KV）
// ================================================================

async function getToken(env) {
  const cached = await env.BUS_META.getWithMetadata(TOKEN_KEY, "text");
  if (cached.value && cached.metadata?.expiresAt) {
    if (cached.metadata.expiresAt - Date.now() > 120_000) return cached.value;
  }
  return refreshToken(env);
}

async function refreshToken(env) {
  const res = await fetch(TOKEN_URL, {
    method : "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body   : new URLSearchParams({
      grant_type   : "client_credentials",
      client_id    : env.TDX_CLIENT_ID,
      client_secret: env.TDX_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token 取得失敗 [${res.status}]`);
  const { access_token, expires_in } = await res.json();
  await env.BUS_META.put(TOKEN_KEY, access_token, {
    expirationTtl: Math.max(60, expires_in - 60),
    metadata     : { expiresAt: Date.now() + expires_in * 1000 },
  });
  return access_token;
}

// ================================================================
// XML → JSON（備用）
// ================================================================

function elementToObject(el) {
  if (el.children.length === 0) {
    const t = el.textContent.trim();
    if (t !== "" && !isNaN(t)) return Number(t);
    if (t === "true")  return true;
    if (t === "false") return false;
    return t;
  }
  const result = {};
  for (const child of el.children) {
    const key = child.localName, val = elementToObject(child);
    if (key in result) {
      if (!Array.isArray(result[key])) result[key] = [result[key]];
      result[key].push(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

function xmlToJson(xmlText) {
  const doc  = new DOMParser().parseFromString(xmlText, "application/xml");
  const pErr = doc.querySelector("parsererror");
  if (pErr) throw new Error(`XML 解析失敗: ${pErr.textContent}`);
  const root = doc.documentElement, tag = root.localName;
  if (tag.startsWith("ArrayOf")) return { data: Array.from(root.children).map(elementToObject) };
  const dataEl = root.querySelector("Data");
  if (dataEl) return { data: Array.from(dataEl.children).map(elementToObject) };
  return { data: [elementToObject(root)] };
}

// ================================================================
// 資料標準化
// ================================================================

function normalizeA1(records) {
  const norm = (name) => {
      if (!name) return "";
      return name
          .replace(/[\(（][^\)）]*[\)）]/g, "") 
          .replace(/(去程半|返程半|去程|返程|狗狗公車|動物園專車|夜間公車|區間車|區|繞駛|繞|延駛|延)$/g, "")
          .replace(/\(?往[\u4e00-\u9fa5A-Za-z0-9]+\)?$/g, "")
          .trim();
  };

  return records.map(r => ({
    ...r,
    lon        : r.BusPosition?.PositionLon ?? null,
    lat        : r.BusPosition?.PositionLat ?? null,
    routeNameZh: r.RouteName?.Zh_tw ? norm(r.RouteName.Zh_tw) : null,
    rawRouteName: r.RouteName?.Zh_tw ?? null
  }));
}

function normalizeEta(records) {
  const norm = (name) => {
      if (!name) return "";
      return name
          .replace(/[\(（][^\)）]*[\)）]/g, "") 
          .replace(/(去程半|返程半|去程|返程|狗狗公車|動物園專車|夜間公車|區間車|區|繞駛|繞|延駛|延)$/g, "")
          .replace(/\(?往[\u4e00-\u9fa5A-Za-z0-9]+\)?$/g, "")
          .trim();
  };

  return records.map(r => ({
    ...r,
    routeNameZh    : r.RouteName?.Zh_tw ? norm(r.RouteName.Zh_tw) : null,
    rawRouteName   : r.RouteName?.Zh_tw ?? null,
    stopNameZh     : r.StopName?.Zh_tw  ?? null,
    estimateMinutes: r.EstimateTime != null ? Math.round(r.EstimateTime / 60) : null,
  }));
}

// ================================================================
// TDX API 呼叫器
// ================================================================

async function tdxFetch({ path, env, params = {}, forceXml = false, lastModified = null }) {
  const useXml = forceXml;
  const qs = new URLSearchParams({ $format: useXml ? "XML" : "JSON" });
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") qs.set(k, String(v));
  }
  const url = `${TDX_BASE}/api/basic${path}?${qs}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const token   = await getToken(env);
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept       : useXml ? "application/xml" : "application/json",
      };
      if (lastModified) headers["If-Modified-Since"] = lastModified;

      const res = await fetch(url, { headers });
      if (res.status === 304) return { data: null, lastModified: null, notModified: true };
      if (res.status === 401 && attempt < 3) {
        await env.BUS_META.delete(TOKEN_KEY);
        continue;
      }
      if (!res.ok) throw new Error(`TDX [${res.status}] ${path}: ${await res.text()}`);

      const lm = res.headers.get("Last-Modified");
      if (useXml) return { ...xmlToJson(await res.text()), lastModified: lm, notModified: false };
      return { data: await res.json(), lastModified: lm, notModified: false };

    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise(r => setTimeout(r, 500 * 2 ** (attempt - 1)));
    }
  }
}

// ================================================================
// KV 工具（只用於即時資料 BUS_RT）
// ================================================================

const kvKey = (type, ver, city, route) =>
  route ? `${type}:${ver}:${city}:${route}` : `${type}:${ver}:${city}`;

async function kvSet(kv, key, data, ttl) {
  const payload = JSON.stringify({ data, cachedAt: Date.now(), ttl });
  if (payload.length > 24 * 1024 * 1024) {
    console.warn(`[KV] ${key} 過大，截斷至 10000 筆`);
    const truncated = Array.isArray(data) ? data.slice(0, 10000) : data;
    await kv.put(key, JSON.stringify({ data: truncated, cachedAt: Date.now(), ttl, truncated: true }), { expirationTtl: ttl });
    return;
  }
  await kv.put(key, payload, { expirationTtl: ttl });
}

async function kvGet(kv, key) {
  const raw = await kv.get(key, "text");
  return raw ? JSON.parse(raw) : null;
}

const setLM = (env, key, val) => env.BUS_META.put(`lm:${key}`, val, { expirationTtl: 86400 });
const getLM = (env, key)      => env.BUS_META.get(`lm:${key}`, "text");

// ================================================================
// D1 工具（靜態資料 + 歷史快照）
// ================================================================

/**
 * 初始化 D1 資料表（第一次部署後呼叫 /db/init）
 */
async function d1Init(env) {
  const statements = [
    "CREATE TABLE IF NOT EXISTS bus_routes (id INTEGER PRIMARY KEY AUTOINCREMENT, city TEXT NOT NULL, ver TEXT NOT NULL DEFAULT 'v2', route_uid TEXT NOT NULL, route_id TEXT, route_name_zh TEXT, route_name_en TEXT, departure_stop_name_zh TEXT, destination_stop_name_zh TEXT, operator_ids TEXT, raw TEXT, updated_at TEXT NOT NULL, UNIQUE(city, ver, route_uid))",
    "CREATE TABLE IF NOT EXISTS bus_stops (id INTEGER PRIMARY KEY AUTOINCREMENT, city TEXT NOT NULL, ver TEXT NOT NULL DEFAULT 'v2', stop_uid TEXT NOT NULL, stop_id TEXT, stop_name_zh TEXT, stop_name_en TEXT, lon REAL, lat REAL, bearing TEXT, route_uid TEXT, direction INTEGER, raw TEXT, updated_at TEXT NOT NULL, UNIQUE(city, ver, stop_uid))",
    "CREATE TABLE IF NOT EXISTS bus_snapshot (id INTEGER PRIMARY KEY AUTOINCREMENT, city TEXT NOT NULL, ver TEXT NOT NULL DEFAULT 'v2', plate_numb TEXT, route_uid TEXT, route_name_zh TEXT, direction INTEGER, lon REAL, lat REAL, speed REAL, azimuth REAL, duty_status INTEGER, bus_status INTEGER, gps_time TEXT, snapshot_at TEXT NOT NULL)",
    "CREATE INDEX IF NOT EXISTS idx_snapshot_city_at ON bus_snapshot(city, snapshot_at)",
    "CREATE INDEX IF NOT EXISTS idx_snapshot_route ON bus_snapshot(route_uid, snapshot_at)",
    "CREATE INDEX IF NOT EXISTS idx_snapshot_plate ON bus_snapshot(plate_numb, snapshot_at)",
    "CREATE INDEX IF NOT EXISTS idx_routes_city ON bus_routes(city, ver)",
    "CREATE INDEX IF NOT EXISTS idx_stops_city ON bus_stops(city, ver)",
    "CREATE INDEX IF NOT EXISTS idx_stops_route ON bus_stops(route_uid)",
  ];

  for (const sql of statements) {
    await env.DB.prepare(sql).run();
  }
}

/**
 * 將路線資料 upsert 進 D1
 */
async function d1UpsertRoutes(env, city, ver, routes) {
  if (!routes.length) return;
  const now = new Date().toISOString();

  // 分批 insert，每批 100 筆
  for (let i = 0; i < routes.length; i += 100) {
    const batch = routes.slice(i, i + 100);
    const stmts = batch.map(r =>
      env.DB.prepare(`
        INSERT INTO bus_routes
          (city, ver, route_uid, route_id, route_name_zh, route_name_en,
           departure_stop_name_zh, destination_stop_name_zh, operator_ids, raw, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(city, ver, route_uid) DO UPDATE SET
          route_id                 = excluded.route_id,
          route_name_zh            = excluded.route_name_zh,
          route_name_en            = excluded.route_name_en,
          departure_stop_name_zh   = excluded.departure_stop_name_zh,
          destination_stop_name_zh = excluded.destination_stop_name_zh,
          operator_ids             = excluded.operator_ids,
          raw                      = excluded.raw,
          updated_at               = excluded.updated_at
      `).bind(
        city, ver,
        r.RouteUID ?? "",
        r.RouteID  ?? null,
        r.RouteName?.Zh_tw ?? null,
        r.RouteName?.En    ?? null,
        r.DepartureStopName?.Zh_tw   ?? null,
        r.DestinationStopName?.Zh_tw ?? null,
        r.Operators ? JSON.stringify(r.Operators.map(o => o.OperatorID)) : null,
        JSON.stringify(r),
        now,
      )
    );
    await env.DB.batch(stmts);
  }
  console.log(`[D1] Routes upsert ${ver}:${city}: ${routes.length} 筆`);
}

/**
 * 將站牌資料 upsert 進 D1
 */
async function d1UpsertStops(env, city, ver, stops) {
  if (!stops.length) return;
  const now = new Date().toISOString();

  for (let i = 0; i < stops.length; i += 100) {
    const batch = stops.slice(i, i + 100);
    const stmts = batch.map(s =>
      env.DB.prepare(`
        INSERT INTO bus_stops
          (city, ver, stop_uid, stop_id, stop_name_zh, stop_name_en,
           lon, lat, bearing, route_uid, direction, raw, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(city, ver, stop_uid) DO UPDATE SET
          stop_id      = excluded.stop_id,
          stop_name_zh = excluded.stop_name_zh,
          stop_name_en = excluded.stop_name_en,
          lon          = excluded.lon,
          lat          = excluded.lat,
          bearing      = excluded.bearing,
          route_uid    = excluded.route_uid,
          direction    = excluded.direction,
          raw          = excluded.raw,
          updated_at   = excluded.updated_at
      `).bind(
        city, ver,
        s.StopUID ?? "",
        s.StopID  ?? null,
        s.StopName?.Zh_tw ?? null,
        s.StopName?.En    ?? null,
        s.StopPosition?.PositionLon ?? null,
        s.StopPosition?.PositionLat ?? null,
        s.Bearing  ?? null,
        s.RouteUID ?? null,
        s.Direction ?? null,
        JSON.stringify(s),
        now,
      )
    );
    await env.DB.batch(stmts);
  }
  console.log(`[D1] Stops upsert ${ver}:${city}: ${stops.length} 筆`);
}

/**
 * 將 A1 即時資料寫入歷史快照
 */
async function d1InsertSnapshot(env, city, ver, records) {
  if (!records.length) return;
  const now = new Date().toISOString();

  const limited = records.slice(0, SNAPSHOT_BATCH_INSERT);
  const stmts = limited.map(r =>
    env.DB.prepare(`
      INSERT INTO bus_snapshot
        (city, ver, plate_numb, route_uid, route_name_zh,
         direction, lon, lat, speed, azimuth,
         duty_status, bus_status, gps_time, snapshot_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      city, ver,
      r.PlateNumb  ?? null,
      r.RouteUID   ?? null,
      r.routeNameZh ?? r.RouteName?.Zh_tw ?? null,
      r.Direction  ?? null,
      r.lon ?? r.BusPosition?.PositionLon ?? null,
      r.lat ?? r.BusPosition?.PositionLat ?? null,
      r.Speed      ?? null,
      r.Azimuth    ?? null,
      r.DutyStatus ?? null,
      r.BusStatus  ?? null,
      r.GPSTime    ?? null,
      now,
    )
  );
  await env.DB.batch(stmts);
  console.log(`[D1] Snapshot ${ver}:${city}: ${limited.length} 筆`);
}

/**
 * 清除舊快照（保留最近 N 天）
 */
async function d1CleanSnapshots(env) {
  const cutoff = new Date(Date.now() - SNAPSHOT_RETAIN_DAYS * 86400_000).toISOString();
  const result = await env.DB.prepare(
    `DELETE FROM bus_snapshot WHERE snapshot_at < ?`
  ).bind(cutoff).run();
  console.log(`[D1] 清除舊快照，cutoff=${cutoff}，刪除 ${result.changes} 筆`);
}

// ================================================================
// 分批索引
// ================================================================

async function getBatchIndex(env) {
  const raw = await env.BUS_META.get("batch:index", "text");
  return raw ? parseInt(raw, 10) : 0;
}

async function advanceBatchIndex(env, total) {
  const current = await getBatchIndex(env);
  const next    = (current + BATCH_SIZE) % total;
  await env.BUS_META.put("batch:index", String(next), { expirationTtl: 3600 });
  return current;
}

// ================================================================
// Cron 排程
// ================================================================

async function scheduledHandler(event, env) {
  const cron = event.cron;
  console.log(`[Cron] ${cron} @ ${new Date().toISOString()}`);
  try {
    if (cron === "* * * * *") {
      await fetchRealtimeBatch(env);
    } else if (cron === "0 * * * *") {
      await fetchAllStatic(env);
      await d1CleanSnapshots(env); // 每小時清一次舊快照
    } else {
      await fetchRealtimeBatch(env);
      await fetchAllStatic(env);
    }
  } catch (err) {
    console.error("[Cron] 嚴重錯誤:", err.message);
    await env.BUS_META.put("error:last", JSON.stringify({
      message: err.message, cron, time: new Date().toISOString(),
    }), { expirationTtl: 3600 });
  }
}

// ── 每分鐘：即時資料 ──────────────────────────────────────────

async function fetchRealtimeBatch(env) {
  const total  = ALL_CITIES_V2.length;
  const start  = await advanceBatchIndex(env, total);
  const cities = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    cities.push(ALL_CITIES_V2[(start + i) % total]);
  }
  const v3Task  = USE_V3_TAINAN ? [fetchCityRealtime(env, "v3", "Tainan")] : [];
  const results = await Promise.allSettled([
    ...cities.map(c => fetchCityRealtime(env, "v2", c)),
    ...v3Task,
  ]);
  const failed = results.filter(r => r.status === "rejected");
  console.log(`[Cron] 本批 cities=${cities.join(",")}，失敗 ${failed.length}/${results.length}`);
  failed.forEach(r => console.error("  失敗:", r.reason?.message));
}

async function fetchCityRealtime(env, ver, city) {
  const base = ver === "v2" ? "v2/Bus" : "v3/Bus";

  // A1 即時定位
  const a1Key  = kvKey("rt_a1", ver, city);
  const a1Path = `/${base}/RealTimeByFrequency/City/${city}`;
  const a1Lm   = await getLM(env, a1Key);
  const a1     = await tdxFetch({ path: a1Path, env, params: { $top: 500, $select: A1_SELECT }, lastModified: a1Lm });

  if (!a1.notModified) {
    const norm = normalizeA1(Array.isArray(a1.data) ? a1.data : a1.data?.data ?? []);
    // 1. 寫 KV（即時查詢用）
    await kvSet(env.BUS_RT, a1Key, norm, TTL.REALTIME);
    if (a1.lastModified) await setLM(env, a1Key, a1.lastModified);
    // 2. 寫 D1 快照（歷史記錄）
    await d1InsertSnapshot(env, city, ver, norm);
    console.log(`[Cron] A1 ${ver}:${city}: ${norm.length} 筆`);
  }

  // ETA 預估到站（只存 KV，不需歷史）
  const etaKey  = kvKey("eta", ver, city);
  const etaPath = `/${base}/EstimatedTimeOfArrival/City/${city}`;
  const etaLm   = await getLM(env, etaKey);
  const eta     = await tdxFetch({ path: etaPath, env, params: { $top: 1000, $select: ETA_SELECT }, lastModified: etaLm });

  if (!eta.notModified) {
    const norm = normalizeEta(Array.isArray(eta.data) ? eta.data : eta.data?.data ?? []);
    await kvSet(env.BUS_RT, etaKey, norm, TTL.ETA);
    if (eta.lastModified) await setLM(env, etaKey, eta.lastModified);
    console.log(`[Cron] ETA ${ver}:${city}: ${norm.length} 筆`);
  }
}

// ── 每小時：靜態資料 → D1 ─────────────────────────────────────

async function fetchAllStatic(env, force = false) {
  // force 時先清除所有縣市的 Last-Modified，確保全部重新抓取
  if (force) {
    const clearTasks = ALL_CITIES_V2.flatMap(city => [
      env.BUS_META.delete(`lm:${kvKey("route","v2",city)}`),
      env.BUS_META.delete(`lm:${kvKey("stop","v2",city)}`),
    ]);
    await Promise.all(clearTasks);
    console.log("[Static] 已清除所有 Last-Modified 快取");
  }

  const results = await Promise.allSettled(
    ALL_CITIES_V2.map(city => fetchCityStatic(env, "v2", city, force))
  );
  const failed = results.filter(r => r.status === "rejected");
  console.log(`[Cron] Static 完成，失敗 ${failed.length}/${ALL_CITIES_V2.length}`);
  failed.forEach(r => console.error("  失敗:", r.reason?.message));
}

async function fetchCityStatic(env, ver, city, force = false) {
  const base = ver === "v2" ? "v2/Bus" : "v3/Bus";

  // 路線
  const routeKey = kvKey("route", ver, city);
  const routeLm  = force ? null : await getLM(env, routeKey);
  const routeRes = await tdxFetch({
    path: `/${base}/Route/City/${city}`, env,
    params: { $top: 1000 }, lastModified: routeLm,
  });
  if (!routeRes.notModified) {
    const data = Array.isArray(routeRes.data) ? routeRes.data : routeRes.data?.data ?? [];
    await d1UpsertRoutes(env, city, ver, data);
    if (routeRes.lastModified) await setLM(env, routeKey, routeRes.lastModified);
  }

  // 站牌：分頁抓取，每次 5000 筆直到抓完
  const stopKey = kvKey("stop", ver, city);
  const stopLm  = force ? null : await getLM(env, stopKey);
  let skip = 0, lastLm = null, totalInserted = 0;
  while (true) {
    const stopRes = await tdxFetch({
      path: `/${base}/Stop/City/${city}`, env,
      params: { $top: 5000, $skip: skip },
      lastModified: skip === 0 ? stopLm : null,
    });
    if (stopRes.notModified) break;
    const page = Array.isArray(stopRes.data) ? stopRes.data : stopRes.data?.data ?? [];
    if (!page.length) break;
    await d1UpsertStops(env, city, ver, page);
    totalInserted += page.length;
    if (stopRes.lastModified) lastLm = stopRes.lastModified;
    if (page.length < 5000) break; // 最後一頁
    skip += 5000;
  }
  if (lastLm) await setLM(env, stopKey, lastLm);
  if (totalInserted > 0) console.log(`[Static] Stop ${ver}:${city}: 共 ${totalInserted} 筆`);
}

// ================================================================
// HTTP 路由
// ================================================================

function matchPath(pattern, pathname) {
  const pp = pattern.split("/"), rp = pathname.split("/");
  if (pp.length !== rp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) params[pp[i].slice(1)] = decodeURIComponent(rp[i]);
    else if (pp[i] !== rp[i]) return null;
  }
  return params;
}

const jsonRes = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });

const okRes  = (data, meta = {}) => jsonRes({ success: true, ...meta, data });
const errRes = (msg, status = 500, details = null) => jsonRes({ success: false, error: msg, details }, status);

/** KV 即時資料讀取，無快取則 fallback TDX */
async function fromKv({ cacheKey, path, env, params, normalize }) {
  const cached = await kvGet(env.BUS_RT, cacheKey);
  if (cached) {
    const remaining = Math.max(0, Math.round(cached.ttl - (Date.now() - cached.cachedAt) / 1000));
    return okRes(cached.data, {
      source               : "cache",
      cachedAt             : new Date(cached.cachedAt).toISOString(),
      cacheRemainingSeconds: remaining,
      count                : Array.isArray(cached.data) ? cached.data.length : null,
      truncated            : cached.truncated ?? false,
    });
  }
  const res  = await tdxFetch({ path, env, params });
  let   data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  if (normalize) data = normalize(data);
  return okRes(data, { source: "live", count: data.length });
}

/** D1 靜態資料查詢 */
async function d1QueryRoutes(env, city, ver, routeName) {
  let sql    = `SELECT * FROM bus_routes WHERE city = ? AND ver = ?`;
  const bind = [city, ver];
  if (routeName) { sql += ` AND route_name_zh = ?`; bind.push(routeName); }
  sql += ` ORDER BY route_name_zh LIMIT 500`;
  const result = await env.DB.prepare(sql).bind(...bind).all();
  return result.results ?? [];
}

async function d1QueryStops(env, city, ver, routeUid) {
  let sql    = `SELECT * FROM bus_stops WHERE city = ? AND ver = ?`;
  const bind = [city, ver];
  if (routeUid) { sql += ` AND route_uid = ?`; bind.push(routeUid); }
  sql += ` ORDER BY stop_name_zh LIMIT 2000`;
  const result = await env.DB.prepare(sql).bind(...bind).all();
  return result.results ?? [];
}

/** D1 歷史快照查詢 */
async function d1QuerySnapshot(env, { city, routeUid, plate, from, to, limit = 1000 }) {
  let sql    = `SELECT * FROM bus_snapshot WHERE 1=1`;
  const bind = [];
  if (city)     { sql += ` AND city = ?`;      bind.push(city); }
  if (routeUid) { sql += ` AND route_uid = ?`; bind.push(routeUid); }
  if (plate)    { sql += ` AND plate_numb = ?`; bind.push(plate); }
  if (from)     { sql += ` AND snapshot_at >= ?`; bind.push(from); }
  if (to)       { sql += ` AND snapshot_at <= ?`; bind.push(to); }
  sql += ` ORDER BY snapshot_at DESC LIMIT ?`;
  bind.push(Math.min(limit, 5000));
  const result = await env.DB.prepare(sql).bind(...bind).all();
  return result.results ?? [];
}

// ================================================================
// 請求處理
// ================================================================

async function handleRequest(request, env) {
  const { pathname, searchParams } = new URL(request.url);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "GET")     return errRes("只支援 GET 請求", 405);

  const odata = {};
  for (const k of ["$select","$filter","$orderby","$top","$skip","$count"]) {
    if (searchParams.has(k)) odata[k] = searchParams.get(k);
  }

  try {

    // ── 系統端點 ────────────────────────────────────────────────

    if (pathname === "/health") {
      const [batchIdx, lastErr] = await Promise.all([
        getBatchIndex(env),
        env.BUS_META.get("error:last", "text"),
      ]);
      return okRes({
        status            : "ok",
        timestamp         : new Date().toISOString(),
        totalCities       : ALL_CITIES_V2.length,
        currentBatchIndex : batchIdx,
        nextBatchCities   : ALL_CITIES_V2.slice(batchIdx, batchIdx + BATCH_SIZE),
        cycleMinutes      : Math.ceil(ALL_CITIES_V2.length / BATCH_SIZE),
        lastSchedulerError: lastErr ? JSON.parse(lastErr) : null,
      });
    }

    // ── Debug：查看 KV 中特定路線名稱的資料 ─────────────────────────────────
    // GET /debug/live/:city/:route
    const debugP = matchPath("/debug/live/:city/:route", pathname);
    if (debugP) {
      const a1Cache = await kvGet(env.BUS_RT, kvKey("rt_a1", "v2", debugP.city));
      const allBuses = a1Cache?.data ?? [];
      // 找出前5筆的 routeNameZh 值，方便確認格式
      const sample = allBuses.slice(0, 5).map(b => ({ routeNameZh: b.routeNameZh, RouteName: b.RouteName }));
      // 找出符合路線名稱的
      const matched = allBuses.filter(b =>
        (b.routeNameZh && b.routeNameZh.includes(debugP.route)) ||
        (b.RouteName?.Zh_tw && b.RouteName.Zh_tw.includes(debugP.route))
      ).slice(0, 5);
      return okRes({ sample, matched, totalBuses: allBuses.length, searchRoute: debugP.route });
    }

    if (pathname === "/cities") {
      return okRes({ v2: ALL_CITIES_V2, v3: USE_V3_TAINAN ? ["Tainan"] : [] });
    }

    if (pathname === "/cache/status") {
      const rt = await env.BUS_RT.list();
      return okRes({ realtimeKeys: rt.keys.map(k => k.name) });
    }

    // ── D1 初始化（第一次部署後呼叫一次）────────────────────────

    if (pathname === "/db/init") {
      await d1Init(env);
      return okRes({ message: "D1 資料表建立完成" });
    }

    // ── D1 統計 ──────────────────────────────────────────────────

    if (pathname === "/db/stats") {
      const [routes, stops, snapshots] = await Promise.all([
        env.DB.prepare(`SELECT city, ver, COUNT(*) as count FROM bus_routes GROUP BY city, ver ORDER BY city`).all(),
        env.DB.prepare(`SELECT city, ver, COUNT(*) as count FROM bus_stops GROUP BY city, ver ORDER BY city`).all(),
        env.DB.prepare(`SELECT city, COUNT(*) as count, MIN(snapshot_at) as oldest, MAX(snapshot_at) as newest FROM bus_snapshot GROUP BY city ORDER BY city`).all(),
      ]);
      return okRes({
        routes   : routes.results,
        stops    : stops.results,
        snapshots: snapshots.results,
      });
    }

    // ── 手動觸發 ─────────────────────────────────────────────────

    if (pathname === "/trigger/realtime") {
      const start = Date.now();
      await fetchRealtimeBatch(env);
      return okRes({ message: "即時資料抓取完成", elapsedMs: Date.now() - start });
    }

    if (pathname === "/trigger/static") {
      const force = searchParams.get("force") === "true";
      const start = Date.now();
      await fetchAllStatic(env, force);
      return okRes({ message: `靜態資料抓取完成${force ? "（強制更新）" : ""}`, elapsedMs: Date.now() - start });
    }

    const triggerCity = matchPath("/trigger/city/:city", pathname);
    if (triggerCity) {
      const ver   = searchParams.get("ver")  ?? "v2";
      const type  = searchParams.get("type") ?? "realtime"; // realtime | static | all
      const force = searchParams.get("force") === "true";
      const start = Date.now();
      if (type === "static") {
        await fetchCityStatic(env, ver, triggerCity.city, force);
        return okRes({ message: `${ver}:${triggerCity.city} 靜態資料抓取完成${force?"（強制）":""}`, elapsedMs: Date.now() - start });
      } else if (type === "all") {
        await Promise.all([
          fetchCityRealtime(env, ver, triggerCity.city),
          fetchCityStatic(env, ver, triggerCity.city, force),
        ]);
        return okRes({ message: `${ver}:${triggerCity.city} 全部資料抓取完成`, elapsedMs: Date.now() - start });
      } else {
        await fetchCityRealtime(env, ver, triggerCity.city);
        return okRes({ message: `${ver}:${triggerCity.city} 即時資料抓取完成`, elapsedMs: Date.now() - start });
      }
    }

    // ── V2 即時資料（KV）─────────────────────────────────────────

    let p;

    p = matchPath("/v2/bus/realtime/:city", pathname)
     ?? matchPath("/v2/bus/realtime/:city/:route", pathname);
    if (p) return fromKv({ cacheKey: kvKey("rt_a1","v2",p.city,p.route), path:`/v2/Bus/RealTimeByFrequency/City/${p.city}${p.route?"/"+p.route:""}`, env, params:{$top:500,$select:A1_SELECT,...odata}, normalize:normalizeA1 });

    p = matchPath("/v2/bus/estimated/:city", pathname)
     ?? matchPath("/v2/bus/estimated/:city/:route", pathname);
    if (p) return fromKv({ cacheKey: kvKey("eta","v2",p.city,p.route), path:`/v2/Bus/EstimatedTimeOfArrival/City/${p.city}${p.route?"/"+p.route:""}`, env, params:{$top:1000,$select:ETA_SELECT,...odata}, normalize:normalizeEta });

    // ── V2 靜態資料（D1）─────────────────────────────────────────

    p = matchPath("/v2/bus/route/:city", pathname)
     ?? matchPath("/v2/bus/route/:city/:route", pathname);
    if (p) {
      const rows = await d1QueryRoutes(env, p.city, "v2", p.route ?? null);
      return okRes(rows, { source: "d1", count: rows.length });
    }

    p = matchPath("/v2/bus/stop/:city", pathname);
    if (p) {
      const routeUid = searchParams.get("routeUid") ?? null;
      const rows     = await d1QueryStops(env, p.city, "v2", routeUid);
      return okRes(rows, { source: "d1", count: rows.length });
    }

    // ── V3 即時資料（KV）─────────────────────────────────────────

    p = matchPath("/v3/bus/realtime/:city", pathname);
    if (p) return fromKv({ cacheKey: kvKey("rt_a1","v3",p.city), path:`/v3/Bus/RealTimeByFrequency/City/${p.city}`, env, params:{$top:500,...odata}, normalize:normalizeA1 });

    p = matchPath("/v3/bus/estimated/:city", pathname);
    if (p) return fromKv({ cacheKey: kvKey("eta","v3",p.city), path:`/v3/Bus/EstimatedTimeOfArrival/City/${p.city}`, env, params:{$top:1000,...odata}, normalize:normalizeEta });

    // ── V3 靜態資料（D1）─────────────────────────────────────────

    p = matchPath("/v3/bus/route/:city", pathname);
    if (p) {
      const rows = await d1QueryRoutes(env, p.city, "v3", null);
      return okRes(rows, { source: "d1", count: rows.length });
    }

    p = matchPath("/v3/bus/stop/:city", pathname);
    if (p) {
      const routeUid = searchParams.get("routeUid") ?? null;
      const rows     = await d1QueryStops(env, p.city, "v3", routeUid);
      return okRes(rows, { source: "d1", count: rows.length });
    }

    // ── 歷史快照查詢（D1）────────────────────────────────────────
    //
    // 用法範例：
    //   /bus/snapshot?city=Taipei
    //   /bus/snapshot?city=Taipei&routeUid=TPE001001&from=2026-03-15T00:00:00Z
    //   /bus/snapshot?plate=ABC-123&limit=500

    if (pathname === "/bus/snapshot") {
      const rows = await d1QuerySnapshot(env, {
        city    : searchParams.get("city")     ?? undefined,
        routeUid: searchParams.get("routeUid") ?? undefined,
        plate   : searchParams.get("plate")    ?? undefined,
        from    : searchParams.get("from")     ?? undefined,
        to      : searchParams.get("to")       ?? undefined,
        limit   : parseInt(searchParams.get("limit") ?? "1000", 10),
      });
      return okRes(rows, { source: "d1", count: rows.length });
    }


    // ── 路線搜尋（跨縣市） ────────────────────────────────────────────────────
    if (pathname === "/v2/bus/route/search") {
      const q = searchParams.get("q") ?? "";
      if (!q) return errRes("請提供 q 參數", 400);
      const result = await env.DB.prepare(
        "SELECT * FROM bus_routes WHERE route_name_zh LIKE ? OR route_name_en LIKE ? ORDER BY city, route_name_zh LIMIT 50"
      ).bind(`%${q}%`, `%${q}%`).all();
      return okRes(result.results ?? [], { source: "d1", count: result.results?.length ?? 0 });
    }

    // ── 車籍字典 ──────────────────────────────────────────────────────────────
    p = matchPath("/v2/bus/vehicle/:city", pathname);
    if (p) {
      const res = await tdxFetch({ path: `/v2/Bus/Vehicle/City/${p.city}`, env, params: { $top: 1000 } });
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return okRes(arr, { source: "live", count: arr.length });
    }

    // ── 路線站牌清單（含方向/站序） ──────────────────────────────────────────
    p = matchPath("/v2/bus/info/:city/:route", pathname);
    if (p) {
      const cacheKey = `info:v2:${p.city}:${p.route}`;
      const cached = await kvGet(env.BUS_RT, cacheKey);
      if (cached) return okRes(cached.data, { source: "cache" });
      const res = await tdxFetch({ path: `/v2/Bus/StopOfRoute/City/${p.city}/${encodeURIComponent(p.route)}`, env, params: { $top: 100 } });
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      await kvSet(env.BUS_RT, cacheKey, arr, 3600);
      return okRes(arr, { source: "live", count: arr.length });
    }

    // ── 路線軌跡 ──────────────────────────────────────────────────────────────
    p = matchPath("/v2/bus/shape/:city/:route", pathname);
    if (p) {
      const cacheKey = `shape:v2:${p.city}:${p.route}`;
      const cached = await kvGet(env.BUS_RT, cacheKey);
      if (cached) return okRes(cached.data, { source: "cache" });
      const res = await tdxFetch({ path: `/v2/Bus/Shape/City/${p.city}/${encodeURIComponent(p.route)}`, env, params: { $top: 20 } });
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      await kvSet(env.BUS_RT, cacheKey, arr, 3600);
      return okRes(arr, { source: "live", count: arr.length });
    }

    // ── 站牌查詢經過路線 ──────────────────────────────────────────────────────
    p = matchPath("/v2/bus/stop-routes/:city", pathname);
    if (p) {
      const name = searchParams.get("name") ?? "";
      if (!name) return errRes("請提供 name 參數", 400);
      const result = await env.DB.prepare(
        "SELECT DISTINCT route_uid, route_name_zh, city, direction FROM bus_stops WHERE city = ? AND stop_name_zh = ? LIMIT 100"
      ).bind(p.city, name).all();
      const routes = (result.results ?? []).map(r => ({ name: r.route_name_zh, routeUid: r.route_uid, city: r.city }));
      return okRes({ routes }, { source: "d1" });
    }

    // ── 即時資料整合（A1 + ETA）前端專用 ────────────────────────────────────
    p = matchPath("/v2/bus/live/:city/:route", pathname);
    if (p) {
      const [a1Cache, etaCache] = await Promise.all([
        kvGet(env.BUS_RT, kvKey("rt_a1", "v2", p.city)),
        kvGet(env.BUS_RT, kvKey("eta",   "v2", p.city)),
      ]);
      const routeName = p.route;
      const allBuses  = a1Cache?.data ?? [];
      const buses = allBuses
        .filter(b => (b.routeNameZh === routeName) || (b.RouteName?.Zh_tw === routeName))
        .map(b => {
          const lat = b.lat ?? b.BusPosition?.PositionLat ?? null;
          const lon = b.lon ?? b.BusPosition?.PositionLon ?? null;
          return {
            PlateNumb : b.PlateNumb,
            plate     : b.PlateNumb,
            dir       : b.Direction,
            lat       : lat,
            lon       : lon,
            speed     : b.Speed,
            azimuth   : b.Azimuth,
            dutyStatus: b.DutyStatus,
            busStatus : b.BusStatus,
            time      : b.GPSTime,
          };
        });
      const estimates = {};
      (etaCache?.data ?? [])
        .filter(e => (e.routeNameZh === routeName) || (e.RouteName?.Zh_tw === routeName))
        .forEach(e => {
          estimates[`${e.Direction}_${e.StopUID}`] = {
            sec        : e.EstimateTime,
            plate      : e.PlateNumb,
            status     : e.StopStatus ?? e.StopCountDown,
            nextBusTime: e.NextBusTime ?? null,
          };
        });
      return okRes({ buses, estimates }, {
        source  : a1Cache ? "cache" : "live",
        busCount: buses.length,
        etaCount: Object.keys(estimates).length,
        cachedAt: a1Cache ? new Date(a1Cache.cachedAt).toISOString() : null,
      });
    }

    // ── 班表 ──────────────────────────────────────────────────────────────────
    p = matchPath("/v2/bus/schedule/:city/:route", pathname);
    if (p) {
      const cacheKey = `schedule:v2:${p.city}:${p.route}`;
      const cached = await kvGet(env.BUS_RT, cacheKey);
      if (cached) return okRes(cached.data, { source: "cache" });
      const res = await tdxFetch({ path: `/v2/Bus/Schedule/City/${p.city}/${encodeURIComponent(p.route)}`, env, params: { $top: 100 } });
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      await kvSet(env.BUS_RT, cacheKey, arr, 3600);
      return okRes(arr, { source: "live", count: arr.length });
    }

    // ── 票價 ──────────────────────────────────────────────────────────────────
    p = matchPath("/v2/bus/fare/:city/:route", pathname);
    if (p) {
      const cacheKey = `fare:v2:${p.city}:${p.route}`;
      const cached = await kvGet(env.BUS_RT, cacheKey);
      if (cached) return okRes(cached.data, { source: "cache" });
      const res = await tdxFetch({ path: `/v2/Bus/RouteFare/City/${p.city}/${encodeURIComponent(p.route)}`, env, params: { $top: 20 } });
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      await kvSet(env.BUS_RT, cacheKey, arr, 3600);
      return okRes(arr, { source: "live", count: arr.length });
    }

    // ── 公告 ──────────────────────────────────────────────────────────────────
    if (pathname === "/v2/bus/news") {
      const city = searchParams.get("city") ?? "";
      const type = searchParams.get("type") ?? "CityBus";
      const path = (type === "InterCity" || !city) ? "/v2/Bus/News/InterCity" : `/v2/Bus/News/City/${city}`;
      const res = await tdxFetch({ path, env, params: { $top: 30 } });
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return okRes(arr, { source: "live", count: arr.length });
    }

    // ── 通阻 ──────────────────────────────────────────────────────────────────
    if (pathname === "/v2/bus/alert") {
      const city = searchParams.get("city") ?? "";
      const type = searchParams.get("type") ?? "CityBus";
      const path = (type === "InterCity" || !city) ? "/v2/Bus/Alert/InterCity" : `/v2/Bus/Alert/City/${city}`;
      const res = await tdxFetch({ path, env, params: { $top: 30 } });
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return okRes(arr, { source: "live", count: arr.length });
    }

    // ── 404 ──────────────────────────────────────────────────────

    return errRes(`找不到路由: ${pathname}`, 404, {
      availableRoutes: [
        "GET /health",
        "GET /cities",
        "GET /cache/status",
        "GET /db/init  ← 第一次部署後呼叫一次",
        "GET /db/stats",
        "GET /trigger/realtime",
        "GET /trigger/static",
        "GET /trigger/city/:city[?ver=v2|v3]",
        "GET /v2/bus/live/:city/:route          (KV → 前端即時用)",
        "GET /v2/bus/info/:city/:route          (路線站牌清單)",
        "GET /v2/bus/shape/:city/:route         (路線軌跡)",
        "GET /v2/bus/vehicle/:city              (車籍字典)",
        "GET /v2/bus/stop-routes/:city?name=    (站牌查路線)",
        "GET /v2/bus/schedule/:city/:route      (班表)",
        "GET /v2/bus/fare/:city/:route          (票價)",
        "GET /v2/bus/news?city=&type=           (公告)",
        "GET /v2/bus/alert?city=&type=          (通阻)",
        "GET /v2/bus/route/search?q=            (路線搜尋)",
        "GET /v2/bus/realtime/:city[/:route]   (KV)",
        "GET /v2/bus/estimated/:city[/:route]  (KV)",
        "GET /v2/bus/route/:city[/:route]      (D1)",
        "GET /v2/bus/stop/:city[?routeUid=]    (D1)",
        "GET /v3/bus/realtime/:city            (KV)",
        "GET /v3/bus/estimated/:city           (KV)",
        "GET /v3/bus/route/:city               (D1)",
        "GET /v3/bus/stop/:city[?routeUid=]    (D1)",
        "GET /bus/snapshot?city=&routeUid=&plate=&from=&to=&limit=  (D1)",
      ],
    });

  } catch (err) {
    console.error("[Worker]", err.message);
    return errRes(err.message ?? "內部伺服器錯誤", 500);
  }
}

// ================================================================
// 主入口
// ================================================================

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scheduledHandler(event, env));
  },
};

/*
 * ================================================================
 * D1 初始化 SQL（供參考，實際透過 /db/init 端點執行）
 * ================================================================
 *
 * CREATE TABLE IF NOT EXISTS bus_routes (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   city TEXT NOT NULL, ver TEXT NOT NULL DEFAULT 'v2',
 *   route_uid TEXT NOT NULL, route_id TEXT,
 *   route_name_zh TEXT, route_name_en TEXT,
 *   departure_stop_name_zh TEXT, destination_stop_name_zh TEXT,
 *   operator_ids TEXT, raw TEXT, updated_at TEXT NOT NULL,
 *   UNIQUE(city, ver, route_uid)
 * );
 *
 * CREATE TABLE IF NOT EXISTS bus_stops (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   city TEXT NOT NULL, ver TEXT NOT NULL DEFAULT 'v2',
 *   stop_uid TEXT NOT NULL, stop_id TEXT,
 *   stop_name_zh TEXT, stop_name_en TEXT,
 *   lon REAL, lat REAL, bearing TEXT,
 *   route_uid TEXT, direction INTEGER,
 *   raw TEXT, updated_at TEXT NOT NULL,
 *   UNIQUE(city, ver, stop_uid)
 * );
 *
 * CREATE TABLE IF NOT EXISTS bus_snapshot (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   city TEXT NOT NULL, ver TEXT NOT NULL DEFAULT 'v2',
 *   plate_numb TEXT, route_uid TEXT, route_name_zh TEXT,
 *   direction INTEGER, lon REAL, lat REAL,
 *   speed REAL, azimuth REAL,
 *   duty_status INTEGER, bus_status INTEGER,
 *   gps_time TEXT, snapshot_at TEXT NOT NULL
 * );
 * ================================================================
 */