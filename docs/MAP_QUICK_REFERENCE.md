# 🗺️ 市區監視器地圖功能 - 快速參考指南

## 概述

市區監視器頁面 (`city.html`) 已添加完整的互動地圖功能，用戶可以以地圖視圖查看監視器位置。

## 快速啟用

### 對用戶
1. 打開 `city.html`
2. 選擇縣市
3. 點擊「🗺️ 地圖檢視」按鈕
4. 地圖加載並顯示所有監視器
5. 點擊標記查看詳情

### 對開發者
1. 所有代碼已集成到 `city.html`
2. 無需額外配置
3. Leaflet.js 已通過 CDN 引入
4. 開箱即用

## 核心組件

```
HTMLElement (地圖容器)
    └─ <div id="mapContainer"></div>
    
HTMLElement (切換按鈕)
    └─ <button id="mapToggleBtn">🗺️ 地圖檢視</button>

JavaScript Global
    ├─ currentMap (Leaflet 實例)
    ├─ cameraMarkers (標記陣列)
    └─ mapViewActive (狀態標誌)

JavaScript Functions
    ├─ initializeMap()
    ├─ updateMapMarkersGlobal()
    ├─ toggleMapView()
    └─ displayCameras() (修改版)

CSS Classes
    ├─ #mapContainer (容器)
    ├─ .map-toggle-btn (按鈕)
    └─ 相關懸停/激活效果
```

## 文件修改位置

| 文件 | 行號 | 修改內容 |
|------|------|--------|
| city.html | 144-148 | CSS 樣式 |
| city.html | 250 | 地圖按鈕 HTML |
| city.html | 269 | 地圖容器 HTML |
| city.html | 572-577 | 全局變數 |
| city.html | 579-591 | initializeMap() |
| city.html | 595-637 | updateMapMarkersGlobal() |
| city.html | 641-673 | toggleMapView() |
| city.html | 919-922 | 按鈕顯示邏輯 |
| city.html | 1815-1823 | displayCameras() 修改 |

## 使用流程圖

```
┌─────────────────┐
│  打開 city.html │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│  顯示縣市選擇介面    │
│ (地圖按鈕隱藏)      │
└────────┬─────────────┘
         │
    用戶選擇縣市
         │
         ▼
┌──────────────────────┐
│  加載監視器列表      │
│ (地圖按鈕顯示)      │
└────────┬─────────────┘
         │
    用戶點擊地圖按鈕
         │
         ▼
┌──────────────────────┐
│  初始化 Leaflet 地圖 │
│  加載 OSM 圖層      │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  添加監視器標記      │
│  自動調整視野        │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  地圖交互            │
│ • 點擊標記→彈窗     │
│ • 拖動→平移         │
│ • 滾輪→縮放         │
│ • 篩選→標記更新     │
└────────┬─────────────┘
         │
    用戶返回列表
         │
         ▼
┌──────────────────────┐
│  隱藏地圖，顯示列表  │
└──────────────────────┘
```

## API 參考

### 全局函數

#### `initializeMap()`
初始化 Leaflet 地圖實例
```javascript
initializeMap();
// 創建地圖，設置中心點台灣 (23.97, 120.96)，縮放級別 8
```

#### `updateMapMarkersGlobal(camerasToDisplay)`
更新地圖上的標記
```javascript
updateMapMarkersGlobal(allCameras);
// 清除舊標記，添加新標記，調整視野
```

#### `toggleMapView()`
切換地圖/列表視圖
```javascript
window.toggleMapView();
// 切換 mapViewActive 狀態，更新 UI
```

#### `displayCameras(cameras)`
顯示監視器列表或地圖
```javascript
displayCameras(filteredCameras);
// 如果 mapViewActive=true，更新地圖；否則顯示列表
```

### 全局變數

```javascript
let currentMap = null;      // Leaflet 地圖實例
let cameraMarkers = [];     // 標記陣列
let mapViewActive = false;  // 地圖視圖激活狀態
```

### CSS 類

```css
#mapContainer           /* 地圖容器 */
#mapContainer.active    /* 地圖可見 */
.map-toggle-btn         /* 按鈕樣式 */
.map-toggle-btn:hover   /* 懸停效果 */
.map-toggle-btn.active  /* 激活狀態 */
```

## 標記顏色編碼

| 顏色 | 來源 | 十六進制 | RGB |
|------|------|--------|-----|
| 🔵 藍色 | TDX | #1e40af | (30, 64, 175) |
| 🟠 橙色 | 其他 | #FF9800 | (255, 152, 0) |

## 按鈕狀態

| 狀態 | 顏色 | 含義 |
|------|------|------|
| 🔵 青色 | #0891b2 | 列表視圖激活，點擊切換到地圖 |
| 🟠 橙色 | #FF9800 | 地圖視圖激活，點擊返回列表 |
| ⚪ 隱藏 | none | 未加載監視器 |

## 地圖配置

| 配置項 | 值 |
|--------|-----|
| 初始中心點 | (23.97, 120.96) - 台灣中心 |
| 初始縮放級別 | 8 |
| 最大縮放級別 | 19 |
| 最小縮放級別 | 1 |
| 圖層來源 | OpenStreetMap |
| 標記類型 | Leaflet.circleMarker |
| 標記半徑 | 6 pixels |

## 標記配置

| 配置項 | 值 |
|--------|-----|
| 半徑 | 6 px |
| 邊框寬度 | 2 px |
| 邊框顏色 | #ffffff |
| 不透明度 | 1 |
| 填充不透明度 | 0.7 |

## 容器配置

| 配置項 | 值 |
|--------|-----|
| 寬度 | 100% |
| 高度 | 600 px |
| 邊距 | 20 px |
| 邊框半徑 | 10 px |
| 框陰影 | 0 5px 15px rgba(0,0,0,0.2) |

## 彈窗內容

標記彈窗顯示以下信息：
```
┌─────────────────────────┐
│ 🛣️ 監視器名稱/路名      │
├─────────────────────────┤
│ 📍 位置描述             │
│ 🏢 縣市 / 鄉鎮區        │
│ 📌 經度, 緯度           │
└─────────────────────────┘
```

## 性能指標

| 操作 | 預期時間 |
|------|---------|
| 地圖初始化 | < 1 秒 |
| 加載 50 個標記 | < 500 ms |
| 加載 500 個標記 | < 2 秒 |
| 篩選後更新 | < 1 秒 |
| 視野調整 | < 200 ms |

## 瀏覽器支持

| 瀏覽器 | 支持 | 備註 |
|--------|------|------|
| Chrome | ✅ | 完全支持 |
| Firefox | ✅ | 完全支持 |
| Safari | ✅ | 完全支持 |
| Edge | ✅ | 完全支持 |
| IE 11 | ⚠️ | 部分支持 |

## 常見操作

### 查看特定縣市的監視器
```javascript
1. 點擊縣市按鈕
2. 點擊「🗺️ 地圖檢視」
3. 地圖自動調整以顯示該縣市的監視器
```

### 搜索特定路段
```javascript
1. 在搜尋框輸入路名
2. 列表自動篩選
3. 若在地圖視圖，標記自動更新
```

### 查看監視器詳情
```javascript
1. 在地圖上點擊標記
2. 彈窗顯示詳細信息
3. 點擊關閉或點擊地圖其他位置關閉
```

### 返回列表視圖
```javascript
1. 點擊「🗺️ 地圖檢視」按鈕（現為橙色）
2. 地圖隱藏，列表重新出現
3. 分頁控制重新顯示
```

## 開發工具

### 控制台日誌

在瀏覽器控制台（F12）可以看到：

```
✅ 地圖已初始化
✅ 已在地圖上標記 50 個監視器
```

### 調試變數

在控制台輸入以下命令檢查狀態：

```javascript
// 檢查地圖實例
console.log(currentMap);

// 檢查標記陣列
console.log(cameraMarkers);

// 檢查視圖狀態
console.log(mapViewActive);

// 檢查所有監視器
console.log(allCameras);

// 檢查篩選結果
console.log(filteredCameras);
```

## 故障排查

### 地圖不顯示
```javascript
// 檢查 Leaflet 庫是否加載
console.log(L);

// 檢查地圖容器是否存在
console.log(document.getElementById('mapContainer'));

// 檢查是否初始化
console.log(currentMap);
```

### 標記不顯示
```javascript
// 檢查標記數組
console.log(cameraMarkers.length);

// 檢查監視器坐標
console.log(allCameras[0].PositionLat, allCameras[0].PositionLon);
```

### 按鈕不出現
```javascript
// 檢查監視器是否加載
console.log(allCameras.length);

// 檢查按鈕元素
console.log(document.getElementById('mapToggleBtn'));
```

## 擴展建議

### 短期
- [ ] 添加縮放控制按鈕
- [ ] 實現熱力圖
- [ ] 彈窗中添加監視器縮圖

### 中期
- [ ] Marker Cluster（聚類）
- [ ] 自訂地圖樣式
- [ ] 導出地圖功能

### 長期
- [ ] 深色模式支持
- [ ] WebSocket 實時更新
- [ ] 路線規劃集成
- [ ] 實時影像預覽

## 相關文檔

- `MAP_FEATURE_CITY.md` - 詳細功能說明
- `MAP_TEST_CHECKLIST.md` - 測試檢查清單
- `MAP_IMPLEMENTATION_SUMMARY.md` - 實現總結
- `MAP_VERIFICATION_REPORT.md` - 驗證報告

## 技術棧

- **前端框架**: 原生 JavaScript (無框架)
- **地圖庫**: Leaflet.js v1.9.4
- **地圖來源**: OpenStreetMap
- **圖標庫**: Font Awesome
- **CSS**: 原生 CSS3

## 版本信息

- **功能版本**: 1.0.0
- **上線日期**: 2025年11月21日
- **狀態**: ✅ 生產就緒
- **相容性**: Chrome, Firefox, Safari, Edge

---

**最後更新**: 2025年11月21日
**快速參考版本**: 1.0
