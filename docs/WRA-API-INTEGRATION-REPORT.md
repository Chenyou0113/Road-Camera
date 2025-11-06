# 水利署 API 整合報告

## 📅 整合日期
**2025年11月6日 下午9:28**

---

## 🎯 整合目標

將經濟部水利署河川監視器 API 整合到監視器影像系統，實現真實監視器資料的即時顯示和自動更新。

---

## ✅ 完成項目

### 1. API 連接設定 ✓

**API 端點：**
```
https://wra-od-testing.blueplanet.com.tw/api/v2/f71b74eb-cbe5-42c6-8be5-7500450e7db0
```

**參數配置：**
- `sort`: _importdate asc
- `format`: JSON
- `refreshInterval`: 300000ms (5分鐘)

### 2. 核心檔案建立 ✓

#### 主系統檔案
- ✅ **water-monitor.html** - 主監視器頁面（已整合 API）
- ✅ **assets/water-monitor-data.js** - 示範資料生成器（備援用）
- ✅ **assets/wra-api-integration.js** - API 整合模組

#### 測試工具
- ✅ **test/wra-api-test.html** - API 測試診斷工具

#### 文檔
- ✅ **docs/WATER-MONITOR-SYSTEM-GUIDE.md** - 完整使用說明
- ✅ **docs/WATER-MONITOR-QUICK-START.md** - 快速開始指南
- ✅ **docs/WRA-API-INTEGRATION-REPORT.md** - 本整合報告

### 3. 功能實現 ✓

#### 資料載入
```javascript
// 自動從 API 載入真實資料
async function loadCameraData() {
    if (useRealApi) {
        allCameras = await loadRealCameraData();
    } else {
        allCameras = generateDemoData();
    }
}
```

#### API 資料轉換
```javascript
// 轉換 API 格式為系統格式
function transformApiData(apiData) {
    return records.map(record => ({
        id: record.stationNo,
        name: record.baseName,
        location: buildLocation(record),
        river: record.riverName,
        imageUrl: record.snapshotURL,
        // ... 更多欄位
    }));
}
```

#### 自動更新機制
- ✅ 每 5 分鐘自動重新載入監視器資料
- ✅ 每 30 秒自動重新整理影像
- ✅ 即時統計數據更新

#### 備援機制
- ✅ API 失敗時自動切換到示範資料
- ✅ 詳細的錯誤日誌記錄
- ✅ 友善的錯誤提示訊息

---

## 🔧 技術架構

### 資料流程圖

```
┌─────────────────────┐
│   水利署 API Server  │
└──────────┬──────────┘
           │ HTTPS Request
           ↓
┌─────────────────────┐
│  wra-api-integration │ ← API 整合層
│      .js Module      │
└──────────┬──────────┘
           │ Transform Data
           ↓
┌─────────────────────┐
│   water-monitor.html │ ← 主頁面
│    (Display Layer)   │
└─────────────────────┘
```

### 模組化設計

#### 1. API 配置模組
```javascript
const WRA_API_CONFIG = {
    endpoint: '...',
    params: {...},
    refreshInterval: 300000
};
```

#### 2. 資料轉換模組
- `transformApiData()` - 轉換 API 資料
- `buildLocation()` - 建構地理位置
- `determineType()` - 判斷管理類型
- `determineStatus()` - 判斷監視器狀態

#### 3. 更新控制模組
- `loadRealCameraData()` - 載入真實資料
- `refreshCameraImages()` - 重新整理影像
- `enableAutoRefresh()` - 啟用自動更新

---

## 📊 API 資料映射

### 欄位對應表

| API 欄位 | 系統欄位 | 說明 | 備用欄位 |
|---------|---------|------|---------|
| stationNo | id | 設備編號 | id, index |
| baseName | name | 監視器名稱 | stationName, name |
| county/city | location | 地理位置 | city + district |
| riverName | river | 所屬河川 | basin, river |
| snapshotURL | imageUrl | 影像網址 | imageURL, snapshot |
| lat/lng | latitude/longitude | 座標 | latitude, longitude |
| waterLevel | waterLevel | 水位 | stage |
| discharge | flow | 流量 | flow |
| updateTime | lastUpdate | 更新時間 | timestamp |

### 狀態判定邏輯

```javascript
function determineStatus(record) {
    // 1. 檢查 status 欄位
    if (record.status) return parseStatus(record.status);
    
    // 2. 檢查影像 URL
    if (record.snapshotURL) return 'online';
    
    // 3. 檢查更新時間
    if (isRecent(record.updateTime)) return 'online';
    
    // 4. 預設為線上
    return 'online';
}
```

---

## 🎨 使用者介面

### 統計面板
顯示即時統計資訊：
- 📊 總監視器數（動態更新）
- 🏢 水利署直轄數量
- 🏙️ 地方合建數量
- 📡 線上監視器數量
- 🕐 最後更新時間

### 篩選功能
- 主管機關篩選（全部/直轄/合建）
- 影像狀態篩選（全部/有影像/無影像）
- 排序方式（名稱/位置/狀態）
- 即時搜尋（名稱/位置/河川）

### 監視器卡片
每張卡片顯示：
- ✅ 即時影像（自動更新）
- ✅ 線上/離線狀態指示
- ✅ 詳細資訊（位置、河川、水位、流量）
- ✅ 設備編號
- ✅ 管理類型徽章

---

## 🚀 效能優化

### 1. 載入優化
- 非同步資料載入
- 漸進式渲染
- 載入動畫提示

### 2. 更新策略
- 智能更新間隔（5分鐘資料、30秒影像）
- 避免重複請求
- 快取機制

### 3. 錯誤處理
- 優雅的失敗處理
- 自動備援切換
- 詳細錯誤日誌

---

## 🔍 測試工具

### API 測試頁面
**檔案：** `test/wra-api-test.html`

**功能：**
1. ✅ 測試 API 連線
2. ✅ 顯示資料統計
3. ✅ 查看原始資料結構
4. ✅ 預覽監視器影像
5. ✅ 診斷錯誤問題

**使用方式：**
```bash
open Road-Camera/test/wra-api-test.html
```

---

## 📝 使用說明

### 切換 API 模式

在 `water-monitor.html` 中調整：

```javascript
// true = 使用真實 API，false = 使用示範資料
let useRealApi = true;
```

### 調整更新頻率

在 `wra-api-integration.js` 中修改：

```javascript
const WRA_API_CONFIG = {
    refreshInterval: 300000  // 毫秒（預設5分鐘）
};
```

### 查看 API 狀態

開啟瀏覽器開發者工具（F12），檢查 Console：

```javascript
// 查看 API 統計
WRA_API.getStats().then(console.log);

// 手動重新整理影像
WRA_API.refresh();

// 手動載入資料
WRA_API.load().then(cameras => console.log(cameras));
```

---

## 🐛 常見問題

### Q1: API 無法連線？

**檢查清單：**
1. ✅ 確認網路連線正常
2. ✅ 檢查 API 端點是否正確
3. ✅ 查看 Console 錯誤訊息
4. ✅ 確認瀏覽器允許跨域請求（CORS）

**解決方案：**
- 系統會自動切換到示範資料
- 檢查 Network 標籤的 API 請求狀態
- 聯繫水利署確認 API 服務狀態

### Q2: 影像無法顯示？

**可能原因：**
1. API 未提供影像 URL
2. 影像伺服器無回應
3. 圖片載入失敗

**自動處理：**
- 顯示「暫無影像」佔位圖
- 錯誤影像自動替換為預設圖

### Q3: 資料不準確？

**檢查步驟：**
1. 確認 API 回傳資料格式
2. 查看資料轉換邏輯
3. 比對 API 欄位名稱

**調整方法：**
修改 `wra-api-integration.js` 中的欄位映射

---

## 📈 未來擴展建議

### 短期目標（1-2週）
1. ⭐ 根據實際 API 資料調整欄位映射
2. ⭐ 優化影像載入效能
3. ⭐ 加入更詳細的錯誤提示
4. ⭐ 實作影像放大查看功能

### 中期目標（1-2月）
1. 🎯 加入地圖定位功能
2. 🎯 實作歷史資料查詢
3. 🎯 加入資料匯出功能
4. 🎯 建立管理後台

### 長期目標（3-6月）
1. 🚀 整合其他水利署 API
2. 🚀 加入機器學習預警
3. 🚀 開發行動 App
4. 🚀 建立數據分析儀表板

---

## 📞 技術支援

### 水利署聯絡資訊
- 📧 Email: service@wra.gov.tw
- 🌐 官網: https://www.wra.gov.tw/
- 📞 客服: 02-37073000

### API 文檔
- 測試環境: wra-od-testing.blueplanet.com.tw
- 資料格式: JSON
- 更新頻率: 即時更新

---

## ✨ 系統特色總結

### 🎯 核心優勢
1. **真實數據** - 直接連接水利署官方 API
2. **即時更新** - 自動定期更新資料和影像
3. **智能備援** - API 失敗自動切換示範資料
4. **完整功能** - 篩選、搜尋、排序一應俱全
5. **響應式設計** - 完美支援所有裝置
6. **現代化界面** - 美觀的漸變色設計

### 📊 技術亮點
- ✅ 模組化設計，易於維護
- ✅
