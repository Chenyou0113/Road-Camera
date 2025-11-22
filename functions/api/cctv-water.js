/**
 * 💧 水利署 CCTV 監視器 API
 *
 * 資料來源：水利署開放資料 (無需 Token)
 * API URL: https://opendata.wra.gov.tw/api/v2/...
 * 快取：5 分鐘 (圖片更新較慢)
 *
 * 安全特性：
 * ✅ Origin 白名單檢查 (防止跨域盜連)
 * ✅ D1 快取 5 分鐘
 * ✅ 自動數據清洗和座標驗證
 * ✅ JPG 圖片 URL 過濾
 */

import { checkRequestSecurity, createCORSHeaders } from '../lib/security.js';

const CACHE_KEY = 'wra_cctv';
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘
const SOURCE_URL = 'https://opendata.wra.gov.tw/api/v2/f71b74eb-cbe5-42c6-8be5-7500450e7db0?sort=_importdate%20asc&format=JSON';

export async function onRequest(context) {
  const { request, env } = context;

  // 🛡️ 第一道防線：Origin 白名單檢查
  const securityCheck = checkRequestSecurity(request);
  if (!securityCheck.allowed) {
    return securityCheck.response;
  }

  try {
    // 檢查 D1 資料庫
    if (!env.DB) {
      console.warn('⚠️ D1 資料庫未配置，使用無快取模式');
    }

    // 步驟 1：嘗試從 D1 讀取快取
    let cachedData = null;
    if (env.DB) {
      try {
        const cached = await env.DB
          .prepare('SELECT data, updated_at FROM api_cache WHERE key = ?')
          .bind(CACHE_KEY)
          .first();

        if (cached) {
          const updatedAt = new Date(cached.updated_at);
          const now = new Date();
          const age = now - updatedAt;

          if (age < CACHE_TTL) {
            console.log(`⚡ D1 快取命中 (年齡: ${Math.round(age / 1000)}秒)`);
            cachedData = JSON.parse(cached.data);
          }
        }
      } catch (dbError) {
        console.warn('⚠️ D1 讀取失敗，繼續從上游 API 抓取:', dbError.message);
      }
    }

    // 如果有有效的快取，直接返回
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
          ...createCORSHeaders(securityCheck.origin)
        }
      });
    }

    // 步驟 2：從水利署 OpenData 抓取資料
    console.log('🌐 從水利署抓取 CCTV 資料...');
    const response = await fetch(SOURCE_URL, { method: 'GET', timeout: 15000 });

    if (!response.ok) {
      console.error(`❌ 水利署 API 返回狀態 ${response.status}`);
      throw new Error(`WRA API 錯誤: ${response.statusText}`);
    }

    const rawData = await response.json();

    if (!Array.isArray(rawData)) {
      console.warn('⚠️ 水利署返回非陣列資料');
      return new Response(JSON.stringify({ success: false, error: '資料格式錯誤', data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...createCORSHeaders(securityCheck.origin) }
      });
    }

    // 步驟 3：清洗資料（WRA 欄位對應）
    const cleanedData = rawData
      .map(item => {
        try {
          const lat = parseFloat(item.Latitude);
          const lon = parseFloat(item.Longitude);
          const url = item.MonitorImageURL;

          // 過濾：必須有圖片 URL 和有效座標
          if (!url || isNaN(lat) || isNaN(lon)) {
            return null;
          }

          // 台灣座標合理範圍
          if (lat < 20 || lat > 26 || lon < 118 || lon > 122) {
            return null;
          }

          return {
            id: item.StationNo || '未知',
            name: item.StationName || '未知',
            city: item.CityName || '未知',
            river: item.RiverName || '未知',
            url: url, // JPG 圖片連結
            lat: lat,
            lon: lon,
            time: item.RecTime || new Date().toISOString()
          };
        } catch (e) {
          console.warn('⚠️ 清洗資料失敗:', e.message);
          return null;
        }
      })
      .filter(item => item !== null);

    console.log(`✅ 成功清洗 ${cleanedData.length} 個監控點`);

    // 🛡️ 防呆鎖：如果資料為空，不要存入 D1！
    if (cleanedData.length === 0) {
      console.error(`❌ [${CACHE_KEY}] 清洗後無有效資料，放棄寫入資料庫`);
      throw new Error("抓取到的水利署資料為空，放棄寫入資料庫");
    }

    const responseData = {
      success: true,
      count: cleanedData.length,
      timestamp: new Date().toISOString(),
      data: cleanedData
    };

    // 步驟 4：寫入 D1 快取
    if (env.DB) {
      try {
        await env.DB
          .prepare(`
            INSERT INTO api_cache (key, data, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
              data = excluded.data,
              updated_at = CURRENT_TIMESTAMP
          `)
          .bind(CACHE_KEY, JSON.stringify(responseData))
          .run();

        console.log('✅ 資料已寫入 D1 快取');
      } catch (dbError) {
        console.warn('⚠️ D1 寫入失敗:', dbError.message);
      }
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
        ...createCORSHeaders(securityCheck.origin)
      }
    });

  } catch (error) {
    console.error('❌ 水利 CCTV API 錯誤:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: '無法獲取水利監視器資料',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...createCORSHeaders(securityCheck.origin)
        }
      }
    );
  }
}

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
