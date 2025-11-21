# 捷運電子看板 - 資料結構驗證指南

## 📋 系統支援的資料結構

本文檔記錄系統支援的所有 API 回應格式和欄位對應。

---

## 🚇 台北捷運 (TRTC) LiveBoard 實際資料範例

### API 端點
```
GET /v2/Rail/Metro/LiveBoard/TRTC?$format=JSON
```

### 實際回應格式

```json
{
  "LineNO": "BL",
  "LineID": "BL",
  "LineName": {
    "Zh_tw": "板南線",
    "En": "Bannan Line"
  },
  "StationID": "BL05",
  "StationName": {
    "Zh_tw": "亞東醫院",
    "En": "Far Eastern Hospital"
  },
  "TripHeadSign": "往頂埔",
  "DestinationStaionID": "BL01",
  "DestinationStationID": "BL01",
  "DestinationStationName": {
    "Zh_tw": "頂埔",
    "En": "Dingpu"
  },
  "ServiceStatus": 0,
  "EstimateTime": 0,
  "SrcUpdateTime": "2025-11-21T15:32:08+08:00",
  "UpdateTime": "2025-11-21T15:32:38+08:00"
}
```

### 欄位說明

| 欄位 | 型別 | 說明 | 必需 | 備註 |
|------|------|------|------|------|
| `LineNO` | String | 路線代碼 | ✓ | 同 LineID |
| `LineID` | String | 路線 ID | ✓ | 如 "BL"、"G"、"R" |
| `LineName` | Object | 路線名稱 | ✓ | {Zh_tw, En} 雙語 |
| `StationID` | String | 車站代碼 | ✓ | 如 "BL05" |
| `StationName` | Object | 車站名稱 | ✓ | {Zh_tw, En} 雙語 |
| `TripHeadSign` | String | 方向指示 | ✓ | 如 "往頂埔"、"往淡水" |
| `DestinationStationID` | String | 終點站代碼 | ✓ | 如 "BL01" |
| `DestinationStaionID` | String | 終點站代碼 (拼字錯誤) | ✗ | **API BUG**: 同上，系統會相容 |
| `DestinationStationName` | Object | 終點站名稱 | ✓ | {Zh_tw, En} 雙語 |
| `ServiceStatus` | Number | 服務狀態 | ✓ | 0=正常, 1=延誤, 3=不行駛 |
| `EstimateTime` | Number | 預估到站時間 | ✓ | 單位: 秒, 0=進站中 |
| `SrcUpdateTime` | String | 資料來源更新時間 | ✓ | ISO 8601 格式 |
| `UpdateTime` | String | 系統更新時間 | ✓ | ISO 8601 格式 |

### 欄位特殊處理

#### 1. `TripHeadSign` 的重要性
- **定義**: 列車的方向指示 (e.g., "往頂埔")
- **優先級**: 在顯示方向時優先使用
- **格式**: 中文方向 "往{終點站名}"
- **系統處理**:
  ```javascript
  const directionText = estimate.TripHeadSign ||  // 優先
                        estimate.Direction ||      // 其次
                        '由終點站推斷';             // 最後
  ```

#### 2. 終點站 ID 的雙重欄位
- **API 返回兩個欄位**:
  - `DestinationStationID`: 正確欄位名
  - `DestinationStaionID`: 拼字錯誤 (系統相容)
- **系統處理**:
  ```javascript
  const destStationId = estimate.DestinationStationID ||  // 優先
                        estimate.DestinationStaionID ||   // 容錯
                        '';
  ```

#### 3. 時間欄位
- `SrcUpdateTime`: 資料來源 (MOTC) 的更新時間
- `UpdateTime`: TDX 系統的更新時間 (通常晚 30 秒)
- **顯示邏輯**: 優先使用 `UpdateTime`

#### 4. 服務狀態代碼
```
0 = 正常 🟢
1 = 延誤 🟡
2 = 轉向 🔄
3 = 不行駛 🔴
```

---

## 📊 完整欄位對應表

### 系統支援的所有欄位變異

#### 路線資訊
| API 回應欄位 | 備選欄位 | 系統使用 |
|-------------|---------|---------|
| `LineName.Zh_tw` | `LineName` | 路線中文名 |
| `LineID` | `LineNo` | 路線代碼 |

#### 車站資訊
| API 回應欄位 | 備選欄位 | 系統使用 | 強化方式 |
|-------------|---------|---------|---------|
| `StationID` | `StationCode` | 車站代碼 | - |
| `StationName.Zh_tw` | `StationName` | 車站名稱 | 使用本地對應表 |

#### 列車時間資訊
| API 回應欄位 | 備選欄位 | 單位 | 系統使用 |
|-------------|---------|------|---------|
| `EstimateTime` | `estimateTime` | 秒 | 轉換為分秒 |
| `UpdateTime` | `SrcUpdateTime` | ISO 8601 | 更新時間戳 |

#### 列車方向資訊
| 優先級 | 欄位 | 範例 |
|--------|------|------|
| 1 | `TripHeadSign` | "往頂埔" |
| 2 | `Direction` | "往淡水" |
| 3 | `DestinationStationName.Zh_tw` | "頂埔" |

---

## 🔄 API 回應格式類型

### 格式 1: 台北捷運 (TRTC) - Estimates 結構
```json
{
  "StationID": "BL05",
  "LineName": { "Zh_tw": "板南線" },
  "Estimates": [
    {
      "EstimateTime": 240,
      "DestinationStationName": { "Zh_tw": "頂埔" },
      "TripHeadSign": "往頂埔"
    }
  ]
}
```

### 格式 2: 高雄輕軌 (KLRT) - 直接列車資訊
```json
{
  "StationID": "C01",
  "StationName": { "Zh_tw": "籬仔內" },
  "LineID": "LRT",
  "EstimateTime": 180,
  "DestinationStationName": { "Zh_tw": "竹圍" },
  "TripHeadSign": "往竹圍"
}
```

---

## ⚠️ API 已知問題與容錯機制

### 1. 拼字錯誤: `DestinationStaionID`

**問題描述**:
- API 返回 `DestinationStaionID` (少了一個 't')
- 同時也返回正確的 `DestinationStationID`

**系統容錯**:
```javascript
// 支援兩個欄位名稱
const destStationId = estimate.DestinationStationID ||     // 正確
                      estimate.DestinationStaionID ||      // 容錯
                      '';
```

**狀態**: ✅ 已相容

### 2. 多個 LineName 格式

**問題描述**:
- 某些 API 返回 `LineName` 物件 {Zh_tw, En}
- 某些 API 返回 `LineName` 字串

**系統容錯**:
```javascript
const lineName = typeof item.LineName === 'string' 
  ? item.LineName 
  : item.LineName?.Zh_tw || '';
```

**狀態**: ✅ 已相容

### 3. 時間欄位可能遺失

**問題描述**:
- `EstimateTime` 可能未定義
- `UpdateTime` 可能使用 `SrcUpdateTime`

**系統容錯**:
```javascript
const estTime = estimate.EstimateTime !== undefined 
  ? estimate.EstimateTime 
  : estimate.estimateTime !== undefined 
  ? estimate.estimateTime 
  : 0;
```

**狀態**: ✅ 已相容

---

## 🔧 欄位驗證邏輯

### 必要欄位檢查
```javascript
// 系統要求以下欄位至少有一個不為空
const isValid = {
  hasStationId: !!item.StationID,
  hasLineId: !!item.LineID,
  hasEstimateTime: item.EstimateTime !== undefined,
  hasDestination: !!item.DestinationStationName || !!item.Direction
};

// 任何一個格式有效即可顯示
const canDisplay = Object.values(isValid).some(v => v);
```

### 優雅降級策略
```
完整資訊
  ↓
缺少終點站名 → 使用 TripHeadSign
  ↓
缺少時間 → 顯示 "--"
  ↓
缺少方向 → 留空
```

---

## 📈 時間轉換規則

### EstimateTime 的顯示邏輯

```javascript
const estTime = item.EstimateTime;  // 秒數

if (estTime === 0) {
  display = "進站中";          // 🟢 進站
} else if (estTime <= 60) {
  display = "即將到站";         // 🟡 即將
} else if (estTime <= 180) {
  const minutes = Math.ceil(estTime / 60);
  display = `約 ${minutes} 分鐘`;  // 🔵 等候
} else {
  const minutes = Math.ceil(estTime / 60);
  display = `約 ${minutes} 分鐘`;  // ⚪ 等候
}
```

### 更新時間顯示

系統優先使用 `UpdateTime` 而非 `SrcUpdateTime`:
- `UpdateTime`: TDX 系統更新時間 (較新)
- `SrcUpdateTime`: MOTC 資料來源時間 (較舊，但權威)

---

## ✅ 驗證清單

API 回應驗證：

- [ ] 包含 `StationID` 和 `LineID`
- [ ] 包含 `StationName.Zh_tw` 或 `StationName`
- [ ] 包含 `EstimateTime` (可為 0)
- [ ] 包含 `TripHeadSign` 或 `Direction`
- [ ] 包含 `DestinationStationName.Zh_tw` 或類似欄位
- [ ] 包含 `UpdateTime` 或 `SrcUpdateTime`
- [ ] `ServiceStatus` 為 0-3 之間

---

## 📝 測試資料

### 測試用例 1: 正常列車 (進站中)
```json
{
  "LineID": "BL",
  "StationID": "BL05",
  "TripHeadSign": "往頂埔",
  "EstimateTime": 0,
  "ServiceStatus": 0,
  "DestinationStationName": { "Zh_tw": "頂埔" }
}
```
**預期**: 顯示「進站中」，綠色狀態徽章

### 測試用例 2: 即將到站
```json
{
  "LineID": "G",
  "StationID": "G01",
  "TripHeadSign": "往松山",
  "EstimateTime": 45,
  "ServiceStatus": 0,
  "DestinationStationName": { "Zh_tw": "松山" }
}
```
**預期**: 顯示「即將到站」，黃色狀態徽章

### 測試用例 3: 延誤列車
```json
{
  "LineID": "R",
  "StationID": "R10",
  "TripHeadSign": "往淡水",
  "EstimateTime": 300,
  "ServiceStatus": 1,
  "DestinationStationName": { "Zh_tw": "淡水" }
}
```
**預期**: 顯示「約 5 分鐘」，橙色狀態徽章 (延誤)

### 測試用例 4: 不行駛 (跳站)
```json
{
  "LineID": "O",
  "StationID": "O05",
  "TripHeadSign": "往迴龍",
  "EstimateTime": 0,
  "ServiceStatus": 3,
  "DestinationStationName": { "Zh_tw": "迴龍" }
}
```
**預期**: 顯示「跳站」或隱藏此列車，紅色狀態徽章

---

## 🔗 相關文檔

- `METRO_LIVEBOARD_API_GUIDE.md` - API 端點完整指南
- `metro-liveboard.html` - 主程式

---

**最後更新**: 2025-11-21
**驗證版本**: v1.0
**狀態**: ✅ 生產就緒
