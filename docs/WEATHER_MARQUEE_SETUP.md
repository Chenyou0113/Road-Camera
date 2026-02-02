# 🌤️ 氣象跑馬燈設定指南

## 📋 功能說明

dashboard.html 已整合氣象署即時警特報和天氣預報跑馬燈功能。

## 🔑 使用現有的 CWA_API_KEY 變數

### 方法一：從環境變數讀取（推薦）

如果您的 `CWA_API_KEY` 是在環境變數中定義的，請修改 dashboard.html：

```javascript
// 原本的程式碼（第 395 行附近）
const CWA_API_KEY = "您的API_KEY填在這裡";

// 改為從環境變數讀取
const CWA_API_KEY = typeof process !== 'undefined' && process.env.CWA_API_KEY 
    ? process.env.CWA_API_KEY 
    : "您的API_KEY填在這裡";
```

### 方法二：從外部 JS 檔案引入

如果 `CWA_API_KEY` 定義在其他 JS 檔案中：

1. **假設您有一個 config.js 檔案：**
```javascript
// assets/config.js
const CWA_API_KEY = "CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX";
```

2. **在 dashboard.html 的 `<head>` 區塊加入：**
```html
<script src="assets/config.js"></script>
```

3. **移除 dashboard.html 中的 CWA_API_KEY 定義**（第 395 行）

### 方法三：從 wrangler.toml 讀取（Cloudflare Workers）

如果部署在 Cloudflare Pages，可以透過 Worker 轉發：

1. **創建 Worker API 端點**：
```javascript
// functions/api/weather-proxy.js
export async function onRequest(context) {
    const CWA_API_KEY = context.env.CWA_API_KEY;
    const { type } = context.params; // 'alert' 或 'forecast'
    
    let apiUrl;
    if (type === 'alert') {
        apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-001?Authorization=${CWA_API_KEY}&format=JSON`;
    } else if (type === 'forecast') {
        apiUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${CWA_API_KEY}&format=JSON`;
    }
    
    const response = await fetch(apiUrl);
    return response;
}
```

2. **修改 dashboard.html 的 API 呼叫**：
```javascript
// 原本：
const alertUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-001?Authorization=${CWA_API_KEY}&format=JSON`;

// 改為：
const alertUrl = '/api/weather-proxy/alert';
const forecastUrl = '/api/weather-proxy/forecast';
```

## 🎯 快速測試

### 1. 檢查 API Key 是否有效
在瀏覽器 Console 執行：
```javascript
console.log('CWA_API_KEY:', CWA_API_KEY);
console.log('Key 長度:', CWA_API_KEY?.length);
console.log('是否為預設值:', CWA_API_KEY === "您的API_KEY填在這裡");
```

### 2. 手動測試氣象 API
```javascript
// 在 Console 執行
fetch(`https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-001?Authorization=${CWA_API_KEY}&format=JSON`)
    .then(r => r.json())
    .then(data => console.log('警特報資料:', data))
    .catch(e => console.error('錯誤:', e));
```

## 🐛 故障排除

### 問題 1：顯示「未設定 CWA_API_KEY」
**原因**：程式讀不到您的 API Key 變數  
**解決**：
1. 確認變數名稱完全一致（區分大小寫）
2. 檢查 JavaScript 載入順序
3. 使用 Console 確認變數值

### 問題 2：CORS 錯誤
**症狀**：Console 顯示 "Access to fetch... has been blocked by CORS policy"  
**解決方案**：
- **開發環境**：安裝 Chrome 擴充套件 "Allow CORS"
- **正式環境**：使用方法三的 Worker 轉發

### 問題 3：API 回傳 401 錯誤
**原因**：API Key 無效或過期  
**解決**：
1. 到氣象署網站確認 API Key 狀態
2. 重新申請新的 API Key
3. 確認 Key 沒有多餘的空格或換行

### 問題 4：跑馬燈不動
**可能原因**：
1. CSS 動畫被其他樣式覆蓋
2. 文字內容太短
3. 瀏覽器不支援 CSS animations

**檢查方式**：
```javascript
// Console 執行
const marquee = document.querySelector('.marquee-text');
const style = window.getComputedStyle(marquee);
console.log('動畫名稱:', style.animationName);
console.log('動畫持續時間:', style.animationDuration);
```

## 📊 功能驗證清單

- [ ] 頁面載入時跑馬燈出現
- [ ] 警特報區塊顯示內容（綠色或紅色背景）
- [ ] 天氣預報區塊顯示臺北市天氣
- [ ] 文字平滑滾動（約 30 秒循環）
- [ ] 有警報時背景變紅色
- [ ] 無警報時背景為綠色
- [ ] Console 無錯誤訊息

## 🎨 自訂設定

### 修改城市（預設為臺北市）
在 dashboard.html 第 444 行附近：
```javascript
// 改為您想要的城市
const locationData = foreData.records.location.find(L => L.locationName === "高雄市");
```

### 修改跑馬燈速度
在 CSS 第 210 行附近：
```css
.marquee-text {
    animation: marquee 30s linear infinite; /* 改為 20s 更快，40s 更慢 */
}
```

### 修改背景顏色
在 CSS 第 177-183 行：
```css
/* 無警報時的背景 */
.weather-marquee-container {
    background: linear-gradient(90deg, #2e7d32, #1b5e20); /* 改為您喜歡的顏色 */
}

/* 有警報時的背景 */
.weather-marquee-container.alert {
    background: linear-gradient(90deg, #d32f2f, #b71c1c); /* 改為您喜歡的顏色 */
}
```

## 📚 相關資源

- [氣象署開放資料平台](https://opendata.cwa.gov.tw/)
- [警特報 API 文件](https://opendata.cwa.gov.tw/dist/opendata-swagger.html#/%E9%A0%90%E5%A0%B1%E3%80%81%E7%89%B9%E5%A0%B1%E3%80%81%E8%AD%A6%E5%A0%B1)
- [天氣預報 API 文件](https://opendata.cwa.gov.tw/dist/opendata-swagger.html#/%E9%A0%90%E5%A0%B1)

## 💡 最佳實踐

1. **安全性**：不要將 API Key 直接寫在前端程式碼中（使用 Worker 轉發）
2. **快取**：可以在 Worker 中加入快取機制，減少 API 呼叫次數
3. **錯誤處理**：確保模擬模式正常運作，避免 API 失敗時頁面卡住
4. **效能**：考慮使用 localStorage 快取氣象資料（5-10 分鐘）

---

📝 **更新日期**：2025/11/30  
🔧 **版本**：v1.0  
👤 **維護者**：BAILUCODE AI IDE
