// TDX API 設定檔
// 
// 【安全最佳實踐】
// 此設定檔支援兩種模式：
// 
// 1️⃣ 【生產環境 - Cloudflare Pages】(推薦)
//    - 密鑰存儲在 Cloudflare Dashboard 環境變數
//    - 前端通過 /api/token 端點安全地申請 Token
//    - 用戶完全看不到任何密鑰
// 
// 2️⃣ 【開發環境 - 本機測試】(僅用於開發)
//    - 可在下方填入臨時密鑰進行本機開發
//    - 【警告】絕不要將含有真實密鑰的版本推送到 GitHub！
//    - 提交前務必刪除或註釋掉密鑰

const TDX_CONFIG = {
    // 開發環境臨時密鑰（本機開發用）
    // 【提交 GitHub 前務必清空這些值】
    CLIENT_ID: '',
    CLIENT_SECRET: '',
    
    // TDX OAuth Token 申請端點
    AUTH_URL: 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
    
    // Cloudflare Pages Functions 端點
    // 在生產環境中，TokenFetcher 會改用這個安全端點
    TOKEN_API_ENDPOINT: '/api/token',
    
    // 是否使用 Cloudflare Pages Functions（自動偵測）
    // 如果部署在 Cloudflare Pages，此值會被設為 true
    USE_CLOUDFLARE_FUNCTIONS: typeof window !== 'undefined' && 
                              window.location.hostname.includes('pages.dev'),
    
    // Token 快取設定
    TOKEN_CACHE_KEY: 'tdx_token_cache',
    TOKEN_REFRESH_BUFFER_SECONDS: 60  // 提前 60 秒重新申請 Token
};

// 環境檢測日誌
console.log('🔧 TDX 配置初始化:');
console.log('  - 環境:', TDX_CONFIG.USE_CLOUDFLARE_FUNCTIONS ? '☁️ Cloudflare Pages' : '💻 本機/其他環境');
console.log('  - Token 端點:', TDX_CONFIG.USE_CLOUDFLARE_FUNCTIONS ? TDX_CONFIG.TOKEN_API_ENDPOINT : TDX_CONFIG.AUTH_URL);
console.log('  - 本機密鑰狀態:', TDX_CONFIG.CLIENT_ID ? '⚠️ 已設定（開發用）' : '✅ 未設定（使用伺服器）');
