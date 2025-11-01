# 捷運資料轉換工具 API 快速參考

## 🚀 快速開始

### 匯入腳本
```html
<script src="assets/mrt-data-transformer.js"></script>
```

### 基本使用
```javascript
// 格式化到站時間
const timeText = MRTDataTransformer.formatEstimateTime(180);
// "3 分"

// 解析更新時間
const updateTime = MRTDataTransformer.parseUpdateTime("2025-11-02T08:30:45+08:00");
// "08:30:45"

// 獲取路線信息
const lineInfo = MRTDataTransformer.getLineInfo('BL');
// { name: "板南線", color: "#0070C0", bgColor: "#E5F1FA" }

// 生成列車卡片
const html = MRTDataTransformer.createTrainCard(trainObject);

// 顯示統計資訊
const statsHTML = MRTDataTransformer.createStatsPanel(trainsArray);
```

---

## 📚 完整方法參考表

| 方法 | 參數 | 返回值 | 說明 |
|-----|-----|--------|------|
| **formatEstimateTime** | `(estimateTime: number)` | `string` | 格式化到站秒數為可讀文本 |
| **parseUpdateTime** | `(isoString: string)` | `string` | 解析 ISO 8601 時間為 HH:MM:SS |
| **getLineInfo** | `(lineID: string)` | `{name, color, bgColor}` | 獲取路線顏色和名稱 |
| **getServiceStatus** | `(status: number)` | `{text, icon, color}` | 獲取營運狀態資訊 |
| **createTrainCard** | `(train: object)` | `string` | 生成單個列車卡片 HTML |
| **createTrainCards** | `(trains: array)` | `string` | 批量生成列車卡片 HTML |
| **createStatsPanel** | `(trains: array)` | `string` | 生成統計資訊面板 HTML |
| **createLineCards** | `(grouped: object)` | `string` | 生成路線卡片 HTML |
| **groupByLine** | `(trains: array)` | `object` | 按路線分組列車 |
| **groupByArrivalStatus** | `(trains: array)` | `{arriving, inStation, delayed}` | 按到站狀態分組 |
| **filterNormalService** | `(trains: array)` | `array` | 篩選正常營運的列車 |
| **filterAbnormalService** | `(trains: array)` | `array` | 篩選異常營運的列車 |
| **sortTrains** | `(trains: array, sortBy: string)` | `array` | 排序列車 |
| **calculateStats** | `(trains: array)` | `{total, inStation, arriving, delayed, abnormal}` | 計算統計資訊 |
| **isValidTrain** | `(train: object)` | `boolean` | 驗證單個列車資料 |
| **validateTrains** | `(trains: array)` | `{valid, invalid}` | 批量驗證列車資料 |
| **exportToCSV** | `(trains: array)` | `string` | 導出為 CSV 字串 |
| **exportToJSON** | `(trains: array)` | `string` | 導出為 JSON 字串 |
| **downloadCSV** | `(trains: array, filename: string)` | `void` | 下載 CSV 檔案 |
| **downloadJSON** | `(trains: array, filename: string)` | `void` | 下載 JSON 檔案 |

---

## 🎨 路線代碼與顏色對應

### 台北捷運路線

| 代碼 | 路線名稱 | 顏色代碼 | RGB值 |
|-----|--------|---------|-------|
| **R** | 紅線 | `#E4002B` | 228, 0, 43 |
| **G** | 綠線 | `#00A65E` | 0, 166, 94 |
| **B** | 藍線 | `#0070C0` | 0, 112, 192 |
| **O** | 橙線 | `#F8931E` | 248, 147, 30 |
| **BR** | 棕線 | `#A4622D` | 164, 98, 45 |
| **Y** | 黃線 | `#FCC300` | 252, 195, 0 |
| **BL** | 板南線 | `#0070C0` | 0, 112, 192 |
| **SL** | 淡水線 | `#E4002B` | 228, 0, 43 |
| **CL** | 新店線 | `#FCC300` | 252, 195, 0 |
| **C** | 中和線 | `#00A65E` | 0, 166, 94 |
| **LC** | 環狀線 | `#C1A501` | 193, 165, 1 |
| **F** | 文湖線 | `#8B4513` | 139, 69, 19 |

---

## 📊 營運狀態代碼速查

| 代碼 | 狀態 | 圖標 | 顏色 | 含義 |
|-----|------|------|------|------|
| **0** | 正常 | check-circle | #27ae60 | 正常營運 |
| **1** | 疏運 | warning | #f39c12 | 班次減少 |
| **2** | 單線 | alert-circle | #e74c3c | 單向營運 |
| **3** | 停駛 | x-circle | #8b0000 | 全線停駛 |
| **255** | 未知 | question-circle | #95a5a6 | 狀態未知 |

---

## 📋 資料結構

### 列車物件

```javascript
{
  LineID: "BL",                    // 路線代碼
  LineName: {                      // 路線名稱
    Zh_tw: "板南線",
    En: "Bannan Line"
  },
  StationID: "BL10",              // 現在車站代碼
  StationName: {                  // 現在車站名稱
    Zh_tw: "龍山寺",
    En: "Longshan Temple"
  },
  TripHeadSign: "往亞東醫院",      // 列車方向
  DestinationStationID: "BL05",   // 目標車站代碼
  DestinationStationName: {       // 目標車站名稱
    Zh_tw: "亞東醫院",
    En: "Far Eastern Hospital"
  },
  ServiceStatus: 0,               // 營運狀態 (0-3, 255)
  EstimateTime: 180,              // 到站秒數 (0=進站中)
  SrcUpdateTime: "2025-11-02T...", // 來源更新時間
  UpdateTime: "2025-11-02T..."    // 看板更新時間
}
```

---

## 🔑 常見用法模式

### 模式 1: 取得統計資訊

```javascript
const stats = MRTDataTransformer.calculateStats(trains);

console.log(`${stats.total} 班列車`);
console.log(`${stats.inStation} 班進站中`);
console.log(`${stats.arriving} 班即將到站`);
console.log(`${stats.abnormal} 班異常營運`);
```

### 模式 2: 按路線顯示

```javascript
const grouped = MRTDataTransformer.groupByLine(trains);
const htmlCards = MRTDataTransformer.createLineCards(grouped);
document.getElementById('container').innerHTML = htmlCards;
```

### 模式 3: 篩選和排序

```javascript
const normalTrains = MRTDataTransformer.filterNormalService(trains);
const sorted = MRTDataTransformer.sortTrains(normalTrains, 'time');
```

### 模式 4: 按到站狀態分組

```javascript
const grouped = MRTDataTransformer.groupByArrivalStatus(trains);

// 進站中的列車
grouped.inStation.forEach(train => {
  console.log(`${train.StationName.Zh_tw} 進站中 ✓`);
});

// 即將到站 (5分鐘內)
grouped.arriving.forEach(train => {
  console.log(`${train.StationName.Zh_tw} ${MRTDataTransformer.formatEstimateTime(train.EstimateTime)}`);
});
```

### 模式 5: 驗證與清理資料

```javascript
const { valid, invalid } = MRTDataTransformer.validateTrains(trainsData);

console.log(`有效: ${valid.length}`);
console.log(`無效: ${invalid.length}`);

// 只使用有效的資料
const cleanData = valid;
```

### 模式 6: 數據導出

```javascript
// 匯出為 CSV
const csv = MRTDataTransformer.exportToCSV(trains);
MRTDataTransformer.downloadCSV(trains, 'mrt_20251102.csv');

// 匯出為 JSON
const json = MRTDataTransformer.exportToJSON(trains);
MRTDataTransformer.downloadJSON(trains, 'mrt_20251102.json');
```

---

## ⚙️ 時間轉換參考

### EstimateTime 轉換表

| 秒數 | formatEstimateTime 結果 |
|-----|-------------------------|
| 0 | "進站中" |
| 30 | "即將進站" |
| 60 | "1 分" |
| 120 | "2 分" |
| 180 | "3 分" |
| 300 | "5 分" |
| 600 | "10 分" |
| 1800 | "30 分" |
| 3600 | "1h0m" |
| 5400 | "1h30m" |

### ISO 8601 時間轉換

```javascript
// 輸入
"2025-11-02T08:30:45+08:00"

// 輸出
"08:30:45"
```

---

## ✅ 最佳實踐

### 推薦做法 ✓

```javascript
// ✓ 驗證資料後再使用
const { valid } = MRTDataTransformer.validateTrains(data);

// ✓ 使用排序改善用戶體驗
const sorted = MRTDataTransformer.sortTrains(valid, 'time');

// ✓ 使用路線顏色提升視覺效果
const lineInfo = MRTDataTransformer.getLineInfo(train.LineID);
element.style.color = lineInfo.color;

// ✓ 定時刷新數據
setInterval(refreshData, 10000);

// ✓ 提供數據導出功能
document.getElementById('exportBtn').onclick = () => {
  MRTDataTransformer.downloadCSV(trains, 'report.csv');
};
```

### 避免做法 ✗

```javascript
// ✗ 直接使用未驗證的資料
const trains = apiResponse; // 沒有驗證

// ✗ 忘記處理時間轉換
element.textContent = train.EstimateTime; // 顯示秒數，不友善

// ✗ 假設路線代碼一定存在
const color = LINE_COLORS[unknown].color; // 可能崩潰

// ✗ 過於頻繁的更新
setInterval(refreshData, 1000); // 太耗資源

// ✗ 不處理錯誤
const data = await fetch(url); // 沒有 try-catch
```

---

## 🐛 故障排除

### 問題 1: 時間顯示不正確

**症狀**: 顯示 `--:--:--` 或錯誤時間

**解決**:
```javascript
// 檢查時間格式
const time = train.UpdateTime; // 應為 ISO 8601 格式
const parsed = MRTDataTransformer.parseUpdateTime(time);
console.log(parsed);
```

### 問題 2: 路線顏色找不到

**症狀**: undefined 或未知顏色

**解決**:
```javascript
// getLineInfo 會返回預設值
const lineInfo = MRTDataTransformer.getLineInfo(lineID);
// 永遠返回有效物件: { name, color, bgColor }
```

### 問題 3: 卡片 HTML 為空

**症狀**: 沒有任何內容顯示

**解決**:
```javascript
// 檢查資料是否有效
const { valid } = MRTDataTransformer.validateTrains(trains);
console.log('有效資料:', valid.length);

if (valid.length === 0) {
  console.warn('沒有有效資料');
}
```

### 問題 4: 列車不按預期排序

**症狀**: 排序結果不符預期

**解決**:
```javascript
// 確認排序方式正確
const sorted = MRTDataTransformer.sortTrains(trains, 'time');
// 可用: 'time', 'line', 'status'

// 檢查資料是否有缺失欄位
const { valid, invalid } = MRTDataTransformer.validateTrains(trains);
console.log('無效資料:', invalid);
```

---

## 📞 支援資訊

- **線上文檔**: [MRT-DATA-FORMAT-GUIDE.md](MRT-DATA-FORMAT-GUIDE.md)
- **程式碼範例**: [MRT-DATA-EXAMPLES.js](MRT-DATA-EXAMPLES.js)
- **完整實現**: [mrt-data-transformer.js](../assets/mrt-data-transformer.js)
- **架構圖**: [TRAIN-ARCHITECTURE-DIAGRAM.md](TRAIN-ARCHITECTURE-DIAGRAM.md)

---

**最後更新**: 2025 年 11 月 2 日
