# 台鐵列車資料轉換工具 - API 快速參考

## 🚀 快速開始

```javascript
// ✅ 工具已自動載入 train-liveboard.html
// 其他頁面需手動引入：
// <script src="assets/train-data-transformer.js"></script>

// 可直接使用全域物件
TrainDataTransformer.formatTime("14:30:45");  // "14:30"
```

---

## 📚 完整方法列表

### 🕐 時間處理

```javascript
// HH:MM:SS → HH:MM
formatTime(timeStr)                    // "14:30:45" → "14:30"

// ISO 8601 → HH:MM:SS
parseUpdateTime(isoString)             // "2025-11-02T14:30:45+08:00" → "14:30:45"
```

### 📊 狀態判斷

```javascript
// 計算延誤狀態
getDelayStatus(delayMinutes)
// 返回: { status, cssClass, icon, color }
// 例: { status: "延誤 5 分", cssClass: "delayed", icon: "hourglass-end", color: "#e74c3c" }

// 解析方向
getDirectionInfo(direction)            // 0=南下, 1=北上
// 返回: { text, icon, color }

// 分類車種
getTrainTypeInfo(typeCode)             // "1"=自強號, "6"=區間 etc.
// 返回: { name, badge, color }
```

### 📈 統計計算

```javascript
// 計算統計資訊
calculateStats(trains)
// 返回: { total, arrival, departure, delayed }
```

### 📋 資料轉換

```javascript
// 生成單一表格行
createTrainRow(train)                  // 返回 <tr>...</tr> HTML

// 生成多行表格
createTrainRows(trains)                // 返回多個 <tr> 連接

// 驗證資料
validateTrains(trains)                 // 返回 { valid, invalid }
```

### 🔍 篩選與分類

```javascript
// 篩選最近 N 分鐘列車
filterRecentTrains(trains, minutes)    // 預設 30 分鐘

// 篩選延誤列車
filterDelayedTrains(trains)

// 按方向分類
groupByDirection(trains)               // { northbound, southbound }

// 按車種分類
groupByTrainType(trains)               // { '1': [...], '6': [...] }
```

### 🔄 排序

```javascript
// 排序列車
sortTrains(trains, sortBy)
// sortBy: 'time' | 'delay' | 'trainNo'
```

### 💾 導出

```javascript
// 轉換為 CSV
exportToCSV(trains)                    // 返回 CSV 字串

// 下載 CSV 檔案
downloadCSV(trains, filename)
```

---

## 💻 常見用法

### 用法 1: 格式化時間顯示

```javascript
const arrival = TrainDataTransformer.formatTime("14:30:45");
const updated = TrainDataTransformer.parseUpdateTime("2025-11-02T14:30:45+08:00");

console.log(`到站: ${arrival}, 更新: ${updated}`);
// 輸出: 到站: 14:30, 更新: 14:30:45
```

### 用法 2: 判斷並顯示延誤狀態

```javascript
const status = TrainDataTransformer.getDelayStatus(train.DelayTime);

// 顯示徽章
const badge = `
  <span class="status-badge ${status.cssClass}">
    <i class="fas fa-${status.icon}"></i>
    ${status.status}
  </span>
`;
```

### 用法 3: 生成表格

```javascript
// 篩選 + 排序 + 生成 HTML
const recent = TrainDataTransformer.filterRecentTrains(trains, 30);
const sorted = TrainDataTransformer.sortTrains(recent, 'time');
const html = TrainDataTransformer.createTrainRows(sorted);

document.getElementById('tableBody').innerHTML = html;
```

### 用法 4: 統計分析

```javascript
const stats = TrainDataTransformer.calculateStats(trains);

document.getElementById('totalCount').textContent = stats.total;
document.getElementById('delayedCount').textContent = stats.delayed;
document.getElementById('arrivalCount').textContent = stats.arrival;
```

### 用法 5: 方向分類

```javascript
const { northbound, southbound } = TrainDataTransformer.groupByDirection(trains);

console.log(`北上: ${northbound.length} 班, 南下: ${southbound.length} 班`);
```

### 用法 6: 延誤監控

```javascript
const delayed = TrainDataTransformer.filterDelayedTrains(trains);

if (delayed.length > 0) {
    delayed.forEach(train => {
        console.warn(`🚨 ${train.TrainNo} 號延誤 ${train.DelayTime} 分`);
    });
}
```

### 用法 7: 資料驗證

```javascript
const { valid, invalid } = TrainDataTransformer.validateTrains(trains);

console.log(`有效: ${valid.length}, 無效: ${invalid.length}`);

// 只使用有效資料
const rows = TrainDataTransformer.createTrainRows(valid);
```

### 用法 8: 資料匯出

```javascript
// 方式 1: 直接下載
TrainDataTransformer.downloadCSV(trains, 'trains_2025-11-02.csv');

// 方式 2: 取得 CSV 字串供其他用途
const csv = TrainDataTransformer.exportToCSV(trains);
console.log(csv);  // 可傳給後端或其他系統
```

---

## 🎯 返回值參考

### getDelayStatus() 返回值

```javascript
{
  status: "延誤 5 分",        // 顯示文本
  cssClass: "delayed",        // CSS 類別
  icon: "hourglass-end",      // Font Awesome 圖標
  color: "#e74c3c"            // 16進位色碼
}
```

### getDirectionInfo() 返回值

```javascript
{
  text: "北上",               // 顯示文本
  icon: "arrow-up",           // Font Awesome 圖標
  color: "#3498db"            // 16進位色碼
}
```

### getTrainTypeInfo() 返回值

```javascript
{
  name: "自強號",             // 車種名稱
  badge: "express",           // CSS 類別
  color: "#ff6b6b"            // 16進位色碼
}
```

### calculateStats() 返回值

```javascript
{
  total: 15,                  // 列車總數
  arrival: 3,                 // 即將到站數
  departure: 2,               // 即將離站數
  delayed: 1                  // 延誤列車數
}
```

### validateTrains() 返回值

```javascript
{
  valid: [train1, train2],    // 有效列車陣列
  invalid: [train3]           // 無效列車陣列
}
```

### groupByDirection() 返回值

```javascript
{
  northbound: [train1, ...],  // Direction = 1
  southbound: [train2, ...]   // Direction = 0
}
```

### groupByTrainType() 返回值

```javascript
{
  '1': [train1, ...],         // 自強號
  '6': [train2, ...],         // 區間
  '2': [train3, ...]          // 莒光號
  // ...
}
```

---

## 📊 列車類型代碼表

| 代碼 | 名稱 | 徽章 | 顏色 |
|------|------|------|------|
| 0 | 普通 | other | #95a5a6 |
| 1 | 自強號 | express | #ff6b6b |
| 2 | 莒光號 | tze-chiang | #e74c3c |
| 3 | 復興號 | chu-kuang | #ff8c42 |
| 4 | 區間快 | limited | #ffd93d |
| 5 | 特快 | special | #c0392b |
| 6 | 區間 | local | #4ecdc4 |
| 21 | 觀光列車 | tourist | #f39c12 |

---

## 🎨 CSS 類別參考

### 狀態徽章

```css
.status-badge.ontime { background: #27ae60; color: white; }  /* 準點 */
.status-badge.delayed { background: #e74c3c; color: white; } /* 延誤 */
.status-badge.early { background: #3498db; color: white; }   /* 提前 */
```

### 車種徽章

```css
.train-type.express { background: #ff6b6b; color: white; }     /* 自強號 */
.train-type.local { background: #4ecdc4; color: white; }       /* 區間 */
.train-type.tze-chiang { background: #e74c3c; color: white; }  /* 莒光號 */
.train-type.chu-kuang { background: #ff8c42; color: white; }   /* 復興號 */
.train-type.limited { background: #ffd93d; color: #333; }      /* 區間快 */
```

---

## ⚠️ 錯誤處理

```javascript
// 安全的資料處理
try {
    const trains = await fetchTrains();
    
    // 驗證資料
    if (!Array.isArray(trains)) {
        throw new Error('無效的資料格式');
    }
    
    // 驗證完整性
    const { valid } = TrainDataTransformer.validateTrains(trains);
    if (valid.length === 0) {
        console.warn('沒有有效的列車資料');
        return [];
    }
    
    // 處理資料
    const stats = TrainDataTransformer.calculateStats(valid);
    const html = TrainDataTransformer.createTrainRows(valid);
    
} catch (error) {
    console.error('處理列車資料失敗:', error.message);
    showErrorMessage(error.message);
}
```

---

## 🔗 相關連結

| 資源 | 位置 |
|------|------|
| 完整指南 | `docs/TRAIN-DATA-FORMAT-GUIDE.md` |
| 使用範例 | `docs/TRAIN-DATA-EXAMPLES.js` |
| 整合報告 | `docs/TRAIN-DATA-INTEGRATION-REPORT.md` |
| 原始碼 | `assets/train-data-transformer.js` |
| 主頁面 | `train-liveboard.html` |

---

## 💡 最佳實踐

✅ **應該做**
- 使用 `validateTrains()` 驗證資料
- 使用 `filterRecentTrains()` 篩選舊資料
- 使用 `sortTrains()` 整理資料
- 使用 `calculateStats()` 計算統計

❌ **不應該做**
- 直接信任 API 回傳的資料
- 處理超過 1 小時的舊資料
- 在迴圈中重複格式化時間
- 忽略資料驗證錯誤

---

**最後更新**: 2025-11-02  
**版本**: 1.0.0

