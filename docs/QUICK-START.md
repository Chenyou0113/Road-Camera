# 🚀 快速啟動指南

## 📋 目錄
1. [第一次使用](#第一次使用)
2. [日常開發](#日常開發)
3. [測試驗證](#測試驗證)
4. [部署上線](#部署上線)
5. [常見問題](#常見問題)

---

## 🌟 第一次使用

### 1. 取得專案
```bash
git clone https://github.com/Chenyou0113/Road-Camera.git
cd Road-Camera
```

### 2. 設定 API 金鑰
編輯 `assets/config.js`：
```javascript
const TDX_CONFIG = {
    CLIENT_ID: '您的-CLIENT-ID',
    CLIENT_SECRET: '您的-CLIENT-SECRET',
    // ...
};
```

> 💡 **取得 API 金鑰**: [TDX 平台](https://tdx.transportdata.tw/) → 會員中心 → API 金鑰管理

### 3. 啟動開發伺服器
```powershell
# Windows PowerShell
.\scripts\start-server.ps1

# 或使用 Python
python -m http.server 8000

# 或使用 Node.js
npx serve
```

### 4. 開啟瀏覽器
```
http://localhost:8000/index.html
```

---

## 💻 日常開發

### 快速預覽
```powershell
# 直接開啟主要頁面
start index.html          # 首頁
start highway.html        # 國道
start road.html          # 省道（最新功能）
start city.html          # 市區
```

### 即時測試
1. 修改 HTML/CSS/JS 檔案
2. 重新整理瀏覽器（F5）
3. 開啟開發者工具（F12）查看 Console

### 目錄結構
```
只編輯這些檔案:
├── *.html              # 主要頁面
├── assets/             # 共用資源
│   ├── *.css          # 樣式
│   └── *.js           # 腳本
└── test/              # 測試檔案
```

---

## 🧪 測試驗證

### 系統狀態檢查
```powershell
# 開啟系統狀態頁面
start test/system-status.html
```

點擊「🚀 測試所有頁面」自動檢測所有功能。

### 功能測試清單

#### ✅ 圖片載入
```powershell
start test/image-test.html
```
驗證監視器影像能正常載入。

#### ✅ 省道篩選
```powershell
start test/filter-logic-test.html
```
確認國道/省道分類正確。

#### ✅ 里程格式
```powershell
start test/mileage-test.html
```
檢查里程顯示格式（125K+500 圓山交流道）。

#### ✅ API 連線
```powershell
start test/tdx-test.html
```
測試 TDX API 連線狀態。

---

## 📦 部署上線

### 方法 1: 靜態網站託管

#### GitHub Pages
```bash
# 1. 推送到 GitHub
git add .
git commit -m "Update"
git push origin main

# 2. 在 GitHub 倉庫設定中啟用 Pages
# Settings → Pages → Source: main branch
```

訪問: `https://你的用戶名.github.io/Road-Camera/`

#### Cloudflare Pages
```bash
# 1. 連接 GitHub 倉庫
# 2. 設定建置命令（無需建置）
# 3. 發布目錄: /
```

### 方法 2: 自架伺服器

#### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/Road-Camera;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```

#### Apache
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/Road-Camera
    <Directory /path/to/Road-Camera>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### 部署前檢查清單
- [ ] 測試所有主要頁面
- [ ] 確認 API 金鑰已設定
- [ ] 檢查圖片載入正常
- [ ] 驗證響應式設計（手機/平板）
- [ ] 測試深色模式切換
- [ ] 移除或排除 test/ 資料夾
- [ ] 更新 README.md

---

## ❓ 常見問題

### Q1: 圖片顯示「載入中」不消失？
**A**: 檢查以下項目：
1. API 金鑰是否正確設定
2. 網路連線是否正常
3. 開啟開發者工具查看 Network 錯誤
4. 確認使用 `image-handler-simple.js`

### Q2: CORS 錯誤？
**A**: 使用以下方法之一：
1. 啟動本地伺服器（不要直接開啟 HTML）
2. 使用 PHP 代理（`api-proxy.php`）
3. 部署到支援 CORS 的主機

### Q3: 省道頁面顯示國道資料？
**A**: 
1. 清除瀏覽器快取
2. 檢查是否為最新版本
3. 使用 `test/filter-logic-test.html` 驗證篩選邏輯

### Q4: 深色模式無法切換？
**A**:
1. 確認 `assets/dark-mode.js` 已載入
2. 檢查 Console 是否有錯誤
3. 清除 localStorage

### Q5: 手機版顯示異常？
**A**:
1. 確認 `assets/responsive-camera.css` 已載入
2. 檢查 viewport meta tag
3. 使用 `test/mobile-test.html` 測試

---

## 🔧 開發技巧

### 快速除錯
```javascript
// 在 Console 執行
console.log('當前頁面:', window.CURRENT_PAGE);
console.log('監視器數量:', allCameras.length);
console.log('TDX Token:', tdxApi.accessToken);
```

### 效能優化
1. 使用 `image-handler-simple.js`（更快）
2. 啟用分頁載入（省道頁面已實作）
3. 限制同時載入圖片數量

### 樣式調整
```css
/* 修改主題色 - 在對應頁面的 <style> 區塊 */
body {
    background: linear-gradient(135deg, #你的顏色1, #你的顏色2);
}
```

---

## 📞 獲取協助

### 文檔
- [專案總覽](PROJECT-OVERVIEW.md)
- [README](README.md)
- [修復報告](docs/)

### 測試工具
- 系統狀態: `test/system-status.html`
- 功能測試: `test/`

### 外部資源
- [TDX 平台文檔](https://tdx.transportdata.tw/api-service/swagger)
- [Font Awesome 圖示](https://fontawesome.com/icons)

---

## 🎯 下一步

1. ✅ 完成第一次設定
2. ✅ 測試所有功能
3. ✅ 自訂主題與樣式
4. ✅ 部署到正式環境
5. ✅ 監控使用狀況

---

**祝開發順利！** 🎉

---

**最後更新**: 2025年10月21日
**維護**: Road Camera Team
