# 道路監視器整合系統

## 📁 專案結構

```
Road-Camera/
├── 📄 index.html              # 首頁（紫色漸層主題）
├── 🚗 highway.html            # 國道監視器（藍色主題）
├── 🛣️ road.html               # 省道監視器（橘色主題）
├── 🏙️ city.html               # 市區道路監視器（綠色主題）
├── 💧 water.html              # 水資源監視器（青色主題）
├── 💧 water-gov.html          # 水利署監視器
├── 💧 water-local.html        # 地方水資源監視器
├── 💧 water-resources.html    # 水資源整合頁面
├── 🏞️ soil-observation.html   # 河川流域監測（棕色主題）
├── 🌫️ air-quality.html        # 空氣品質監測（紫色主題）
├── 🌊 debris-flow.html        # 土石流監測（深棕色主題）
├── 🏔️ landslide-monitoring.html # 邊坡監測（橘紅主題）
├── 📋 wrangler.toml           # Cloudflare Workers 配置
├── 📂 assets/                 # 共用資源
│   ├── navbar.js              # 導航列組件
│   ├── config.js              # 全域配置
│   └── tdx-api.js             # TDX API 工具
├── 📂 scripts/                # 部署腳本
│   ├── build.sh               # Linux 建置腳本
│   ├── deploy.ps1             # Windows 部署腳本
│   └── start-server.ps1       # 開發伺服器啟動腳本
├── 📂 docs/                   # 文檔資料
│   └── (舊版 README)
└── 📂 .git/                   # Git 版本控制
```

## 🎨 設計系統

### 色彩主題
每個頁面都有專屬的漸層色彩主題：
- **首頁**: 紫色漸層 (#667eea → #764ba2)
- **國道**: 藍色系 (#2196F3 → #1976D2)
- **省道**: 橘色系 (#FF9800 → #F57C00)
- **市區**: 綠色系 (#4CAF50 → #388E3C)
- **水資源**: 青色系 (#00BCD4 → #0097A7)
- **河川流域**: 棕色系 (#8D6E63 → #6D4C41)
- **空氣品質**: 紫色系 (#9C27B0 → #7B1FA2)
- **土石流**: 深棕色系 (#795548 → #5D4037)
- **邊坡監測**: 橘紅色系 (#FF5722 → #E64A19)

### 網格佈局
所有監視器頁面統一使用三欄網格佈局：
- **桌面版** (>1200px): 3 欄
- **平板版** (768-1200px): 2 欄
- **手機版** (<768px): 1 欄

### 設計特色
- 🔮 **玻璃擬態效果**: backdrop-filter: blur(10px)
- 🎴 **卡片式佈局**: 陰影效果，圓角設計
- 📱 **完全響應式**: 適配所有螢幕尺寸
- 🎯 **固定導航列**: z-index 分層，置頂顯示

## 🧭 導航系統

導航列採用分類結構 (`assets/navbar.js`)：

### 交通監控
- 國道監視器 (highway.html)
- 省道監視器 (road.html)
- 市區道路 (city.html)

### 環境監控
- 水資源 (water.html)
- 河川流域 (soil-observation.html)
- 空氣品質 (air-quality.html)

### 災防監控
- 土石流監測 (debris-flow.html)
- 邊坡監測 (landslide-monitoring.html)

## 🔌 API 整合

### TDX 交通資料
- **國道 CCTV**: `/CCTV/Freeway`
- **省道 CCTV**: `/CCTV/Provincial`
- **市區 CCTV**: `/CCTV/CityLive`

### 環境資料
- **水利署河川流域**: Water Resources Administration API
- **環保署空氣品質**: EPA Air Quality API

### 備援機制
所有頁面都有 XML 備援資料源，確保穩定運行。

## 🚀 部署方式

### 開發環境
```powershell
# 啟動開發伺服器
.\scripts\start-server.ps1
```

### Cloudflare Workers
```powershell
# 部署到 Cloudflare
.\scripts\deploy.ps1
```

或使用 Linux/Mac:
```bash
# 建置並部署
chmod +x scripts/build.sh
./scripts/build.sh
```

## ✅ 完成狀態

### 已完成
- ✅ 首頁（現代化紫色主題）
- ✅ 國道監視器（縮圖支援、篩選功能）
- ✅ 省道監視器（完整重寫、橘色主題）
- ✅ 河川流域監測（WRA API 整合）
- ✅ 導航列（分類設計、玻璃擬態效果）
- ✅ 三欄網格佈局標準化
- ✅ 文件結構整理

### 待完成
- 🔄 市區道路監視器（目前是佔位檔案，需完整重寫）
- 🔄 水資源頁面整合（多個檔案需整合）
- 🔄 空氣品質頁面現代化
- 🔄 災防監控頁面現代化

## 📝 開發注意事項

1. **路徑引用**: 所有 JS 文件已移至 `assets/` 目錄，請使用 `src="assets/xxx.js"`
2. **網格佈局**: 新增頁面請統一使用 `grid-template-columns: repeat(3, 1fr)`
3. **色彩主題**: 為新頁面選擇專屬漸層色，避免重複
4. **響應式設計**: 必須加入 1200px 和 768px 兩個中斷點

## 🛠️ 技術棧

- **前端**: HTML5 / CSS3 / Vanilla JavaScript
- **圖示**: Font Awesome 6.4.0
- **部署**: Cloudflare Workers
- **API**: TDX 運輸資料流通服務、政府開放資料平台

---

**最後更新**: 2024年10月17日
