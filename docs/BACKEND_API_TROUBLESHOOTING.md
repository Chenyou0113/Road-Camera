# 🔧 後端代理 API - 故障排除與調試指南

## 📋 快速診斷清單

如果你的網站出現問題，按以下順序檢查：

### 1️⃣ 環境變數檢查

```bash
# 症狀: /api/get-cameras 回傳 500 錯誤
# 解決方案:

❌ 錯誤信息: "Server Config Error: TDX_CLIENT_ID 或 TDX_CLIENT_SECRET 未設定"
   └─ 打開 Cloudflare Dashboard → Pages → Road-Camera → Settings → Environment Variables
   └─ 檢查是否填入 TDX_CLIENT_ID 和 TDX_CLIENT_SECRET
   └─ 確保不包含引號 (不是 "xxx"，而是 xxx)
```

---

### 2️⃣ Cloudflare 部署檢查

```bash
# 症狀: /api/get-cameras 回傳 404
# 解決方案:

❌ Functions 未部署
   └─ Cloudflare Dashboard → Pages → Road-Camera → Deployments
   └─ 查看最新部署，確認包含 "functions/"
   └─ 如果未包含，執行:
      git push  (觸發自動重新部署)
```

---

### 3️⃣ 前端代碼檢查

```bash
# 症狀: 頁面完全無法加載監視器
# 解決方案:

❌ 缺少腳本引入
   └─ 檢查 HTML 頁面是否有:
      <script src="assets/tdx-api.js"></script>
      <script src="assets/lazy-load-cameras.js"></script>
   
❌ JavaScript 錯誤
   └─ 開啟瀏覽器開發者工具 (F12)
   └─ 查看 Console 頁籤是否有紅色錯誤
   └─ 複製錯誤訊息進行搜索
```

---

## 🐛 常見錯誤與解決方案

### 錯誤 1: "502 Bad Gateway" 或 "500 Server Error"

**症狀：**
```json
{
  "error": "Server Config Error",
  "message": "TDX_CLIENT_ID 或 TDX_CLIENT_SECRET 未設定"
}
```

**診斷步驟：**

1. **檢查環境變數**
   ```bash
   # Cloudflare Dashboard
   - Pages → Road-Camera
   - Settings → Environment Variables
   - 查看 TDX_CLIENT_ID 和 TDX_CLIENT_SECRET 是否都有值
   ```

2. **檢查金鑰格式**
   ```bash
   # ✅ 正確
   TDX_CLIENT_ID = a1b2c3d4e5f6
   TDX_CLIENT_SECRET = xyz789abc123
   
   # ❌ 錯誤（帶引號）
   TDX_CLIENT_ID = "a1b2c3d4e5f6"    ← 會包含引號，導致驗証失敗
   ```

3. **重新部署**
   ```bash
   # 有時環境變數更新需要重新部署
   cd Road-Camera
   git commit --allow-empty -m "redeploy"
   git push
   ```

---

### 錯誤 2: "API 回應時間過長" 或 "超時"

**症狀：**
```
fetch failed, error: net::ERR_INCOMPLETE_CHUNKED_ENCODING
或
Cloudflare Worker request timed out
```

**原因：**
- TDX API 響應資料過大（超過 1000 筆）
- Cloudflare Worker 有 30 秒超時限制

**解決方案：**

```javascript
// ❌ 會超時（要求 1000 筆）
const cameras = await tdxApi.fetchCCTVData('Freeway', 1000);

// ✅ 改為 500 筆
const cameras = await tdxApi.fetchCCTVData('Freeway', 500);

// 或只設定必要的欄位
const response = await fetch('/api/get-cameras?type=Freeway&top=500');
```

**進階解決方案：** 在 `functions/api/get-cameras.js` 修改

```javascript
// 修改為分頁查詢
const top = Math.min(url.searchParams.get('top') || 1000, 500); // 限制最多 500
```

---

### 錯誤 3: "CORS 錯誤" 或 "被阻止的請求"

**症狀：**
```
Access to fetch at 'https://api.example.com/...' from origin 'https://your-site.com'
has been blocked by CORS policy
```

**診斷：**

```javascript
// 在瀏覽器主控台檢查
fetch('/api/get-cameras')
  .then(r => r.json())
  .then(data => console.log('✅ 後端 API 正常'))
  .catch(e => console.error('❌ CORS 錯誤:', e));
```

**解決方案：**

1. **如果使用後端代理（正確做法）**
   ```javascript
   // ✅ 使用相同域名，自動解決 CORS
   const response = await fetch('/api/get-cameras');
   ```

2. **如果直接呼叫 TDX（舊方法，會有 CORS 問題）**
   ```javascript
   // ❌ 不要這樣做
   const response = await fetch('https://tdx.transportdata.tw/api/...');
   
   // ✅ 改用後端代理
   const response = await fetch('/api/get-cameras?type=Freeway');
   ```

---

### 錯誤 4: "圖片無法加載" 或 "顯示破圖"

**症狀：**
- 懶加載模組顯示「圖片載入失敗」
- 瀏覽器主控台有 404 或 403 錯誤

**診斷步驟：**

```javascript
// 在主控台檢查第一個相機的影像 URL
fetch('/api/get-cameras?type=Freeway&top=1')
  .then(r => r.json())
  .then(data => {
    console.log('影像 URL:', data[0].VideoStreamURL);
    // 嘗試直接訪問此 URL
    // 如果無法打開，代表影像伺服器有問題
  });
```

**可能原因：**

1. **TDX API 返回的 URL 已過期**
   ```bash
   # 解決方案: 等待 TDX API 更新
   # 或在 TDX 官方回報問題
   ```

2. **HTTPS/HTTP 混合內容（Mixed Content）**
   ```bash
   ❌ 如果你的頁面是 HTTPS，但影像 URL 是 HTTP
   └─ 瀏覽器會自動阻止加載
   
   ✅ 解決方案: 在 functions/api/get-cameras.js 轉換 URL
   ```

3. **影像伺服器的 CORS 設定**
   ```bash
   # 如果影像伺服器不允許跨域請求
   # 前端無法加載（無解，需聯絡伺服器管理員）
   ```

---

## 🔍 高級調試技巧

### 技巧 1: 查看完整的 API 回應

```javascript
// 在主控台執行
const response = await fetch('/api/get-cameras?type=Freeway&top=5');
const data = await response.json();
console.table(data); // 以表格顯示

// 或查看原始 JSON
console.log(JSON.stringify(data, null, 2));
```

### 技巧 2: 模擬慢速網路

```javascript
// Chrome DevTools → Network 頁籤
// 1. 開啟 Chrome 開發者工具 (F12)
// 2. Network 頁籤
// 3. 右上角「齒輪圖標」→ Throttling
// 4. 選擇「Slow 4G」或自定義速度
// 5. 重新整理頁面 (Ctrl+R) 以觀察加載過程
```

### 技巧 3: 檢查 Cloudflare Worker 執行時間

```javascript
// 在 functions/api/get-cameras.js 添加計時
const startTime = Date.now();

// ... API 邏輯 ...

const duration = Date.now() - startTime;
console.log(`⏱️ Worker 執行時間: ${duration}ms`);
```

### 技巧 4: 強制清除快取

```javascript
// 立即刷新，不使用快取
fetch('/api/get-cameras?t=' + Date.now())
  .then(r => r.json())
  .then(data => console.log('新鮮資料:', data));
```

---

## 📊 效能分析

### 檢查 API 回應時間

```javascript
async function benchmarkAPI() {
  console.time('API 響應時間');
  
  const response = await fetch('/api/get-cameras?type=Freeway&top=100');
  const data = await response.json();
  
  console.timeEnd('API 響應時間');
  console.log('📊 資料筆數:', data.length);
}

benchmarkAPI();
```

**預期結果：**
- 第 1 次請求: 2-5 秒（TDX API 呼叫）
- 第 2+ 次請求（60 秒內）: < 50ms（CDN 快取）

### 檢查頁面大小

```javascript
// 在開發者工具的 Network 頁籤
// 1. 打開頁面
// 2. Network 下方的「Total」應該是 200-500 KB（不含圖片）
// 3. 之前是 2-3 MB，所以節省了 ~90%
```

---

## 🚨 緊急修復

### 如果後端 API 完全故障

**臨時方案（回到舊方式）：**

1. 暫時禁用後端代理
   ```javascript
   // 在 assets/tdx-api.js 中，註釋掉新方法
   // fetchCCTVData() { ... }  // 暫時禁用
   ```

2. 恢復舊的 API 呼叫
   ```javascript
   // 使用舊方法（需要 Client ID/Secret 在前端）
   const response = await tdxApi.fetchCCTV('/v2/Road/Traffic/CCTV/Freeway?...');
   ```

3. 提交臨時修復
   ```bash
   git add -A
   git commit -m "hotfix: 暫時禁用後端代理，恢復舊方法"
   git push
   ```

---

## 📞 獲取更多幫助

| 問題來源 | 解決方案 |
|---------|---------|
| 🔐 環境變數問題 | Cloudflare Dashboard → Pages 設定 |
| 🌐 API 金鑰無效 | TDX 官方網站重新申請 |
| 🖥️ Worker 錯誤 | 查看 Cloudflare 日誌（Analytics Engine） |
| 🖼️ 圖片無法加載 | 檢查 TDX API 返回的 URL 是否有效 |
| 📱 前端Bug | 檢查瀏覽器主控台，查看錯誤堆棧跟蹤 |

---

## 📋 檢查清單

部署後完整檢查：

- [ ] Cloudflare 環境變數已設定
- [ ] Cloudflare 部署已完成（顯示 ✅ Success）
- [ ] `/api/get-cameras?type=Freeway` 能正常回應
- [ ] 前端頁面成功載入（不顯示白屏）
- [ ] 懶加載佔位符出現（「點擊載入影像」）
- [ ] 點擊相機卡片能加載圖片
- [ ] 瀏覽器主控台無紅色錯誤
- [ ] 不同網路速度下都能正常加載
- [ ] 統計數據儲存到 D1（可選）

---

祝你除錯愉快！如有問題，逐一檢查上述項目。 🎯
