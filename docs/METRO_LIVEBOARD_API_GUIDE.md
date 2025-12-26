# 捷運電子看板 (Metro Liveboard) - API 集成指南

## 📋 系統概述

本系統透過 TDX (Taiwan Data Exchange) API 提供台灣主要捷運系統的實時列車到離站資訊查詢功能。

---

## 🔌 API 端點配置

### 基礎端點

所有 API 呼叫使用以下基礎路徑：
```
https://tdx.transportdata.tw/api/basic/v2/Rail/Metro/...
```

### 支援的端點

#### 1. 車站列表端點 (Station)
**用途**: 獲取系統內所有車站的詳細資訊（位置、地址、路線代碼等）

```
GET /v2/Rail/Metro/Station/{SystemCode}?$format=JSON&$top=500
```

**參數**:
- `SystemCode`: 軌道系統代碼（見下表）
- `$format=JSON`: 回應格式
- `$top=500`: 最多回傳 500 筆資料

**回應結構**:
```json
{
  "StationUID": "TRTC-G01",
  "StationID": "G01",
  "StationName": {
    "Zh_tw": "新店",
    "En": "Xindian"
  },
  "StationAddress": "...",
  "LineID": "G",
  "LineName": {
    "Zh_tw": "松山新店線"
  },
  "SequenceNo": 1,
  "StationPosition": {
    "PositionLon": 121.xxx,
    "PositionLat": 24.xxx
  }
}
```

#### 2. 實時列車資訊端點 (LiveBoard)
**用途**: 獲取實時的列車到離站預估時間資訊

```
GET /v2/Rail/Metro/LiveBoard/{SystemCode}?$format=JSON&$top=1000
```

**參數**:
- `SystemCode`: 軌道系統代碼
- `$format=JSON`: 回應格式
- `$top=1000`: 最多回傳 1000 筆資料

**回應結構**:
```json
{
  "StationID": "G01",
  "StationName": {
    "Zh_tw": "新店"
  },
  "LineID": "G",
  "LineName": {
    "Zh_tw": "松山新店線"
  },
  "Estimates": [
    {
      "TrainNo": "...",
      "Direction": "往松山",
      "DestinationStationID": "G19",
      "DestinationStationName": {
        "Zh_tw": "松山"
      },
      "EstimateTime": 240,
      "ServiceStatus": 0
    }
  ]
}
```

---

## 🚇 軌道系統代碼

| 代碼 | 系統名稱 | 路線數 | 總車站數 | 備註 |
|------|--------|--------|---------|------|
| `TRTC` | 臺北捷運 | 6 | 101 | 完整支援 |
| `KRTC` | 高雄捷運 | 2 | 39 | 紅線 24 + 橘線 15 |
| `KLRT` | 高雄輕軌 | 1 | 37 | 完整支援 |
| `TYMC` | 桃園捷運 | 1 | 21* | **API 限制**: 僅提供 A1~A21 站 |

*桃園捷運 API 限制說明*: 雖然桃園捷運機場線共有 23 站，但 TDX API 目前僅提供 A1~A21 站的資料。

---

## 📊 路線代碼對照表

### 臺北捷運 (TRTC)

| 代碼 | 路線名稱 | 站點數 |
|------|--------|--------|
| `BL` | 板南線 | 23 |
| `R` | 淡水信義線 | 28 |
| `G` | 松山新店線 | 19 |
| `O` | 中和新蘆線 | 24 |
| `BR` | 文湖線 | 24 |
| `Y` | 環狀線 | 13 |

### 高雄捷運 (KRTC)

| 代碼 | 路線名稱 | 站點數 |
|------|--------|--------|
| `R` | 紅線 | 24 |
| `O` | 橘線 | 15 |

### 高雄輕軌 (KLRT)

| 代碼 | 路線名稱 | 站點數 |
|------|--------|--------|
| `LRT` | 輕軌 | 37 |

### 桃園捷運 (TYMC)

| 代碼 | 路線名稱 | 站點數 |
|------|--------|--------|
| `A` | 機場線 | 21* |

---

## 🔍 資料結構對應

### 車站資訊欄位

| 欄位 | 型別 | 說明 |
|------|------|------|
| `StationUID` | String | 唯一識別碼 (e.g., "TRTC-G01") |
| `StationID` | String | 車站代碼 (e.g., "G01") |
| `StationName` | Object | 車站名稱 {Zh_tw, En} |
| `LineID` | String | 路線代碼 (e.g., "G") |
| `LineName` | Object | 路線名稱 {Zh_tw, En} |
| `SequenceNo` | Number | 路線上的順序號 |
| `StationAddress` | String | 車站地址 |
| `StationPosition` | Object | GPS 坐標 {PositionLon, PositionLat} |

### 列車資訊欄位

| 欄位 | 型別 | 說明 | 備註 |
|------|------|------|------|
| `StationID` | String | 車站代碼 | |
| `LineID` | String | 路線代碼 | |
| `TrainNo` | String | 列車編號 | |
| `Direction` | String | 方向指示 (e.g., "往松山") | |
| `DestinationStationID` | String | 終點站 ID | |
| `DestinationStationName` | Object | 終點站名稱 | |
| `EstimateTime` | Number | 預估到站時間（秒） | 0 = 進站中 |
| `ServiceStatus` | Number | 服務狀態 | 0=正常, 1=延誤, 3=不行駛 |
| `UpdateTime` | String | 資料更新時間 (ISO 8601) | |

---

## ⏱️ 時間轉換規則

系統根據 `EstimateTime` (秒) 自動轉換為使用者友善的格式：

| EstimateTime (秒) | 顯示狀態 | 顯示文字 |
|------------------|---------|---------|
| 0 | 🟢 進站中 | "進站中" |
| 1-60 | 🟡 即將到站 | "即將到站 (N秒)" |
| 61-180 | 🔵 等候中 | "約 N 分鐘" |
| >180 | ⚪ 等候 | "約 N 分鐘" |

---

## 🔐 認證機制

系統使用 TDX OAuth 2.0 認證：

1. **獲取 Access Token**:
   ```
   POST https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token
   ```

2. **使用 Token 進行 API 呼叫**:
   ```
   Authorization: Bearer {access_token}
   ```

詳見 `/assets/tdx-api.js` 中的 `TDXApi` 類實作。

---

## 📱 系統整合流程

### 1. 載入系統資料 (loadSystemData)

```
選擇系統 (TRTC/KRTC/KLRT/TYMC)
    ↓
呼叫 Station API → 獲取所有車站列表
    ↓
呼叫 LiveBoard API → 獲取實時列車資訊
    ↓
提取路線資訊 → 建立路線選擇菜單
    ↓
強化資料 → 使用本地對應表補全資訊
    ↓
顯示路線選擇介面
```

### 2. 選擇路線 (onLineChange)

```
選擇中文路線名稱
    ↓
查詢 lineIdMap 得到路線代碼
    ↓
篩選該路線的所有車站
    ↓
按 SequenceNo 排序車站
    ↓
顯示車站選擇菜單
```

### 3. 查詢列車 (queryLiveboard)

```
選擇車站
    ↓
篩選該車站的所有列車
    ↓
使用本地對應表強化車站名稱
    ↓
轉換時間格式
    ↓
渲染列車表格
    ↓
啟動自動刷新 (30 秒)
```

---

## 🛠️ 本地對應表

系統包含以下本地對應表以增強顯示品質：

### 台北捷運對應表 (trtcStationMap)
- 覆蓋: 101 個車站
- 用途: 確保完整的中文站名顯示

### 高雄捷運對應表 (krctStationMap)
- 覆蓋: 39 個車站 (紅線 + 橘線)
- 用途: 補全站名資訊

### 高雄輕軌對應表 (klrtStationMap)
- 覆蓋: 37 個車站
- 用途: 完整的站名對應

### 桃園捷運對應表 (tymcStationMap)
- 覆蓋: 21 個車站 (A1~A21)
- 用途: 對應 API 限制的車站範圍

---

## ⚠️ 已知限制

### 1. 桃園捷運 (TYMC)
- **限制**: API 僅提供 A1~A21 站
- **影響**: 無法查詢 A22 (內壢) 和 A23 (中壢高中) 的列車資訊
- **狀態**: TDX 官方限制，待未來更新

### 2. 資料更新延遲
- 某些系統的實時資訊可能有 1-5 秒延遲
- 建議自動刷新間隔設置為 30 秒

### 3. 離峰時段資料
- 某些離峰路線可能無列車資訊
- 系統會顯示「目前沒有列車資訊」提示

---

## 🔧 故障排除

### 問題: 某系統無法載入資料

**原因**:
1. TDX API 臨時無法連接
2. 系統認證令牌失效
3. 網路連接中斷

**解決**:
1. 檢查瀏覽器控制台的錯誤訊息
2. 嘗試重新選擇系統
3. 清除瀏覽器快取並刷新頁面

### 問題: 車站清單為空

**原因**:
1. API 回傳格式變更
2. 系統代碼不正確

**解決**:
1. 檢查 `console.log` 輸出的 API 回應
2. 驗證 SystemCode 是否正確

### 問題: 列車資訊不更新

**原因**:
1. 自動刷新未啟動
2. API 無可用資料

**解決**:
1. 手動點擊「查詢」按鈕
2. 確認時間在營運時段內

---

## 📚 參考資源

- **TDX 官方文檔**: https://tdx.transportdata.tw/
- **TDX API 規範**: https://tdx.transportdata.tw/api-service/swagger-ui.html
- **軌道系統資料**: 各捷運公司官方網站

---

## 🗓️ 更新日期

- **最後更新**: 2025-11-21
- **文檔版本**: 1.0
- **系統版本**: metro-liveboard.html v1.0

---

## ✅ 檢查清單

部署前確認以下項目:

- [ ] TDX API 認證憑據已設置
- [ ] 所有四個系統代碼已測試 (TRTC/KRTC/KLRT/TYMC)
- [ ] 本地對應表已完整載入
- [ ] 時間轉換邏輯正確運作
- [ ] 深色模式樣式適用
- [ ] 響應式設計在手機/平板運作正常
- [ ] 自動刷新功能運作
- [ ] 錯誤處理適當顯示

---

**系統已準備就緒！** ✨
