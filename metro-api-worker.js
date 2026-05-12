/**
 * Metro API Worker - TDX Master 旗艦完整版
 * 支援：即時動態、站別時刻表、營運通阻(支援 ALL 全台查詢)、最新消息
 */

const METRO_CONFIG = {
  TRTC: {
    tdxIdMap: { 'O15': '049', 'BL12': '100', 'R10': '100', 'BL15': '091', 'BR10': '091', 'O07': '047', 'BL14': '047' }
  }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const params = url.searchParams;
    
    const corsHeaders = { 
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS", 
      "Access-Control-Allow-Headers": "Content-Type" 
    };
    
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    
    const jsonRes = (data, status = 200) => new Response(JSON.stringify(data), { 
      status, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

    try {
      let sys = (params.get('sys') || params.get('system') || 'TRTC').toUpperCase();
      const sid = (params.get('sid') || params.get('station') || '').toUpperCase();

      // ==========================================
      // 1. 即時到站 (Liveboard)
      // ==========================================
      if (path === '/api/liveboard' || path === '/api/live') {
        const apiUrl = `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/${sys === 'ALL' ? 'TRTC' : sys}?%24format=JSON`;
        const tdxData = await fetchTDX(env, apiUrl);
        
        let filtered = tdxData || [];
        if (sys === 'TRTC' && sid) {
          const targetTdxId = METRO_CONFIG.TRTC.tdxIdMap[sid] || sid;
          filtered = filtered.filter(t => String(t.StationID) === targetTdxId);
        } else if (sid) {
          filtered = filtered.filter(t => String(t.StationID).toUpperCase() === sid);
        }

        const processed = filtered.map(item => {
          let estimate = (item.EstimateTime != null) ? item.EstimateTime * 60 : 0;
          let dest = item.DestinationStationName.Zh_tw;
          if (sys === 'KLRT' && item.TripHeadSign) dest = `${dest} (${item.TripHeadSign.replace('方向','')})`;
          
          return { ...item, EstimateTime: estimate, Direction: dest };
        });
        
        return jsonRes(processed.sort((a, b) => a.EstimateTime - b.EstimateTime));
      }

      // ==========================================
      // 2. 站別時刻表 (StationTimeTable) - 完美解析版
      // ==========================================
      if (path === '/api/schedule') {
        if (sys === 'TRTC' && sid.startsWith('BR')) {
          return jsonRes({ Timetables: [] }); // 文湖線無時刻表
        }
        
        let targetSys = sys;
        if (sys === 'NTMC') {
            if (sid.startsWith('V')) targetSys = 'NTDLRT';
            if (sid.startsWith('K')) targetSys = 'NTALRT';
        }

        const apiUrl = `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/StationTimeTable/${targetSys}?%24filter=StationID%20eq%20'${sid}'&%24format=JSON`;
        const data = await fetchTDX(env, apiUrl);
        
        let allTimetables = [];
        if (Array.isArray(data)) {
            data.forEach(routeObj => {
                const destName = routeObj.DestinationStaionName?.Zh_tw || routeObj.DestinationStationName?.Zh_tw || "未知方向";
                const direction = routeObj.Direction;
                const timetablesArray = routeObj.Timetables || routeObj.TimeTables || [];
                
                timetablesArray.forEach(t => {
                    allTimetables.push({
                        DestinationName: destName,
                        DestinationStationName: { Zh_tw: destName },
                        DepartureTime: t.DepartureTime || t.ArrivalTime,
                        ArrivalTime: t.ArrivalTime || t.DepartureTime,
                        TrainNumber: t.TrainNo || t.TrainNumber || '--',
                        Direction: direction,
                        LinePrefix: sid.replace(/[0-9]/g, '')
                    });
                });
            });
        }
        
        // 過濾掉過去的班次
        const twTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
        const hh = String(twTime.getHours()).padStart(2, '0');
        const mm = String(twTime.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${hh}:${mm}`;
        
        const futureTimetables = allTimetables.filter(t => (t.DepartureTime || "") >= currentTimeStr);
        futureTimetables.sort((a, b) => (a.DepartureTime || "").localeCompare(b.DepartureTime || ""));

        return jsonRes({ Timetables: futureTimetables });
      }

      // ==========================================
      // 3. 營運通阻 (Alert) - 支援單一與全台(ALL)查詢
      // ==========================================
      if (path === '/api/alert' || path === '/api/alerts') {
        if (sys === 'ALL') {
            const systems = ['TRTC', 'KRTC', 'TYMC', 'TMRT', 'NTMC', 'KLRT'];
            // 平行發送請求，加快速度
            const promises = systems.map(s => 
                fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Alert/${s}?%24format=JSON`)
                .then(data => ({ sysCode: s, data }))
            );
            const results = await Promise.all(promises);
            
            let combined = [];
            results.forEach(res => {
                if (Array.isArray(res.data)) {
                    // 把哪家捷運的代碼寫入資料，讓前端可以識別
                    res.data.forEach(item => combined.push({ ...item, SysCode: res.sysCode }));
                }
            });
            return jsonRes(combined);
        } else {
            const data = await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Alert/${sys}?%24format=JSON`);
            return jsonRes(data);
        }
      }

      // ==========================================
      // 4. 最新消息 (News)
      // ==========================================
      if (path === '/api/news') {
        const data = await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/News/${sys}?%24format=JSON`);
        return jsonRes(data);
      }

      // ==========================================
      // 5. 車站清單 (Stations)
      // ==========================================
      if (path === '/api/stations') {
        const data = await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Station/${sys}?%24format=JSON`);
        return jsonRes(data.map(s => ({
          id: s.StationID,
          name: s.StationName.Zh_tw,
          line: s.StationID.replace(/[0-9]/g, '')
        })));
      }

      return jsonRes({ error: "Endpoint Not Found" }, 404);
    } catch (err) {
      return jsonRes({ error: "Worker Error", msg: err.message }, 500);
    }
  }
};

// --- TDX 取資料小幫手 ---
async function fetchTDX(env, url) {
  let token = (env.METRO_CACHE) ? await env.METRO_CACHE.get('tdx_token') : null;
  
  if (!token) {
    const auth = await fetch('https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.TDX_CLIENT_ID,
        client_secret: env.TDX_CLIENT_SECRET
      })
    });
    if (!auth.ok) return [];
    const authData = await auth.json();
    token = authData.access_token;
    if (token && env.METRO_CACHE) await env.METRO_CACHE.put('tdx_token', token, { expirationTtl: 3500 });
  }

  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  
  if (res.status === 401 && env.METRO_CACHE) {
    await env.METRO_CACHE.delete('tdx_token');
    return fetchTDX(env, url);
  }
  
  return res.ok ? await res.json() : [];
}