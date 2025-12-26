# 監視器地圖定位功能 - 實現指南

## 🎯 已完成的頁面

✅ **highway.html** （國道監視器）
✅ **road.html** （省道監視器）

## 📋 實現內容

每個頁面都添加了以下功能：

### 1. **Leaflet 地圖集成**
   - 引入 Leaflet CSS: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
   - 引入 Leaflet JS: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
   - 引入地圖管理器: `assets/camera-map-manager.js`

### 2. **地圖容器和樣式**
   ```html
   <div class="map-section">
       <h3><i class="fas fa-map"></i> 監視器地理分佈圖</h3>
       <div id="map"></div>
       <p>💡 提示：點擊地圖上的標記可查看監視器詳細資訊和坐標位置</p>
   </div>
   ```

### 3. **CSS 樣式**
   ```css
   #map {
       width: 100%;
       height: 500px;
       border-radius: 10px;
       box-shadow: 0 5px 15px rgba(0,0,0,0.1);
       margin: 20px 0;
       z-index: 1;
   }

   .map-section {
       background: white;
       padding: 20px;
       border-radius: 10px;
       margin: 20px 0;
       box-shadow: 0 2px 10px rgba(0,0,0,0.1);
   }

   .map-section h3 {
       color: #1e40af;
       margin-bottom: 15px;
       display: flex;
       align-items: center;
       gap: 10px;
   }
   ```

### 4. **JavaScript 初始化**
   ```javascript
   // 全局變數
   let cameraMapManager = null;

   // 初始化地圖
   function initializeMap() {
       if (cameraMapManager) {
           cameraMapManager.destroy();
       }
       
       cameraMapManager = new CameraMapManager('map', allCameras, {
           center: [23.5, 121],
           zoom: 7,
           onMarkerClick: (camera) => {
               console.log('點擊監視器:', camera);
           }
       });
   }

   // 更新地圖標記
   function updateMapMarkers() {
       if (cameraMapManager) {
           cameraMapManager.updateMarkers(filteredCameras);
       }
   }
   ```

### 5. **與頁面功能集成**
   - 在初始載入完成後調用 `initializeMap()`
   - 在應用篩選時調用 `updateMapMarkers()` 更新地圖標記

## 🗺️ CameraMapManager 功能

### 核心方法

| 方法 | 功能 |
|------|------|
| `constructor(mapId, cameras, options)` | 初始化地圖 |
| `addMarkers(cameras)` | 添加標記 |
| `updateMarkers(cameras)` | 更新標記 |
| `clearMarkers()` | 清除所有標記 |
| `filterByCity(city)` | 按城市篩選 |
| `filterByRoad(road)` | 按道路篩選 |
| `highlightMarker(index)` | 高亮特定標記 |
| `fitMarkersInView()` | 自動調整視圖 |
| `destroy()` | 銷毀地圖 |

### 彈窗信息

每個標記點擊時顯示：
- 📍 監視器名稱
- 🏘️ 縣市名稱
- 🏢 行政區
- 🧭 **經緯度坐標**（主要功能）
- 📊 其他相關信息

## 🎨 標記樣式

- **默認顏色**: 藍色（#1e40af）
- **高亮顏色**: 橙色（#ff9800）
- **默認大小**: 8px 半徑
- **高亮大小**: 12px 半徑

## 📱 使用示例

### 基本使用
```javascript
// 1. 創建地圖
const manager = new CameraMapManager('map', cameras);

// 2. 篩選和更新
manager.filterByCity('台北市');

// 3. 高亮標記
manager.highlightMarker(0);
```

### 高級配置
```javascript
const manager = new CameraMapManager('map', cameras, {
    center: [25.0, 120.5],  // 自定義中心
    zoom: 8,                 // 自定義縮放級別
    onMarkerClick: (camera) => {
        // 自定義點擊處理
        showCameraDetail(camera);
    }
});
```

## 🚀 適用於以下頁面

### 已完成
- ✅ highway.html - 國道監視器
- ✅ road.html - 省道監視器

### 待完成（使用同樣方式）
- ⏳ expressway.html - 快速道路監視器
- ⏳ city.html - 市區道路監視器
- ⏳ air-quality-cctv.html - 空品測站影像

## 💾 新增檔案

- `assets/camera-map-manager.js` - 地圖管理器類
  - 390+ 行
  - 支援所有監視器類型
  - 自動坐標提取和標記化

## ⚙️ 坐標欄位適配

管理器自動支援不同檔案格式的坐標欄位：

| 格式 | 緯度 | 經度 |
|------|------|------|
| TDX | PositionLat | PositionLon |
| 通用 | lat | lng |
| 備選 | latitude | longitude |

## 🔧 如何為其他頁面添加

1. **添加 Leaflet 資源**
   ```html
   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
   <script src="assets/camera-map-manager.js"></script>
   ```

2. **添加 HTML 容器**
   ```html
   <div class="map-section">
       <h3><i class="fas fa-map"></i> 監視器地理分佈圖</h3>
       <div id="map"></div>
   </div>
   ```

3. **添加 CSS 樣式** (複製上述 CSS 代碼)

4. **添加 JavaScript 代碼**
   ```javascript
   let cameraMapManager = null;
   
   function initializeMap() {
       cameraMapManager = new CameraMapManager('map', allCameras);
   }
   
   function updateMapMarkers() {
       if (cameraMapManager) {
           cameraMapManager.updateMarkers(filteredCameras);
       }
   }
   ```

5. **集成到頁面流程**
   - 在數據載入完成後調用 `initializeMap()`
   - 在應用篩選時調用 `updateMapMarkers()`

## 📊 技術特性

✨ **特色功能**
- 自動坐標解析
- 實時標記更新
- 聚焦和高亮功能
- 響應式設計
- 中文界面
- 經緯度精確到 6 位小數

🎯 **使用者體驗**
- 直觀的地圖界面
- 詳細的彈窗信息
- 點擊標記即可查看坐標
- 拖拖縮放地圖
- 全屏響應式適配

## 🔗 相關檔案

- `assets/camera-map-manager.js` - 核心地圖管理器
- `highway.html` - 國道實現示例
- `road.html` - 省道實現示例
- `water-cctv.html` - 水利監視器參考

---

**更新日期**: 2025-11-13
**版本**: 1.0
**狀態**: 核心功能完成，待擴展到其他頁面
