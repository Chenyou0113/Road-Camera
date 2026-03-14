/**
 * 台灣公車即時動態系統 - 終極旗艦穩定版 (v14.5)
 * 網址：bus-worker.weacamm.org
 * 修正：加入 NextBusTime 支援、解決站點反查與幽靈車問題
 */

let cachedToken = null;
let tokenExpiry = 0;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const params = url.searchParams;
    const cache = caches.default;
    const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const action = params.get("action");
    const category = params.get("category") || "CityBus";
    const city = params.get("city") || "Taipei";
    const route = params.get("route");
    const search = params.get("search");
    const authCode = params.get("authCode");
    
    let apiVer = (city === "Tainan" && category !== "InterCity") ? "v3" : "v2";
    if (params.get("version")) apiVer = params.get("version");
    const encodedRoute = route ? encodeURIComponent(route) : "";

    const isStaticAction = ["info", "shape", "fare", "schedule", "first_last_trip", "stop_info", "vehicle", "news", "alert", "network", "depot", "station", "stop", "shuttle_auth", "shuttle_op", "shuttle_stop", "shuttle_route", "shuttle_schedule", "drts_stop", "drts_station", "drts_op", "drts_route", "drts_booking"].includes(action);

    if (isStaticAction) {
      let cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;
    }

    const sendResponse = (data, status = 200, ttl = 60) => {
      if (status === 200 && isStaticAction) {
        const now = new Date();
        const targetTime = new Date(now);
        targetTime.setUTCHours(19, 0, 0, 0); 
        if (now > targetTime) targetTime.setDate(targetTime.getDate() + 1);
        ttl = Math.floor((targetTime.getTime() - now.getTime()) / 1000);
        if (ttl <= 0) ttl = 60;
      }
      const response = new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` } });
      if (isStaticAction && status === 200) ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    };

    try {
      const token = await getTDXToken(env);
      const authHeader = { "Authorization": `Bearer ${token}` };

      const safeFetch = async (apiUrl, retries = 3) => {
        await sleep(Math.floor(Math.random() * 100) + 50);
        let res = await fetch(apiUrl, { headers: authHeader });
        if ((res.status === 429 || res.status >= 500) && retries > 0) { await sleep(1500); return safeFetch(apiUrl, retries - 1); }
        if (!res.ok) return [];
        const data = await res.json();
        return data.Items || (Array.isArray(data) ? data : []);
      };

      const baseBusUrl = `https://tdx.transportdata.tw/api/basic/${apiVer}/Bus`;

      if (action === "list_all") {
        const queryCity = params.get("city"); const queryType = params.get("type"); 
        let sql = "SELECT name, departure, destination, city, type FROM routes WHERE 1=1";
        let binds = [];
        if (search) { sql += " AND (name LIKE ? OR departure LIKE ? OR destination LIKE ?)"; binds.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (queryType === "InterCity") { sql += " AND type = 'InterCity'"; }
        else if (queryCity) { sql += " AND city = ? AND type = 'CityBus'"; binds.push(queryCity); }
        sql += " ORDER BY name ASC LIMIT 500";
        const results = await env.DB.prepare(sql).bind(...binds).all();
        return sendResponse(results.results, 200, 3600);
      }

      if (action === "stop_info") {
        const nameParam = params.get("name");
        let allResults = [];
        const cityData = await safeFetch(`${baseBusUrl}/StopOfRoute/City/${city}?$format=JSON`);
        const cityRoutes = cityData.filter(r => r.Stops?.some(s => s.StopName?.Zh_tw.includes(nameParam)));
        allResults = allResults.concat(cityRoutes.map(i => i.RouteName?.Zh_tw || i.RouteName));
        if (allResults.length < 5 || city === "HualienCounty") {
            const interData = await safeFetch(`https://tdx.transportdata.tw/api/basic/v2/Bus/StopOfRoute/InterCity?$format=JSON`);
            const interRoutes = interData.filter(r => r.Stops?.some(s => s.StopName?.Zh_tw.includes(nameParam)));
            allResults = allResults.concat(interRoutes.map(i => i.RouteName?.Zh_tw || i.RouteName));
        }
        return sendResponse({ routes: [...new Set(allResults)].filter(Boolean).sort() }, 200, 86400);
      }

      if (isStaticAction) {
        const apiMap = { info: "StopOfRoute", shape: "Shape", fare: "RouteFare", schedule: "Schedule", first_last_trip: "FirstLastTripInfo", vehicle: "Vehicle", news: "News", alert: "Alert" };
        const endpoint = apiMap[action];
        let apiUrl = "";
        if (action === "vehicle" && category !== "InterCity") {
            const support = ["Taipei", "NewTaipei", "Taoyuan", "Taichung", "Kaohsiung"];
            apiUrl = support.includes(city) ? `https://tdx.transportdata.tw/api/basic/v2/Bus/Vehicle/City/${city}` : `https://tdx.transportdata.tw/api/basic/v2/Bus/Vehicle`;
        } else {
            const ver = (category === "InterCity") ? "v2" : apiVer;
            const path = (category === "InterCity") ? `${endpoint}/InterCity${route ? `/${encodedRoute}` : ""}` : `${endpoint}/City/${city}${route ? `/${encodedRoute}` : ""}`;
            apiUrl = `https://tdx.transportdata.tw/api/basic/${ver}/Bus/${path}`;
        }
        const data = await safeFetch(`${apiUrl}${apiUrl.includes('?') ? '&' : '?'}?$format=JSON`);
        return sendResponse(data, 200);
      }

      if (!route) return sendResponse({ error: "Missing route" }, 400);
      const curVer = (category === "InterCity") ? "v2" : apiVer;
      const a1Url = `https://tdx.transportdata.tw/api/basic/${curVer}/Bus/RealTimeByFrequency/${category === "InterCity" ? "InterCity" : `City/${city}`}/${encodedRoute}?$format=JSON`;
      const n1Url = `https://tdx.transportdata.tw/api/basic/${curVer}/Bus/EstimatedTimeOfArrival/${category === "InterCity" ? "InterCity" : `City/${city}`}/${encodedRoute}?$format=JSON`;
      let occupancyMap = {};
      const fetchOcc = async () => {
          if (city !== 'Taipei') return;
          try {
              const res = await fetch("https://tcgbusfs.blob.core.windows.net/blobbus/TstBusSeatEvent.json");
              const list = await res.json();
              list.forEach(ev => occupancyMap[ev.BusID.replace(/-/g, '').toUpperCase()] = { level: ev.Level, num: ev.RemainingNum });
          } catch(e) {}
      };
      const [a1, n1, _] = await Promise.all([ safeFetch(a1Url), safeFetch(n1Url), fetchOcc() ]);
      return sendResponse({
        buses: a1.filter(b => (b.BusStatus === 0 && b.DutyStatus !== 2 && (b.RouteName?.Zh_tw || b.RouteName) === route)).map(b => {
          const bKey = b.PlateNumb.replace(/-/g, '').toUpperCase();
          return { plate: b.PlateNumb, lat: b.BusPosition?.PositionLat, lon: b.BusPosition?.PositionLon, dir: b.Direction, azi: b.Azimuth, time: b.GPSTime || b.RecTime, occupancy: occupancyMap[bKey] || null };
        }).filter(b => b.lat !== undefined),
        estimates: n1.reduce((acc, est) => {
          acc[`${est.Direction}_${est.StopUID}`] = { 
            sec: est.EstimateTime ?? null, 
            status: est.StopStatus, 
            plate: est.PlateNumb,
            nextBusTime: est.NextBusTime ?? null // 🌟 傳出 NextBusTime
          };
          return acc;
        }, {})
      }, 200, 0);

    } catch (err) {
      return sendResponse({ error: "Worker異常", message: err.message }, 500, 0);
    }
  }
};

async function getTDXToken(env) {
  const now = Date.now();
  if (cachedToken && now < (tokenExpiry - 60000)) return cachedToken;
  const res = await fetch("https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.TDX_CLIENT_ID, client_secret: env.TDX_CLIENT_SECRET }) });
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in * 1000);
  return cachedToken;
}
