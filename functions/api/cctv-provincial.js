/**
 * 🛣️ 省道監視器 API (XML → JSON 轉譯)
 *
 * 資料來源：台灣交通部運輸研究所 (THB) 省道監視器即時影像
 * API URL: https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml
 * 限制：> 60 秒一次
 *
 * 安全特性：
 * ✅ Origin 白名單檢查 (防止跨域盜連)
 * ✅ D1 快取 70 秒 (符合官方要求，避免被 Ban)
 * ✅ 自動數據清洗和座標驗證
 */

import { checkRequestSecurity, createCORSHeaders } from '../lib/security.js';

export async function onRequest(context) {
  const { request } = context;
  const cache = caches.default;

  // 🛡️ 第一道防線：Origin 白名單檢查
  const securityCheck = checkRequestSecurity(request);
  if (!securityCheck.allowed) {
    return securityCheck.response;
  }  // 固定的快取 Key，確保所有訪客共享同一份快取
  const cacheKey = new Request("https://internal-cache/provincial-cctv", { method: 'GET' });

  try {
    // ✅ Step 1: 檢查快取
    console.log('🔍 檢查快取...');
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      console.log('⚡ 快取命中 - 直接返回快取資料');
      return cachedResponse;
    }

    console.log('📥 快取未命中，準備抓取原始 XML...');

    // ❌ Step 2: 向官方 API 抓取 XML
    const SOURCE_URL = 'https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml';
    const xmlResp = await fetch(SOURCE_URL, {
      timeout: 15000 // 15 秒超時
    });

    if (!xmlResp.ok) {
      console.error(`❌ 省道源連線失敗: ${xmlResp.status}`);
      return new Response(
        JSON.stringify({ error: '無法連接省道資料源', status: xmlResp.status }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const xmlText = await xmlResp.text();
    console.log(`✅ XML 已取得，大小: ${xmlText.length} 字節`);

    // 🔄 Step 3: 解析 XML -> JSON
    // 因為 Cloudflare Workers 不支援完整 DOM 解析，使用正則表達式快速提取
    const cctvs = [];
    const regex = /<CCTV>([\s\S]*?)<\/CCTV>/g;
    let match;
    let processedCount = 0;

    while ((match = regex.exec(xmlText)) !== null) {
      const content = match[1];
      
      // Helper: 從 XML 標籤提取值
      const getVal = (tag) => {
        const r = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 'i');
        const m = content.match(r);
        return m ? m[1].trim() : null;
      };

      const lon = getVal('PositionLon');
      const lat = getVal('PositionLat');
      const url = getVal('VideoStreamURL');
      const id = getVal('CCTVID');
      const locType = getVal('LocationType');
      const direction = getVal('RoadDirection');

      // ✅ 過濾：必須有影像 URL 和經緯度
      if (url && lon && lat) {
        try {
          const cctvItem = {
            type: '省道',
            id: id || '未知',
            url: url,
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            name: `${locType || '省道監視器'} (${id || '未知'})`,
            direction: direction || null,
            source: 'THB'
          };

          // 驗證座標合理性（台灣範圍）
          if (cctvItem.lat >= 20 && cctvItem.lat <= 26 && cctvItem.lon >= 118 && cctvItem.lon <= 122) {
            cctvs.push(cctvItem);
            processedCount++;
          }
        } catch (e) {
          console.warn(`⚠️ 解析 CCTV 項目失敗: ${e.message}`);
        }
      }
    }

    console.log(`✅ 成功解析 ${processedCount} 個省道監視器`);

    if (cctvs.length === 0) {
      console.warn('⚠️ 警告：未能解析到任何監視器資料');
    }

    // 📦 Step 4: 建立 JSON 回應
    const jsonResponse = new Response(JSON.stringify({
      success: true,
      type: '省道',
      count: cctvs.length,
      timestamp: new Date().toISOString(),
      data: cctvs
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // 🛡️ 快取 70 秒（大於官方要求的 60 秒，安全邊界）
        'Cache-Control': 'public, max-age=70, s-maxage=70, stale-while-revalidate=300',
        ...createCORSHeaders(securityCheck.origin) // 使用安全的 CORS 頭
      }
    });

    // 💾 Step 5: 非同步寫入快取
    // context.waitUntil 確保快取寫入會完成，即使回應已經發出
    context.waitUntil(cache.put(cacheKey, jsonResponse.clone()));

    console.log('✅ 回應已發送，快取寫入進行中...');
    return jsonResponse;

  } catch (error) {
    console.error(`❌ 錯誤: ${error.message}`);
    return new Response(
      JSON.stringify({ 
        error: '伺服器錯誤',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// OPTIONS 方法用於 CORS preflight
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
