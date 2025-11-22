// TDX API 共用處理函式（參考官方 GitHub 範例）
// 
// 【安全特性】
// - 支援 Cloudflare Pages Functions 後端 Token 申請
// - 本機開發時支援直接密鑰認證
// - 自動快取 Token，避免頻繁申請

class TDXApi {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.useCloudflareFunction = TDX_CONFIG.USE_CLOUDFLARE_FUNCTIONS;
    }

    /**
     * 獲取 Access Token
     * 
     * 如果部署在 Cloudflare Pages：
     *   - 調用 /api/token 端點（伺服器端處理，密鑰不暴露）
     * 
     * 如果在本機開發：
     *   - 直接使用 TDX_CONFIG 中的密鑰（僅用於開發）
     */
    async getAccessToken() {
        // 1. 檢查快取的 Token 是否仍有效
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
            console.log('💾 使用快取的 Token');
            return this.accessToken;
        }

        console.log(`🔄 需要新的 Token (使用模式: ${this.useCloudflareFunction ? '☁️ Cloudflare' : '💻 本機'})`);

        try {
            let tokenData;

            if (this.useCloudflareFunction) {
                // 【生產環境】使用 Cloudflare Pages Functions
                console.log('☁️ 向 Cloudflare Functions (/api/token) 申請 Token...');
                tokenData = await this._getTokenFromCloudflare();
            } else {
                // 【開發環境】直接使用本機密鑰
                if (!TDX_CONFIG.CLIENT_ID || !TDX_CONFIG.CLIENT_SECRET) {
                    throw new Error(
                        '❌ 開發環境: 缺少 CLIENT_ID 或 CLIENT_SECRET\\n' +
                        '請在 assets/config.js 中填入臨時密鑰進行開發\n' +
                        '提交 GitHub 前務必刪除這些值'
                    );
                }
                console.log('💻 直接使用本機密鑰申請 Token（開發模式）');
                tokenData = await this._getTokenDirect();
            }

            if (!tokenData || !tokenData.access_token) {
                throw new Error('無法從 Token 響應中提取 access_token');
            }

            // 2. 儲存 Token 和過期時間
            this.accessToken = tokenData.access_token;
            // 提前 60 秒重新申請（考慮網路延遲和時間誤差）
            const expiresIn = tokenData.expires_in || 3600;
            this.tokenExpiry = Date.now() + (expiresIn * 1000) - 60000;

            console.log(`✅ Token 已取得，有效期: ${expiresIn} 秒`);
            return this.accessToken;

        } catch (error) {
            console.error('❌ Token 申請失敗:', error.message);
            throw error;
        }
    }

    /**
     * 從 Cloudflare Pages Functions 端點獲取 Token（安全方式）
     */
    async _getTokenFromCloudflare() {
        try {
            const response = await fetch(TDX_CONFIG.TOKEN_API_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                // 不使用快取，每次都取最新的 Token
                cache: 'no-store'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `Cloudflare Functions 錯誤 (${response.status}): ${errorData.message || response.statusText}`
                );
            }

            return await response.json();

        } catch (error) {
            console.error('☁️ Cloudflare Functions 請求失敗:', error.message);
            
            // 降級處理：如果 Cloudflare Function 失敗且有本機密鑰，嘗試本機方式
            if (TDX_CONFIG.CLIENT_ID && TDX_CONFIG.CLIENT_SECRET) {
                console.warn('⚠️ 降級到本機密鑰模式...');
                return await this._getTokenDirect();
            }
            
            throw error;
        }
    }

    /**
     * 直接使用本機密鑰申請 Token（開發/降級用）
     */
    async _getTokenDirect() {
        const parameter = {
            grant_type: 'client_credentials',
            client_id: TDX_CONFIG.CLIENT_ID,
            client_secret: TDX_CONFIG.CLIENT_SECRET
        };

        try {
            const response = await fetch(TDX_CONFIG.AUTH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(parameter)
            });

            if (!response.ok) {
                throw new Error(`TDX 認証失敗 (${response.status}): ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('💻 本機密鑰申請失敗:', error.message);
            throw error;
        }
    }

    async fetchCCTV(endpoint, retries = 3) {
        console.log(`📡 fetchCCTV 被調用，端點: ${endpoint}`);
        
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`🔐 嘗試獲取 Token (第 ${i + 1}/${retries} 次)...`);
                const token = await this.getAccessToken();
                console.log(`✅ Token 已取得`);
                
                const fullUrl = `https://tdx.transportdata.tw/api/basic${endpoint}`;
                console.log(`🌐 正在請求: ${fullUrl}`);
                
                // 添加超時控制 (30 秒)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                
                try {
                    const response = await fetch(fullUrl, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept-Encoding': 'gzip'
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);
                    console.log(`📊 API 回應狀態: ${response.status} ${response.statusText}`);

                    if (!response.ok) {
                        if (response.status === 429) {
                            // 處理請求過於頻繁的錯誤 - 使用更保守的等待時間
                            const baseDelay = Math.pow(2, i) * 3000; // 從2秒改為3秒基準
                            const retryAfter = response.headers.get('Retry-After') || baseDelay;
                            console.warn(`⚠️ API 請求過於頻繁 (429), 等待 ${retryAfter}ms 後重試...`);
                            await this.delay(retryAfter);
                            continue;
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log(`✅ 數據已取得，共 ${Array.isArray(data) ? data.length : (data?.data?.length || data?.records?.length || 0)} 筆紀錄`);
                    console.log(`📋 API 回應結構:`, Object.keys(data));
                    return data;
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    throw fetchError;
                }
            } catch (error) {
                console.error(`❌ 第 ${i + 1} 次嘗試失敗:`, error.message);
                
                if (i === retries - 1) {
                    console.error('🔴 所有重試都已失敗，拋出錯誤');
                    throw error;
                }
                
                const delay = 1000 * (i + 1);
                console.warn(`⏳ 等待 ${delay}ms 後重試...`);
                await this.delay(delay);
            }
        }
    }

    // 通用 API 呼叫方法（用於台鐵、捷運等）
    async fetch(endpoint, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const token = await this.getAccessToken();
                const response = await window.fetch(`https://tdx.transportdata.tw/api/basic${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept-Encoding': 'gzip'
                    }
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        // 處理請求過於頻繁的錯誤
                        const retryAfter = response.headers.get('Retry-After') || (Math.pow(2, i) * 1000);
                        console.warn(`API 請求過於頻繁 (429), 等待 ${retryAfter}ms 後重試...`);
                        await this.delay(retryAfter);
                        continue;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                if (i === retries - 1) {
                    console.error('API 呼叫失敗:', error);
                    throw error;
                }
                console.warn(`嘗試 ${i + 1} 失敗，重試中...`);
                await this.delay(1000 * (i + 1)); // 漸進式延遲
            }
        }
    }

    /**
     * 透過後端代理 API 獲取監視器資料（推薦方式）
     * 
     * 優點：
     * - API 密鑰不暴露到前端
     * - Cloudflare CDN 自動快取 60 秒，減少 TDX API 呼叫次數
     * - 自動解決 CORS 問題
     * - 節省流量和 API 額度
     * 
     * @param {string} type - 監視器類型: 'Freeway' (國道) | 'Provincial' (省道) | 'County' (縣市)
     * @param {number} top - 最多取多少筆資料 (預設 1000)
     * @returns {Promise<Array>} 監視器資料陣列
     */
    async fetchCCTVData(type = 'Freeway', top = 1000) {
        try {
            console.log(`📡 正在從後端代理取得 ${type} 監視器資料...`);
            
            const response = await fetch(`/api/get-cameras?type=${type}&top=${top}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `後端代理錯誤 (${response.status}): ${errorData.message || errorData.error || response.statusText}`
                );
            }
            
            const data = await response.json();
            console.log(`✅ 成功取得 ${data.length || 0} 筆 ${type} 監視器資料`);
            return data;
            
        } catch (error) {
            console.error('❌ 後端代理請求失敗:', error.message);
            throw error;
        }
    }

    // 延遲函數
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


}

// 創建全域實例供其他頁面使用
const tdxApi = new TDXApi();
