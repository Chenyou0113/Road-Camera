# 捷運即時電子看板資料格式指南

## 📋 資料結構

### 完整欄位說明

| 欄位名稱 | 資料型別 | 說明 | 範例 |
|---------|---------|------|------|
| **LineID** | String | 路線代碼 | `"BL"`, `"R"`, `"G"` |
| **LineName** | Object | 路線名稱 (雙語) | `{ "Zh_tw": "板南線", "En": "Bannan Line" }` |
| **StationID** | String | 現在車站代碼 | `"BL10"` |
| **StationName** | Object | 現在車站名稱 (雙語) | `{ "Zh_tw": "龍山寺", "En": "Longshan Temple" }` |
| **TripHeadSign** | String | 列車方向顯示 | `"往亞東醫院"` |
| **DestinationStationID** | String | 目標車站代碼 | `"BL05"` |
| **DestinationStationName** | Object | 目標車站名稱 (雙語) | `{ "Zh_tw": "亞東醫院", "En": "Far Eastern Hospital" }` |
| **ServiceStatus** | Number | 營運狀態代碼 | `0` (正常), `1` (疏運), `2` (單線), `3` (停駛) |
| **EstimateTime** | Number | 估計到站秒數 | `0` (進站中), `180` (3分鐘) |
| **SrcUpdateTime** | String | 來源更新時間 (ISO 8601) | `"2025-11-02T00:05:58+08:00"` |
| **UpdateTime** | String | 電子看板更新時間 (ISO 8601) | `"2025-11-02T00:06:38+08:00"` |

---

## 🚇 路線代碼速查表

| 代碼 | 路線名稱 | 顏色 | 營運單位 |
|-----|--------|------|--------|
| **SL** | 淡水線 | 紅色 | 台北捷運 |
| **CL** | 新店線 | 黃色 | 台北捷運 |
| **C** | 中和線 | 綠色 | 台北捷運 |
| **BL** | 板南線 | 藍色 | 台北捷運 |
| **O** | 橙線 | 橙色 | 台北捷運 |
| **R** | 紅線 | 紅色 | 台北捷運 |
| **G** | 綠線 | 綠色 | 台北捷運 |
| **B** | 藍線 | 藍色 | 台北捷運 |
| **BR** | 棕線 | 棕色 | 台北捷運 |
| **Y** | 黃線 | 黃色 | 台北捷運 |
| **LC** | 環狀線 | 金黃 | 台北捷運 |
| **F** | 文湖線 | 棕色 | 台北捷運 |

---

## 📊 營運狀態代碼

### 狀態值定義

```javascript
// 0: 正常
{
  "ServiceStatus": 0,
  "Description": "正常營運",
  "Icon": "check-circle",
  "Color": "#27ae60"
}

// 1: 班次疏運 (列車班次減少)
{
  "ServiceStatus": 1,
  "Description": "班次疏運",
  "Icon": "warning",
  "Color": "#f39c12"
}

// 2: 單線運行 (只能往一個方向)
{
  "ServiceStatus": 2,
  "Description": "單線運行",
  "Icon": "alert-circle",
  "Color": "#e74c3c"
}

// 3: 全線停駛 (路線暫停服務)
{
  "ServiceStatus": 3,
  "Description": "全線停駛",
  "Icon": "x-circle",
  "Color": "#8b0000"
}

// 255: 未知狀態
{
  "ServiceStatus": 255,
  "Description": "未知",
  "Icon": "question-circle",
  "Color": "#95a5a6"
}
```

---

## ⏱️ 到站時間說明

### EstimateTime 值的含義

```javascript
// 0: 列車正在進站或已到達
EstimateTime === 0
// 顯示文字: "進站中" ✓

// 1-60 秒: 即將進站
EstimateTime === 30
// 顯示文字: "即將進站" ⏰

// 60+ 秒: 按分鐘計算
EstimateTime === 180     // 3分鐘
EstimateTime === 600     // 10分鐘
EstimateTime === 3600    // 1小時
// 顯示格式: "N 分" 或 "Xh Ym"

// -1 或無資訊: 未知
EstimateTime === -1
// 顯示文字: "--"
```

### 時間轉換函數

```javascript
// 使用 MRTDataTransformer 進行時間轉換

// 1. 格式化估計到站時間
const timeText = MRTDataTransformer.formatEstimateTime(180);
// 結果: "3 分"

// 2. 解析 ISO 8601 更新時間
const updateTime = MRTDataTransformer.parseUpdateTime(
  "2025-11-02T00:06:38+08:00"
);
// 結果: "00:06:38"
```

---

## 🎨 路線顏色與樣式

### 路線顏色對應

```javascript
const LINE_COLORS = {
    'R': { name: '紅線', color: '#E4002B', bgColor: '#FFE5E8' },
    'G': { name: '綠線', color: '#00A65E', bgColor: '#E5F5ED' },
    'B': { name: '藍線', color: '#0070C0', bgColor: '#E5F1FA' },
    'O': { name: '橙線', color: '#F8931E', bgColor: '#FEF3E5' },
    'BR': { name: '棕線', color: '#A4622D', bgColor: '#F3EADD' },
    'Y': { name: '黃線', color: '#FCC300', bgColor: '#FFFAE5' },
    'BL': { name: '板南線', color: '#0070C0', bgColor: '#E5F1FA' },
    'SL': { name: '淡水線', color: '#E4002B', bgColor: '#FFE5E8' },
    'CL': { name: '新店線', color: '#FCC300', bgColor: '#FFFAE5' },
    'C': { name: '中和線', color: '#00A65E', bgColor: '#E5F5ED' },
    'LC': { name: '環狀線', color: '#C1A501', bgColor: '#F9F5E5' },
    'F': { name: '文湖線', color: '#8B4513', bgColor: '#F5F0E8' }
};

// 使用方式
const lineInfo = MRTDataTransformer.getLineInfo('BL');
// 結果:
// {
//   name: "板南線",
//   color: "#0070C0",
//   bgColor: "#E5F1FA"
// }
```

---

## 📝 常見使用場景

### 場景 1: 顯示單個列車資訊卡

```javascript
const trainData = {
  "LineID": "BL",
  "LineName": { "Zh_tw": "板南線", "En": "Bannan Line" },
  "StationID": "BL10",
  "StationName": { "Zh_tw": "龍山寺", "En": "Longshan Temple" },
  "DestinationStationID": "BL05",
  "DestinationStationName": { "Zh_tw": "亞東醫院", "En": "Far Eastern Hospital" },
  "ServiceStatus": 0,
  "EstimateTime": 120,
  "UpdateTime": "2025-11-02T00:06:38+08:00"
};

// 生成卡片 HTML
const html = MRTDataTransformer.createTrainCard(trainData);
document.getElementById('train-container').innerHTML = html;
```

### 場景 2: 顯示多個列車資訊

```javascript
const trainsData = [
  { /* train 1 */ },
  { /* train 2 */ },
  { /* train 3 */ }
];

// 批量生成卡片
const cardsHTML = MRTDataTransformer.createTrainCards(trainsData);
document.getElementById('trains-container').innerHTML = cardsHTML;
```

### 場景 3: 按路線分類顯示

```javascript
const trains = [ /* 多班列車 */ ];

// 按路線分組
const groupedByLine = MRTDataTransformer.groupByLine(trains);

// 生成路線卡片
const lineCardsHTML = MRTDataTransformer.createLineCards(groupedByLine);
document.getElementById('lines-container').innerHTML = lineCardsHTML;
```

### 場景 4: 顯示統計資訊

```javascript
const trains = [ /* 多班列車 */ ];

// 生成統計卡片
const statsHTML = MRTDataTransformer.createStatsPanel(trains);
document.getElementById('stats-container').innerHTML = statsHTML;
```

### 場景 5: 數據篩選

```javascript
// 只顯示正常營運的列車
const normalTrains = MRTDataTransformer.filterNormalService(trains);

// 只顯示異常營運的列車
const abnormalTrains = MRTDataTransformer.filterAbnormalService(trains);

// 只顯示 5 分鐘內到站的列車
const grouped = MRTDataTransformer.groupByArrivalStatus(trains);
const soonArrivingTrains = grouped.inStation.concat(grouped.arriving);
```

### 場景 6: 數據排序

```javascript
// 按到站時間排序 (最快到站優先)
const sortedByTime = MRTDataTransformer.sortTrains(trains, 'time');

// 按路線代碼排序
const sortedByLine = MRTDataTransformer.sortTrains(trains, 'line');

// 按營運狀態排序 (異常優先)
const sortedByStatus = MRTDataTransformer.sortTrains(trains, 'status');
```

### 場景 7: 數據驗證

```javascript
const trains = [ /* 可能包含無效資料 */ ];

// 驗證所有列車資料
const result = MRTDataTransformer.validateTrains(trains);

console.log('有效資料:', result.valid.length);
console.log('無效資料:', result.invalid.length);

// 只使用有效資料
const validTrains = result.valid;
```

### 場景 8: 導出數據

```javascript
// 導出為 CSV
const csv = MRTDataTransformer.exportToCSV(trains);
console.log(csv); // 列印 CSV 內容

// 下載 CSV 檔案
MRTDataTransformer.downloadCSV(trains, 'mrt_data_20251102.csv');

// 導出為 JSON
const json = MRTDataTransformer.exportToJSON(trains);
console.log(json);

// 下載 JSON 檔案
MRTDataTransformer.downloadJSON(trains, 'mrt_data_20251102.json');
```

---

## 🔧 整合到頁面步驟

### 1. 引入腳本

```html
<script src="assets/mrt-data-transformer.js"></script>
```

### 2. 添加 HTML 容器

```html
<div id="mrt-stats"></div>
<div id="mrt-lines"></div>
<div id="mrt-trains"></div>
```

### 3. 加入 JavaScript 邏輯

```javascript
// 模擬 API 調用
async function loadMRTData() {
    try {
        // 實際應用時，從 TDX API 獲取數據
        const response = await fetch('https://api.example.com/mrt');
        const trainsData = await response.json();
        
        // 驗證數據
        const { valid, invalid } = MRTDataTransformer.validateTrains(trainsData);
        
        if (invalid.length > 0) {
            console.warn(`發現 ${invalid.length} 筆無效資料`);
        }
        
        // 顯示統計
        const statsHTML = MRTDataTransformer.createStatsPanel(valid);
        document.getElementById('mrt-stats').innerHTML = statsHTML;
        
        // 按路線分類並顯示
        const groupedByLine = MRTDataTransformer.groupByLine(valid);
        const lineCardsHTML = MRTDataTransformer.createLineCards(groupedByLine);
        document.getElementById('mrt-lines').innerHTML = lineCardsHTML;
        
        // 顯示所有列車
        const trainsHTML = MRTDataTransformer.createTrainCards(valid);
        document.getElementById('mrt-trains').innerHTML = trainsHTML;
        
    } catch (error) {
        console.error('載入捷運資料失敗:', error);
        document.getElementById('mrt-trains').innerHTML = 
            '<div style="color: red; padding: 20px;">無法載入列車資訊</div>';
    }
}

// 初始加載
loadMRTData();

// 定時刷新 (每 10 秒)
setInterval(loadMRTData, 10000);
```

---

## 📌 注意事項

1. **時間格式**: 所有時間均為 ISO 8601 格式，需轉換為本地時間顯示
2. **語言支援**: 所有名稱欄位為雙語物件，使用時應取 `Zh_tw` 欄位
3. **數據驗證**: 強烈建議驗證 API 回傳資料的完整性
4. **錯誤處理**: 處理網路錯誤、超時和異常資料情況
5. **性能優化**: 頻繁更新時可用 `filterRecentTrains()` 降低畫面重繪
6. **實時更新**: 建議 10-30 秒更新一次，避免過度刷新

---

## 🔗 相關資源

- [TDX API 官方文檔](https://tdx.transportdata.tw/)
- [MRTDataTransformer API 參考](TRAIN-API-QUICK-REFERENCE.md)
- [使用範例](MRT-DATA-EXAMPLES.js)
- [架構文檔](TRAIN-ARCHITECTURE-DIAGRAM.md)
