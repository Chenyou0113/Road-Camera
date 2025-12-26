# 🗺️ 地圖顯示診斷指南

## ⚠️ 問題描述
- 地圖未顯示在 highway.html 或 road.html 頁面上

## 🔍 診斷步驟

### 步驟 1️⃣：檢查瀏覽器控制台
1. **打開瀏覽器開發者工具** (按 F12 或 右鍵 → 檢查)
2. **切換到 Console 標籤**
3. **重新加載頁面** (Ctrl+R)
4. **查看是否有以下訊息**

#### ✅ 預期的成功訊息
```
✅ Leaflet 已就位，現在初始化地圖
開始初始化地圖...
✅ Leaflet 已載入，地圖容器存在
地圖容器大小: [寬度] x [高度]
建立新的 CameraMapManager，監視器數量: [數字]
✅ 地圖初始化成功！
```

#### ❌ 常見的問題訊息

**問題 1: Leaflet 未載入**
```
❌ Leaflet 仍未加載，嘗試重新加載...
❌ Leaflet 加載失敗！
```
**原因**: Leaflet CDN 資源未成功下載
**解決**: 檢查網際網路連接，確認 CDN 可訪問

**問題 2: 找不到地圖容器**
```
❌ 找不到地圖容器 #map
```
**原因**: HTML 中缺少 `<div id="map"></div>`
**解決**: 檢查 HTML 結構，確認地圖容器存在

**問題 3: CameraMapManager 初始化失敗**
```
❌ 地圖初始化失敗: [錯誤信息]
錯誤詳情: [詳細信息]
```
**原因**: CameraMapManager.js 有錯誤
**解決**: 檢查檔案內容

### 步驟 2️⃣：檢查 Network 標籤
1. **打開 Network 標籤**
2. **重新加載頁面**
3. **查找以下資源**

| 資源 | 狀態 | 說明 |
|------|------|------|
| leaflet.css | ✅ 200 | Leaflet 樣式表 |
| leaflet.js | ✅ 200 | Leaflet 庫 |
| camera-map-manager.js | ✅ 200 | 地圖管理器 |

❌ **如果任何資源顯示紅色（404 或其他錯誤）**
- 檢查檔案路徑是否正確
- 確認 CDN URL 是否可訪問

### 步驟 3️⃣：檢查地圖容器

在瀏覽器控制台中執行：
```javascript
// 檢查地圖容器是否存在
document.getElementById('map')

// 檢查容器是否有大小
const map = document.getElementById('map');
if (map) {
    console.log('寬度:', map.offsetWidth);
    console.log('高度:', map.offsetHeight);
}

// 檢查 Leaflet 是否已載入
console.log('L 對象:', typeof L);
```

**預期輸出**:
```
<div id="map"></div>
寬度: 1200 (或類似數字)
高度: 500 (或類似數字)
L 對象: object
```

### 步驟 4️⃣：檢查 CameraMapManager

在瀏覽器控制台中執行：
```javascript
// 檢查是否存在地圖管理器
console.log('cameraMapManager:', cameraMapManager);

// 檢查地圖物件
if (cameraMapManager) {
    console.log('地圖實例:', cameraMapManager.getMap());
    console.log('標記數量:', cameraMapManager.getMarkers().length);
}
```

## 🧪 測試頁面

已創建測試頁面用於驗證 Leaflet 是否正常工作：

**檔案**: `test-map.html`

### 測試步驟
1. **在檔案瀏覽器中找到** `test-map.html`
2. **用瀏覽器打開該檔案** (雙擊或右鍵 → 打開方式)
3. **觀察是否有地圖和標記顯示**

**如果 test-map.html 能正常顯示地圖**:
- ✅ 表示 Leaflet 工作正常
- ❌ 表示 highway.html/road.html 的 CameraMapManager 有問題

**如果 test-map.html 無法顯示地圖**:
- ❌ 表示 Leaflet CDN 無法訪問
- 需要檢查網際網路連接或代理設定

## 📊 已進行的修復

### 修復 1：添加 Leaflet 加載檢查
- **位置**: highway.html 和 road.html 的 `loadCameras()` 函數
- **功能**: 等待 Leaflet 完全加載後再初始化地圖
- **延遲**: 500ms + 額外 1000ms 重試

### 修復 2：增強 initializeMap() 函數
- **檢查** Leaflet 是否已加載 (`typeof L !== 'undefined'`)
- **檢查** 地圖容器是否存在 (`document.getElementById('map')`)
- **檢查** 地圖容器是否有尺寸 (`offsetWidth`, `offsetHeight`)
- **詳細** 錯誤報告和日誌

### 修復 3：改進 updateMapMarkers() 函數
- **檢查** cameraMapManager 是否初始化
- **警告** 未初始化情況
- **詳細** 日誌輸出

## 🐛 常見問題排查

### Q: 地圖容器顯示但沒有地圖內容
**A:** 
1. 檢查瀏覽器控制台是否有紅色錯誤
2. 確認 Leaflet.js 已正確載入
3. 檢查地圖容器的 CSS (應該有 500px 高度)

### Q: 頁面載入很慢
**A:**
1. 網際網路速度慢，Leaflet CDN 資源下載耗時
2. TDX API 響應時間長
3. 監視器資料量過大

### Q: 標記沒有顯示但地圖顯示了
**A:**
1. 監視器資料中坐標格式可能不正確
2. 查看控制台是否有警告訊息
3. 檢查坐標是否都是 0 或 null

### Q: 彈窗無法打開
**A:**
1. 檢查是否點擊了標記
2. 查看控制台錯誤信息
3. 確認彈窗內容生成函數正確

## 📞 進一步調試

如果以上步驟都無法解決問題，請提供以下信息：

1. **瀏覽器控制台的完整錯誤訊息**
   - 複製所有紅色錯誤訊息

2. **Network 標籤的資源列表**
   - 拍攝截圖顯示 Leaflet 資源的狀態

3. **頁面源代碼中的 #map 容器**
   ```html
   <div class="map-section">
       <div id="map"></div>
   </div>
   ```

4. **CSS 樣式是否正確**
   ```css
   #map {
       width: 100%;
       height: 500px;
       border-radius: 10px;
   }
   ```

5. **camera-map-manager.js 是否正確加載**

---

**最後更新**: 2025-11-13  
**建議**: 使用 Chrome 或 Edge 瀏覽器進行測試，它們有更好的開發者工具
