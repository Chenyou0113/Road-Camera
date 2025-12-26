# API 代理服務設置指南

## 概述

為了隱藏敏感的 API 密鑰和端點，本系統使用本地 API 代理服務。前端應用通過代理與環保署 API 通信，而不是直接暴露密鑰。

## 安全性

### ✅ 優點
- **隱藏密鑰**: API 密鑰僅存儲在後端伺服器，不會在前端代碼中暴露
- **請求驗證**: 代理可以驗證和限制請求
- **中央管理**: API 配置集中管理，易於維護
- **CORS 防護**: 代理可以控制跨域請求

### 🔒 敏感文件
以下文件已添加到 `.gitignore` 並不會被提交到版本控制：
- `.env` - 環境變數（包含 API 密鑰）
- `config-private.js` - 私有配置
- `secrets.json` - 敏感資訊

## 安裝和運行

### 1. 啟動代理伺服器

#### 方式一：直接運行 Python 腳本

```bash
python api_proxy.py
```

輸出應該看起來像：
```
✅ API 代理伺服器啟動於 http://localhost:8001
📍 可用的代理端點:
   - http://localhost:8001/api/air-quality/images
   - http://localhost:8001/api/air-quality/image/01
```

#### 方式二：使用 PowerShell

```powershell
cd "c:\Users\xiaoy\OneDrive\桌面\Camera\Road-Camera"
python api_proxy.py
```

### 2. 啟動主應用伺服器

在新的終端窗口中運行：

```bash
cd "c:\Users\xiaoy\OneDrive\桌面\Camera"
python -m http.server 8000
```

### 3. 訪問應用

打開瀏覽器訪問：
```
http://localhost:8000/air-quality-cctv.html
```

## 代理 API 端點

### 1. 獲取影像清單
```
GET /api/air-quality/images
```

**回應示例：**
```json
{
  "records": [
    {
      "filename": "空氣品質監測即時影像資料(發布)_20251106_223502.zip",
      "url": "https://newcdx.moenv.gov.tw/api/files/AQX_P_01/d1f814c9-aa4b-4af0-b5c4-6848fc9829b8",
      "description": "提供空氣品質監測網測站即時影像資料..."
    }
  ]
}
```

### 2. 獲取單個測站影像資訊
```
GET /api/air-quality/image/{station_code}
```

**參數：**
- `station_code`: 測站代碼 (01-63)

**回應示例：**
```json
{
  "station_code": "01",
  "latest_record": {
    "filename": "...",
    "url": "...",
    "description": "..."
  },
  "timestamp": "2025-11-06T22:35:02.123456"
}
```

## 環境配置

### 創建 .env 檔案

複製 `.env.example` 並根據需要修改：

```bash
cp .env.example .env
```

編輯 `.env` 檔案以包含您的配置：

```
MOENV_API_BASE=https://data.moenv.gov.tw/api/v2/aqx_p_01
MOENV_API_KEY=your-api-key-here
PROXY_SERVER_PORT=8001
```

## 前端配置

### 轉換工具會自動：
1. 優先嘗試連接本地代理（`/api/air-quality`）
2. 如果代理不可用，回退到直接 API
3. 記錄使用的 API 源（代理或直接）

在瀏覽器控制台中檢查日誌：
```javascript
// 使用代理時
✅ 使用本地代理 API

// 使用直接 API 時
⚠️ 使用直接 API（建議運行本地代理）
```

## 故障排查

### 問題：代理伺服器無法啟動

**解決方案：**
```bash
# 檢查 8001 端口是否被佔用
netstat -ano | findstr :8001

# 使用不同的端口運行代理
python api_proxy.py  # 修改代碼中的 PORT
```

### 問題：前端無法連接代理

**解決方案：**
1. 確保代理伺服器正在運行
2. 檢查瀏覽器控制台是否有 CORS 錯誤
3. 驗證代理地址是否正確 (`http://localhost:8001/api/air-quality/images`)

### 問題：API 密鑰無效

**解決方案：**
1. 檢查 `.env` 檔案中的 API 密鑰
2. 確保密鑰未被意外修改
3. 聯繫環保署獲取新的密鑰

## 生產環境部署

### 安全建議

1. **使用密鑰管理系統**
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault

2. **啟用 HTTPS**
   - 生產環境應使用 HTTPS
   - 使用有效的 SSL 證書

3. **實施速率限制**
   - 防止 API 濫用
   - 保護後端 API 配額

4. **添加日誌和監控**
   - 記錄所有 API 請求
   - 監控異常活動

5. **定期更新密鑰**
   - 定期輪換 API 密鑰
   - 撤銷過期的密鑰

## 技術細節

### 代理伺服器架構

```
┌─────────────────────────────────┐
│      前端應用                    │
│  air-quality-cctv.html          │
└──────────┬──────────────────────┘
           │ HTTPS/HTTP
           ▼
┌─────────────────────────────────┐
│     本地代理伺服器              │
│      api_proxy.py               │
│   (localhost:8001)              │
└──────────┬──────────────────────┘
           │ 使用 API 密鑰
           ▼
┌─────────────────────────────────┐
│  環保署 CDX API                 │
│  data.moenv.gov.tw              │
└─────────────────────────────────┘
```

### 數據流程

1. 前端發送請求到代理：`GET /api/air-quality/images`
2. 代理接收請求並驗證參數
3. 代理使用儲存的 API 密鑰向環保署 API 發送請求
4. 環保署 API 返回數據
5. 代理移除敏感信息（如完整的 API 密鑰）並返回給前端
6. 前端接收淨化後的數據

## 常見問題

### Q: 為什麼需要代理？
A: 為了隱藏 API 密鑰和真實的 API 端點，防止在前端代碼中暴露敏感信息。

### Q: 代理會減慢性能嗎？
A: 性能影響最小。代理只添加毫秒級的額外延遲。

### Q: 可以禁用代理嗎？
A: 可以。轉換工具會自動回退到直接 API。但建議始終使用代理以增強安全性。

## 許可證

此代碼基於開放式標準，遵循 MIT 許可證。
