// ============================================
// 台灣公車即時追蹤系統 - Cloudflare Worker
// 完整版 - 支援所有 TDX Bus API
// ============================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS 預檢處理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    // 忽略 favicon 請求
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    // 解析參數
    const action = url.searchParams.get('action');
    const category = url.searchParams.get('category') || 'CityBus';
    const city = url.searchParams.get('city');
    const route = url.searchParams.get('route');
    const stopName = url.searchParams.get('name');

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    try {
      const token = await getTDXToken(env);
      const baseUrl = 'https://tdx.transportdata.tw/api/basic/v2/Bus';
      const authHeader = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      };

      // ============================================
      // 核心函式：根據類別組合 API 路徑
      // ============================================
      const getPath = (apiType) => {
        if (category === 'InterCity') {
          return `/${apiType}/InterCity/${route || ''}`;
        }
        return `/${apiType}/City/${city}/${route || ''}`;
      };

      // ============================================
      // 功能 1: 取得路線站序資訊 (action=info)
      // ============================================
      if (action === 'info') {
        const apiUrl = `${baseUrl}${getPath('StopOfRoute')}?$format=JSON`;
        console.log('📍 [INFO] 查詢站序:', apiUrl);
        
        const response = await fetch(apiUrl, { headers: authHeader });
        
        if (!response.ok) {
          throw new Error(`TDX API 錯誤: ${response.status}`);
        }
        
        const data = await response.text();
        
        return new Response(data, {
          headers: {
            ...corsHeaders,
            'Cache-Control': 'public, max-age=3600' // 站序資料可快取 1 小時
          }
        });
      }

      // ============================================
      // 功能 2: 取得路線線型 (action=shape)
      // ============================================
      if (action === 'shape') {
        const apiUrl = `${baseUrl}${getPath('Shape')}?$format=JSON`;
        console.log('🗺️ [SHAPE] 查詢線型:', apiUrl);
        
        const response = await fetch(apiUrl, { headers: authHeader });
        
        if (!response.ok) {
          throw new Error(`TDX API 錯誤: ${response.status}`);
        }
        
        const data = await response.text();
        
        return new Response(data, {
          headers: {
            ...corsHeaders,
            'Cache-Control': 'public, max-age=3600' // 線型資料可快取 1 小時
          }
        });
      }

      // ============================================
      // 功能 3: 反查站點經過的路線 (action=stop_info)
      // ============================================
      if (action === 'stop_info') {
        if (!stopName) {
          return new Response(JSON.stringify({ 
            error: '缺少站名參數 (name)' 
          }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        // 構建過濾條件
        const filter = encodeURIComponent(`StopName/Zh_tw eq '${stopName}'`);
        
        // 組合 API 網址
        let apiUrl;
        if (category === 'InterCity') {
          // 公路客運：查詢範圍較大
          apiUrl = `${baseUrl}/Stop/InterCity?$filter=${filter}&$select=RouteName,Direction&$format=JSON`;
        } else {
          // 市區公車：以縣市為範圍
          if (!city) {
            return new Response(JSON.stringify({ 
              error: '市區公車查詢需要 city 參數' 
            }), {
              status: 400,
              headers: corsHeaders
            });
          }
          apiUrl = `${baseUrl}/Stop/City/${city}?$filter=${filter}&$select=RouteName,Direction&$format=JSON`;
        }
        
        console.log('🔍 [STOP_INFO] 反查站點路線:', apiUrl);
        
        const response = await fetch(apiUrl, { headers: authHeader });
        
        if (!response.ok) {
          throw new Error(`TDX API 錯誤: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 去重並排序路線名稱
        const routeNames = [...new Set(
          data.map(item => item.RouteName?.Zh_tw || item.RouteName)
            .filter(name => name)
        )].sort((a, b) => {
          // 智慧排序：數字在前，文字在後
          const aNum = parseInt(a);
          const bNum = parseInt(b);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          return a.localeCompare(b, 'zh-TW');
        });
        
        return new Response(JSON.stringify({ 
          stopName: stopName,
          city: city,
          category: category,
          routes: routeNames,
          count: routeNames.length
        }), {
          headers: {
            ...corsHeaders,
            'Cache-Control': 'public, max-age=600' // 站點路線資料可快取 10 分鐘
          }
        });
      }

      // ============================================
      // 預設功能: 即時動態資料 (A1 + N1)
      // ============================================
      console.log('🚌 [LIVE] 查詢即時動態:', getPath('RealTimeByFrequency'));
      
      // 並行取得車輛位置 (A1) 和到站時間 (N1)
      const [resA1, resN1] = await Promise.all([
        fetch(`${baseUrl}${getPath('RealTimeByFrequency')}?$format=JSON`, { 
          headers: authHeader 
        }),
        fetch(`${baseUrl}${getPath('EstimatedTimeOfArrival')}?$format=JSON`, { 
          headers: authHeader 
        })
      ]);

      if (!resA1.ok || !resN1.ok) {
        throw new Error('無法取得即時動態資料');
      }

      const dataA1 = await resA1.json();
      const dataN1 = await resN1.json();
      
      const now = Date.now();

      // 整理車輛位置資料（過濾 5 分鐘內的資料）
      const buses = dataA1
        .filter(b => {
          const updateTime = new Date(b.SrcTransTime || b.UpdateTime).getTime();
          return (now - updateTime) < 300000; // 5 分鐘內
        })
        .map(b => ({
          plate: b.PlateNumb,
          lat: b.BusPosition?.PositionLat,
          lon: b.BusPosition?.PositionLon,
          dir: b.Direction,
          azimuth: b.Azimuth,
          speed: b.Speed,
          updateTime: b.SrcTransTime || b.UpdateTime
        }))
        .filter(b => b.lat && b.lon); // 只保留有座標的資料

      // 整理到站時間資料
      const estimates = {};
      dataN1.forEach(est => {
        const key = `${est.Direction}_${est.StopUID}`;
        estimates[key] = {
          sec: est.EstimateTime,
          status: est.StopStatus,
          updateTime: est.SrcUpdateTime || est.UpdateTime
        };
      });

      const result = {
        buses: buses,
        estimates: estimates,
        timestamp: new Date().toISOString(),
        dataCount: {
          buses: buses.length,
          estimates: Object.keys(estimates).length
        }
      };

      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache' // 即時資料不快取
        }
      });

    } catch (err) {
      console.error('❌ Worker 錯誤:', err);
      
      return new Response(JSON.stringify({ 
        error: '處理請求時發生錯誤',
        detail: err.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

// ============================================
// 輔助函式: 取得 TDX 認證 Token
// ============================================
async function getTDXToken(env) {
  const apiUrl = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
  
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', env.TDX_CLIENT_ID);
  params.append('client_secret', env.TDX_CLIENT_SECRET);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded' 
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`無法取得 TDX Token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ============================================
// API 使用範例
// ============================================
/*

1. 查詢路線站序
GET https://bus-worker.weacamm.org/?action=info&category=CityBus&city=Taipei&route=307

2. 查詢路線線型
GET https://bus-worker.weacamm.org/?action=shape&category=CityBus&city=Taipei&route=307

3. 反查站點路線
GET https://bus-worker.weacamm.org/?action=stop_info&category=CityBus&city=Taipei&name=捷運市政府站

4. 查詢即時動態（預設）
GET https://bus-worker.weacamm.org/?category=CityBus&city=Taipei&route=307

*/
