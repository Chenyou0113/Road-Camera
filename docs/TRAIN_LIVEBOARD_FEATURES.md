# 台鐵即時看板系統 - 完整功能說明

## 📋 功能概覽

`train-liveboard.html` 現已實現完整的台灣鐵路即時列車資訊查詢系統，包括實時更新、進階篩選、排序、異常警示等功能。

---

## 🎯 核心功能

### 1. ✅ 列車資訊展示
- **即時資料來源**: 交通部 TDX API (StationLiveBoard)
- **更新頻率**: 自動每 2 分鐘更新一次
- **顯示範圍**: 前後 30 分鐘內的列車資訊
- **列車欄位**:
  - 車次號碼
  - 車種分類（自強/普悠瑪/區間/區間快等）
  - 行駛方向（南下/北上）
  - 終點站
  - 預計到站時間
  - 預計離站時間
  - 狀態（準點/誤點/早到/停駛）

### 2. ✅ 進階篩選系統

#### 篩選模式 (4種)

| 篩選類型 | 功能 | 圖示 |
|---------|------|------|
| **全部** | 顯示所有列車 | `<i class="fas fa-list"></i>` |
| **到站** | 只顯示即將到站的列車 | `<i class="fas fa-arrow-down"></i>` |
| **離站** | 只顯示即將離站的列車 | `<i class="fas fa-arrow-up"></i>` |
| **延誤** | 只顯示延誤 > 5 分鐘的列車 | `<i class="fas fa-exclamation-triangle"></i>` |

**使用方式**:
```javascript
// 按鈕式篩選 (HTML 中已集成)
<button class="filter-btn" data-filter="delayed" onclick="setFilter('delayed')">
    <i class="fas fa-exclamation-triangle"></i> 延誤
</button>

// JavaScript 方式
setFilter('delayed');  // 篩選延誤列車
setFilter('arrival');  // 篩選到站列車
```

### 3. ✅ 排序系統

#### 排序模式 (4種)

| 排序類型 | 排序依據 | 使用場景 |
|---------|--------|--------|
| **時間順序** | 依預計到站/離站時間 | 默認排序，適合規劃乘車 |
| **車次排序** | 依車次號碼從小到大 | 按車次查詢 |
| **車種分類** | 依車種代碼分類 | 找特定類型列車 |
| **延誤排序** | 依延誤分鐘數（最晚優先） | 快速找出最晚的列車 |

**使用方式**:
```javascript
setSort('time');     // 時間順序
setSort('trainNo');  // 車次排序
setSort('type');     // 車種分類
setSort('delay');    // 延誤排序
```

### 4. ✅ 自動更新機制

```javascript
// 自動更新配置
- 初次查詢後自動啟動
- 每 2 分鐘自動拉取最新資料
- 列車資訊動畫刷新效果
- 保持篩選和排序狀態
```

**事件流程**:
```
查詢看板
    ↓
首次載入 TRA API
    ↓
啟動 120 秒計時器
    ↓
自動重新載入
    ↓
保留目前篩選/排序設定
    ↓
刷新列車表格
```

### 5. ✅ 延誤警示系統

#### 狀態分類

```javascript
{
  text: '準點',
  class: 'ontime',
  icon: 'fas fa-check',
  severity: 0  // 無警示
}

{
  text: '誤點 10分',
  class: 'delayed',
  icon: 'fas fa-exclamation-triangle',
  severity: 2  // 中度警示（6-20分）
}

{
  text: '誤點 35分',
  class: 'delayed',
  icon: 'fas fa-exclamation-triangle',
  severity: 5  // 嚴重警示（>30分）
}

{
  text: '停駛',
  class: 'delayed',
  icon: 'fas fa-ban',
  severity: 5  // 最高警示
}
```

#### 異常檢測

```javascript
// 自動檢測 3 種異常情況
{
  delayed: [],    // 誤點 > 15分
  cancelled: [],  // 停駛列車
  critical: []    // 誤點 > 30分（嚴重）
}

// 觸發條件
- 誤點 > 15分: 警告級別
- 誤點 > 30分: 嚴重級別
- 狀態停駛: 最高級別
```

### 6. ✅ 即時更新動畫

```css
/* 新增列車行動畫 */
@keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

/* 刷新旋轉動畫 */
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* 脈衝效果（警示） */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}
```

### 7. ✅ 立即刷新功能

```javascript
// 點擊刷新圖示立即更新
function quickRefresh() {
    const icon = document.getElementById('refreshIcon');
    icon.style.animation = 'spin 1s linear';
    loadLiveboard();  // 立即重新載入
}
```

**HTML 按鈕**:
```html
<i class="fas fa-sync-alt" id="refreshIcon" onclick="quickRefresh()" title="立即刷新"></i>
```

### 8. ✅ 資料匯出功能

```javascript
// 匯出為 CSV 格式
exportTableData()

// 輸出格式:
// 車次,車種,方向,終點站,預計到站,預計離站,延誤(分),狀態
// 447,自強(3000),北上,樹林,23:56,23:57,0,準點
// 3786,區間,南下,臺南,23:51,23:52,2,誤點 2分
```

---

## 🛠️ TrainLiveboardManager 類別

### 主要方法

#### 篩選方法
```javascript
// 篩選列車資料
trainLiveboardManager.filterTrains(trains, mode)
// mode: 'all' | 'arrival' | 'departure' | 'delayed'
```

#### 排序方法
```javascript
// 排序列車資料
trainLiveboardManager.sortTrains(trains, mode)
// mode: 'time' | 'trainNo' | 'type' | 'delay'
```

#### 狀態檢測
```javascript
// 取得單班列車狀態
trainLiveboardManager.getTrainStatus(train)
// 返回: { text, class, icon, severity }

// 檢測全部異常列車
trainLiveboardManager.detectAnomalies(trains)
// 返回: { delayed, cancelled, critical }

// 取得系統整體狀態
trainLiveboardManager.getSystemStatus(trains)
// 返回: { status, text, color }
```

#### 分析方法
```javascript
// 生成看板摘要
trainLiveboardManager.generateBoardSummary(trains)
// 返回: { total, ontime, delayed, cancelled, avgDelay }

// 統計延誤分佈
trainLiveboardManager.analyzeDelayDistribution(trains)
// 返回: { ontime, slight, moderate, heavy, critical, cancelled }

// 計算列車進度
trainLiveboardManager.calculateTrainProgress(train)
// 返回: 0-100 進度百分比 或 { status, minutesUntil }

// 取得下一班列車
trainLiveboardManager.getNextTrain(trains)
// 返回: train object
```

#### 通知方法
```javascript
// 要求通知權限
trainLiveboardManager.requestNotificationPermission()

// 顯示通知
trainLiveboardManager.showNotification(title, options)

// 顯示 Toast 提示
trainLiveboardManager.showToast(title, message)

// 播放通知聲音
trainLiveboardManager.playNotificationSound(type)
// type: 'normal' | 'delayed' | 'critical'
```

#### 匯出方法
```javascript
// 匯出為 CSV
trainLiveboardManager.exportToCSV(trains)
```

---

## 📊 統計面板

實時顯示以下統計數據：

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 列車總數      │ 即將到站      │ 即將離站      │ 延誤列車      │
│ (Total)      │ (Arrival)    │ (Departure)  │ (Delayed)    │
├──────────────┼──────────────┼──────────────┼──────────────┤
│     48       │      12      │      24      │      3       │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 🎨 UI 設計要素

### 車種標籤顏色

| 車種 | 代碼 | 顏色 | 圖示 |
|------|------|------|------|
| 自強(3000) | 110G | 🔴 紅色 | ⚡ |
| 普悠瑪 | 1107 | 🟠 橙色 | 🚀 |
| 莒光 | 1111 | 🟠 橙色 | 🚆 |
| 區間 | 1131 | 🔵 青藍 | ⭕ |
| 區間快 | 1132 | 🔴 紅色 | ⭕⭕ |

### 狀態標籤顏色

| 狀態 | 顏色 | 延誤分鐘 |
|------|------|----------|
| 準點 | 🟢 綠色 | 0-5分 |
| 早到 | 🔵 藍色 | -2以下 |
| 輕微延誤 | 🟡 黃色 | 6-10分 |
| 延誤 | 🔴 紅色 | > 5分 |
| 嚴重延誤 | 🔴 深紅 | > 30分 |
| 停駛 | ⚫ 黑色 | 不適用 |

---

## 🔄 自動更新流程圖

```
頁面載入
    ↓
選擇路線與車站
    ↓
點擊「查詢看板」
    ↓
發送 API 請求到 TDX
    ↓
收到列車資料
    ↓
保存至 allTrains[]
    ↓
應用篩選和排序
    ↓
顯示在表格中
    ↓
啟動 120 秒自動更新計時器
    ↓
[每 2 分鐘重複一次]
    ↓
檢測異常並顯示警示
    ↓
更新統計面板
    ↓
刷新顯示時間
```

---

## 🚀 使用範例

### 範例 1: 查詢基隆車站

```javascript
// 1. 選擇路線
document.getElementById('lineSelect').value = 'all';
onLineChange();

// 2. 選擇車站
document.getElementById('stationSelect').value = '0900'; // 基隆

// 3. 查詢
queryLiveboard();

// 結果: 自動載入基隆車站即時看板
//      每 2 分鐘自動更新
```

### 範例 2: 快速篩選延誤列車

```javascript
// 點擊「延誤」按鈕或調用
setFilter('delayed');

// 結果: 表格只顯示延誤 > 5 分鐘的列車
//      可繼續按「延誤排序」以最晚優先排列
```

### 範例 3: 檢測嚴重異常

```javascript
const trains = allTrains;
const anomalies = trainLiveboardManager.detectAnomalies(trains);

console.log('延誤列車:', anomalies.delayed.length);  // 誤點 > 15分
console.log('停駛列車:', anomalies.cancelled.length); // 停駛
console.log('嚴重延誤:', anomalies.critical.length);  // 誤點 > 30分

if (anomalies.critical.length > 0) {
    trainLiveboardManager.showToast(
        '⚠️ 嚴重警示',
        `有 ${anomalies.critical.length} 班列車嚴重延誤！`
    );
}
```

### 範例 4: 分析延誤統計

```javascript
const distribution = trainLiveboardManager.analyzeDelayDistribution(allTrains);

console.log('準點:', distribution.ontime);      // 0-5分
console.log('輕微延誤:', distribution.slight);   // 6-10分
console.log('中度延誤:', distribution.moderate); // 11-20分
console.log('嚴重延誤:', distribution.heavy);    // 21-30分
console.log('極端延誤:', distribution.critical); // 30分+
console.log('停駛:', distribution.cancelled);   // 停駛
```

---

## ⚙️ 配置選項

### 全域設定

```javascript
// 訪問全域管理器實例
trainLiveboardManager

// 配置自動更新
trainLiveboardManager.autoRefreshEnabled = true;
trainLiveboardManager.setupAutoRefresh(loadLiveboard, 120000);

// 配置通知
trainLiveboardManager.notificationEnabled = true;
trainLiveboardManager.soundNotificationEnabled = false;

// 要求瀏覽器通知權限
trainLiveboardManager.requestNotificationPermission();
```

---

## 📱 響應式設計

**支援螢幕尺寸**:
- 📱 手機 (≤ 480px)
- 📱 平板 (≤ 768px)
- 💻 桌面 (> 768px)

**響應式特性**:
- 篩選按鈕自動換行
- 表格字體自動調整
- 統計面板 2-1 欄顯示
- 深色模式支援

---

## 🔐 API 安全性

### TDX API 認證
```javascript
// 使用 tdxApi 模組進行認證
// 在 assets/tdx-api.js 中配置

const endpoint = `/v2/Rail/TRA/LiveBoard?StationID=${stationId}&$format=JSON`;
const response = await tdxApi.fetch(endpoint);
```

### Rate Limiting
- API 調用頻率: 2 分鐘 1 次
- 符合 TDX API 調用限制
- 自動重試機制

---

## 🐛 除錯模式

### 瀏覽器控制台日誌

```javascript
// 啟用詳細日誌
console.log('✅ API回應:', response);
console.log('📊 取得 N 班列車資訊');
console.log('🔄 自動更新台鐵看板...');

// 查看異常檢測
const anomalies = trainLiveboardManager.detectAnomalies(allTrains);
console.log('異常列車:', anomalies);

// 查看系統狀態
const status = trainLiveboardManager.getSystemStatus(allTrains);
console.log('系統狀態:', status);
```

---

## 📋 文件結構

```
Road-Camera/
├── train-liveboard.html              # 主頁面
├── assets/
│   ├── train-liveboard-manager.js    # ← NEW 管理系統
│   ├── tdx-api.js                    # TDX API 驅動
│   ├── train-line-classification.js  # 路線分類
│   └── train-data-transformer.js     # 資料轉換
└── TRAIN_LIVEBOARD_FEATURES.md       # 本文件
```

---

## 🎯 功能完成清單

- [x] 列車資訊即時展示
- [x] 自動每 2 分鐘更新
- [x] 進階篩選系統 (4種模式)
- [x] 多模式排序 (4種方式)
- [x] 延誤警示系統
- [x] 異常自動檢測
- [x] 即時更新動畫
- [x] 立即刷新功能
- [x] CSV 資料匯出
- [x] 深色模式支援
- [x] 響應式設計
- [x] 瀏覽器通知整合
- [x] 音效通知系統
- [x] 統計面板
- [x] 下一班列車預告

---

## 🌟 推薦使用場景

1. **旅客查詢**: 快速查看列車狀態和延誤資訊
2. **運營監控**: 監控全線延誤情況
3. **應急響應**: 快速檢測和通知嚴重異常
4. **資料分析**: 導出資料進行延誤統計分析
5. **實時看板**: 車站大螢幕顯示實時到離站資訊

---

## 📞 技術支援

### 常見問題

**Q: 為什麼看板不自動更新？**  
A: 確認已點擊「查詢看板」按鈕，自動更新會在查詢後啟動。

**Q: 如何手動立即刷新？**  
A: 點擊更新時間旁的刷新圖示（同步符號）。

**Q: 為什麼有些列車沒有顯示？**  
A: 已離站或超過 30 分鐘範圍的列車會自動隱藏。

**Q: 如何只看延誤列車？**  
A: 點擊篩選按鈕中的「延誤」選項。

**Q: 可以匯出資料嗎？**  
A: 可以，點擊「匯出」按鈕下載 CSV 檔案。

---

**版本**: 1.0  
**最後更新**: 2025-11-20  
**狀態**: ✅ 完全功能
