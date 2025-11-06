# 水利署 CCTV 監控站資料處理工具

## 📡 資料來源

**水利署 CCTV 監控站系統**
- 支援所有流域的即時監控站資料
- 包含影像、座標、狀態等完整資訊

---

## 📋 資料結構

### 完整的監控站物件

```json
{
  "cameraid": "16512",
  "cameraname": "台南溪頂寮大橋",
  "videosurveillancestationname": "台南溪頂寮大橋",
  "basinname": "鹽水溪",
  "tributary": "鹽水溪",
  "rivercode": "165000",
  "countiesandcitieswherethemonitoringpointsarelocated": "臺南市",
  "administrativedistrictwherethemonitoringpointislocated": "永康區",
  "latitude_4326": "23.0246667",
  "longitude_4326": "120.215645",
  "coordinate": "WGS84",
  "imageurl": "https://fmg.wra.gov.tw/...",
  "imageformat": "JPG",
  "status": "1",
  "updatetime": "2025-11-06T12:00:00"
}
```

### 欄位說明

| 欄位 | 資料型 | 說明 |
|-----|-------|------|
| **cameraid** | String | 監控站 ID |
| **cameraname** | String | 監控站名稱 |
| **basinname** | String | 流域名稱 |
| **countiesandcitieswherethemonitoringpointsarelocated** | String | 縣市 |
| **administrativedistrictwherethemonitoringpointislocated** | String | 行政區 |
| **latitude_4326** | String | 緯度 (WGS84) |
| **longitude_4326** | String | 經度 (WGS84) |
| **imageurl** | String | 即時影像 URL |
| **status** | String/Number | 狀態 (0=離線, 1=線上, 2=異常, 3=維護) |

---

## 🌊 支援的流域

台灣主要流域 (20+ 條):

| 流域 | 顏色 | 監控站數 |
|-----|------|--------|
| 淡水河 | 藍色 | 多站 |
| 大安溪 | 綠色 | 多站 |
| 大甲溪 | 橙色 | 多站 |
| 烏溪 | 橙黃色 | 多站 |
| 濁水溪 | 褐色 | 多站 |
| 北港溪 | 土色 | 多站 |
| 朴子溪 | 棕色 | 多站 |
| 八掌溪 | 藍色 | 多站 |
| 鹽水溪 | 綠色 | 多站 |
| 高屏溪 | 紅色 | 多站 |
| 東港溪 | 紫色 | 多站 |
| ... | ... | ... |

---

## 🔧 主要方法 (40+ 個)

### 資訊查詢
- `getBasinInfo(basinName)` - 流域資訊
- `getStatusInfo(status)` - 狀態資訊
- `calculateStats(stations)` - 統計資訊

### 資料驗證
- `isValidStation(station)` - 單筆驗證
- `validateStations(stations)` - 批量驗證

### 分組操作
- `groupByBasin()` - 按流域分組
- `groupByCounty()` - 按縣市分組
- `groupByDistrict()` - 按行政區分組
- `groupByStatus()` - 按狀態分組

### 篩選操作
- `filterOnline()` - 線上監控站
- `filterOffline()` - 離線監控站
- `filterAbnormal()` - 異常監控站
- `filterByBasin()` - 按流域篩選
- `filterByCounty()` - 按縣市篩選
- `search()` - 關鍵字搜尋

### 排序操作
- `sort()` - 多維度排序

### HTML 生成
- `createStationCard()` - 監控站卡片
- `createStationCards()` - 批量卡片
- `createStationTable()` - 表格列表
- `createStatsPanel()` - 統計面板
- `createBasinOverview()` - 流域概覽

### 資料導出
- `exportToCSV()` - CSV 導出
- `downloadCSV()` - 下載 CSV
- `exportToJSON()` - JSON 導出
- `downloadJSON()` - 下載 JSON

### 地理位置
- `calculateDistance()` - 計算距離
- `findNearbyStations()` - 查詢附近監控站

---

## 📝 使用範例

### 快速集成

```html
<script src="assets/water-cctv-transformer.js"></script>
<script src="assets/water-cctv-data.js"></script>

<!-- 統計面板 -->
<div id="stats"></div>

<!-- 列表 -->
<div id="list"></div>

<script>
// 使用現有資料
const stations = waterCCTVStationsData;

// 驗證資料
const { valid } = WaterCCTVTransformer.validateStations(stations);

// 排序
const sorted = WaterCCTVTransformer.sort(valid, 'name');

// 顯示
document.getElementById('stats').innerHTML = 
  WaterCCTVTransformer.createStatsPanel(sorted);

document.getElementById('list').innerHTML = 
  WaterCCTVTransformer.createStationTable(sorted);
</script>
```

### 按流域篩選

```javascript
const rCCTV = WaterCCTVTransformer.filterByBasin(stations, '高屏溪');
console.log('高屏溪監控站:', rCCTV);
```

### 搜尋監控站

```javascript
const results = WaterCCTVTransformer.search(stations, '大橋');
console.log('搜尋結果:', results);
```

### 查詢附近監控站

```javascript
// 查詢 (緯度, 經度) 周邊 5 公里內的監控站
const nearby = WaterCCTVTransformer.findNearbyStations(
  stations,
  23.0246667,  // 緯度
  120.215645,  // 經度
  5            // 半徑 5 公里
);
console.log('附近監控站:', nearby);
```

### 流域概覽

```javascript
const grouped = WaterCCTVTransformer.groupByBasin(stations);
const html = WaterCCTVTransformer.createBasinOverview(grouped);
document.getElementById('overview').innerHTML = html;
```

---

## 🎨 CSS 樣式類

### 卡片相關
- `.cctv-station-card` - 監控站卡片
- `.card-header` - 卡片頭部
- `.card-body` - 卡片主體
- `.card-footer` - 卡片底部
- `.station-image` - 監控影像

### 狀態相關
- `.status-badge` - 狀態徽章
- `.online` - 線上
- `.offline` - 離線
- `.abnormal` - 異常
- `.maintenance` - 維護

### 表格相關
- `.station-table` - 表格
- `.station-row` - 表格列

### 流域相關
- `.basin-card` - 流域卡片
- `.basin-header` - 流域標題
- `.basin-count` - 監控站計數
- `.status-bar-item` - 狀態條

### 統計相關
- `.cctv-stats-panel` - 統計面板
- `.stat-card` - 統計卡片
- `.stat-icon` - 統計圖標
- `.stat-number` - 統計數字
- `.stat-label` - 統計標籤

---

## 💡 高級用法

### 多條件篩選

```javascript
// 只取得線上的高屏溪監控站
const highping = WaterCCTVTransformer.filterByBasin(stations, '高屏溪');
const online = WaterCCTVTransformer.filterOnline(highping);
```

### 統計分析

```javascript
const stats = WaterCCTVTransformer.calculateStats(stations);
const onlineRate = ((stats.online / stats.total) * 100).toFixed(2);
console.log(`線上率: ${onlineRate}%`);
```

### 按流域統計

```javascript
const grouped = WaterCCTVTransformer.groupByBasin(stations);

Object.entries(grouped).forEach(([basin, basinStations]) => {
  const basinStats = WaterCCTVTransformer.calculateStats(basinStations);
  console.log(`${basin}: ${basinStats.online} / ${basinStats.total}`);
});
```

### 地理位置搜尋

```javascript
// 查詢 (23.0, 120.2) 周邊 10 公里內的所有監控站
const nearby = WaterCCTVTransformer.findNearbyStations(stations, 23.0, 120.2, 10);

// 按距離排序並取前 5 個
const top5 = nearby.slice(0, 5);
```

---

## ✅ 快速檢查表

整合時確認:

- [ ] 已引入 `water-cctv-transformer.js`
- [ ] 已引入 `water-cctv-data.js`
- [ ] 驗證資料正確加載
- [ ] HTML 容器已準備
- [ ] CSS 樣式已套用 (可選)
- [ ] 測試篩選功能
- [ ] 測試搜尋功能
- [ ] 測試排序功能

---

**版本**: 1.0.0 | **最後更新**: 2025 年 11 月 6 日
