# 台鐵 LiveBoard 工具 - 快速參考卡

## 🚀 30秒快速開始

```html
<!-- 1. 引入腳本 -->
<script src="assets/train-liveboard-transformer.js"></script>

<!-- 2. 準備容器 -->
<div id="stats"></div>
<div id="trains"></div>

<!-- 3. 加入程式碼 -->
<script>
async function load() {
  const res = await fetch('https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/LiveBoard?StationID=0900');
  const trains = await res.json();
  const valid = TrainLiveboardTransformer.validateTrains(trains).valid;
  const sorted = TrainLiveboardTransformer.sortByArrivalTime(valid);
  
  document.getElementById('stats').innerHTML = TrainLiveboardTransformer.createStatsPanel(sorted);
  document.getElementById('trains').innerHTML = TrainLiveboardTransformer.createTrainTable(sorted);
}
load();
setInterval(load, 30000);
</script>
```

---

## 📚 完整方法表

### 時間轉換 ⏱️

| 方法 | 參數 | 返回 | 說明 |
|-----|------|------|------|
| `formatTime` | `(timeStr: string)` | `string` | "HH:MM:SS" → "HH:MM" |
| `parseUpdateTime` | `(isoString: string)` | `string` | ISO 8601 → "HH:MM:SS" |

### 資訊查詢 ℹ️

| 方法 | 參數 | 返回 | 說明 |
|-----|------|------|------|
| `getTrainTypeInfo` | `(typeCode: string)` | `{name, badge, color, bgColor}` | 列車類型資訊 |
| `getDirectionInfo` | `(direction: number)` | `{text, icon, color}` | 方向資訊 |
| `getDelayStatus` | `(delayMinutes: number)` | `{text, icon, color, cssClass}` | 延誤狀態 |
| `getTrainStatus` | `(train: object)` | `string` | 列車狀態 |

### HTML 生成 🎨

| 方法 | 參數 | 返回 | 說明 |
|-----|------|------|------|
| `createTrainRow` | `(train: object)` | `string` | 單個表格列 |
| `createTrainRows` | `(trains: array)` | `string` | 批量表格列 |
| `createTrainTable` | `(trains: array)` | `string` | 完整表格 |
| `createStatsPanel` | `(trains: array)` | `string` | 統計面板 |

### 資料分組 📊

| 方法 | 參數 | 返回 | 說明 |
|-----|------|------|------|
| `groupByDirection` | `(trains: array)` | `object` | 按方向分組 |
| `groupByTrainType` | `(trains: array)` | `object` | 按列車類型分組 |
| `groupByEndingStation` | `(trains: array)` | `object` | 按終點站分組 |

### 資料篩選 🔍

| 方法 | 參數 | 返回 | 說明 |
|-----|------|------|------|
| `filterDelayedTrains` | `(trains: array)` | `array` | 延誤列車 |
| `filterOntimeTrains` | `(trains: array)` | `array` | 準點列車 |
| `filterArrivedTrains` | `(trains: array)` | `array` | 已到達列車 |
| `filterDepartedTrains` | `(trains: array)` | `array` | 已離站列車 |
| `filterScheduledTrains` | `(trains: array)` | `array` | 預定列車 |

### 資料排序 ↕️

| 方法 | 參數 | 返回 | 說明 |
|-----|------|------|------|
| `sortByArrivalTime` | `(trains, order='asc')` | `array` | 按到達時間排序 |
| `sortByTrainNo` | `(trains, order='asc')` | `array` | 按列車號排序 |
| `sortByDelay` | `(trains)` | `array` | 按延誤排序 |

### 統計驗證 ✓

| 方法 | 參數 | 返回 | 說明 |
|-----|------|------|------|
| `calculateStats` | `(trains: array)` | `{total, arrived, departed, ...}` | 統計資訊 |
| `isValidTrain` | `(train: object)` | `boolean` | 驗證單筆 |
| `validateTrains` | `(trains: array)` | `{valid, invalid}` | 批量驗證 |

### 資料導出 📥

| 方法 | 參數 | 返回 | 說明 |
|-----|------|------|------|
| `exportToCSV` | `(trains: array)` | `string` | CSV 字串 |
| `downloadCSV` | `(trains, filename?)` | `void` | 下載 CSV |
| `exportToJSON` | `(trains: array)` | `string` | JSON 字串 |
| `downloadJSON` | `(trains, filename?)` | `void` | 下載 JSON |

---

## 📋 資料結構速查

### 列車物件欄位

```javascript
{
  StationID: "0900",                // 車站代碼
  StationName: {Zh_tw, En},         // 車站名稱
  TrainNo: "1288",                  // 列車號
  Direction: 0,                     // 0=南下, 1=北上
  TrainTypeCode: "6",               // 列車類型
  EndingStationName: {Zh_tw, En},   // 終點站
  ScheduledArrivalTime: "00:27:00", // 預定到站
  ScheduledDepartureTime: "00:27:00",// 預定離站
  ActualArrivalTime: "ISO8601",     // 實際到站
  ActualDepartureTime: "ISO8601",   // 實際離站
  DelayTime: 0,                     // 延誤分鐘
  UpdateTime: "ISO8601"             // 更新時間
}
```

### 列車類型代碼

| 代碼 | 名稱 | 徽章 |
|-----|------|------|
| 0-3 | 自強 | 自 |
| 4-5 | 莒光 | 莒 |
| 6-7 | 區間 | 區 |
| 21 | 區間快 | 快 |

### 方向代碼

| 代碼 | 名稱 | 圖標 |
|-----|------|------|
| 0 | 南下 | ⬇️ |
| 1 | 北上 | ⬆️ |

---

## 💡 常用程式碼片段

### 只顯示延誤列車

```javascript
const delayed = TrainLiveboardTransformer.filterDelayedTrains(trains);
const html = TrainLiveboardTransformer.createTrainTable(delayed);
document.getElementById('container').innerHTML = html;
```

### 按方向顯示 (南下/北上)

```javascript
const grouped = TrainLiveboardTransformer.groupByDirection(trains);
const southbound = TrainLiveboardTransformer.createTrainTable(grouped[0]);
const northbound = TrainLiveboardTransformer.createTrainTable(grouped[1]);
```

### 顯示統計資訊

```javascript
const stats = TrainLiveboardTransformer.calculateStats(trains);
console.log(`延誤: ${stats.delayed} / 準點: ${stats.ontime}`);
```

### 排序後顯示表格

```javascript
const sorted = TrainLiveboardTransformer.sortByDelay(trains);
const html = TrainLiveboardTransformer.createTrainTable(sorted);
```

### 驗證並過濾

```javascript
const { valid, invalid } = TrainLiveboardTransformer.validateTrains(data);
console.log(`有效: ${valid.length}, 無效: ${invalid.length}`);
```

### 導出報告

```javascript
TrainLiveboardTransformer.downloadCSV(trains, 'report.csv');
TrainLiveboardTransformer.downloadJSON(trains, 'report.json');
```

---

## 🎨 CSS 樣式類名

自動生成的 HTML 使用這些類名:

```
表格:
.train-table              // 表格
.train-row                // 列車列
.train-arrived            // 已到達行
.train-departed           // 已離站行
.train-scheduled          // 預定行

徽章:
.train-badge              // 列車類型徽章
.status-badge             // 狀態徽章
  .ontime                 // 準點
  .delayed                // 延誤
  .early                  // 提前

統計:
.stats-panel              // 統計面板
.stat-card                // 統計卡片
.stat-label               // 標籤
.stat-number              // 數字
```

---

## 🔗 相關連結

| 資源 | 連結 |
|-----|------|
| API 文檔 | https://tdx.transportdata.tw/ |
| 工具檔案 | `assets/train-liveboard-transformer.js` |
| 完整指南 | `docs/TRAIN-LIVEBOARD-FORMAT-GUIDE.md` |
| 範例程式 | `docs/TRAIN-LIVEBOARD-EXAMPLES.js` |

---

## ⚡ 效能提示

- 使用 `filterScheduledTrains()` 減少顯示列數
- 每 30-60 秒刷新一次資料
- 使用 `sortByArrivalTime()` 改善用戶體驗
- 為大量資料考慮虛擬滾動

---

**版本**: 1.0.0 | **最後更新**: 2025 年 11 月 2 日
