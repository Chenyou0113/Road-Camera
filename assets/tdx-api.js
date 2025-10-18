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

    async fetchCCTV(endpoint) {
        try {
            const token = await this.getAccessToken();
            const response = await fetch(`https://tdx.transportdata.tw/api/basic${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept-Encoding': 'gzip'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API 呼叫失敗:', error);
            throw error;
        }
    }
}
