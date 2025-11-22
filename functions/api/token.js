// functions/api/token.js
// Cloudflare Pages Functions - Token API 端點
// 此端點負責安全地處理 TDX Token 申請，所有敏感信息（Secret）都隱藏在 Cloudflare 後台

export async function onRequest(context) {
  // 1. 從環境變數 (context.env) 取得 TDX 密鑰
  // 這些環境變數在 Cloudflare Dashboard 中設定，前端完全看不到
  const clientId = context.env.TDX_CLIENT_ID;
  const clientSecret = context.env.TDX_CLIENT_SECRET;
  
  const authUrl = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';

  // 簡單檢查有沒有漏填變數
  if (!clientId || !clientSecret) {
    console.error('❌ 環境變數未設定:', {
      TDX_CLIENT_ID: clientId ? '✅' : '❌',
      TDX_CLIENT_SECRET: clientSecret ? '✅' : '❌'
    });
    
    return new Response(JSON.stringify({ 
      error: 'Server configuration error',
      message: '缺少必要的環境變數設定'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    console.log('🔄 開始向 TDX 申請 Token...');
    
    // 2. 準備發送給 TDX 的資料
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    // 3. 幫前端去跟 TDX 要 Token（這是在 Cloudflare 邊緣節點上執行，速度很快）
    const tdxResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!tdxResponse.ok) {
      console.error(`❌ TDX 回應異常: ${tdxResponse.status} ${tdxResponse.statusText}`);
      const errorText = await tdxResponse.text();
      console.error('錯誤詳情:', errorText);
      
      throw new Error(`TDX API returned ${tdxResponse.status}`);
    }

    const data = await tdxResponse.json();

    if (data.error) {
      console.error('❌ TDX 返回錯誤:', data.error_description);
      throw new Error(data.error_description || 'TDX API error');
    }

    console.log('✅ Token 申請成功，有效期:', data.expires_in, '秒');

    // 4. 把結果回傳給前端 (只回傳 Token 和過期時間，不回傳 Secret)
    // 添加 CORS headers 允許跨域請求（前端可以調用這個 API）
    return new Response(JSON.stringify({
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type || 'Bearer',
      scope: data.scope,
      // 添加伺服器時間戳，方便客戶端計算過期時間
      server_time: Math.floor(Date.now() / 1000)
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('❌ Token 申請失敗:', error.message);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch token',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// OPTIONS 請求處理（CORS preflight）
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
