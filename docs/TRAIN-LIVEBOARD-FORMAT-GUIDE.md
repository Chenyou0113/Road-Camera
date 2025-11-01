# 台鐵車站別列車即時到離站看板工具

## 📡 API 端點

```
https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/LiveBoard
```

**資料格式**: XML (返回陣列結構)  
**工具檔案**: `assets/train-liveboard-transformer.js`

---

## 📋 資料結構

### 完整的列車物件

```json
{
  "StationID": "0900",
  "StationName": {
    "Zh_tw": "基隆",
    "En": "Keelung"
  },
  "TrainNo": "1288",
  "Direction": 0,
  "TrainTypeID": "1131",
  "TrainTypeCode": "6",
  "TrainTypeName": {
    "Zh_tw": "區間",
    "En": "Local Train"
  },
  "TripLine": 1,
  "EndingStationID": "0900",
  "EndingStationName": {
    "Zh_tw": "基隆",
    "En": "Keelung"
  },
  "ScheduledArrivalTime": "00:27:00",
  "ScheduledDepartureTime": "00:27:00",
  "ActualArrivalTime": "2025-11-02T00:27:30+08:00",
  "ActualDepartureTime": "2025-11-02T00:28:00+08:00",
  "DelayTime": 0,
  "SrcUpdateTime": "2025-11-02T00:02:04+08:00",
  "UpdateTime": "2025-11-02T00:03:08+08:00"
}
```

### 欄位說明

| 欄位名 | 資料型 | 說明 |
|--------|-------|------|
| **StationID** | String | 車站代碼 |
| **StationName** | Object | 車站名稱 (雙語) |
| **TrainNo** | String | 列車號 |
| **Direction** | Number | 方向 (0=南下, 1=北上) |
| **TrainTypeCode** | String | 列車類型代碼 |
| **TrainTypeName** | Object | 列車類型名稱 (雙語) |
| **EndingStationName** | Object | 終點站名稱 (雙語) |
| **ScheduledArrivalTime** | String | 預定到站時間 (HH:MM:SS) |
| **ScheduledDepartureTime** | String | 預定離站時間 (HH:MM:SS) |
| **ActualArrivalTime** | String | 實際到達時間 (ISO 8601) |
| **ActualDepartureTime** | String | 實際離站時間 (ISO 8601) |
| **DelayTime** | Number | 延誤分鐘數 |
| **UpdateTime** | String | 資料更新時間 (ISO 8601) |

---

## 🚆 列車類型代碼

| 代碼 | 名稱 | 徽章 | 顏色 |
|-----|------|------|------|
| **0-3** | 自強 | 自 | #E81B23 (紅) |
| **4-5** | 莒光 | 莒 | #FFC72C (黃) |
| **6-7** | 區間 | 區 | #0070C0 (藍) |
| **21** | 區間快 | 快 | #00A65E (綠) |

---

## ⬆️⬇️ 方向代碼

| 代碼 | 方向 | 圖標 |
|-----|------|------|
| **0** | 南下 | ⬇️ arrow-down |
| **1** | 北上 | ⬆️ arrow-up |

---

## 🔧 主要方法

### 時間轉換

```javascript
// 格式化時間 (HH:MM:SS -> HH:MM)
const time = TrainLiveboardTransformer.formatTime("12:34:56");
// 結果: "12:34"

// 解析 ISO 8601 時間
const updateTime = TrainLiveboardTransformer.parseUpdateTime("2025-11-02T00:03:08+08:00");
// 結果: "00:03:08"
```

### 資訊查詢

```javascript
// 獲取列車類型資訊
const typeInfo = TrainLiveboardTransformer.getTrainTypeInfo("6");
// { name: "區間", badge: "區", color: "#0070C0", bgColor: "#E5F1FA" }

// 獲取方向資訊
const dirInfo = TrainLiveboardTransformer.getDirectionInfo(0);
// { text: "南下", icon: "arrow-down", color: "#e74c3c" }

// 獲取延誤狀態
const delay = TrainLiveboardTransformer.getDelayStatus(5);
// { text: "延誤 5 分", icon: "hourglass-end", color: "#e74c3c", cssClass: "delayed" }

// 判斷列車狀態
const status = TrainLiveboardTransformer.getTrainStatus(train);
// 結果: "arrived" | "departed" | "scheduled" | "delayed" | "cancelled"
```

### HTML 生成

```javascript
// 生成表格列 (單個)
const row = TrainLiveboardTransformer.createTrainRow(train);

// 批量生成表格列
const rows = TrainLiveboardTransformer.createTrainRows(trains);

// 生成完整表格
const table = TrainLiveboardTransformer.createTrainTable(trains);

// 生成統計面板
const stats = TrainLiveboardTransformer.createStatsPanel(trains);
```

### 資料分組

```javascript
// 按方向分組
const byDir = TrainLiveboardTransformer.groupByDirection(trains);
// { 0: [南下列車...], 1: [北上列車...] }

// 按列車類型分組
const byType = TrainLiveboardTransformer.groupByTrainType(trains);

// 按終點站分組
const byStation = TrainLiveboardTransformer.groupByEndingStation(trains);
```

### 資料篩選

```javascript
// 篩選延誤列車
const delayed = TrainLiveboardTransformer.filterDelayedTrains(trains);

// 篩選準點列車
const ontime = TrainLiveboardTransformer.filterOntimeTrains(trains);

// 篩選已到達列車
const arrived = TrainLiveboardTransformer.filterArrivedTrains(trains);

// 篩選已離站列車
const departed = TrainLiveboardTransformer.filterDepartedTrains(trains);

// 篩選預定列車 (還未到達或離站)
const scheduled = TrainLiveboardTransformer.filterScheduledTrains(trains);
```

### 資料排序

```javascript
// 按預定到達時間排序 (升序)
const sorted1 = TrainLiveboardTransformer.sortByArrivalTime(trains, 'asc');

// 按預定到達時間排序 (降序)
const sorted2 = TrainLiveboardTransformer.sortByArrivalTime(trains, 'desc');

// 按列車號排序
const sorted3 = TrainLiveboardTransformer.sortByTrainNo(trains);

// 按延誤時間排序 (延誤最多優先)
const sorted4 = TrainLiveboardTransformer.sortByDelay(trains);
```

### 統計計算

```javascript
const stats = TrainLiveboardTransformer.calculateStats(trains);
// {
//   total: 20,        // 列車總數
//   arrived: 5,       // 已到達
//   departed: 3,      // 已離站
//   scheduled: 10,    // 預定中
//   delayed: 2,       // 延誤
//   ontime: 15        // 準點
// }
```

### 資料驗證

```javascript
// 驗證單個列車
const isValid = TrainLiveboardTransformer.isValidTrain(train);

// 批量驗證
const { valid, invalid } = TrainLiveboardTransformer.validateTrains(trains);
```

### 資料導出

```javascript
// 導出為 CSV
const csv = TrainLiveboardTransformer.exportToCSV(trains);

// 下載 CSV 檔案
TrainLiveboardTransformer.downloadCSV(trains, 'trains_20251102.csv');

// 導出為 JSON
const json = TrainLiveboardTransformer.exportToJSON(trains);

// 下載 JSON 檔案
TrainLiveboardTransformer.downloadJSON(trains, 'trains_20251102.json');
```

---

## 📝 使用範例

### 範例 1: 基本集成

```html
<!-- HTML -->
<div id="stats-container"></div>
<div id="table-container"></div>

<script src="assets/train-liveboard-transformer.js"></script>
<script>
async function loadTrains() {
  try {
    // 1. 取得資料
    const response = await fetch(
      'https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/LiveBoard?StationID=0900&$top=50'
    );
    const data = await response.json();

    // 2. 驗證資料
    const { valid } = TrainLiveboardTransformer.validateTrains(data);

    // 3. 排序資料
    const sorted = TrainLiveboardTransformer.sortByArrivalTime(valid);

    // 4. 顯示統計
    document.getElementById('stats-container').innerHTML = 
      TrainLiveboardTransformer.createStatsPanel(sorted);

    // 5. 顯示表格
    document.getElementById('table-container').innerHTML = 
      TrainLiveboardTransformer.createTrainTable(sorted);

  } catch (error) {
    console.error('載入失敗:', error);
  }
}

loadTrains();
setInterval(loadTrains, 30000); // 每 30 秒刷新
</script>
```

### 範例 2: 只顯示延誤列車

```javascript
const delayed = TrainLiveboardTransformer.filterDelayedTrains(trains);
const sorted = TrainLiveboardTransformer.sortByDelay(delayed);
console.log('延誤列車:', sorted);
```

### 範例 3: 按方向分類顯示

```javascript
const grouped = TrainLiveboardTransformer.groupByDirection(trains);

// 南下列車
const southbound = grouped[0];
const southTable = TrainLiveboardTransformer.createTrainTable(southbound);

// 北上列車
const northbound = grouped[1];
const northTable = TrainLiveboardTransformer.createTrainTable(northbound);
```

### 範例 4: 統計並顯示

```javascript
const stats = TrainLiveboardTransformer.calculateStats(trains);
console.log(`
  總數: ${stats.total}
  已到達: ${stats.arrived}
  已離站: ${stats.departed}
  預定: ${stats.scheduled}
  延誤: ${stats.delayed}
`);
```

### 範例 5: 導出報告

```javascript
// 匯出為 CSV
TrainLiveboardTransformer.downloadCSV(trains, `trains_${new Date().toISOString()}.csv`);

// 匯出為 JSON
TrainLiveboardTransformer.downloadJSON(trains, `trains_${new Date().toISOString()}.json`);
```

---

## 🎨 CSS 樣式類

自動生成的 HTML 包含以下 CSS 類供自訂:

### 表格相關
- `.train-table` - 表格容器
- `.train-row` - 列車列
- `.train-arrived` - 已到達列
- `.train-departed` - 已離站列
- `.train-scheduled` - 預定列
- `.train-delayed` - 延誤列

### 徽章相關
- `.train-badge` - 列車類型徽章
- `.status-badge` - 狀態徽章
- `.ontime` - 準點狀態
- `.delayed` - 延誤狀態
- `.early` - 提前狀態

### 統計相關
- `.stats-panel` - 統計面板
- `.stat-card` - 統計卡片
- `.stat-label` - 統計標籤
- `.stat-number` - 統計數字

---

## ✅ 快速檢查表

集成時確認:

- [ ] 已引入 `train-liveboard-transformer.js`
- [ ] API 端點可訪問
- [ ] 資料格式與文檔相符
- [ ] HTML 容器已準備
- [ ] 刷新邏輯已設置 (可選)
- [ ] CSS 樣式已套用 (可選)
- [ ] 錯誤處理已實施

---

## 🔗 相關資源

- **TDX API 官方文檔**: https://tdx.transportdata.tw/
- **台鐵車站代碼**: 需從 TDX API 的站點清單查詢
- **台鐵官網**: https://www.railway.gov.tw/

---

**版本**: 1.0.0  
**最後更新**: 2025 年 11 月 2 日
