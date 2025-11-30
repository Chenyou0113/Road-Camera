/**
 * 氣象資料代理 API
 * 用途：安全地從 Cloudflare 環境變數讀取 CWA_API_KEY，避免在前端暴露
 * 路由：
 *   GET /api/weather-proxy?type=alert    - 取得警特報
 *   GET /api/weather-proxy?type=forecast - 取得天氣預報
 */

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    // 從 Cloudflare 環境變數讀取 API Key
    const CWA_API_KEY = env.CWA_API_KEY;

    // 檢查 API Key 是否存在
    if (!CWA_API_KEY) {
        return new Response(JSON.stringify({
            success: false,
            error: '伺服器設定錯誤：未設定 CWA_API_KEY 環境變數'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    // 根據類型決定 API URL
    let apiUrl;
    if (type === 'alert') {
        // 警特報 API
        apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-001?Authorization=${CWA_API_KEY}&format=JSON`;
    } else if (type === 'forecast') {
        // 天氣預報 API
        apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&format=JSON`;
    } else {
        return new Response(JSON.stringify({
            success: false,
            error: '無效的類型參數。請使用 type=alert 或 type=forecast'
        }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    try {
        // 呼叫氣象署 API
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Cloudflare-Worker'
            }
        });

        // 檢查回應狀態
        if (!response.ok) {
            throw new Error(`氣象署 API 回應錯誤: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // 回傳資料並加上 CORS 標頭
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300' // 快取 5 分鐘
            }
        });

    } catch (error) {
        console.error('氣象 API 代理錯誤:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: '無法取得氣象資料',
            details: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

// 處理 OPTIONS 請求（CORS preflight）
export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        }
    });
}
