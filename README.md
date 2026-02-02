# 🇹🇼 Taiwan Traffic & Environment Monitor
> **全台交通與環境監控系統 ‧ 旗艦版**

這是一個整合台灣全方位交通、公共運輸與環境資訊的即時監控儀表板。從高速公路路況、捷運列車動態 (PIDS)，到地震速報與水情監測，提供一站式的視覺化數據服務。

![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Status](https://img.shields.io/badge/Status-Active-success.svg)

## ✨ 核心功能

### 🚅 軌道交通智慧顯示 (Metro & Rail)
本系統內建強大的軌道交通資訊整合功能，支援 PIDS (旅客資訊顯示系統) 模擬與即時動態看板。

- **捷運智慧儀表板 (Metro Liveboard)** `metro-liveboard.html`
  - 支援全台捷運系統：**北捷、高捷、桃捷、中捷、新北捷、輕軌**。
  - **即時資訊**：顯示列車倒數、車廂擁擠度、營運狀態。
  - **PIDS 模擬器**：`metro-pids.html` 完美還原北捷/高捷月台顯示器介面 (支援 TPASS 2.0 風格)。
  
- **雙鐵資訊系統**
  - **台鐵 PIDS**：`tra-pids.html` 模擬台鐵月台旅客資訊顯示器，包含跑馬燈與列車動態。
  - **高鐵 PIDS**：`thsr_pids.html` 高鐵風格的列車資訊看板。
  - **機場航班**：`airport_liveboard.html` 整合機場航班資訊。

### 📹 即時影像監控 (CCTV)
整合多個政府單位的公開監視器資料，提供地圖化與列表化的檢視介面。

- **公路監控**：國道 (`highway.html`)、快速道路 (`expressway.html`)、省道 (`road.html`)。
- **市區道路**：`city.html` 涵蓋全台主要縣市的重要路口監控。
- **特色功能**：全站支援深色模式 (Dark Mode)、地圖定位檢視、關鍵字快速篩選。

### 🌩️ 環境與防災監控 (Environment)
整合中央氣象署 (CWA) 與水利署 Open Data，建立防災與環境監測中心。

- **天氣雷達**：`rainfall-radar.html` 即時雷達迴波圖與降雨預測。
- **地震速報**：`earthquake_report.html` 強震即時警報與歷史地震查詢。
- **水情看板**：`water.html` 整合水庫蓄水量、河川水位影像與淹水感測器。
- **空氣品質**：`air-quality.html` 全台空氣品質指標 (AQI) 監測。

---

## 🚀 快速開始 (Quick Start)

本專案為靜態網頁架構 (Static Site)，可直接在瀏覽器運行，或使用本地伺服器預覽。

### 1. 安裝工具 (選用)
雖然是靜態網頁，但我們提供了開發與部署工具 (Wrangler)。

```bash
npm install
```

### 2. 啟動開發伺服器
使用下列指令啟動本地伺服器 (Port 8000)：

```bash
npm run start
```
*系統將自動嘗試使用 python, php 或 npx serve 啟動伺服器。*

### 3. 開啟網頁
瀏覽器訪問：`http://localhost:8000`

---

## 🛠️ 部署指南 (Deployment)

本專案針對 **Cloudflare Pages** 進行了最佳化配置。

### 使用 Wrangler CLI 部署

```bash
# 登入 Cloudflare
npx wrangler login

# 部署到 Cloudflare Pages
npm run deploy:pages
```

### 環境變數設定 (Environment Variables)
為了正常使用 TDX (交通部) 與 CWA (氣象署) API，請務必在 Cloudflare Pages 後台設定以下環境變數：

| 變數名稱 | 說明 |
|----------|------|
| `TDX_CLIENT_ID` | TDX API Client ID |
| `TDX_CLIENT_SECRET` | TDX API Client Secret |
| `CWA_API_KEY` | 中央氣象署 API Key |

---

## 📂 資料維護

### 捷運站點資料庫
本系統使用本地 JSON 檔案來維護全台捷運站點對照表，以加速載入並減少 API 依賴。

- **檔案路徑**：`metro-stations-raw.json`
- **結構說明**：
  ```json
  {
    "systems": {
      "TRTC": [ ... ], // 台北捷運
      "KRTC": [ ... ]  // 高雄捷運 (含輕軌)
    }
  }
  ```
- **更新方式**：若有新站點開通，請直接更新此 JSON 檔案中的站點列表 (ID, 中英文站名)。

---

## 📝 頁面索引

| 分類 | 檔案名稱 | 用途 |
|------|----------|------|
| **核心** | `index.html` | 系統首頁與導航 |
| **捷運** | `metro-liveboard.html` | 全台捷運整合儀表板 |
| | `metro-pids.html` | 捷運月台顯示器模擬 |
| **鐵路** | `tra-pids.html` | 台鐵月台顯示器 |
| | `thsr_pids.html` | 高鐵旅客資訊顯示 |
| **路況** | `highway.html` | 高速公路路況 |
| | `city.html` | 縣市道路路況 |
| **防災** | `earthquake_report.html` | 地震速報 |
| | `water.html` | 水情監視 |

---

## 📄 授權 (License)

MIT License. Copyright (c) 2026 Road Camera System Team.
