# 台灣即時監控系統 - 檔案架構說明

## 📋 系統概述
整合台灣各政府機關開放資料，提供交通、環境、災防監控影像的一站式查詢平台。

## 🗂️ 檔案結構

### 核心檔案
- `index.html` - 首頁（已重寫✅）
- `navbar.js` - 導航列組件
- `config.js` - API 配置
- `tdx-api.js` - TDX API 串接工具

### 交通監控頁面
#### ✅ 已完成重寫
1. **highway.html** - 國道監視器
   - 資料來源：TDX API + 高速公路局備援 XML
   - 特色：縮圖預覽、路線篩選、即時影像

2. **road.html** - 省道監視器（已重寫✅）
   - 資料來源：TDX API + 公路總局備援 XML
   - 特色：路線編號與里程分離顯示、現代化 UI

3. **city.html** - 市區道路監視器（已重寫✅）
   - 資料來源：TDX API
   - 特色：縣市道路篩選、綠色主題設計

### 環境監控頁面
#### 🔄 待重寫/整合
1. **water.html** - 水資源監控（主頁面）
   - 需要整合以下子頁面：
   - `water-resources.html` - 水利署河川監控
   - `water-gov.html` - 水利署專區
   - `water-local.html` - 地方政府專區

2. **soil-observation.html** - 河川流域監控（已完成✅）
   - 資料來源：水利署河川分署 API
   - 特色：流域監控、提供單位分類

3. **soil-monitoring.html** - 土壤監測（待整合）

4. **air-quality.html** - 空氣品質監測（待重寫）
   - 資料來源：環保署空氣品質監測網
   - 需要重寫為現代化設計

### 災防監控頁面
#### 🔄 待重寫
1. **debris-flow.html** - 土石流監測（待重寫）
   - 資料來源：水土保持局
   - 需要重寫為現代化設計

2. **landslide-monitoring.html** - 邊坡監測（待重寫）
   - 需要重寫為現代化設計

### 多餘檔案（待整合或刪除）
- `debug-classification.html` - 除錯用，可考慮刪除
- 各種 water-* 頁面需要整合成單一入口

## 🎨 設計風格統一
### 已重寫頁面的特色
- **漸層背景**：各頁面使用專屬配色
  - 首頁：紫色系
  - 國道：藍色系
  - 省道：橘色系
  - 市區：綠色系

- **卡片式設計**：統一使用圓角卡片布局
- **三欄網格佈局**：所有監視器頁面統一使用 `grid-template-columns: repeat(3, 1fr)`
  - 桌面（>1200px）：3欄
  - 平板（768px-1200px）：2欄
  - 手機（<768px）：1欄
- **懸停效果**：統一的浮起動畫
- **響應式設計**：完美適配各種裝置
- **統計面板**：即時顯示數據統計
- **篩選系統**：直觀的下拉選單篩選
- **現代化導航列**：分類清晰的三大系統導航

## 🔧 後續工作建議

### 高優先級
1. ✅ **刪除測試檔案**（已完成）
   - 已刪除所有 *-test.html, *-backup.html, *-debug.html

2. 🔄 **整合水資源頁面**
   - 將 water-gov.html、water-local.html 整合到 water.html
   - 或在 water.html 中提供清晰的分類導航

3. 🔄 **重寫空氣品質頁面**
   - 採用與其他頁面一致的設計風格
   - 整合環保署 API

4. 🔄 **重寫災防頁面**
   - debris-flow.html（土石流）
   - landslide-monitoring.html（邊坡）

### 中優先級
5. **統一 Modal 彈窗設計**
   - 確保所有頁面的詳細資訊彈窗風格一致

6. **優化手機版體驗**
   - 測試各頁面在手機上的顯示效果

7. **加入載入骨架屏**
   - 改善初次載入體驗

### 低優先級
8. **SEO 優化**
   - 加入 meta description
   - Open Graph 標籤

9. **加入 PWA 支援**
   - manifest.json
   - Service Worker

10. **效能優化**
    - 圖片懶加載
    - API 請求快取

## 📊 當前狀態

### ✅ 已完成（3/8 主要頁面）
- index.html（首頁）
- highway.html（國道）
- road.html（省道）
- soil-observation.html（河川流域）

### 🔄 需要重寫（4/8 主要頁面）
- city.html（市區）- 需要完整重寫
- air-quality.html（空氣品質）
- debris-flow.html（土石流）
- landslide-monitoring.html（邊坡）

### 🤔 需要整合決策
- water.html + water-resources.html + water-gov.html + water-local.html
- soil-monitoring.html（是否與 soil-observation.html 整合）

## 🚀 快速開始

### 開發環境
```powershell
# 啟動本地伺服器（需要 Python）
python -m http.server 8080

# 或使用 PowerShell 內建伺服器
cd Road-Camera
python -m http.server 8088
```

### 瀏覽器開啟
直接開啟 index.html 即可（無需伺服器）

## 📝 備註
- 所有測試和備份檔案已清理
- API 金鑰配置在 config.js
- TDX API 需要申請金鑰才能正常使用
- 部分頁面有備援 XML API 確保資料可用性

---
最後更新：2025年10月17日
