/**
 * 地震資料 API 代理
 * 
 * 功能：安全地代理 CWA 地震報告 API，隱藏 API Key
 * 
 * 端點：
 * - /api/earthquake-proxy?type=significant - 顯著有感地震
 * - /api/earthquake-proxy?type=minor - 小區域有感地震
 */

export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 處理 CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 取得環境變數中的 API Key
    const apiKey = env.CWA_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'CWA_API_KEY 未設定' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 解析查詢參數
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'significant';
    const limit = url.searchParams.get('limit') || '10';

    // 根據類型選擇對應的資料集
    let dataset;
    if (type === 'significant') {
      dataset = 'E-A0015-001'; // 顯著有感地震
    } else if (type === 'minor') {
      dataset = 'E-A0016-001'; // 小區域有感地震
    } else {
      return new Response(
        JSON.stringify({ error: '無效的類型參數。請使用 significant 或 minor' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 呼叫 CWA API
    const cwaUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${dataset}?Authorization=${apiKey}&limit=${limit}&format=JSON`;
    
    console.log(`📡 呼叫 CWA 地震 API: ${type}`);
    const response = await fetch(cwaUrl);

    if (!response.ok) {
      console.error(`❌ CWA API 錯誤: ${response.status}`);
      throw new Error(`CWA API 返回錯誤: ${response.status}`);
    }

    const data = await response.json();

    // 返回資料
    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60' // 快取 1 分鐘
        } 
      }
    );

  } catch (error) {
    console.error('❌ 地震 API 代理錯誤:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
