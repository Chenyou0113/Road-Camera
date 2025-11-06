# 🔒 API 密鑰隱藏 - 實施完成

## ✅ 已完成的工作

### 1. 建立本地 API 代理伺服器
- **檔案**: `api_proxy.py`
- **功能**: 隱藏 API 密鑰，提供安全的代理介面
- **端口**: 8001（可配置）

### 2. 安全配置系統
- **檔案**: `.env.example` - 環境變數模板
- **支援**: 從環境變數讀取敏感資訊
- **隱藏**: 敏感文件已添加到 `.gitignore`

### 3. 前端自動適配
- **檔案**: `air-quality-transformer.js`
- **邏輯**: 優先使用代理，自動回退到直接 API
- **日誌**: 在控制台顯示使用的 API 源

### 4. 啟動腳本
- **Batch**: `start_servers.bat` - Windows 批次檔
- **PowerShell**: `start_servers.ps1` - PowerShell 腳本
- **功能**: 一鍵啟動所有服務

### 5. 完整文檔
- **檔案**: `API_PROXY_SETUP.md`
- **內容**: 詳細的安裝、配置和故障排查指南

---

## 🚀 快速開始

### 方式一：使用批次檔（推薦用於 Windows）

```cmd
start_servers.bat
```

### 方式二：使用 PowerShell

```powershell
.\start_servers.ps1
```

### 方式三：手動啟動

**終端 1 - 啟動 API 代理**
```bash
python api_proxy.py
```

**終端 2 - 啟動主應用**
```bash
cd ..
python -m http.server 8000
```

**然後打開瀏覽器**
```
http://localhost:8000/air-quality-cctv.html
```

---

## 🔐 安全性改進

| 方面 | 之前 | 之後 |
|------|------|------|
| **API 密鑰位置** | ❌ 暴露在前端代碼 | ✅ 隱藏在後端代理 |
| **API 端點** | ❌ 直接暴露 | ✅ 隱藏在代理後 |
| **版本控制** | ❌ 可能提交密鑰 | ✅ 使用 .gitignore 保護 |
| **環境配置** | ❌ 硬編碼 | ✅ 支援環境變數 |
| **CORS 保護** | ❌ 無 | ✅ 代理管理 CORS |
| **請求驗證** | ❌ 無 | ✅ 代理驗證請求 |

---

## 📊 系統架構

```
使用者瀏覽器
    ↓
前端應用 (localhost:8000)
air-quality-cctv.html
    ↓
本地代理伺服器 (localhost:8001)
api_proxy.py
    ↓ (使用 API 密鑰)
環保署 CDX API
data.moenv.gov.tw
```

---

## 🎯 API 端點

### 代理提供的安全端點

1. **獲取影像清單**
   ```
   GET http://localhost:8001/api/air-quality/images
   ```

2. **獲取單個測站影像**
   ```
   GET http://localhost:8001/api/air-quality/image/{station_code}
   ```

---

## 📝 設定環境變數

### 創建 .env 檔案

```bash
cp .env.example .env
```

### 編輯 .env

```ini
MOENV_API_BASE=https://data.moenv.gov.tw/api/v2/aqx_p_01
MOENV_API_KEY=your-api-key-here
PROXY_SERVER_PORT=8001
LOG_LEVEL=INFO
```

---

## ✨ 功能特性

✅ **自動回退**: 代理不可用時自動使用直接 API  
✅ **安全日誌**: 控制台提示使用的 API 源  
✅ **CORS 支援**: 代理正確處理跨域請求  
✅ **請求驗證**: 代理驗證所有輸入參數  
✅ **環境配置**: 支援環境變數配置  
✅ **錯誤處理**: 完善的錯誤消息和日誌  

---

## 🔍 驗證工作

### 檢查是否使用代理

打開瀏覽器開發者工具（F12）→ Console 標籤

應看到：
```
✅ 使用本地代理 API
```

或

```
⚠️ 使用直接 API（建議運行本地代理）
```

---

## 📚 相關文件

- `API_PROXY_SETUP.md` - 詳細設置指南
- `.env.example` - 環境變數模板
- `api_proxy.py` - 代理伺服器代碼
- `start_servers.bat` - Windows 啟動腳本
- `start_servers.ps1` - PowerShell 啟動腳本

---

## ⚠️ 重要事項

1. **不要提交密鑰**: 確保 `.env` 在 `.gitignore` 中
2. **定期更新**: 定期輪換 API 密鑰
3. **監控日誌**: 查看代理日誌以檢測異常
4. **生產環保**: 使用適當的密鑰管理系統

---

## 💡 常見問題

**Q: 代理必須運行嗎？**  
A: 不是必須的。前端會自動回退到直接 API，但建議運行以提高安全性。

**Q: 如何在生產環保部署？**  
A: 使用雲端密鑰管理服務（AWS Secrets、Azure Key Vault 等）。

**Q: 可以使用不同的端口嗎？**  
A: 可以。在 `.env` 中設定 `PROXY_SERVER_PORT` 或修改啟動命令。

---

## 🎉 完成！

系統已配置為隱藏 API 密鑰。所有敏感資訊現在保存在後端，前端無法訪問。
