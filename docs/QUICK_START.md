# 🚀 快速啟動指南

## 直接內嵌密鑰的代理伺服器

### 📁 可用的代理伺服器版本

我已為您創建了 **兩個版本**的代理伺服器：

#### 1️⃣ **api_proxy.py** - 完整功能版
- 支援環境變數配置
- 完善的錯誤處理
- 詳細的日誌記錄
- 適合生產環境

#### 2️⃣ **api_proxy_simple.py** - 簡化版（推薦）
- 代碼簡潔易懂
- 直接內嵌密鑰
- 零依賴配置
- 適合快速測試

---

## ⚡ 快速開始（3步）

### 步驟 1️⃣：打開終端
```bash
cd "c:\Users\xiaoy\OneDrive\桌面\Camera\Road-Camera"
```

### 步驟 2️⃣：啟動代理伺服器
```bash
python api_proxy_simple.py
```

應看到輸出：
```
======================================================================
🔐 台灣空品測站 API 代理伺服器 (簡化版)
======================================================================

✅ 伺服器啟動於 http://localhost:8001

📍 可用的代理端點:
   • GET http://localhost:8001/api/air-quality/images
   • GET http://localhost:8001/api/air-quality/image/01

🔒 安全性:
   • API 密鑰已隱藏於伺服器端
   • 前端無法訪問真實密鑰
   • 所有請求經過驗證

⏹️  按 Ctrl+C 停止伺服器
======================================================================
```

### 步驟 3️⃣：打開應用
在瀏覽器中訪問：
```
http://localhost:8000/air-quality-cctv.html
```

---

## 🔍 驗證是否使用代理

打開瀏覽器開發者工具（按 F12）→ 選擇 Console 標籤

### ✅ 使用代理時
```
✅ 使用本地代理 API
```

### ⚠️ 沒有代理時
```
⚠️ 使用直接 API（建議運行本地代理）
```

---

## 🔐 密鑰隱藏說明

### 密鑰位置

```python
# ✅ 代理伺服器中（安全）
API_CONFIG = {
    'api_key': '4c89a32a-a214-461b-bf29-30ff32a61a8a'  # 隱藏
}

# ⚠️ 前端備用（如代理不可用）
static DIRECT_API_BASE = 'https://data.moenv.gov.tw/api/v2/aqx_p_01';
static API_KEY = '4c89a32a-a214-461b-bf29-30ff32a61a8a';  // 備用
```

### 工作流程

```
使用者瀏覽器
      ↓
  前端應用
      ↓
  嘗試連接 → http://localhost:8001/api/air-quality/...
      ↓
  [成功] 使用代理
      ↓
  代理伺服器（隱藏密鑰）
      ↓
  環保署 API
      
  
  [失敗] 回退到直接 API
      ↓
  直接調用環保署 API（帶備用密鑰）
```

---

## 📊 代理伺服器功能

### 支援的端點

#### 1. 獲取最新影像清單
```bash
GET http://localhost:8001/api/air-quality/images

# 回應
{
  "records": [
    {
      "filename": "空氣品質監測即時影像資料...",
      "url": "https://newcdx.moenv.gov.tw/api/files/...",
      "description": "..."
    }
  ]
}
```

#### 2. 獲取單個測站影像
```bash
GET http://localhost:8001/api/air-quality/image/01

# 回應
{
  "station_code": "01",
  "latest_record": {...},
  "total_records": 123
}
```

---

## 🎯 使用建議

### 開發環境
✅ 使用簡化版 (`api_proxy_simple.py`)  
✅ 密鑰直接內嵌  
✅ 易於測試和調試

### 生產環境
✅ 使用完整版 (`api_proxy.py`)  
✅ 配合環境變數 (`.env`)  
✅ 定期輪換密鑰  
✅ 使用密鑰管理服務

---

## ⚙️ 自訂代理設定

### 更改代理端口

編輯 `api_proxy_simple.py`：
```python
# 改變端口
PROXY_PORT = 9001  # 從 8001 改為 9001
```

然後重新啟動代理

---

## 🆘 故障排查

### 問題 1：代理無法啟動

**症狀**：運行 `python api_proxy_simple.py` 後沒有輸出

**解決方案**：
```bash
# 1. 確認在正確目錄
cd "c:\Users\xiaoy\OneDrive\桌面\Camera\Road-Camera"

# 2. 確認 Python 已安裝
python --version

# 3. 檢查 8001 端口是否被佔用
netstat -ano | findstr :8001

# 4. 如果被佔用，使用不同端口
# 編輯 api_proxy_simple.py 的 PROXY_PORT
```

### 問題 2：前端無法連接代理

**症狀**：看到 "⚠️ 使用直接 API"

**解決方案**：
1. 確保代理伺服器正在運行
2. 檢查代理地址是否正確
3. 查看瀏覽器控制台是否有 CORS 錯誤

### 問題 3：無法訪問環保署 API

**症狀**：收到 API 錯誤或 502 錯誤

**解決方案**：
1. 確認網路連接
2. 確認密鑰有效
3. 檢查環保署 API 是否在線

---

## 📚 相關文件

- `api_proxy_simple.py` - 簡化代理伺服器（推薦用）
- `api_proxy.py` - 完整代理伺服器
- `air-quality-transformer.js` - 前端轉換工具
- `air-quality-cctv.html` - 應用頁面

---

## 🎉 完成！

系統已準備好！密鑰已安全隱藏在後端，前端無法訪問。

開始使用：
```bash
python api_proxy_simple.py
# 然後打開 http://localhost:8000/air-quality-cctv.html
```
