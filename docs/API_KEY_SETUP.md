# Google Maps API Key 配置指南

## 🚨 当前问题
```
RefererNotAllowedMapError
Your site URL to be authorized: https://test.weacamm.org/bus-liveboard
```

## ✅ 解决步骤

### 1. 訪問 Google Cloud Console
- 打開 https://console.cloud.google.com
- 登入您的 Google 帳戶

### 2. 選擇您的項目
- 從項目下拉菜單中選擇正確的項目

### 3. 導航到 API 金鑰設置
- 左側菜單 → **API 和服務** → **認證**
- 找到您的 API Key：`AIzaSyBvpcEA4hfvIg9ddt0UadRLibxwsORPVe4`
- 點擊編輯

### 4. 配置應用程序限制
在 **應用程序限制** 部分：
- 選擇 **HTTP 引用者 (網站)**
- 點擊 **新增項目**
- 輸入以下網址：
  ```
  https://test.weacamm.org/*
  https://test.weacamm.org/bus-liveboard
  http://localhost/*
  http://127.0.0.1/*
  ```

### 5. 配置 API 限制
在 **API 限制** 部分：
- 選擇 **限制金鑰...**
- 勾選以下 API：
  - Maps JavaScript API
  - Geometry Library
  - Distance Matrix API (選用)

### 6. 保存更改
- 點擊 **儲存** 按鈕
- 等待 1-5 分鐘讓配置生效

## 📝 本地測試
如果要在本地測試，添加以下到應用程序限制：
```
http://localhost/*
http://localhost:8000/*
http://localhost:3000/*
http://127.0.0.1/*
```

## ⚠️ 性能改進（已完成）
✅ Google Maps API 已配置為 async 加載
✅ 使用 `loading=async` 和 `defer` 參數改進加載性能

## 🗺️ 已知警告（非關鍵）
- **google.maps.Marker 已弃用**：建議將來升級到 `AdvancedMarkerElement`（當前仍可使用，不會立即移除）

## 🧪 測試
配置完成後：
1. 清除瀏覽器快取
2. 刷新頁面
3. 檢查控制台是否還有 `RefererNotAllowedMapError`

---

**如果問題持續，請檢查：**
- API Key 是否正確複製
- 網址是否完全匹配（注意 http/https 和末尾的 `/`）
- Google Cloud Console 中的項目是否已啟用 Maps JavaScript API
