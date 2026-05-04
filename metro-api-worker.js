/**
 * Metro API Worker - TDX Master 強化版
 */

const METRO_CONFIG = {
  TRTC: {
    // 北捷車站編號與 TDX StationID 轉換 (範例，建議補全)
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
      // 取得參數：系統(sys), 車站(sid)
      let sys = (params.get('sys') || params.get('system') || 'TRTC').toUpperCase();
      const sid = (params.get('sid') || params.get('station') || '').toUpperCase();

      // ==========================================
      // 1. 即時到站 (Liveboard)
      // ==========================================
      if (path === '/api/liveboard' || path === '/api/live') {
        const apiUrl = `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/LiveBoard/${sys}?%24format=JSON`;
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
          // 高雄輕軌特殊處理方向
          if (sys === 'KLRT' && item.TripHeadSign) dest = `${dest} (${item.TripHeadSign.replace('方向','')})`;
          
          return {
            ...item,
            EstimateTime: estimate,
            Direction: dest
          };
        });
        
        return jsonRes(processed.sort((a, b) => a.EstimateTime - b.EstimateTime));
      }

      // ==========================================
      // 2. 首末班車 (FirstLastTimetable)
      // 支援: TRTC, KRTC, TYMC, TMRT, KLRT, NTMC, TRTCMG
      // ==========================================
      if (path === '/api/tdx/firstlast') {
        return jsonRes(await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/FirstLastTimetable/${sys}?%24format=JSON`));
      }

      // ==========================================
      // 3. 班距頻率 (Frequency)
      // 支援: TRTC, TYMC, TMRT, NTMC
      // ==========================================
      if (path === '/api/tdx/frequency') {
        return jsonRes(await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Frequency/${sys}?%24format=JSON`));
      }

      // ==========================================
      // 4. 站間運行時間 (S2STravelTime)
      // 支援: TRTC, KRTC, TYMC, TMRT, KLRT, NTMC
      // ==========================================
      if (path === '/api/tdx/traveltime') {
        return jsonRes(await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/S2STravelTime/${sys}?%24format=JSON`));
      }

      // ==========================================
      // 5. 站別時刻表 (StationTimeTable)
      // 注意: 北捷文湖線(BR)無資料，建議改用 Frequency
      // ==========================================
      if (path === '/api/schedule') {
        if (sys === 'TRTC' && sid.startsWith('BR')) {
          return jsonRes({ 
            error: "文湖線不提供站別時刻表", 
            suggestion: "請改用 /api/tdx/frequency 查詢班距",
            note: "According to TDX policy, TRTC Brown line has no station timetable."
          }, 400);
        }
        
        // 處理新北捷運細分代碼 (若傳入的是 NTMC，且需要查時刻表)
        let targetSys = sys;
        if (sys === 'NTMC') {
            // 這裡可以根據 sid 前綴判斷要導向 NTDLRT (淡海) 還是 NTALRT (安坑)
            if (sid.startsWith('V')) targetSys = 'NTDLRT';
            if (sid.startsWith('K')) targetSys = 'NTALRT';
        }

        const apiUrl = `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/StationTimeTable/${targetSys}?%24filter=StationID%20eq%20'${sid}'&%24format=JSON`;
        const data = await fetchTDX(env, apiUrl);
        return jsonRes({ Timetables: data });
      }

      // ==========================================
      // 6. 最新消息 (News)
      // ==========================================
      if (path === '/api/news') {
        return jsonRes(await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/News/${sys}?%24format=JSON`));
      }

      // ==========================================
      // 7. 車站清單 (Stations)
      // ==========================================
      if (path === '/api/stations') {
        const data = await fetchTDX(env, `https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/Station/${sys}?%24format=JSON`);
        const formatted = data.map(s => ({
          id: s.StationID,
          name: s.StationName.Zh_tw,
          line: s.StationID.replace(/[0-9]/g, '')
        }));
        return jsonRes(formatted);
      }

      return jsonRes({ error: "Endpoint Not Found" }, 404);
    } catch (err) {
      return jsonRes({ error: "Worker Error", msg: err.message }, 500);
    }
  }
};

// --- TDX API 工具 (帶快取機制) ---
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
  
  // Token 失效處理
  if (res.status === 401 && env.METRO_CACHE) {
    await env.METRO_CACHE.delete('tdx_token');
    return fetchTDX(env, url);
  }
  
  return res.ok ? await res.json() : [];
}