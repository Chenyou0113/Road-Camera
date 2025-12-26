# Road Camera System 🚗

台灣監視器畫面查詢系統 - 整合高速公路、省道、水利署等多源監控影像

## 功能特點

- 📹 **多源監控整合**：高速公路、省道、市區道路、水利署、監控影像等
- 🌙 **深色模式**：全網站支援暗黑主題
- 📍 **實時查詢**：使用交通部 TDX API 獲取最新監控影像
- 📊 **多種檢視**：不同道路類型的專用顯示頁面
- ⚡ **快速響應**：靜態網站 + Cloudflare CDN 加速
- 🔒 **安全設計**：所有 API 密鑰存儲在 Cloudflare 環境中

## 支援頁面

| 頁面 | 說明 |
|------|------|
| [highway.html](highway.html) | 高速公路監控 |
| [expressway.html](expressway.html) | 快速道路監控 |
| [road.html](road.html) | 省道監控 |
| [city.html](city.html) | 市區道路監控 |
| [water-cctv.html](water-cctv.html) | 水利署監控 |
| [dashboard.html](dashboard.html) | 整合儀表板 |
| [weather.html](weather.html) | 天氣和氣象資訊 |
| [earthquake_report.html](earthquake_report.html) | 地震速報 |

## 快速開始

### 本機開發

```bash
# 1. 安裝依賴
npm install

# 2. 啟動本機伺服器
npm run start

# 3. 開啟瀏覽器訪問
# http://localhost:8000
```

### 環境設定

#### 本機開發環境

1. 複製 `.env.example` 為 `.env.local`
2. 填入 API 密鑰：
   ```dotenv
   TDX_CLIENT_ID=your_client_id
   TDX_CLIENT_SECRET=your_client_secret
   CWA_API_KEY=your_cwa_api_key
   ```
3. **重要**：提交 Git 前請移除 `.env.local`，該檔案已在 `.gitignore` 中

#### 線上部署（推薦）

在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 設定環境變數：

1. 進入 **Pages** > 選擇專案 > **Settings** > **Environment variables**
2. 新增以下環境變數：
   - `TDX_CLIENT_ID`
   - `TDX_CLIENT_SECRET`
   - `CWA_API_KEY`

這樣所有 API 密鑰會安全地存儲在 Cloudflare，不會暴露在前端代碼中。

## 部署

### 部署到 Cloudflare Pages

```bash
# 安裝 Wrangler CLI
npm install -g @cloudflare/wrangler

# 登入 Cloudflare
wrangler auth login

# 部署
npm run deploy:pages

# 或進行本機預覽
npm run deploy:preview
```

### GitHub Pages（簡單模式）

1. 推送到 GitHub
2. 進入 Repository Settings > Pages
3. 選擇 Deploy from a branch
4. 選擇分支（通常是 `main`）

## API 端點

| 端點 | 說明 |
|------|------|
| `/api/token` | 申請 TDX Token（Cloudflare Pages Function） |
| `/api/get-cameras` | 獲取監控影像列表 |
| `/api/weather-proxy` | 天氣資訊代理 |
| `/api/weather-stations` | 氣象站資訊 |

## 項目結構

```
├── index.html                 # 主頁
├── highway.html              # 高速公路頁面
├── expressway.html           # 快速道路頁面
├── road.html                 # 省道頁面
├── city.html                 # 市區道路頁面
├── water-cctv.html          # 水利署監控頁面
├── dashboard.html            # 整合儀表板
├── functions/                # Cloudflare Pages Functions
│   ├── api/token.js         # Token 申請端點
│   ├── api/get-cameras.js   # 監控影像列表端點
│   └── ...
├── scripts/                  # 部署和開發腳本
├── assets/                   # 靜態資源（圖片、CSS 等）
└── docs/                     # 文檔集合
```

## 開發指南

### 新增監控影像頁面

1. 在根目錄建立新的 HTML 檔案（如 `my-camera.html`）
2. 引入 JavaScript 模組並初始化地圖
3. 更新 `index.html` 的導航連結

### 修改樣式

CSS 主要位於各 HTML 檔案內的 `<style>` 標籤，支援深色模式自動切換。

### 測試功能

```bash
npm run test              # 系統狀態測試
npm run test:filter      # 過濾邏輯測試
npm run test:mileage     # 里程測試
npm run test:image       # 影像測試
```

## 安全性

- ✅ 所有 API 密鑰存儲在 Cloudflare 環境變數中
- ✅ `.env` 檔案已加入 `.gitignore`
- ✅ 前端代碼不包含任何敏感信息
- ✅ CORS 安全檢查已啟用

## 故障排除

### Token 申請失敗
- 檢查 Cloudflare Dashboard 中是否設定了 `TDX_CLIENT_ID` 和 `TDX_CLIENT_SECRET`
- 確認 TDX API 帳號狀態是否正常

### 影像無法載入
- 檢查網路連接
- 確認監控鏡頭的 ID 是否正確
- 檢查瀏覽器控制台的錯誤訊息

### 樣式問題
- 清除瀏覽器快取（Ctrl+F5）
- 檢查深色模式設定

## 貢獻

歡迎提交 Issue 或 Pull Request！

## 許可證

MIT License - 查看 [LICENSE](LICENSE) 詳情

## 相關資源

- [交通部 TDX API 文檔](https://tdx.transportdata.tw/)
- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [中央氣象署開放資料](https://opendata.cwa.gov.tw/)

---

**最後更新**：2025年12月26日
