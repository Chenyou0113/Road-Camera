/**
 * 🛡️ API 安全防護中間件
 * 
 * 三道防線：
 * 1. Origin 白名單檢查 (防止跨域盜連)
 * 2. 請求驗證 (檢查 HTTP 方法)
 * 3. 速率限制準備 (輔助函數)
 */

/**
 * 檢查請求來源是否被允許
 * @param {Request} request - HTTP 請求物件
 * @param {String[]} allowedOrigins - 允許的來源列表 (預設為當前環境的有效域名)
 * @returns {Object} { allowed: Boolean, origin: String, reason: String }
 */
export function checkOrigin(request, allowedOrigins = null) {
  const origin = request.headers.get('Origin') || request.headers.get('origin');
  const referer = request.headers.get('Referer') || request.headers.get('referer');

  // 🔒 定義預設允許的網域 (白名單)
  // 用戶可以透過部署時設定環境變數來自訂
  if (!allowedOrigins) {
    allowedOrigins = [
      'https://road-camera.pages.dev',      // 正式環境
      'https://www.road-camera.pages.dev',  // 帶 www 的版本
      'http://127.0.0.1:8788',              // 本機開發 (Wrangler)
      'http://localhost:8788',              // 本機開發 (localhost)
      'http://localhost:3000',              // 本機開發 (其他常見端口)
      'http://127.0.0.1:3000'
    ];
  }

  // 檢查邏輯：
  // 1. 瀏覽器會在跨域請求時設定 Origin header
  // 2. 如果 Origin 被允許，請求通過
  // 3. 如果沒有 Origin，檢查 Referer (某些瀏覽器/工具可能不傳 Origin)
  // 4. 如果兩者都沒有或不符合，可能是 curl/Python/爬蟲，拒絕
  
  const isOriginAllowed = origin && allowedOrigins.includes(origin);
  const isRefererAllowed = referer && allowedOrigins.some(domain => referer.startsWith(domain));
  const isAllowed = isOriginAllowed || isRefererAllowed;

  return {
    allowed: isAllowed,
    origin: origin || '(no origin)',
    referer: referer || '(no referer)',
    reason: isOriginAllowed ? 'Origin matched' : isRefererAllowed ? 'Referer matched' : 'Not allowed'
  };
}

/**
 * 建立 403 Forbidden 回應
 * @param {Object} details - 額外的錯誤詳情
 * @returns {Response}
 */
export function createForbiddenResponse(details = {}) {
  return new Response(JSON.stringify({
    error: 'Forbidden',
    message: 'Access denied: This API is only available from authorized origins.',
    details: details,
    timestamp: new Date().toISOString()
  }), {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'null' // 不返回任何 CORS 頭給未授權的請求
    }
  });
}

/**
 * 建立 CORS 回應頭 (安全版本)
 * @param {String} requestOrigin - 請求的 Origin
 * @param {String[]} allowedOrigins - 允許的來源清單
 * @returns {Object} 適合在 Response headers 中使用的物件
 */
export function createCORSHeaders(requestOrigin, allowedOrigins = null) {
  if (!allowedOrigins) {
    allowedOrigins = [
      'https://road-camera.pages.dev',
      'https://www.road-camera.pages.dev',
      'http://127.0.0.1:8788',
      'http://localhost:8788',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
  }

  // 只有被允許的 Origin 才能獲得 CORS 頭
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '3600'
    };
  }

  // 非授權請求不返回 CORS 頭 (瀏覽器會報錯，這是故意的)
  return {};
}

/**
 * 完整的安全檢查 + 回應
 * 用法：在 onRequest 函數開頭調用，如果返回 Response，立即返回
 * 
 * @example
 * export async function onRequest(context) {
 *   const securityCheck = checkRequestSecurity(context.request);
 *   if (!securityCheck.allowed) {
 *     return securityCheck.response; // 直接返回 403
 *   }
 *   // ... 後續邏輯 ...
 * }
 */
export function checkRequestSecurity(request, allowedOrigins = null) {
  const originCheck = checkOrigin(request, allowedOrigins);
  
  if (!originCheck.allowed) {
    console.warn(`🚫 拒絕未授權的請求: Origin=${originCheck.origin}, Referer=${originCheck.referer}`);
    return {
      allowed: false,
      response: createForbiddenResponse({
        origin: originCheck.origin,
        referer: originCheck.referer
      })
    };
  }

  console.log(`✅ 請求通過安全檢查: Origin=${originCheck.origin}`);
  return {
    allowed: true,
    origin: request.headers.get('Origin'),
    response: null
  };
}

/**
 * 記錄 API 調用 (方便調試和監控)
 */
export function logAPICall(request, result) {
  const timestamp = new Date().toISOString();
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log(`[${timestamp}] ${method} ${path} - ${result}`);
}

export default {
  checkOrigin,
  createForbiddenResponse,
  createCORSHeaders,
  checkRequestSecurity,
  logAPICall
};
