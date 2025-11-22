/**
 * 🌬️ 空氣品質 API (環境部資料)
 *
 * 資料來源：行政院環保署 (MOENV) 空氣品質即時資訊
 * API URL: 需要 API Key 從環境部申請
 * 快取：10 分鐘 (空品變化較慢)
 *
 * 安全特性：
 * ✅ Origin 白名單檢查 (防止跨域盜連)
 * ✅ API Key 隱藏在 Cloudflare 環境變數
 * ✅ D1 快取 10 分鐘
 * ✅ 自動數據清洗和座標驗證
 */

import { checkRequestSecurity, createCORSHeaders } from '../lib/security.js';

const CACHE_KEY = 'moenv_air_quality';
const CACHE_TTL = 10 * 60 * 1000; // 10 分鐘

export async function onRequest(context) {
  const { request, env } = context;

  // 🛡️ 第一道防線：Origin 白名單檢查
  const securityCheck = checkRequestSecurity(request);
  if (!securityCheck.allowed) {
    return securityCheck.response;
  }

  try {
    // 檢查環境變數
    if (!env.DB) {
      console.warn('⚠️ D1 資料庫未配置，使用無快取模式');
    }

    if (!env.MOENV_API_KEY) {
      console.error('❌ 環境變數 MOENV_API_KEY 未設定');
      return new Response(
        JSON.stringify({ error: 'API Key 未配置', success: false }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...createCORSHeaders(securityCheck.origin) }
        }
      );
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

    // 步驟 2：從環境部 API 抓取新資料
    console.log('🌐 從環境部抓取空品資料...');
    const apiUrl = `https://data.moenv.gov.tw/api/v2/aqx_p_432?api_key=${env.MOENV_API_KEY}&limit=1000&format=JSON`;

    const response = await fetch(apiUrl, { method: 'GET', timeout: 15000 });

    if (!response.ok) {
      console.error(`❌ 環境部 API 返回狀態 ${response.status}`);
      throw new Error(`MOENV API 錯誤: ${response.statusText}`);
    }

    const rawData = await response.json();

    if (!rawData.records || rawData.records.length === 0) {
      console.warn('⚠️ 環境部返回空資料');
      return new Response(JSON.stringify({ success: false, error: '無可用資料', data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...createCORSHeaders(securityCheck.origin) }
      });
    }

    // 步驟 3：清洗資料
    const cleanedData = rawData.records
      .map(item => {
        try {
          const lat = parseFloat(item.latitude);
          const lon = parseFloat(item.longitude);

          // 過濾無效的經緯度
          if (isNaN(lat) || isNaN(lon)) return null;

          // 台灣座標合理範圍
          if (lat < 20 || lat > 26 || lon < 118 || lon > 122) return null;

          return {
            id: item.siteid || item.site_id || '未知',
            name: item.sitename || item.site_name || '未知',
            county: item.county || '未知',
            aqi: item.aqi ? parseInt(item.aqi) : null,
            status: item.status || 'Unknown',
            pm25: item.pm2_5 ? parseFloat(item.pm2_5) : null,
            lat: lat,
            lon: lon,
            time: item.datetime || new Date().toISOString()
          };
        } catch (e) {
          console.warn('⚠️ 清洗資料失敗:', e.message);
          return null;
        }
      })
      .filter(item => item !== null);

    console.log(`✅ 成功清洗 ${cleanedData.length} 個測站`);

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
    console.error('❌ 空品 API 錯誤:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: '無法獲取空品資料',
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
