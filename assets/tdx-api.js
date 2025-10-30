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
        for (let i = 0; i < retries; i++) {
            try {
                const token = await this.getAccessToken();
                const response = await fetch(`https://tdx.transportdata.tw/api/basic${endpoint}`, {
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
