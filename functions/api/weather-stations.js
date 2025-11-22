/**
 * 氣象署天氣資料 API 端點
 * 
 * 功能：從 CWA 抓取天氣資料 -> 清洗簡化 -> 快取 5 分鐘
 * 
 * 安全特性：
 * ✅ Origin 白名單檢查 (防止跨域盜連)
 * ✅ D1 快取 5 分鐘
 * ✅ 自動數據清洗和座標驗證
 * 
 * 流程：
 * 1. 安全性檢查 (Origin 白名單)
 * 2. 檢查 Cloudflare 快取
 * 3. 如無快取，呼叫 CWA API
 * 4. 資料清洗 (把複雜的巢狀結構攤平)
 * 5. 過濾掉無效資料 (經緯度為空、故障代碼 -99/-98)
 * 6. 設定 5 分鐘快取並返回
 */

import { checkRequestSecurity, createCORSHeaders } from '../lib/security.js';

export async function onRequest(context) {
  const { request, env } = context;
  const cache = caches.default;

  // 🛡️ 第一道防線：Origin 白名單檢查
  const securityCheck = checkRequestSecurity(request);
  if (!securityCheck.allowed) {
    return securityCheck.response;
  }
  
  // 固定的快取鍵 (所有請求都用同一個鍵，確保全局共享)
  const cacheKey = new Request("https://internal-cache/weather-stations");

  try {
    // ============ 第 1 步：檢查快取 ============
    console.log('🔄 檢查天氣資料快取...');
    let response = await cache.match(cacheKey);
    
    if (response) {
      console.log('✅ 快取命中，直接返回');
      // 添加快取指示標頭和安全的 CORS 頭
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('X-Cache', 'HIT');
      // 更新 CORS 頭為安全版本
      const corsHeaders = createCORSHeaders(securityCheck.origin);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });
      return newResponse;
    }
    
    console.log('❌ 快取未命中，呼叫 CWA API...');

    // ============ 第 2 步：呼叫 CWA API ============
    const apiKey = env.CWA_API_KEY;
    if (!apiKey) {
      console.error('❌ 環境變數 CWA_API_KEY 未設定');
      return new Response(
        JSON.stringify({ error: 'API Key 未配置' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = `https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/O-A0003-001?Authorization=${apiKey}&downloadType=WEB&format=JSON`;
    
    console.log('🌐 正在從 CWA 伺服器載入資料...');
    const res = await fetch(apiUrl, { method: 'GET' });
    
    if (!res.ok) {
      console.error(`❌ CWA API 返回狀態 ${res.status}`);
      throw new Error(`CWA API 錯誤: ${res.statusText}`);
    }
    
    const rawData = await res.json();
    console.log(`✅ CWA 返回 ${rawData.cwaopendata.dataset.Station.length} 個測站的資料`);

    // ============ 第 3 步：資料清洗 ============
    // CWA 的 JSON 結構非常深，例如：
    // rawData
    //   └─ cwaopendata
    //      └─ dataset
    //         └─ Station[]
    //            ├─ StationId (站點ID)
    //            ├─ StationName (站點名稱)
    //            ├─ GeoInfo
    //            │  ├─ CountyName (縣市)
    //            │  ├─ TownName (鄉鎮)
    //            │  └─ Coordinates[] (經緯度，但格式有點奇怪)
    //            └─ WeatherElement (數據)
    //               ├─ AirTemperature (氣溫)
    //               ├─ RelativeHumidity (濕度)
    //               └─ ... (還有更多)
    
    const stations = rawData.cwaopendata.dataset.Station.map((st, idx) => {
      try {
        const geo = st.GeoInfo;
        const we = st.WeatherElement;
        
        // 處理數值：-99 表示故障，-98 表示無資料，都轉成 null
        const parseVal = (val) => {
          if (val === -99 || val === -98 || val === null || val === undefined) {
            return null;
          }
          const num = parseFloat(val);
          return isNaN(num) ? null : num;
        };

        // CWA 的經緯度在 Coordinates 陣列裡，且順序是 [經度, 緯度]
        // Coordinates[0] = 經度, Coordinates[1] = 緯度
        let lat = null, lon = null;
        if (geo.Coordinates && geo.Coordinates.length >= 2) {
          lon = parseVal(geo.Coordinates[0].StationLongitude);
          lat = parseVal(geo.Coordinates[1].StationLatitude);
        }

        return {
          id: st.StationId,
          name: st.StationName,
          city: geo.CountyName,
          town: geo.TownName,
          lat: lat,
          lon: lon,
          // 氣象數據
          temp: parseVal(we.AirTemperature),           // 溫度
          humid: parseVal(we.RelativeHumidity),        // 相對濕度 (%)
          pressure: parseVal(we.AirPressure),          // 氣壓 (hPa)
          wind_speed: parseVal(we.WindSpeed),          // 風速 (m/s)
          wind_dir: parseVal(we.WindDirection),        // 風向 (度)
          rain: parseVal(we.Now?.Precipitation),       // 降雨量 (mm)
          uvi: parseVal(we.UVIndex),                   // 紫外線指數
          time: st.ObsTime?.DateTime || new Date().toISOString(), // 觀測時間
        };
      } catch (e) {
        console.warn(`⚠️ 第 ${idx} 個測站解析失敗:`, e.message);
        return null;
      }
    }).filter(st => st !== null);

    console.log(`📊 成功清洗 ${stations.length} 個測站的資料`);

    // ============ 第 4 步：過濾無效資料 ============
    // 移除沒有經緯度的站點 (這些通常是廢棄的或資料有問題)
    const validStations = stations.filter(s => s.lat !== null && s.lon !== null);
    
    console.log(`✅ 過濾後剩餘 ${validStations.length} 個有效站點`);

    // ============ 第 5 步：建立回應並快取 ============
    const responseBody = JSON.stringify({
      success: true,
      count: validStations.length,
      timestamp: new Date().toISOString(),
      data: validStations
    });

    response = new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        ...createCORSHeaders(securityCheck.origin), // 使用安全的 CORS 頭
        'X-Cache': 'MISS'
      }
    });

    // 異步保存到快取 (不阻塞回應)
    context.waitUntil(cache.put(cacheKey, response.clone()));

    console.log('✅ 天氣資料已返回並快取');
    return response;

  } catch (error) {
    console.error('❌ 處理天氣資料時發生錯誤:', error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: '無法獲取天氣資料',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

// 處理 OPTIONS 請求 (CORS 預檢)
export async function onRequestOptions(context) {
  const { request } = context;
  const securityCheck = checkRequestSecurity(request);

  if (!securityCheck.allowed) {
    return securityCheck.response;
  }

  return new Response(null, {
    status: 204,
    headers: createCORSHeaders(securityCheck.origin)
  });
}
