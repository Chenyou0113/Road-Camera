# 🔐 Cloudflare Pages Functions - 快速參考

## 快速開始（5 分鐘）

### 1️⃣ 在 Cloudflare Dashboard 設定環境變數

進入：**Pages 專案 → Settings → Environment variables**

添加兩個變數：
```
1. Variable: TDX_CLIENT_ID
   Value: <你的 CLIENT ID>
   
2. Variable: TDX_CLIENT_SECRET
   Value: <你的 CLIENT SECRET>
```

環境選擇：**Production**

點擊 **Save**

### 2️⃣ 推送代碼到 GitHub

```bash
git add .
git commit -m "feat: Add Cloudflare Pages Functions for secure token management"
git push origin main
```

Cloudflare 會自動部署（5-10 分鐘）

### 3️⃣ 驗證部署

- 訪問你的網站：`https://road-camera.pages.dev`
- 按 F12 打開控制台
- 應看到：`☁️ Cloudflare Pages` 環境
- 沒有任何錯誤信息

---

## 🛡️ 安全檢查

**部署前請確認：**

```bash
# ✅ 檢查本機密鑰已清除
grep -r "CLIENT_SECRET" assets/config.js  # 應該為空

# ✅ 檢查沒有密鑰提交到 Git
git log -p | grep "CLIENT_SECRET"  # 應該無結果

# ✅ 檢查 GitHub 線上代碼
# 進入 https://github.com/你的用戶/Road-Camera
# 搜索 "CLIENT_SECRET"，應該無結果
```

---

## 📝 代碼文件說明

| 文件 | 用途 | 修改內容 |
|------|------|---------|
| `functions/api/token.js` | ✨ 新增 | 後端 Token 申請端點 |
| `assets/config.js` | 📝 修改 | 移除硬編碼密鑰 |
| `assets/tdx-api.js` | 📝 修改 | 支援 Cloudflare Function |
| `wrangler.toml` | 📝 修改 | Pages 配置 |
| `.env.example` | 📝 修改 | 環境變數模板 |

---

## 🧪 本機測試（可選）

如果想在推送前本機測試：

```bash
# 1. 安裝 wrangler（一次性）
npm install -g @cloudflare/wrangler

# 2. 設定本機環境變數
cp .env.example .env.local
# 編輯 .env.local，填入開發用密鑰

# 3. 啟動本機開發伺服器
wrangler pages dev

# 4. 訪問 http://localhost:8788
# 看起來應該跟線上一樣
```

> ⚠️ **提交前：** 刪除 `.env.local`，確認 `assets/config.js` 中的密鑰為空

---

## ❌ 常見錯誤

| 錯誤 | 原因 | 解決方案 |
|-----|------|--------|
| `/api/token` 404 | Functions 未部署 | 檢查 `functions/api/token.js` 存在，重新推送 |
| 環境變數未設定 (500) | Cloudflare Dashboard 未設定 | 進入 Settings → Environment variables，確認已保存 |
| Token 申請失敗 (401) | 密鑰錯誤或過期 | 在 TDX Dashboard 重新生成密鑰 |
| 前端看得到密鑰 | 本機密鑰未清除 | 檢查 `assets/config.js` 中的 CLIENT_ID 和 SECRET 是否為空 |

---

## 🔍 驗證清單

部署完成後，逐一檢查：

- [ ] Cloudflare Dashboard 環境變數已設定
- [ ] GitHub 代碼無任何密鑰
- [ ] 網站可正常訪問
- [ ] F12 控制台顯示 Cloudflare Pages 環境
- [ ] 監視器頁面可正常加載
- [ ] Network 標籤顯示 `/api/token` 返回 200
- [ ] 沒有 API 金鑰在網頁源代碼中暴露

全部完成 ✅ = 部署成功！

---

## 📞 技術支持

- **Cloudflare 文件：** https://developers.cloudflare.com/pages/platform/functions/
- **TDX API：** https://tdx.transportdata.tw/api-service/swagger-ui.html
- **本項目文件：** 參見 `CLOUDFLARE_PAGES_SETUP.md`

---

**最後更新：2025 年 11 月**
