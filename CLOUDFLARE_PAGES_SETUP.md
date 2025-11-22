# Cloudflare Pages Functions - 安全 Token 管理實施指南

## 📋 概述

本項目已升級為使用 **Cloudflare Pages Functions** 安全管理 TDX API 密鑰。所有敏感信息（CLIENT_SECRET）現在存儲在 Cloudflare 後台，前端代碼中**完全不會暴露任何密鑰**。

---

## 🔐 安全架構

### 舊方式（不安全 ❌）
```
用戶瀏覽器 → 前端代碼（含密鑰） → TDX API
                ↑
          【密鑰暴露】
          用戶可以看到 Secret
```

### 新方式（安全 ✅）
```
用戶瀏覽器 → 前端代碼（無密鑰） → Cloudflare Function (/api/token) → TDX API
                                   ↓
                            【密鑰隱藏】
                        只有伺服器端能看到
```

---

## 🚀 部署步驟

### 第一步：在 Cloudflare Dashboard 設定環境變數

1. **登入 Cloudflare Dashboard**
   - 前往 https://dash.cloudflare.com

2. **進入你的 Pages 專案**
   - 左側選單 → Pages
   - 選擇你的專案（例如 "road-camera-system"）

3. **設定環境變數**
   - 點選上方選單 **Settings** (設定)
   - 在左側選單找到 **Environment variables** (環境變數)
   - 點擊 **Add variable** 按鈕

4. **添加第一個變數：TDX_CLIENT_ID**
   ```
   Variable name: TDX_CLIENT_ID
   Value: <你的 TDX Client ID>
   例如: xiaoyouwu5-ec236890-81d5-4406
   ```
   - 選擇環境：**Production** (生產環境)
   - 點擊 **Add variable**

5. **添加第二個變數：TDX_CLIENT_SECRET**
   ```
   Variable name: TDX_CLIENT_SECRET
   Value: <你的 TDX Client Secret>
   例如: cdb74a75-972a-42a8-a647-be6988a40bfd
   ```
   - 選擇環境：**Production**
   - 點擊 **Add variable**

6. **驗證設定**
   - 頁面應顯示兩個變數：
     - ✓ TDX_CLIENT_ID
     - ✓ TDX_CLIENT_SECRET
   - 點擊 **Save** (儲存)

> ⚠️ **重要安全提示**：這些環境變數只在伺服器端（Cloudflare 邊緣節點）執行，前端代碼看不到，也無法在瀏覽器開發者工具中查看。

---

### 第二步：檢查本機代碼結構

確保你的項目包含以下文件結構：

```
Road-Camera/
├── index.html
├── assets/
│   ├── config.js          ← 已更新（無硬編碼密鑰）
│   ├── tdx-api.js         ← 已更新（支援 Cloudflare Function）
│   └── ... 其他文件
├── functions/
│   └── api/
│       └── token.js       ← ✨ 新增（Cloudflare Function 端點）
└── wrangler.toml          ← 已更新（配置文件）
```

---

### 第三步：測試部署流程

#### 3.1 本機測試（可選）

如果想在本機測試 Cloudflare Functions，需要安裝 `wrangler`：

```bash
# 安裝 wrangler CLI
npm install -g @cloudflare/wrangler

# 進入專案目錄
cd Road-Camera

# 本機啟動開發伺服器（模擬 Cloudflare 邊緣節點）
wrangler pages dev
```

> 💡 **如果安裝 wrangler 太麻煩？**
> 可以跳過本機測試，直接推送到 GitHub，Cloudflare 會自動部署。

#### 3.2 部署到 Cloudflare Pages

**方式一：自動部署（推薦）**

1. 將代碼推送到 GitHub
   ```bash
   git add .
   git commit -m "feat: Add Cloudflare Pages Functions for secure TDX token management"
   git push origin main
   ```

2. Cloudflare 會自動偵測 `functions/` 資料夾，自動部署 Functions

3. 部署完成後，你的網站會在 `https://你的專案.pages.dev` 上線

**方式二：手動上傳**

1. 在 Cloudflare Dashboard 中，進入你的 Pages 專案
2. 選擇 **Deployments**
3. 上傳包含 `functions/` 資料夾的代碼

---

## 🧪 驗證部署成功

### 1. 檢查 Function 是否正常運作

1. 打開你的網站：`https://road-camera.pages.dev` (或你的自訂域名)
2. 按 **F12** 打開開發者工具
3. 進入 **Console** (控制台) 標籤
4. 應該看到類似的日誌：
   ```
   🔧 TDX 配置初始化:
     - 環境: ☁️ Cloudflare Pages
     - Token 端點: /api/token
     - 本機密鑰狀態: ✅ 未設定（使用伺服器）
   ```

### 2. 驗證 Token 申請

1. 切換到 **Network** (網路) 標籤
2. 重新整理頁面
3. 尋找以下請求：
   - `POST /api/token` → 應該返回 `200` 且包含 `access_token`
   - 【重要】在網路請求中，應該**看不到任何 SECRET 或密鑰**

### 3. 檢查監視器是否正常加載

1. 進入任何需要 CCTV 數據的頁面（例如 `combined-roads.html`）
2. 應該正常加載並顯示監視器
3. 控制台應無錯誤，日誌應顯示 `✅ Token 已取得`

---

## 📝 代碼說明

### `functions/api/token.js` - 後端端點

這個文件運行在 **Cloudflare 邊緣節點**，只有它能訪問環境變數中的密鑰。

```javascript
export async function onRequest(context) {
  const clientId = context.env.TDX_CLIENT_ID;      // 安全取得密鑰
  const clientSecret = context.env.TDX_CLIENT_SECRET;

  // 向 TDX 申請 Token
  const response = await fetch(authUrl, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**關鍵特點：**
- ✅ 環境變數在伺服器端解析，前端永遠看不到
- ✅ Token 通過 HTTPS 傳送，無法被攔截
- ✅ 支援 CORS，允許前端跨域調用

### `assets/config.js` - 前端配置

```javascript
const TDX_CONFIG = {
  CLIENT_ID: '',                    // 空白（已從伺服器隱藏）
  CLIENT_SECRET: '',                // 空白（已從伺服器隱藏）
  TOKEN_API_ENDPOINT: '/api/token', // 指向後端端點
  USE_CLOUDFLARE_FUNCTIONS: true    // 自動偵測環境
};
```

**優點：**
- 前端代碼中完全沒有敏感信息
- 自動偵測環境（Cloudflare vs 本機）
- 支援本機開發降級

### `assets/tdx-api.js` - Token 申請邏輯

```javascript
class TDXApi {
  async getAccessToken() {
    if (TDX_CONFIG.USE_CLOUDFLARE_FUNCTIONS) {
      // 生產環境：調用安全的後端端點
      return await this._getTokenFromCloudflare();
    } else {
      // 開發環境：使用本機密鑰
      return await this._getTokenDirect();
    }
  }
}
```

**雙模式支持：**
1. **Cloudflare Pages 環境** → 調用 `/api/token`（安全）
2. **本機開發** → 使用本機密鑰（便捷，僅開發用）

---

## ⚠️ 重要安全檢查清單

在部署到生產環境前，請確認：

- [ ] ✅ **Cloudflare Dashboard 已設定環境變數**
  - TDX_CLIENT_ID
  - TDX_CLIENT_SECRET

- [ ] ✅ **本機代碼已清理**
  - `assets/config.js` 中的 CLIENT_ID 和 CLIENT_SECRET 為空
  - 沒有硬編碼任何密鑰在 HTML 或 JavaScript 中

- [ ] ✅ **`.gitignore` 已包含敏感文件**
  ```
  # .gitignore
  .env
  .env.local
  .env.*.local
  wrangler.toml  # （可選，如果包含開發環境密鑰）
  ```

- [ ] ✅ **已推送到 GitHub**
  - 檢查 GitHub 上的代碼，確認沒有任何密鑰
  - 使用 `git log` 確認之前的提交沒有暴露密鑰

- [ ] ✅ **Cloudflare Pages 部署已完成**
  - 檢查 Deployments 欄位，應顯示 "SUCCESS"
  - 訪問你的網站，確認能正常加載監視器

---

## 🔧 故障排除

### 問題 1：`/api/token` 返回 404

**症狀：** 控制台顯示錯誤 `GET /api/token 404 Not Found`

**解決方案：**
1. 確認 `functions/api/token.js` 文件存在
2. 檢查部署日誌，確認 Cloudflare Pages 已自動檢測 Functions
3. 嘗試重新部署：在 Cloudflare Dashboard → 點擊 "Redeploy" 按鈕

### 問題 2：`環境變數未設定` 錯誤

**症狀：** Functions 返回 500 錯誤，日誌顯示 "Server configuration error"

**解決方案：**
1. 進入 Cloudflare Dashboard
2. Pages 專案 → Settings → Environment variables
3. 確認 **TDX_CLIENT_ID** 和 **TDX_CLIENT_SECRET** 已設定
4. 確認選擇的環境是 **Production**
5. 點擊 "Save"，等待部署完成（約 1-2 分鐘）

### 問題 3：Token 申請失敗 401

**症狀：** 日誌顯示 `TDX 認証失敗 (401)`

**解決方案：**
1. 檢查 Cloudflare Dashboard 中的 CLIENT_ID 和 SECRET 是否正確複製
2. 確認密鑰沒有多餘的空格或特殊字符
3. 訪問 TDX 官方網站，確認密鑰仍有效（可能已過期）
4. 在 TDX Dashboard 中重新生成新的密鑰：
   - 進入 https://tdx.transportdata.tw
   - 登入帳號
   - 找到你的應用程式
   - 點擊 "Reset" 生成新密鑰
   - 複製新密鑰到 Cloudflare Dashboard

### 問題 4：本機開發時無法運作

**症狀：** 本機測試 (`npm run dev`) 時 Token 申請失敗

**解決方案：**
1. 確認 `assets/config.js` 中已填入開發用密鑰
2. 確認 `wrangler.toml` 中的開發環境變數已設定
3. 重新啟動開發伺服器：
   ```bash
   # 停止當前伺服器 (Ctrl+C)
   # 重新啟動
   wrangler pages dev
   ```

---

## 📚 相關資源

- **Cloudflare Pages Functions 官方文件：**
  https://developers.cloudflare.com/pages/platform/functions/

- **TDX API 文件：**
  https://tdx.transportdata.tw/api-service/swagger-ui.html

- **安全最佳實踐：**
  https://owasp.org/www-project-web-security-testing-guide/

---

## ✅ 部署完成檢查清單

部署完成後，執行以下檢查確認一切正常：

- [ ] 訪問 `https://road-camera.pages.dev` 能正常打開
- [ ] F12 控制台顯示 "☁️ Cloudflare Pages" 環境
- [ ] Network 標籤顯示 `/api/token` 請求返回 200
- [ ] 監視器頁面正常加載並顯示數據
- [ ] 沒有任何 API 金鑰在網頁源代碼中暴露
- [ ] GitHub 代碼中沒有任何敏感信息

如果所有檢查都通過 ✅，恭喜你！系統已成功升級為安全的 token 管理方式。

---

**最後更新：2025 年 11 月**
**維護者：Chenyou0113**
