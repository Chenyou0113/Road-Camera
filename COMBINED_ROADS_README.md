# 公路監視器綜合頁面說明文檔

## 📌 概述

新增了 `combined-roads.html` 頁面，這是一個整合國道、快速公路、省道監視器的統一平台。

## ✨ 主要功能

### 1. **統一監視器查詢**
   - 整合國道、快速公路、省道三種類型的監視器
   - 單一平台查看全國公路監控影像
   - 支持跨類型篩選和搜索

### 2. **智能篩選系統**
   - **道路類型篩選**：國道、快速道路、省道
   - **縣市篩選**：依照監視器所在地區進行篩選
   - **多條件組合**：支持同時應用多個篩選條件
   - **快速重置**：一鍵重置所有篩選條件

### 3. **地圖可視化**
   - 左側顯示監視器地理分布地圖
   - 不同類型的監視器使用不同顏色標記：
     - 🔵 **藍色**：國道監視器
     - 🟦 **深藍**：快速道路監視器
     - 🟩 **青綠**：省道監視器
   - 點擊標記可快速查看該監視器詳細資訊

### 4. **實時統計面板**
   - **監視器總數**：所有監視器計數
   - **國道監視器**：國道監視器計數
   - **快速道路監視器**：快速道路監視器計數
   - **省道監視器**：省道監視器計數
   - 統計數字實時更新（篩選時自動更新）

### 5. **影像查看系統**
   - 3列響應式網格布局
   - 單擊卡片可查看大圖
   - 模態框顯示完整影像和詳細資訊
   - 支持類型標籤快速識別

### 6. **響應式設計**
   - 桌面端（>1400px）：3列布局
   - 平板端（1200-1400px）：2列布局
   - 手機端（<768px）：1列布局
   - 移動設備上地圖/列表自動堆疊

### 7. **深色模式支持**
   - 完整的深色模式樣式支持
   - 一鍵切換亮暗模式
   - 自適應配色方案

## 🔧 技術架構

### 數據源整合
```javascript
// 三個數據源並行載入
const [highways, expressways, provincial] = await Promise.all([
    TDXClient.getHighwayCamera(),
    TDXClient.getExpresswayCamera(),
    TDXClient.getProvincialCamera()
]);
```

### 標記系統
```javascript
// 每個監視器都被標記上類型信息
{
    ...cameraData,
    type: 'highway' | 'expressway' | 'provincial',
    typeName: '國道' | '快速道路' | '省道'
}
```

### 篩選邏輯
```javascript
filteredCameras = allCameras.filter(cam => {
    const typeMatch = !selectedType || cam.type === selectedType;
    const cityMatch = !selectedCity || cam.LocationCityName === selectedCity;
    return typeMatch && cityMatch;
});
```

## 🎨 UI/UX 特性

### 類型標籤顏色
- **國道**：`#1e40af`（深藍）
- **快速道路**：`#0891b2`（淺藍）
- **省道**：`#14b8a6`（青綠）

### 地圖標記
- 使用 Font Awesome 的攝像頭圖標
- 20px × 20px 大小
- 不同類型使用不同背景顏色
- 帶有白色邊框和陰影效果

### 卡片設計
- 白色背景，圓角邊框（10px）
- 懸停時向上移動 5px
- 圖片區域 200px 高度
- 逐漸放大影像效果

## 📊 數據顯示

### 分頁系統
- 每頁顯示 12 個監視器
- 自動計算總頁數
- 上/下一頁按鈕控制
- 當前頁碼實時顯示

### 資訊面板
- 可收摺的說明信息面板
- 點擊標題可切換展開/收摺
- Chevron 圖標指示狀態

## 🔌 集成方式

### 首頁導航
在 `index.html` 的功能卡片網格中添加了新卡片：
```html
<a href="combined-roads.html" class="feature-card">
    <div class="feature-header">
        <div class="feature-icon"><i class="fas fa-road"></i></div>
        <h3 class="feature-title">公路監視器綜合</h3>
        <span class="feature-badge"><i class="fas fa-network-wired"></i> 統一平台</span>
    </div>
    <div class="feature-body">
        <p class="feature-desc">國道、快速公路、省道監視器統一查詢平台，一站式瀏覽全國公路路況。</p>
    </div>
</a>
```

## 🚀 使用方法

### 快速開始
1. 從首頁點擊「公路監視器綜合」卡片
2. 頁面自動載入所有三種類型的監視器
3. 使用篩選條件進行搜索（可選）
4. 點擊卡片查看大圖
5. 在地圖上查看地理分布

### 篩選操作
1. 選擇「道路類型」：國道/快速道路/省道
2. 選擇「縣市」：特定地區
3. 點擊「重置篩選」返回全部視圖

### 地圖互動
1. 滾輪縮放地圖
2. 點擊標記查看監視器信息
3. 拖動地圖移動視野

## 💾 文件清單

| 文件 | 說明 |
|-----|------|
| `combined-roads.html` | 公路監視器綜合頁面（新增） |
| `index.html` | 首頁導航更新 |

## 🔄 依賴文件

該頁面依賴以下資源：
- `assets/config.js` - 配置文件
- `assets/tdx-api.js` - TDX API 客戶端
- `assets/dark-mode.js` - 深色模式控制
- `assets/dark-mode.css` - 深色模式樣式
- `assets/camera-map-manager.js` - 地圖管理器
- `assets/image-handler-simple.js` - 圖像處理
- `assets/responsive-camera.css` - 響應式樣式
- `assets/loading-progress.js` - 載入進度條

## 📱 跨瀏覽器支持

- ✅ Chrome / Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile

## 🎯 特色優勢

1. **一站式查詢**：無需在多個頁面間切換
2. **統一管理**：所有公路監視器集中管理
3. **智能篩選**：快速找到所需監視器
4. **視覺分佈**：地圖直觀展示分布狀況
5. **性能優化**：並行載入數據，提升速度
6. **用戶友好**：直覺的界面設計和操作

## 🔮 未來擴展

可能的功能擴展方向：
- [ ] 實時流媒體支持（RTSP/HLS）
- [ ] 歷史影像回放
- [ ] 收藏和分享功能
- [ ] 警報通知系統
- [ ] 高級搜索和標籤系統
- [ ] 數據導出功能

## 📞 支持

如有問題或建議，請聯繫開發團隊或提交 Issue。

---

**版本**：1.0  
**最後更新**：2025年11月13日  
**狀態**：✅ 正式上線
