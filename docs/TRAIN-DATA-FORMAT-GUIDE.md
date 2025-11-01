# 台鐵時刻表資料格式整合指南

## 📋 概述
本文檔說明如何在台鐵即時看板中整合 TDX API 回傳的列車到離站資訊格式。

---

## 🔍 資料格式詳解

### 基礎結構
```json
{
  "StationID": "0900",
  "StationName": {
    "Zh_tw": "基隆",
    "En": "Keelung"
  },
  "TrainNo": "1288",
  "Direction": 0,
  "TrainTypeID": "1131",
  "TrainTypeCode": "6",
  "TrainTypeName": {
    "Zh_tw": "區間",
    "En": "Local Train"
  },
  "TripLine": 1,
  "EndingStationID": "0900",
  "EndingStationName": {
    "Zh_tw": "基隆",
    "En": "Keelung"
  },
  "ScheduledArrivalTime": "00:27:00",
  "ScheduledDepartureTime": "00:27:00",
  "DelayTime": 0,
  "SrcUpdateTime": "2025-11-02T00:02:04+08:00",
  "UpdateTime": "2025-11-02T00:03:08+08:00"
}
```

### 欄位說明

| 欄位 | 類型 | 說明 | 範例 |
|------|------|------|------|
| **StationID** | String | 車站編號 | "0900" |
| **StationName** | Object | 車站名稱（雙語） | { "Zh_tw": "基隆", "En": "Keelung" } |
| **TrainNo** | String | 列車車次 | "1288" |
| **Direction** | Number | 方向（0:南下, 1:北上） | 0 |
| **TrainTypeID** | String | 車種編號 | "1131" |
| **TrainTypeCode** | String | 車種代碼 | "6" |
| **TrainTypeName** | Object | 車種名稱（雙語） | { "Zh_tw": "區間", "En": "Local Train" } |
| **TripLine** | Number | 班次序號 | 1 |
| **EndingStationID** | String | 終點站編號 | "0900" |
| **EndingStationName** | Object | 終點站名稱（雙語） | { "Zh_tw": "基隆", "En": "Keelung" } |
| **ScheduledArrivalTime** | String | 預計到站時間 (HH:MM:SS) | "00:27:00" |
| **ScheduledDepartureTime** | String | 預計離站時間 (HH:MM:SS) | "00:27:00" |
| **DelayTime** | Number | 延誤時間（分鐘）| 0 |
| **SrcUpdateTime** | String | 來源系統更新時間 (ISO 8601) | "2025-11-02T00:02:04+08:00" |
| **UpdateTime** | String | TDX 平台更新時間 (ISO 8601) | "2025-11-02T00:03:08+08:00" |

---

## 🔄 資料處理流程

### 1️⃣ 解析時間格式

```javascript
// HH:MM:SS 格式轉換為顯示格式
function formatTime(timeStr) {
  if (!timeStr) return '--';
  return timeStr.substring(0, 5); // 返回 HH:MM
}

// ISO 8601 格式轉換為本地時間
function parseUpdateTime(isoString) {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
```

### 2️⃣ 計算延誤狀態

```javascript
function getDelayStatus(delayMinutes) {
  if (delayMinutes === null || delayMinutes === undefined) {
    return { status: '準點', cssClass: 'ontime', icon: 'check' };
  }
  if (delayMinutes > 0) {
    return { status: `延誤 ${delayMinutes} 分`, cssClass: 'delayed', icon: 'hourglass' };
  }
  if (delayMinutes < 0) {
    return { status: `提前 ${Math.abs(delayMinutes)} 分`, cssClass: 'early', icon: 'bolt' };
  }
  return { status: '準點', cssClass: 'ontime', icon: 'check' };
}
```

### 3️⃣ 解析列車方向

```javascript
function getDirectionInfo(direction) {
  const directionMap = {
    0: { text: '南下', icon: 'arrow-down', color: '#e74c3c' },
    1: { text: '北上', icon: 'arrow-up', color: '#3498db' }
  };
  return directionMap[direction] || { text: '未知', icon: 'question', color: '#95a5a6' };
}
```

### 4️⃣ 分類列車類型

```javascript
function getTrainTypeInfo(typeCode) {
  const trainTypeMap = {
    '1': { name: '自強號', badge: 'express', color: '#ff6b6b' },
    '2': { name: '莒光號', badge: 'tze-chiang', color: '#e74c3c' },
    '3': { name: '復興號', badge: 'chu-kuang', color: '#ff8c42' },
    '4': { name: '區間快', badge: 'limited', color: '#ffd93d' },
    '6': { name: '區間', badge: 'local', color: '#4ecdc4' }
  };
  return trainTypeMap[typeCode] || { name: '其他', badge: 'other', color: '#95a5a6' };
}
```

---

## 📊 統計資訊計算

### 統計現有列車

```javascript
function calculateStats(trains) {
  let stats = {
    total: trains.length,
    arrival: 0,      // 即將到站（預計到站時間 < 5分鐘）
    departure: 0,    // 即將離站（預計離站時間 < 5分鐘）
    delayed: 0       // 延誤列車（DelayTime > 0）
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  trains.forEach(train => {
    // 計算延誤列車
    if (train.DelayTime && train.DelayTime > 0) {
      stats.delayed++;
    }

    // 計算即將到站
    if (train.ScheduledArrivalTime) {
      const [h, m] = train.ScheduledArrivalTime.split(':').map(Number);
      const arrivalMinutes = h * 60 + m;
      const minutesDiff = arrivalMinutes - currentMinutes;
      if (minutesDiff >= 0 && minutesDiff < 5) {
        stats.arrival++;
      }
    }

    // 計算即將離站
    if (train.ScheduledDepartureTime) {
      const [h, m] = train.ScheduledDepartureTime.split(':').map(Number);
      const departureMinutes = h * 60 + m;
      const minutesDiff = departureMinutes - currentMinutes;
      if (minutesDiff >= 0 && minutesDiff < 5) {
        stats.departure++;
      }
    }
  });

  return stats;
}
```

---

## 🎨 HTML 表格行渲染

### 列車表格行模板

```javascript
function createTrainRow(train) {
  const direction = getDirectionInfo(train.Direction);
  const typeInfo = getTrainTypeInfo(train.TrainTypeCode);
  const delayStatus = getDelayStatus(train.DelayTime);
  
  const arrivalTime = formatTime(train.ScheduledArrivalTime);
  const departureTime = formatTime(train.ScheduledDepartureTime);
  
  return `
    <tr>
      <td>
        <span class="train-number">
          <i class="fas fa-train"></i> ${train.TrainNo}
        </span>
      </td>
      <td>
        <span class="train-type ${typeInfo.badge}">
          ${typeInfo.name}
        </span>
      </td>
      <td>
        <span class="direction-badge" style="background: ${direction.color}">
          <i class="fas fa-${direction.icon}"></i>
          ${direction.text}
        </span>
      </td>
      <td>${train.EndingStationName?.Zh_tw || train.EndingStationID}</td>
      <td>${arrivalTime}</td>
      <td>${departureTime}</td>
      <td>
        <span class="status-badge ${delayStatus.cssClass}">
          <i class="fas fa-${delayStatus.icon}"></i>
          ${delayStatus.status}
        </span>
      </td>
    </tr>
  `;
}
```

---

## 🔗 API 整合示例

### 完整查詢流程

```javascript
async function loadTrainsByStation(stationId) {
  try {
    // 1. 取得 API Token
    const token = await tdxApi.getAccessToken();
    
    // 2. 查詢指定車站的列車資訊
    const endpoint = `/v2/Rail/TRA/LiveTrainInfo?$filter=StationID eq '${stationId}'&$format=JSON`;
    const response = await fetch(`https://tdx.transportdata.tw/api/basic${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept-Encoding': 'gzip'
      }
    });

    if (!response.ok) {
      throw new Error(`API 錯誤: ${response.status}`);
    }

    const trains = await response.json();
    
    // 3. 處理資料
    const stats = calculateStats(trains);
    const rows = trains.map(train => createTrainRow(train)).join('');
    
    // 4. 更新 UI
    updateTableBody(rows);
    updateStats(stats);
    updateUpdateTime(new Date());

    return trains;
  } catch (error) {
    console.error('查詢列車失敗:', error);
    showError(error.message);
    return [];
  }
}
```

---

## 🌐 現有頁面使用位置

### train-liveboard.html 
**檔案位置**: `c:\Users\xiaoy\OneDrive\桌面\Camera\Road-Camera\train-liveboard.html`

#### 相關函數：
- `loadLiveboard()` - 主要載入函數（第 850 行左右）
- `displayDelayTrains()` - 顯示延遲列車資料（第 920 行左右）
- `getTrainTypeInfo()` - 車種分類（第 950 行左右）

#### 現有實現：
```javascript
// 篩選經過當前車站的列車
const stationTrains = allTrains.filter(train => {
    if (!train.StopStations || !Array.isArray(train.StopStations)) {
        return false;
    }
    return train.StopStations.some(stop => stop.StationID === currentStationId);
});
```

---

## 💾 資料存儲建議

### 本地快取策略

```javascript
class TrainDataCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 120000; // 2 分鐘過期
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // 檢查是否過期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

// 使用範例
const trainCache = new TrainDataCache();
```

---

## 🔐 錯誤處理

### 常見錯誤及處理方式

```javascript
async function safeLoadTrains(stationId) {
  try {
    const trains = await loadTrainsByStation(stationId);
    
    // 驗證資料
    if (!Array.isArray(trains)) {
      throw new Error('無效的回應格式');
    }
    
    if (trains.length === 0) {
      console.warn('此時段未有列車');
      return [];
    }
    
    return trains;
    
  } catch (error) {
    if (error.message.includes('401')) {
      console.error('認證失敗，請檢查 TDX 金鑰配置');
    } else if (error.message.includes('429')) {
      console.error('API 請求超過限制，請稍候再試');
    } else if (error.message.includes('404')) {
      console.error('車站不存在或資料無法取得');
    } else {
      console.error('其他錯誤:', error.message);
    }
    
    return [];
  }
}
```

---

## 📈 效能最佳化

### 批量查詢

```javascript
async function loadMultipleStations(stationIds) {
  // 分批查詢，避免 API 過載
  const batchSize = 5;
  const results = [];
  
  for (let i = 0; i < stationIds.length; i += batchSize) {
    const batch = stationIds.slice(i, i + batchSize);
    const promises = batch.map(id => loadTrainsByStation(id));
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.flat());
  }
  
  return results;
}
```

### 記憶體優化

```javascript
// 只保留最近 30 分鐘內的列車
function filterRecentTrains(trains) {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);
  
  return trains.filter(train => {
    if (!train.ScheduledDepartureTime) return false;
    
    const [h, m] = train.ScheduledDepartureTime.split(':').map(Number);
    const trainTime = new Date();
    trainTime.setHours(h, m, 0, 0);
    
    return trainTime >= thirtyMinutesAgo;
  });
}
```

---

## 📝 相關文件

- **API 配置**: `assets/config.js`
- **TDX API 包裝**: `assets/tdx-api.js`
- **路線分類**: `assets/train-line-classification.js`
- **主看板頁面**: `train-liveboard.html`
- **深色模式**: `assets/dark-mode.css`

---

## 🚀 下一步建議

1. ✅ **擴展到其他頁面** - 在首頁顯示重點車站資訊
2. ✅ **通知系統** - 列車延誤或異常時推送通知
3. ✅ **歷史統計** - 記錄延誤趨勢分析
4. ✅ **多站比較** - 同時顯示多個車站的列車資訊
5. ✅ **行動應用** - 打包為 PWA 或原生應用

---

**最後更新**: 2025-11-02  
**維護者**: Camera 專案團隊

