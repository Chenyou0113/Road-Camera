# 🧪 測試檔案說明

本資料夾包含所有開發和測試用的 HTML 檔案。這些檔案不會影響正式環境，主要用於功能驗證、除錯和開發。

## 📋 檔案分類

### 🔍 功能測試
- `filter-logic-test.html` - 省道篩選邏輯測試
- `provincial-test.html` - 省道 API 端點測試
- `mileage-test.html` - 里程格式顯示測試
- `image-test.html` - 圖片載入測試
- `loading-progress-test.html` - 載入進度測試
- `mobile-test.html` - 手機版響應式測試
- `coordinate-test.html` - 座標系統測試

### 🐛 除錯工具
- `air-quality-debug.html` - 空氣品質除錯
- `air-quality-diagnosis.html` - 空氣品質診斷
- `debug-classification.html` - 分類除錯
- `debris-test.html` - 土石流測試

### ✅ 驗證工具
- `city-validation.html` - 市區頁面驗證
- `water-data-validator.html` - 水資源資料驗證
- `system-status.html` - 系統狀態總覽 ⭐ **重要**

### 🧹 清理版本
- `air-quality-clean.html` - 空氣品質清理版

### 🔌 API 測試
- `api-test-chiayi-yilan.html` - 嘉義宜蘭 API 測試
- `test-api.html` - 一般 API 測試
- `tdx-test.html` - TDX API 測試

### 📊 頁面測試
- `air-quality-test.html` - 空氣品質頁面測試
- `soil-observation-test.html` - 土壤觀測測試
- `water-test.html` - 水資源測試
- `dashboard-text-visibility-test.html` - 儀表板文字可見性測試
- `test-dashboard-titles.html` - 儀表板標題測試

### ⚡ 快速工具
- `quick-check.html` - 快速檢查工具
- `test.html` - 通用測試頁面

---

## 🌟 推薦測試工具

### 1. 系統狀態檢查
**檔案**: `system-status.html`

**功能**:
- 檢查所有主要頁面載入狀態
- 測試 API 連線
- 驗證功能完整性
- 提供快速連結到各測試工具

**使用時機**: 部署前、重大更新後

---

### 2. 省道篩選邏輯測試
**檔案**: `filter-logic-test.html`

**功能**:
- 測試國道/省道/快速道路分類
- 驗證 CCTV ID 識別
- 檢查道路編號匹配

**使用時機**: 修改篩選邏輯後

---

### 3. 里程格式測試
**檔案**: `mileage-test.html`

**功能**:
- 測試 K+ 格式解析
- 驗證地標識別（交流道、橋樑等）
- 檢查里程顯示格式

**使用時機**: 修改里程相關功能後

---

### 4. 圖片載入測試
**檔案**: `image-test.html`

**功能**:
- 測試圖片載入機制
- 驗證錯誤處理
- 檢查載入時間

**使用時機**: 修改圖片處理器後

---

## 🚀 快速開始

### 單一測試
直接在瀏覽器開啟對應的 HTML 檔案即可。

### 批次測試
使用 `system-status.html` 進行全面檢查：

```
1. 開啟 system-status.html
2. 點擊「測試所有頁面」按鈕
3. 查看測試結果
```

---

## 📝 注意事項

1. **不要刪除**: 這些測試檔案對開發和除錯很重要
2. **不要部署**: 生產環境不需要包含 test/ 資料夾
3. **保持更新**: 主要功能更新時，同步更新對應測試
4. **記錄問題**: 測試發現問題請記錄到 docs/

---

## 🔗 相關文檔

- 主要文檔: `../README.md`
- 專案總覽: `../PROJECT-OVERVIEW.md`
- 修復報告: `../docs/`

---

**最後更新**: 2025年10月21日
