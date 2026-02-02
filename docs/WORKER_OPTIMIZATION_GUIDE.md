# Cloudflare Workers 連線優化指南

## 問題診斷

您遇到的 `ERR_CONNECTION_RESET` 錯誤主要原因：
- ✅ **網路連接正常**（TCP 測試成功）
- ❌ **實際請求被重置**（ISP/防火牆封鎖或 Workers.dev 被過濾）

## 前端優化（已完成）

✅ **超時時間延長**：3 秒 → 8 秒（給 Worker 更多時間處理氣象署 API）  
✅ **重試邏輯改進**：CONNECTION_RESET 錯誤會等待 1.5 秒後重試一次  
✅ **快取策略**：允許瀏覽器快取 API 回應，減少重複請求  
✅ **分散載入**：API 請求分散在 0.5s、1s、2s 載入，避免同時爆發  

---

## Worker 端優化建議

### 1. 綁定自定義域名（最強效解決方案）

**問題**：`*.workers.dev` 容易被防火牆誤殺  
**解決**：使用自己的域名

#### 步驟：

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 選擇您的域名（例如 `yourdomain.com`）
3. 進入 `Workers Routes` 或 Worker 設定頁面
4. 點擊 `Add Custom Domain`
5. 輸入子域名（例如 `api.yourdomain.com`）
6. 儲存後，將前端 API 網址從：
   ```javascript
   // 舊的
   https://cwa-weather-proxy.xiaoyouwu5-fd3.workers.dev/api/weather/alert
   
   // 改為
   https://api.yourdomain.com/api/weather/alert
   ```

---

### 2. 添加快取策略（必須！）

**問題**：每個使用者都去抓氣象署 API，會導致：
- 氣象署封鎖您的 IP
- Worker 請求過多，超出免費額度

**解決**：在 Worker 中快取資料

#### 範例程式碼（添加到您的 Worker）：

```javascript
// cwa-weather-proxy Worker 範例

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;

    // 1. 先檢查快取
    let response = await cache.match(cacheKey);
    if (response) {
      console.log('Cache HIT');
      return response;
    }

    // 2. 快取未命中，向氣象署請求
    const cwaApiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${url.searchParams.get('dataset')}`;
    
    try {
      response = await fetch(cwaApiUrl, {
        headers: {
          'Authorization': env.CWA_API_KEY // 使用您的 API Key
        }
      });

      const data = await response.json();

      // 3. 包裝回應並設定 CORS
      response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'public, max-age=60' // 快取 60 秒
        }
      });

      // 4. 存入 Cloudflare Cache
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      
      return response;

    } catch (error) {
      return new Response(JSON.stringify({
        error: '氣象資料暫時無法取得',
        message: error.message
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
```

---

### 3. 添加 CORS Headers

確保所有回應都包含正確的 CORS Headers：

```javascript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json;charset=UTF-8'
};
```

---

### 4. 添加錯誤處理和降級

```javascript
// 如果氣象署 API 失敗，返回上次快取的資料
if (response.status >= 500) {
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return new Response(cachedResponse.body, {
      ...cachedResponse,
      headers: {
        ...Object.fromEntries(cachedResponse.headers),
        'X-Cache': 'STALE' // 標記為過期快取
      }
    });
  }
}
```

---

## 緊急排查步驟

### 如果問題持續：

1. **切換網路環境測試**
   ```powershell
   # 使用手機熱點測試
   # 如果手機網路正常 → 確認是公司/學校網路封鎖
   ```

2. **直接訪問 Worker**
   - 打開瀏覽器訪問：
     - `https://wang-weather.xiaoyouwu5-fd3.workers.dev/message`
     - `https://cwa-weather-proxy.xiaoyouwu5-fd3.workers.dev/api/weather/alert`
   - 如果瀏覽器顯示「無法連線」→ 確認是網路層級封鎖

3. **檢查 Cloudflare Dashboard**
   - 查看 Worker 的 `Requests` 和 `Errors` 數據
   - 確認是否有大量 5xx 錯誤

---

## 檢查清單

- [ ] Worker 已添加快取邏輯（`Cache-Control: max-age=60`）
- [ ] Worker 已添加 CORS Headers
- [ ] 已測試直接訪問 Worker URL
- [ ] 前端已更新（超時 8 秒、重試邏輯）
- [ ] 考慮綁定自定義域名（長期解決方案）

---

## 聯絡資訊

如果仍有問題，請檢查：
- Cloudflare Dashboard → Workers → Logs
- 瀏覽器開發者工具 → Network Tab → 查看完整錯誤

**參考資料**：
- [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Custom Domains for Workers](https://developers.cloudflare.com/workers/platform/triggers/custom-domains/)
