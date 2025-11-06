# 水利署 CCTV 快速參考卡片

## 🔥 最常用方法 (Top 10)

### 1️⃣ 驗證資料
```javascript
const { valid, invalid, errors } = WaterCCTVTransformer.validateStations(stations);
```

### 2️⃣ 統計數據
```javascript
const stats = WaterCCTVTransformer.calculateStats(stations);
// { total: 100, online: 95, offline: 3, abnormal: 1, maintenance: 1 }
```

### 3️⃣ 搜尋監控站
```javascript
const results = WaterCCTVTransformer.search(stations, '高屏');
```

### 4️⃣ 按流域分組
```javascript
const grouped = WaterCCTVTransformer.groupByBasin(stations);
// { '高屏溪': [...], '鹽水溪': [...], ... }
```

### 5️⃣ 按狀態篩選
```javascript
const online = WaterCCTVTransformer.filterOnline(stations);
const offline = WaterCCTVTransformer.filterOffline(stations);
```

### 6️⃣ 排序
```javascript
const sorted = WaterCCTVTransformer.sort(stations, 'name', 'asc');
```

### 7️⃣ 生成卡片
```javascript
const html = WaterCCTVTransformer.createStationCards(stations);
document.getElementById('list').innerHTML = html;
```

### 8️⃣ 生成表格
```javascript
const table = WaterCCTVTransformer.createStationTable(stations);
document.getElementById('table').innerHTML = table;
```

### 9️⃣ 查詢附近
```javascript
const nearby = WaterCCTVTransformer.findNearbyStations(stations, lat, lon, radiusKm);
```

### 🔟 導出資料
```javascript
WaterCCTVTransformer.downloadCSV(stations, 'monitoring-stations.csv');
WaterCCTVTransformer.downloadJSON(stations, 'monitoring-stations.json');
```

---

## 📊 流域顏色速查表

| 流域 | 顏色代碼 | 色彩值 | RGB |
|-----|---------|-------|-----|
| 淡水河 | `#1f77b4` | 藍色 | 31, 119, 180 |
| 大安溪 | `#2ca02c` | 綠色 | 44, 160, 44 |
| 大甲溪 | `#ff7f0e` | 橙色 | 255, 127, 14 |
| 烏溪 | `#ffc000` | 橙黃 | 255, 192, 0 |
| 濁水溪 | `#8b6914` | 褐色 | 139, 105, 20 |
| 北港溪 | `#a67c52` | 土色 | 166, 124, 82 |
| 朴子溪 | `#8b4513` | 棕色 | 139, 69, 19 |
| 八掌溪 | `#4169e1` | 深藍 | 65, 105, 225 |
| 鹽水溪 | `#7cb342` | 青綠 | 124, 179, 66 |
| 高屏溪 | `#d32f2f` | 紅色 | 211, 47, 47 |
| 東港溪 | `#7b1fa2` | 紫色 | 123, 31, 162 |
| 隘寮溪 | `#e91e63` | 粉紅 | 233, 30, 99 |
| 荖濃溪 | `#ff6f00` | 深橙 | 255, 111, 0 |
| 旗山溪 | `#00796b` | 青色 | 0, 121, 107 |
| 美濃溪 | `#5e35b1` | 深紫 | 94, 53, 177 |
| 楠梓仙溪 | `#1565c0` | 深藍 | 21, 101, 192 |
| 林邊溪 | `#00838f` | 深青 | 0, 131, 143 |
| 北冬瓜溪 | `#4db6ac` | 青綠 | 77, 182, 172 |
| 秀姑巒溪 | `#558b2f` | 橄欖 | 85, 139, 47 |
| 花蓮溪 | `#0277bd` | 淡藍 | 2, 119, 189 |

---

## 🎯 狀態代碼速查表

| 狀態碼 | 狀態名稱 | 中文 | 圖標 | 顏色 |
|-------|---------|------|------|------|
| **0** | Offline | 離線 | 🔴 | 紅色 (#d32f2f) |
| **1** | Online | 線上 | 🟢 | 綠色 (#388e3c) |
| **2** | Abnormal | 異常 | 🟠 | 橙色 (#f57c00) |
| **3** | Maintenance | 維護 | 🟡 | 黃色 (#fbc02d) |

---

## 🗂️ 常用欄位對應表

### 內部欄位 → 顯示名稱

```javascript
const FIELD_NAMES = {
  'cameraid': '監控站 ID',
  'cameraname': '監控站名稱',
  'basinname': '流域',
  'countiesandcitieswherethemonitoringpointsarelocated': '縣市',
  'administrativedistrictwherethemonitoringpointislocated': '行政區',
  'latitude_4326': '緯度',
  'longitude_4326': '經度',
  'imageurl': '影像 URL',
  'status': '狀態'
};
```

---

## 🔄 常見工作流程

### 工作流 #1: 顯示統計面板 + 監控站列表

```javascript
const stations = waterCCTVStationsData;
const { valid } = WaterCCTVTransformer.validateStations(stations);

// 統計
const html1 = WaterCCTVTransformer.createStatsPanel(valid);
document.getElementById('stats').innerHTML = html1;

// 列表
const sorted = WaterCCTVTransformer.sort(valid, 'name');
const html2 = WaterCCTVTransformer.createStationTable(sorted);
document.getElementById('list').innerHTML = html2;
```

### 工作流 #2: 流域過濾 + 排序 + 顯示

```javascript
const basin = '高屏溪';
const filtered = WaterCCTVTransformer.filterByBasin(stations, basin);
const sorted = WaterCCTVTransformer.sort(filtered, 'name');
const html = WaterCCTVTransformer.createStationCards(sorted);
document.getElementById('result').innerHTML = html;
```

### 工作流 #3: 搜尋 + 流域概覽

```javascript
const keyword = '大橋';
const results = WaterCCTVTransformer.search(stations, keyword);
const grouped = WaterCCTVTransformer.groupByBasin(results);
const html = WaterCCTVTransformer.createBasinOverview(grouped);
document.getElementById('overview').innerHTML = html;
```

### 工作流 #4: 地理位置查詢

```javascript
const nearby = WaterCCTVTransformer.findNearbyStations(
  stations, 23.0, 120.2, 5
);
const sorted = WaterCCTVTransformer.sort(nearby, 'distance');
const html = WaterCCTVTransformer.createStationCards(sorted);
document.getElementById('nearby').innerHTML = html;
```

### 工作流 #5: 完整的監控儀表板

```javascript
const stations = waterCCTVStationsData;
const { valid } = WaterCCTVTransformer.validateStations(stations);

// 面板 1: 統計
document.getElementById('stats').innerHTML = 
  WaterCCTVTransformer.createStatsPanel(valid);

// 面板 2: 流域概覽
const grouped = WaterCCTVTransformer.groupByBasin(valid);
document.getElementById('basins').innerHTML = 
  WaterCCTVTransformer.createBasinOverview(grouped);

// 面板 3: 監控站列表
const sorted = WaterCCTVTransformer.sort(valid, 'basinname');
document.getElementById('stations').innerHTML = 
  WaterCCTVTransformer.createStationTable(sorted);

// 工作: 可下載
document.getElementById('download-csv').onclick = () => {
  WaterCCTVTransformer.downloadCSV(valid, 'stations.csv');
};

document.getElementById('download-json').onclick = () => {
  WaterCCTVTransformer.downloadJSON(valid, 'stations.json');
};
```

---

## ⚡ 快速技巧

### 技巧 #1: 鏈式調用

```javascript
const result = WaterCCTVTransformer
  .filterByBasin(stations, '高屏溪')
  .filter(s => s.status === '1')
  .sort((a, b) => a.cameraname.localeCompare(b.cameraname));
```

### 技巧 #2: 批量操作

```javascript
const counties = ['臺南市', '高雄市', '屏東縣'];
const byCounty = {};

counties.forEach(county => {
  byCounty[county] = WaterCCTVTransformer.filterByCounty(stations, county);
});
```

### 技巧 #3: 動態搜尋

```javascript
const searchInput = document.getElementById('search');
searchInput.addEventListener('input', (e) => {
  const keyword = e.target.value;
  const results = WaterCCTVTransformer.search(stations, keyword);
  document.getElementById('results').innerHTML = 
    WaterCCTVTransformer.createStationCards(results);
});
```

### 技巧 #4: 即時統計更新

```javascript
function updateStats(filterFn) {
  const filtered = stations.filter(filterFn);
  const stats = WaterCCTVTransformer.calculateStats(filtered);
  document.getElementById('stats').innerHTML = 
    WaterCCTVTransformer.createStatsPanel(filtered);
}

// 使用
updateStats(s => s.status === '1');  // 只顯示線上
updateStats(s => s.basinname === '高屏溪');  // 只顯示高屏溪
```

### 技巧 #5: 地圖標記 (與地圖庫配合)

```javascript
const stations = WaterCCTVTransformer.validateStations(data).valid;

stations.forEach(station => {
  const marker = L.marker([
    parseFloat(station.latitude_4326),
    parseFloat(station.longitude_4326)
  ]);
  marker.bindPopup(station.cameraname);
  marker.addTo(map);
});
```

---

## 📞 方法簽名速查

```javascript
// 驗證
validateStations(stations) → { valid, invalid, errors }
isValidStation(station) → boolean

// 查詢
getBasinInfo(basinName) → { name, color,... }
getStatusInfo(status) → { name, color, icon, ... }
calculateStats(stations) → { total, online, offline, abnormal, maintenance }

// 分組
groupByBasin(stations) → { basinName: [...stations] }
groupByCounty(stations) → { countyName: [...stations] }
groupByDistrict(stations) → { districtName: [...stations] }
groupByStatus(stations) → { status: [...stations] }

// 篩選
filterOnline(stations) → [...stations]
filterOffline(stations) → [...stations]
filterAbnormal(stations) → [...stations]
filterByBasin(stations, basinName) → [...stations]
filterByCounty(stations, countyName) → [...stations]
search(stations, keyword) → [...stations]

// 排序
sort(stations, sortBy, order) → [...stations]

// 地理
calculateDistance(lat1, lon1, lat2, lon2) → number (km)
findNearbyStations(stations, lat, lon, radiusKm) → [...stations]

// HTML 生成
createStationCard(station) → html string
createStationCards(stations) → html string
createStationTable(stations) → html string
createStatsPanel(stations) → html string
createBasinOverview(groupedByBasin) → html string

// 導出
exportToCSV(stations) → csv string
downloadCSV(stations, filename) → void (下載)
exportToJSON(stations) → json string
downloadJSON(stations, filename) → void (下載)
```

---

**版本**: 1.0.0 | **最後更新**: 2025 年 11 月 6 日
