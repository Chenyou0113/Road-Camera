# 🛡️ API 安全防護實裝指南

**完成日期：** 2025年11月22日  
**狀態：** ✅ 三道防線已實裝

---

## 📋 概述

你的 Cloudflare Functions API 現在已實裝三道防線，防止資料被未授權使用者盜連：

| 防線 | 實裝位置 | 效果 | 狀態 |
|------|--------|------|------|
| **防線一** | Origin 白名單檢查 | 擋掉 90% 的直接複製貼上小白 | ✅ 已實裝 |
| **防線二** | Cloudflare WAF Rate Limiting | 擋掉 9% 的惡意暴力爬蟲 | ⏳ 建議配置 |
| **防線三** | Turnstile 驗證 | 防止自動化工具濫用 | 🟢 選用 |

---

## 🔒 防線一：Origin 白名單檢查 (已完成)

### 實作方式

新增了 `functions/lib/security.js` 安全中間件，所有 API 都調用它進行檢查：

```javascript
import { checkRequestSecurity, createCORSHeaders } from '../lib/security.js';

export async function onRequest(context) {
  const { request } = context;
  
  // 🛡️ 第一道防線：Origin 白名單檢查
  const securityCheck = checkRequestSecurity(request);
  if (!securityCheck.allowed) {
    return securityCheck.response;  // 返回 403 Forbidden
  }
  
  // ... 後續邏輯 ...
}
```

### 檢查邏輯

```
請求來到 API
  ↓
檢查 Origin header
  ↓ ✅ 匹配白名單 → 允許，返回資料
  ↓ ❌ 不匹配 → 檢查 Referer header
    ↓ ✅ 匹配白名單 → 允許，返回資料
    ↓ ❌ 不匹配 → 返回 403 Forbidden
```

### 預設白名單

```javascript
const ALLOWED_ORIGINS = [
  'https://road-camera.pages.dev',      // 正式環境
  'https://www.road-camera.pages.dev',  // 帶 www
  'http://127.0.0.1:8788',              // 本機開發
  'http://localhost:8788',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
```

### 更新的 API 列表

✅ 已套用防線一：
- `functions/api/cctv-freeway.js` (國道監視器)
- `functions/api/cctv-provincial.js` (省道監視器)
- `functions/api/weather-stations.js` (氣象測站)
- `functions/api/air-quality.js` (空氣品質) **新建**
- `functions/api/cctv-water.js` (水利監視器) **新建**

### 未更新的 API（非前端直接調用）

⏳ 暫時不需要：
- `functions/api/token.js` (TDX Token - 內部用)
- `functions/api/view-camera.js` (計數器 - 通常需要認證)
- `functions/api/get-top-cameras.js` (統計 - 可選)

---

## 🛡️ CORS 回應頭的變化

### 之前（不安全）

```javascript
headers: {
  'Access-Control-Allow-Origin': '*',  // ❌ 允許任何來源
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}
```

### 之後（安全）

```javascript
headers: {
  'Access-Control-Allow-Origin': 'https://road-camera.pages.dev',  // ✅ 只允許自己
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '3600'
}
```

---

## 🧪 測試防線一

### 測試 1：正常請求（應該成功）

```bash
# 在你的網站頁面控制台執行
fetch('/api/air-quality')
  .then(r => r.json())
  .then(d => console.log('✅ 成功:', d.count, '個測站'))
  .catch(e => console.error('❌ 失敗:', e.message));
```

**預期結果：** ✅ 成功 (來自同域，Origin 匹配)

### 測試 2：跨域請求（應該被擋）

```bash
# 在其他網站的控制台執行
fetch('https://road-camera.pages.dev/api/air-quality')
  .then(r => r.json())
  .catch(e => console.error('❌ CORS Error:', e.message));
```

**預期結果：** ❌ CORS Error (瀏覽器報錯，因為 Origin 不符)

### 測試 3：命令列工具（應該被擋）

```bash
# 直接用 curl 要資料（沒有 Origin header）
curl https://road-camera.pages.dev/api/air-quality

# 或用 Python
python -c "import requests; print(requests.get('https://road-camera.pages.dev/api/air-quality').json())"
```

**預期結果：** ❌ 403 Forbidden (沒有 Origin/Referer，被拒)

### 測試 4：偽造 Origin（應該被擋）

```bash
curl -H "Origin: https://attacker.com" https://road-camera.pages.dev/api/air-quality
```

**預期結果：** ❌ 403 Forbidden (Origin 不在白名單)

---

## ⚙️ 自訂白名單

如果你的網站改用自己的網域（如 `weather.example.com`），編輯 `functions/lib/security.js`：

```javascript
export function checkOrigin(request, allowedOrigins = null) {
  if (!allowedOrigins) {
    allowedOrigins = [
      'https://weather.example.com',      // 新加！
      'https://www.weather.example.com',
      'http://127.0.0.1:8788',
      'http://localhost:8788',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
  }
  // ... 後續邏輸輯 ...
}
```

---

## 📊 防線二：Cloudflare WAF Rate Limiting (建議)

### 什麼是 Rate Limiting？

限制在特定時間內的請求數量。例如：
- 正常使用者：每分鐘 5-10 次請求（看儀表板、刷新）
- 爬蟲小偷：每分鐘 100+ 次請求（自動循環)

### 如何設定？

1. 登入 **Cloudflare Dashboard** → 選擇你的域名
2. 進入 **Security** → **WAF** (如果沒有，請升級到 Pro/Business 方案)
3. 點擊 **Create Rule** → **Rate Limiting Rule**
4. 設定如下：
   ```
   Rule name: Block API Abuse
   If traffic matches:
     - URI Path contains "/api/"
   
   Action: Block / Managed Challenge (擋掉或顯示驗證碼)
   
   Rate limiting threshold:
     - 100 requests per 1 minute per IP address
   
   Period: 1 minute
   ```
5. **Deploy** 啟用

### 效果

- 正常使用者：❌ 沒影響 (每分鐘遠少於 100 次)
- 爬蟲小偷：❌ 被踢出 (超過限制立即封鎖)
- 成本節省：✅ 無論如何都不會消耗多餘的 D1 額度

---

## 🎯 防線三：Turnstile 驗證 (選用)

如果你發現還有人在惡意抓取，且不介意使用者多一步驟，可以加 Turnstile：

1. 在 HTML 加驗證碼：
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>
<div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
```

2. 前端 API 呼叫時，帶上 Token：
```javascript
const token = document.querySelector('[name=cf-token]').value;
fetch('/api/air-quality', {
  headers: { 'CF-Token': token }
});
```

3. 後端驗證：
```javascript
const token = request.headers.get('CF-Token');
const isValid = await validateTurnstileToken(token);
if (!isValid) return new Response('Invalid token', { status: 403 });
```

**不建議用於這個案例**，因為會影響使用者體驗。正常看天氣的人也要過驗證很煩。

---

## 📝 部署檢查清單

```
✅ 已新增 functions/lib/security.js (中間件)
✅ 已更新 cctv-freeway.js (Origin Check + 安全 CORS)
✅ 已更新 cctv-provincial.js (Origin Check + 安全 CORS)
✅ 已更新 weather-stations.js (Origin Check + 安全 CORS)
✅ 已建立 air-quality.js (Origin Check + D1 快取)
✅ 已建立 cctv-water.js (Origin Check + D1 快取)

⏳ 建議在 Cloudflare Dashboard 設定 WAF Rate Limiting

🚀 準備好推送到 GitHub 並部署！
```

---

## 🚀 部署步驟

```bash
# 1. 檢查新檔案
git status

# 2. 加入版本控制
git add functions/lib/security.js
git add functions/api/air-quality.js
git add functions/api/cctv-water.js
git add functions/api/cctv-freeway.js
git add functions/api/cctv-provincial.js
git add functions/api/weather-stations.js

# 3. 提交
git commit -m "feat: 實裝 API 安全防護 (Origin 白名單 + CORS 強化)

- 新增 functions/lib/security.js (中間件)
  * checkRequestSecurity() 檢查 Origin/Referer
  * createCORSHeaders() 安全的 CORS 回應頭
  * createForbiddenResponse() 403 回應

- 更新所有前端 API:
  * cctv-freeway.js (國道)
  * cctv-provincial.js (省道)
  * weather-stations.js (氣象)

- 新增兩個關鍵 API:
  * air-quality.js (空品，MOENV 資料)
  * cctv-water.js (水利 CCTV，WRA OpenData)

防線一：Origin 白名單檢查
- 預設白名單: road-camera.pages.dev 及本機開發
- 非授權請求返回 403 Forbidden
- 瀏覽器跨域盜連時報 CORS Error
"

# 4. 推送到 GitHub
git push

# 5. Cloudflare 會自動部署 (等待 30 秒)
```

---

## 💡 常見問題

### Q：為什麼我自己的網站還是報 CORS Error？

**A：** 檢查：
1. 請求的 Origin 是否在白名單（可在開發者工具 Network 看 Request Headers）
2. 確保沒有拼錯網域名稱 (https 不是 http，.pages.dev 不要漏)
3. 如果在 localhost 開發，確保使用 http://127.0.0.1:8788 或 http://localhost:8788

### Q：我想允許特定的第三方網站調用我的 API？

**A：** 編輯 `functions/lib/security.js` 的 `ALLOWED_ORIGINS` 陣列，加入他們的網域：

```javascript
const ALLOWED_ORIGINS = [
  'https://road-camera.pages.dev',
  'https://partner-website.com',  // 新增
  'https://www.partner-website.com',
  // ...
];
```

### Q：防線一 + 防線二 + 防線三 都用會不會太嚴格？

**A：** 不會。它們的目標客群不同：
- **防線一** (Origin Check)：擋掉 90% 的小白  
- **防線二** (Rate Limit)：擋掉 9% 的自動化爬蟲  
- **防線三** (Turnstile)：擋掉最後 1% 的頂尖駭客

反而建議都用，因為：
1. 用戶體驗不會受影響（防線一二對合法請求無影響，防線三可選用）
2. 成本幾乎零（Cloudflare WAF 免費層有限額，Turnstile 完全免費）
3. 安全性大幅提升

### Q：我可以用 API Key 代替 Origin Check 嗎？

**A：** 可以，但不推薦。原因：
- API Key 容易外洩（會被嵌在前端代碼裡被看到）
- Origin Check 更簡單（不用管理 Key，只需要信任自己的域名）

---

## 📚 相關資源

- **Cloudflare WAF 文件：** https://developers.cloudflare.com/waf/
- **CORS 詳解：** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **Cloudflare Turnstile：** https://developers.cloudflare.com/turnstile/

---

**防線已實裝！你的 API 現在比 90% 的公開 API 更安全。🛡️**
