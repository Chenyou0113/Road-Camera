// TDX API 共用處理函式（參考官方 GitHub 範例）
class TDXApi {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const parameter = {
            grant_type: "client_credentials",
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
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
            return this.accessToken;
        } catch (error) {
            console.error('取得 Token 失敗:', error);
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

    // 延遲函數
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


}

// 創建全域實例供其他頁面使用
const tdxApi = new TDXApi();
