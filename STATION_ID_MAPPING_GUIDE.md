# 台鐵車站 StationID 對照表使用指南

## 📋 概述

本文件說明如何使用新建立的台鐵車站 **StationID 對照表**，用於 `train-liveboard.html` 以及其他需要車站資訊的功能。

## 📁 檔案位置

- **主要檔案**: `Road-Camera/assets/station-code-mapping.js`
- **資料來源**: `車站基本資料集.json`
- **包含車站數量**: 389 個台鐵車站

## 🔄 資料結構

### stationDataMap 對象

每個車站的詳細資訊包含以下欄位：

```javascript
{
    stationCode: "1000",           // 車站簡碼（票務系統用）
    stationId: "1000",             // 車站ID（TDX API 用）
    name: "臺北",                  // 中文名稱
    ename: "Taipei",               // 英文名稱
    gps: "25.04771 121.51784"      // GPS座標 (緯度 經度)
}
```

### 使用範例

```javascript
// 取得臺北站的詳細資訊
const stationInfo = stationDataMap["1000"];
console.log(stationInfo);
// 輸出: { stationCode: "1000", stationId: "1000", name: "臺北", ename: "Taipei", gps: "25.04771 121.51784" }
```

## 🔧 可用的函數

### 1. getStationIdFromCode(stationCode)

將車站簡碼轉換為 StationID（用於 TDX API）

```javascript
const stationId = getStationIdFromCode("1000");
console.log(stationId); // 輸出: "1000"
```

### 2. getStationData(stationCode)

取得車站的完整資訊對象

```javascript
const stationData = getStationData("1000");
console.log(stationData.name);  // 輸出: "臺北"
console.log(stationData.gps);   // 輸出: "25.04771 121.51784"
```

### 3. getStationName(stationCode)

取得車站的中文名稱

```javascript
const name = getStationName("1000");
console.log(name); // 輸出: "臺北"
```

### 4. getStationEName(stationCode)

取得車站的英文名稱

```javascript
const ename = getStationEName("1000");
console.log(ename); // 輸出: "Taipei"
```

### 5. getStationGPS(stationCode)

取得車站的 GPS 座標

```javascript
const gps = getStationGPS("1000");
console.log(gps); // 輸出: "25.04771 121.51784"
```

### 6. isValidStationCode(stationCode)

驗證車站代碼是否有效

```javascript
if (isValidStationCode("1000")) {
    console.log("有效的車站代碼");
} else {
    console.log("無效的車站代碼");
}
```

### 7. getAllStations(searchText)

取得所有車站列表，支援搜索功能

```javascript
// 取得所有車站
const allStations = getAllStations();

// 搜索包含"臺北"的車站
const searchResults = getAllStations("臺北");
console.log(searchResults);
// 輸出: [
//   { stationCode: "1000", stationId: "1000", name: "臺北", ... },
//   { stationCode: "1001", stationId: "1001", name: "臺北-環島", ... }
// ]
```

## 📍 主要車站代碼參考

| 代碼 | 站名 | 英文名 | 位置 |
|------|------|--------|------|
| 0900 | 基隆 | Keelung | 北部 |
| 1000 | 臺北 | Taipei | 北部 |
| 1020 | 板橋 | Banqiao | 北部 |
| 1080 | 桃園 | Taoyuan | 北部 |
| 1210 | 新竹 | Hsinchu | 中部 |
| 3300 | 臺中 | Taichung | 中部 |
| 3360 | 彰化 | Changhua | 中部 |
| 4080 | 嘉義 | Chiayi | 南部 |
| 4220 | 臺南 | Tainan | 南部 |
| 4400 | 高雄 | Kaohsiung | 南部 |
| 5000 | 屏東 | Pingtung | 南部 |
| 6000 | 臺東 | Taitung | 東部 |
| 7000 | 花蓮 | Hualien | 東部 |
| 7190 | 宜蘭 | Yilan | 東部 |

## 🚀 在 train-liveboard 中的使用

### 車站選擇下拉菜單

```html
<select id="stationSelect">
    <option value="">-- 選擇車站 --</option>
</select>
```

### JavaScript 代碼示例

```javascript
// 填充車站下拉菜單
function populateStationSelect() {
    const selectElement = document.getElementById('stationSelect');
    const stations = getAllStations();
    
    stations.forEach(station => {
        const option = document.createElement('option');
        option.value = station.stationCode;
        option.textContent = `${station.name} (${station.ename})`;
        selectElement.appendChild(option);
    });
}

// 當選擇車站時
document.getElementById('stationSelect').addEventListener('change', function(e) {
    const stationCode = this.value;
    const stationData = getStationData(stationCode);
    
    if (stationData) {
        console.log(`已選擇: ${stationData.name}`);
        console.log(`StationID: ${stationData.stationId}`);
        console.log(`座標: ${stationData.gps}`);
        // 進行相關操作...
    }
});
```

## 📊 涵蓋的路線

該對照表包含以下台鐵路線的車站：

- ✅ **西部幹線** - 基隆到屏東
- ✅ **東部幹線** - 八堵到花蓮
- ✅ **海線** - 竹南到大甲
- ✅ **北迴線** - 蘇澳到花蓮
- ✅ **南迴線** - 屏東到台東
- ✅ **平溪線**
- ✅ **內灣線**
- ✅ **集集線**
- ✅ **沙崙線**
- ✅ **六家線**
- ✅ **其他支線車站**

## 🔗 GPS 座標使用

GPS 座標格式為 `"緯度 經度"`，可用於：

- 地圖標記
- 距離計算
- 地理資訊系統集成

### 示例

```javascript
const gps = getStationGPS("1000");
const [latitude, longitude] = gps.split(' ').map(parseFloat);
console.log(`緯度: ${latitude}, 經度: ${longitude}`);
```

## ⚠️ 注意事項

1. **向下兼容性**: 新的 `stationDataMap` 與舊的 `stationCodeToIdMap` 共存
2. **編碼格式**: 所有數據為 UTF-8 編碼，支援繁體中文
3. **更新來源**: 資料基於 `車站基本資料集.json`
4. **StationID 映射**: 大部分情況下 StationCode == StationID，但可能有例外

## 📝 開發指南

### 添加新的輔助函數

```javascript
// 例：取得車站所在區域
function getStationRegion(stationCode) {
    const code = parseInt(stationCode);
    if (code < 2000) return "西部幹線";
    if (code < 5000) return "中部地區";
    if (code < 6000) return "南部地區";
    if (code < 7400) return "東部地區";
    return "其他";
}
```

### 性能優化

```javascript
// 建立快速查詢索引（按名稱）
const stationNameIndex = {};
getAllStations().forEach(station => {
    stationNameIndex[station.name] = station.stationCode;
});

// 快速按名稱查詢
function getStationCodeByName(name) {
    return stationNameIndex[name];
}
```

## 🐛 故障排除

### 問題：找不到車站

```javascript
const stationCode = "1000";
if (!isValidStationCode(stationCode)) {
    console.error(`車站代碼 ${stationCode} 無效`);
}
```

### 問題：GPS 座標解析錯誤

```javascript
function parseGPS(gpsString) {
    try {
        const [lat, lon] = gpsString.split(' ').map(parseFloat);
        if (isNaN(lat) || isNaN(lon)) {
            throw new Error('GPS 座標解析失敗');
        }
        return { latitude: lat, longitude: lon };
    } catch (e) {
        console.error('GPS 解析錯誤:', e);
        return null;
    }
}
```

## 📞 相關資源

- TDX API 文件：https://tdx.transportdata.tw/
- 列車看板 HTML：`train-liveboard.html`
- 列車資料轉換器：`assets/train-data-transformer.js`
- 列車看板管理器：`assets/train-liveboard-manager.js`

## ✅ 最後確認清單

- [ ] 已在 HTML 中引入 `station-code-mapping.js`
- [ ] 已驗證車站下拉菜單正確填充
- [ ] 已測試車站搜索功能
- [ ] 已確認 GPS 座標格式正確
- [ ] 已檢查 API 調用中的 StationID 使用

---

**最後更新**: 2025年11月21日  
**檔案版本**: v2.0 (基於車站基本資料集.json)  
**包含車站數**: 389 個
