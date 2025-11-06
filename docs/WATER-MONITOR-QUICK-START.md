# 水利署監視器系統 - 快速開始指南

## 🎯 一分鐘快速啟動

### 1️⃣ 開啟系統
```bash
# 雙擊檔案或使用命令
start Road-Camera/water-monitor.html
```

### 2️⃣ 系統特色一覽

| 功能 | 說明 |
|------|------|
| 📊 **統計面板** | 顯示 200 台監視器統計資訊 |
| 🔍 **智能搜尋** | 即時搜尋監視器名稱/位置 |
| 🎛️ **多重篩選** | 依機關/狀態/排序方式過濾 |
| 📱 **響應式** | 完美支援手機、平板、桌面 |
| 🎨 **現代設計** | 漸變色卡片、流暢動畫 |

---

## 📋 系統架構

```
water-monitor.html (主頁面)
    ├── 統計面板 (4個統計卡片)
    ├── 控制面板 (篩選器 + 搜尋)
    └── 監視器網格 (動態卡片)

assets/water-monitor-data.js (資料層)
    ├── generateDemoData() - 生成示範資料
    ├── updateStats() - 更新統計
    ├── filterCameras() - 篩選邏輯
    └── renderCameras() - 渲染畫面
```

---

## 🎮 主要操作

### 篩選監視器
1. **主管機關** → 選擇「水利署直轄」或「地方合建」
2. **影像狀態** → 選擇「有影像」或「無影像」
3. **排序方式** → 選擇排序依據

### 搜尋監視器
- 在搜尋框輸入關鍵字（即時過濾）
- 支援：監視器名稱、地理位置、河川名稱

### 查看詳情
- 每張卡片顯示：
  - ✅ 影像畫面
  - ✅ 線上/離線狀態
  - ✅ 地理位置
  - ✅ 水位流量數據
  - ✅ 設備編號

---

## 💡 示範資料說明

系統包含 **26個主要河川監測站**：

| 區域 | 河川 | 監視器數量 |
|------|------|------------|
| 北部 | 淡水河、基隆河、新店溪等 | 約60台 |
| 中部 | 大安溪、烏溪、濁水溪等 | 約50台 |
| 南部 | 曾文溪、高屏溪、東港溪等 | 約50台 |
| 東部 | 花蓮溪、秀姑巒溪、卑南溪等 | 約40台 |

**總計：約 200 台監視器**
- 水利署直轄：100 台
- 地方合建：100 台
- 線上率：約 90%

---

## 🔧 自訂設定

### 修改統計數字
編輯 `water-monitor.html` 中的初始值：
```html
<p id="totalCameras">200</p>
<p id="directCameras">100</p>
<p id="localCameras">100</p>
<p id="activeCameras">200</p>
```

### 調整監視器數量
編輯 `assets/water-monitor-data.js`：
```javascript
const cameraCount = Math.floor(Math.random() * 3) + 2; // 2-4台
// 改為固定數量
const cameraCount = 5; // 每個地點5台
```

### 修改線上率
```javascript
const isOnline = Math.random() > 0.1; // 90% 線上
// 改為
const isOnline = Math.random() > 0.2; // 80% 線上
```

---

## 🌐 整合真實 API（簡易版）

### Step 1: 準備 API
```javascript
const API_ENDPOINT = 'https://api.wra.gov.tw/cameras';
const API_KEY = 'your_api_key_here';
```

### Step 2: 修改載入函式
```javascript
async function loadCameraData() {
    const response = await fetch(API_ENDPOINT, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    allCameras = await response.json();
    updateStats();
    renderCameras();
}
```

### Step 3: 啟用自動更新
```javascript
setInterval(loadCameraData, 300000); // 每5分鐘
```

---

## 📱 手機版使用技巧

### 最佳體驗建議
- 📱 豎屏使用獲得最佳視覺
- 🔍 使用搜尋功能快速定位
- 👆 點擊卡片查看詳情
- 📊 向下滾動查看更多監視器

### 效能優化
- 系統自動延遲載入圖片
- 流暢滾動動畫
- 快速響應觸控

---

## ❓ 常見問題速查

| 問題 | 解決方案 |
|------|----------|
| 🚫 頁面空白 | 檢查 JS 檔案是否載入 |
| 🖼️ 圖片不顯示 | 確認網路連線正常 |
| 🔢 統計錯誤 | 重新整理頁面 |
| 🔍 搜尋無效 | 清除瀏覽器快取 |
| 📱 手機顯示異常 | 確認 viewport 設定 |

---

## 📚 延伸閱讀

- 📖 [完整使用說明](WATER-MONITOR-SYSTEM-GUIDE.md)
- 🌐 [水利署官網](https://www.wra.gov.tw/)
- 📡 [防災資訊服務網](https://fhy.wra.gov.tw/)

---

## 🎉 完成！

系統已就緒，請開始使用！

**訪問方式：**
```
file:///your-path/Road-Camera/water-monitor.html
```

**系統亮點：**
- ✅ 零配置，開箱即用
- ✅ 純前端，無需伺服器
- ✅ 示範資料完整
- ✅ 界面美觀現代
- ✅ 支援所有裝置

祝使用愉快！🚀
