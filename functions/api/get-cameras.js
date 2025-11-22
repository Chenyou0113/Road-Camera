/**
 * Cloudflare Function: 後端代理 API - 取得監視器資料
 * 
 * 功能：
 * 1. 安全地從 Cloudflare 環境變數讀取 TDX API 金鑰
 * 2. 向 TDX API 申請 Token (伺服器端執行，前端看不到金鑰)
 * 3. 根據前端傳來的參數獲取監視器資料
 * 4. 實施 CDN 快取保護 API 額度
 * 5. 解決 CORS 問題
 */

export async function onRequest(context) {
  const { env, request } = context;
  
  // ============ 步驟 1：讀取環境變數 ============
  const clientId = env.TDX_CLIENT_ID;
  const clientSecret = env.TDX_CLIENT_SECRET;

  // 驗證環境變數是否正確設置
  if (!clientId || !clientSecret) {
    console.error('❌ TDX 環境變數未設定');
    return new Response(
      JSON.stringify({ 
        error: "Server Config Error",
        message: "TDX_CLIENT_ID 或 TDX_CLIENT_SECRET 未設定"
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // ============ 步驟 2：向 TDX 申請 Token ============
    console.log('🔑 正在向 TDX API 申請 Token...');
    
    const tokenResponse = await fetch(
      'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret
        })
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ TDX Token 申請失敗:', errorData);
      return new Response(
        JSON.stringify({ 
          error: "TDX Auth Error",
          details: errorData
        }), 
        { 
          status: tokenResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Token 申請成功');

    // ============ 步驟 3：根據前端參數獲取資料 ============
    const url = new URL(request.url);
    
    // 前端可以傳入 ?type=Freeway 或 ?type=Provincial
    const type = url.searchParams.get('type') || 'Freeway';
    const top = url.searchParams.get('top') || '1000'; // 一次最多拿 1000 筆
    
    console.log(`📡 正在從 TDX 獲取 ${type} 監視器資料 (top=${top})...`);

    // 構建 TDX API 端點
    const dataUrl = `https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/CCTV/${type}?$format=JSON&$top=${top}`;

    // 發送請求到 TDX API
    const dataResponse = await fetch(dataUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!dataResponse.ok) {
      const errorData = await dataResponse.text();
      console.error(`❌ TDX CCTV API 失敗 (${type}):`, errorData);
      return new Response(
        JSON.stringify({ 
          error: "TDX CCTV Error",
          status: dataResponse.status,
          type: type
        }), 
        { 
          status: dataResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await dataResponse.json();
    console.log(`✅ 成功獲取 ${data.length || 0} 筆 ${type} 監視器資料`);

    // ============ 步驟 4：設定 CORS 和快取 ============
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // 重要：設定快取，保護 TDX API 不被頻繁呼叫
        // public = CDN 和瀏覽器都可以快取
        // max-age=60 = 瀏覽器快取 60 秒
        // s-maxage=60 = CDN 快取 60 秒
        'Cache-Control': 'public, max-age=60, s-maxage=60'
      }
    });

  } catch (error) {
    console.error('❌ 伺服器錯誤:', error);
    return new Response(
      JSON.stringify({ 
        error: "Server Error",
        message: error.message
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// 支援 OPTIONS 請求 (CORS preflight)
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
