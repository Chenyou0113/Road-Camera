# 🚆 台鐵即時看板系統 - 完整實現

## 📍 什麼是台鐵即時看板？

台鐵即時看板是一個全功能的 **台灣鐵路列車實時資訊查詢系統**，使用官方 TDX API 提供最新的列車狀態、延誤信息和詳細統計。

---

## ✨ 核心特性

### 🎯 4 大主要功能

| 功能 | 說明 | 使用方式 |
|------|------|--------|
| **解析並顯示** | HTML 卡片展示每班列車的詳細資訊 | 自動加載和刷新 |
| **自動更新** | 每 2 分鐘從 TRA API 拉取最新資料 | 查詢後自動運行 |
| **進階篩選排序** | 按站點、車型、延誤等多條件篩選 | 點擊按鈕即可 |
| **延誤警示** | 自動檢測異常並實時提醒 | Toast 提示 + 動畫 |

### 🎛️ 詳細功能列表

**篩選系統** (4 種模式)
- 📋 全部 - 顯示所有列車
- ⬇️ 到站 - 只顯示即將到站
- ⬆️ 離站 - 只顯示即將離站
- ⚠️ 延誤 - 只顯示延誤列車

**排序系統** (4 種方式)
- ⏰ 時間順序 - 按預計到站/離站時間
- 🔢 車次排序 - 按車次號碼
- 🚆 車種分類 - 按車種分類
- 📊 延誤排序 - 最晚優先

**實時更新**
- 🔄 自動更新 - 每 2 分鐘刷新
- ⚡ 手動刷新 - 點擊刷新圖示
- 💾 狀態保存 - 保留篩選設定
- 📊 統計面板 - 實時數據統計

**警示系統**
- 🟢 準點 - 正常運行
- 🟡 輕微延誤 - 6-10 分鐘
- 🔴 延誤 - 11-30 分鐘
- 🔴 嚴重延誤 - 30 分鐘以上
- ⚫ 停駛 - 列車停駛

**額外功能**
- 📥 CSV 匯出 - 下載列車資訊
- 🌙 深色模式 - 護眼設計
- 📱 響應式設計 - 支援所有設備
- 🎨 動畫效果 - 流暢的 UI 動畫

---

## 🚀 快速開始

### 3 步開始使用

```
1️⃣  打開 train-liveboard.html
2️⃣  選擇路線和車站
3️⃣  點擊「查詢看板」
```

### 實際例子

```javascript
// 查詢基隆車站
1. 選擇路線: 西部幹線
2. 選擇車站: 基隆 (0900)
3. 按下查詢

結果:
✓ 顯示基隆車站即將到離站的列車
✓ 自動每 2 分鐘更新
✓ 可篩選和排序
```

---

## 📊 技術架構

```
train-liveboard.html (主頁面)
    ↓
├─ 選擇路線/車站 (HTML 下拉選單)
├─ 查詢看板 (按鈕)
├─ 篩選/排序 (4 按鈕 + 下拉選單)
└─ 列車表格 (動態生成)

assets/train-liveboard-manager.js (核心邏輯)
    ↓
├─ filterTrains() - 篩選列車
├─ sortTrains() - 排序列車
├─ getTrainStatus() - 取得狀態
├─ detectAnomalies() - 檢測異常
├─ exportToCSV() - 匯出資料
└─ showNotification() - 顯示提醒

TDX API (交通部資料)
    ↓
└─ /v2/Rail/TRA/LiveBoard - 列車實時資訊
```

---

## 📂 文件清單

### 核心文件

| 文件 | 說明 |
|------|------|
| `train-liveboard.html` | 主要頁面 (改進版) |
| `assets/train-liveboard-manager.js` | ⭐ **新建立** - 核心管理系統 |

### 文檔文件

| 文件 | 說明 |
|------|------|
| `TRAIN_LIVEBOARD_FEATURES.md` | ⭐ **新建立** - 完整功能說明 |
| `TRAIN_LIVEBOARD_QUICK_START.md` | ⭐ **新建立** - 快速入門指南 |
| `TRAIN_LIVEBOARD_IMPLEMENTATION_REPORT.md` | ⭐ **新建立** - 實現報告 |
| `TRAIN_LIVEBOARD_README.md` | 本文件 - 簡明說明 |

---

## 🎨 UI 示例

### 篩選和排序區域

```
┌────────────────────────────────────────────────────────┐
│ [全部] [到站] [離站] [延誤]   [排序 ▼] [匯出]         │
└────────────────────────────────────────────────────────┘
```

### 統計面板

```
┌─────────┬─────────┬─────────┬─────────┐
│ 48 班   │ 12 班   │ 24 班   │ 3 班    │
│ 列車總數 │ 到站    │ 離站    │ 延誤    │
└─────────┴─────────┴─────────┴─────────┘
```

### 列車表格

```
┌──────┬──────────┬────────┬────────┬────────┬────────┬────────┐
│ 車次 │ 車種     │ 方向   │ 終點   │ 到站   │ 離站   │ 狀態   │
├──────┼──────────┼────────┼────────┼────────┼────────┼────────┤
│ 447  │ 自強(3000) │ 北上   │ 樹林   │ 23:56  │ 23:57  │ ✓ 準點 │
│ 3786 │ 區間     │ 南下   │ 臺南   │ 23:51  │ 23:52  │ △ 誤點2分 │
└──────┴──────────┴────────┴────────┴────────┴────────┴────────┘
```

---

## 🔄 數據流程

### 完整流程圖

```
用戶選擇車站
    ↓
點擊「查詢看板」
    ↓
發送 API 請求 (TDX)
    ↓
收到列車資料 JSON
    ↓
保存到 allTrains[]
    ↓
應用當前篩選
    ↓
應用當前排序
    ↓
在表格中顯示
    ↓
啟動 2 分鐘自動更新計時器
    ↓
[每 2 分鐘自動重複]
    ↓
檢測異常並顯示警示
    ↓
更新統計面板
    ↓
刷新更新時間
```

---

## 💻 代碼使用示例

### 篩選延誤列車

```javascript
// 點擊「延誤」按鈕
setFilter('delayed');

// 結果: 表格只顯示 DelayTime > 5 的列車
```

### 按延誤排序

```javascript
// 選擇「延誤排序」
setSort('delay');

// 結果: 最延誤的列車顯示在最上面
```

### 檢測嚴重異常

```javascript
const anomalies = trainLiveboardManager.detectAnomalies(allTrains);

if (anomalies.critical.length > 0) {
  // 有列車延誤 > 30 分鐘
  console.log('嚴重延誤:', anomalies.critical);
}
```

### 匯出資料

```javascript
// 點擊「匯出」按鈕
exportTableData();

// 結果: 下載 CSV 檔案 (train_board_YYYY-MM-DD.csv)
```

---

## 📈 統計分析

### 可用的分析方法

```javascript
// 看板摘要
trainLiveboardManager.generateBoardSummary(trains)
// 返回: { total, ontime, delayed, cancelled, avgDelay }

// 延誤分佈
trainLiveboardManager.analyzeDelayDistribution(trains)
// 返回: { ontime, slight, moderate, heavy, critical, cancelled }

// 系統狀態
trainLiveboardManager.getSystemStatus(trains)
// 返回: { status, text, color } (normal/caution/warning/critical)

// 下一班列車
trainLiveboardManager.getNextTrain(trains)
// 返回: 下一班列車的物件
```

---

## 🔐 API 詳情

### TDX 端點

```
GET /v2/Rail/TRA/LiveBoard?StationID={id}&$format=JSON
```

### 請求示例

```javascript
const endpoint = `/v2/Rail/TRA/LiveBoard?StationID=0900&$format=JSON`;
const trains = await tdxApi.fetch(endpoint);
```

### 響應欄位

```javascript
{
  StationID: "0900",              // 車站代碼
  StationName: { Zh_tw: "基隆" },  // 車站名稱
  TrainNo: "2254",                // 車次
  Direction: 0,                   // 0=南下, 1=北上
  TrainTypeName: { Zh_tw: "區間" }, // 車種名稱
  TrainTypeCode: "6",             // 車種代碼
  EndingStationName: { Zh_tw: "基隆" }, // 終點站
  ScheduledArrivalTime: "23:53:00",    // 預計到站
  ScheduledDepartureTime: "23:53:00",  // 預計離站
  DelayTime: 0,                   // 延誤分鐘數
  RunningStatus: 0,               // 0=準點, 1=誤點, 2=停駛
  UpdateTime: "2025-11-20T23:41:50+08:00" // 更新時間
}
```

---

## 🎯 使用場景

### 場景 1: 旅客查詢
```
「我要從台北去基隆，下一班自強號什麼時候出發？」
1. 選擇「西部幹線」
2. 選擇「台北」車站
3. 查詢看板
4. 篩選「到站」，排序「時間」
5. 查看列車資訊
```

### 場景 2: 運營監控
```
「西部幹線目前有多少班列車延誤？」
1. 選擇「西部幹線」路線
2. 選擇多個重要車站分別查詢
3. 使用「延誤篩選」檢查
4. 匯出 CSV 進行分析
```

### 場景 3: 異常警示
```
「有哪班列車嚴重延誤？」
1. 查詢後自動檢測
2. Toast 提示會彈出
3. 點擊「延誤」篩選
4. 按「延誤排序」查看
```

---

## 🌟 主要優勢

✅ **官方資料** - 直接使用 TDX 交通部 API  
✅ **實時更新** - 自動每 2 分鐘刷新  
✅ **多維度篩選** - 4 種篩選 + 4 種排序  
✅ **智能警示** - 自動檢測和提醒異常  
✅ **數據匯出** - CSV 格式下載分析  
✅ **響應式設計** - 支援所有設備  
✅ **深色模式** - 護眼設計  
✅ **零依賴** - 純 JavaScript 實現  

---

## 📞 常見問題

**Q: 多久更新一次？**  
A: 自動每 2 分鐘更新一次，或點擊刷新圖示立即更新。

**Q: 能看到所有站點嗎？**  
A: 支援台灣鐵路所有路線和車站，包括西部、東部、南迴線等。

**Q: 能否設置提醒？**  
A: 當前顯示 Toast 提示，未來版本將支援提醒設置。

**Q: 可以匯出嗎？**  
A: 可以，點擊「匯出」下載 CSV 檔案。

---

## 📚 完整文檔

| 文檔 | 內容 |
|------|------|
| **TRAIN_LIVEBOARD_FEATURES.md** | 完整功能說明和 API 文檔 |
| **TRAIN_LIVEBOARD_QUICK_START.md** | 5 分鐘快速入門指南 |
| **TRAIN_LIVEBOARD_IMPLEMENTATION_REPORT.md** | 技術實現詳細報告 |

---

## ✅ 功能完成狀態

- [x] 列車資訊展示
- [x] 自動更新機制
- [x] 進階篩選系統
- [x] 多模式排序
- [x] 延誤警示系統
- [x] 異常自動檢測
- [x] 即時更新動畫
- [x] 立即刷新功能
- [x] CSV 資料匯出
- [x] 統計面板
- [x] 深色模式
- [x] 響應式設計
- [x] 完整文檔

---

## 🔗 相關資源

- 🌐 [TDX 交通資料流通平台](https://tdx.transportdata.tw/)
- 🚆 [台灣鐵路官方](https://www.railway.gov.tw/)
- 📖 [API 文檔](https://tdx.transportdata.tw/api-service)

---

**版本**: 1.0  
**完成日期**: 2025-11-20  
**狀態**: ✅ 全部功能完成  
**文件**: 1 個主頁面 + 1 個管理模組 + 3 個完整文檔
