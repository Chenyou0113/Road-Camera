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
          const sidUpper = sid.toUpperCase();
          const sidPadded = sidUpper.replace(/^([A-Z]+)([0-9])$/, '$10$2');
          const sidUnpadded = sidUpper.replace(/^([A-Z]+)0([0-9])$/, '$1$2');
          filtered = filtered.filter(t => {
            const tSid = String(t.StationID || '').toUpperCase();
            return tSid === sidUpper || tSid === sidPadded || tSid === sidUnpadded;
          });
        }

        const processed = filtered.map(item => {
          let estimate = (item.EstimateTime != null) ? item.EstimateTime * 60 : 0;
          let dest = item.DestinationStationName?.Zh_tw || item.TripHeadSign || "目的地";
          if (sys === 'KLRT' && item.TripHeadSign) dest = `${dest} (${item.TripHeadSign.replace('方向','')})`;
          
          return {
            ...item,
            EstimateTime: estimate,
            Direction: dest,
            TrainType: item.TrainType ?? (item.TripHeadSign?.includes('直達') ? 2 : (item.TripHeadSign?.includes('普通') ? 1 : 0))
          };
        });
        
        return jsonRes(processed.sort((a, b) => a.EstimateTime - b.EstimateTime));
      }

      // ==========================================
      // 2. 站別時刻表 (StationTimeTable) - 完美解析版
      // ==========================================
      if (path === '/api/schedule') {
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
                let destName = routeObj.DestinationStaionName?.Zh_tw || routeObj.DestinationStationName?.Zh_tw || "未知方向";
                const direction = routeObj.Direction;
                if (targetSys === 'KLRT' || sid.startsWith('C')) {
                    destName = direction === 0 ? '順時針' : (direction === 1 ? '逆時針' : destName);
                }
                const timetablesArray = routeObj.Timetables || routeObj.TimeTables || [];
                
                timetablesArray.forEach(t => {
                    allTimetables.push({
                        DestinationName: destName,
                        DestinationStationName: { Zh_tw: destName },
                        DepartureTime: t.DepartureTime || t.ArrivalTime,
                        ArrivalTime: t.ArrivalTime || t.DepartureTime,
                        TrainNumber: t.TrainNo || t.TrainNumber || '--',
                        TrainType: t.TrainType || 0,
                        Direction: direction,
                        LinePrefix: sid.replace(/[0-9]/g, '')
                    });
                });
            });
        }
        
        allTimetables.sort((a, b) => (a.DepartureTime || "").localeCompare(b.DepartureTime || ""));
        return jsonRes({ Timetables: allTimetables });
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

      // ==========================================
      // 6. 停站模式 (StoppingPattern)
      // ==========================================
      if (path === '/api/stopping-pattern' || path === '/api/pattern') {
        const data = await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/StoppingPattern/${sys}?%24format=JSON`);
        return jsonRes(data);
      }

      // ==========================================
      // 7. 列車即時位置 (LivePosition - 預留未來地圖擴充)
      // ==========================================
      if (path === '/api/position' || path === '/api/liveposition') {
        const data = await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LivePosition/${sys}?%24format=JSON`);
        let processed = [];
        if (Array.isArray(data)) {
          processed = data.map(item => {
            let dirText = '未知';
            if (item.Direction === 0) dirText = (sys === 'KLRT' || item.LineID === 'C') ? '順時針' : '去程';
            else if (item.Direction === 1) dirText = (sys === 'KLRT' || item.LineID === 'C') ? '逆時針' : '返程';
            else if (item.Direction === 2) dirText = '迴圈';
            return { ...item, DirectionText: dirText };
          });
        }
        return jsonRes(processed);
      }

      // ==========================================
      // 8. 車站月台資料 (StationPlatform - 預留月台指引)
      // ==========================================
      if (path === '/api/platform' || path === '/api/station-platform') {
        const data = await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/StationPlatform/${sys}?%24format=JSON`);
        return jsonRes(data);
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