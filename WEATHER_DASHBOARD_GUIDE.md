# 🌤️ 全台天氣儀表板 - 部署指南

**完成日期：** 2025年11月22日  
**狀態：** ✅ 就緒部署

---

## 📋 快速開始

### 1️⃣ 設定環境變數 (Cloudflare Dashboard)

進入 Cloudflare Pages 後台：

1. **進入你的 Pages 專案** → **Settings** → **Environment variables**
2. **新增變數：**
   - **變數名稱：** `CWA_API_KEY`
   - **值：** `CWA-675CED45-09DF-4249-9599-B9B5A5AB761A`
3. **保存並重新部署** (Redeploy)

### 2️⃣ 檔案清單

新增/修改的檔案：

```
✅ functions/api/weather-stations.js    (新增) - 後端 API，清洗 CWA 資料
✅ weather-dashboard.html               (新增) - 前端儀表板頁面
```

### 3️⃣ 部署

```bash
# 1. 確保環境變數已設定在 Cloudflare Dashboard
# 2. 推送代碼到 GitHub
git add functions/api/weather-stations.js weather-dashboard.html
git commit -m "feat: 新增全台天氣儀表板（CWA API 整合）"
git push

# 3. Cloudflare 會自動部署
# 4. 打開 https://your-domain/weather-dashboard.html
```

---

## 🏗️ 架構說明

### 資料流向

```
[CWA 氣象署 API]
    ↓
[Cloudflare Functions: weather-stations.js]
    ├─ 檢查 5 分鐘快取
    ├─ 清洗複雜 JSON 結構
    ├─ 過濾無效資料
    └─ 返回乾淨 JSON
    ↓
[前端: weather-dashboard.html]
    ├─ 繪製地圖標記
    ├─ 顯示統計資料
    └─ 實時更新 (每 5 分鐘)
```

### API 端點

**GET `/api/weather-stations`**

請求：無參數

回應範例：
```json
{
  "success": true,
  "count": 400,
  "timestamp": "2025-11-22T10:30:00Z",
  "data": [
    {
      "id": "C0A710",
      "name": "台北",
      "city": "台北市",
      "town": "中正區",
      "lat": 25.0330,
      "lon": 121.5654,
      "temp": 22.5,
      "humid": 65.0,
      "pressure": 1013.2,
      "wind_speed": 2.1,
      "wind_dir": 180,
      "rain": 0.0,
      "uvi": 3.5,
      "time": "2025-11-22T10:20:00Z"
    },
    ...
  ]
}
```

---

## 💡 技術亮點

### 1. 資料清洗 (後端)

CWA 的原始 JSON 非常深層：
```javascript
// ❌ 原始 (痛苦)
rawData.cwaopendata.dataset.Station[0].WeatherElement.AirTemperature

// ✅ 清洗後 (簡單)
cleanData[0].temp
```

### 2. 容錯機制

- `-99` / `-98` 自動轉成 `null` (故障代碼)
- 無經緯度的站點自動過濾
- API 失敗自動使用 5 分鐘快取

### 3. 視覺化

- 根據溫度自動著色（紅熱藍冷）
- 使用 Leaflet 高效繪製 400+ 圓點標記
- 點擊查看詳細資訊

### 4. 性能優化

- 5 分鐘邊緣快取 (s-maxage=300)
- 僅返回必要欄位
- 自動刷新而不重新加載整個頁面

---

## 🧪 測試方法

### 方法 1：瀏覽器開啟

```
https://your-domain/weather-dashboard.html
```

應該看到：
- ✅ 全台地圖with彩色圓點
- ✅ 左側統計數據
- ✅ 自動更新 (每 5 分鐘)

### 方法 2：API 測試

```bash
# 在瀏覽器主控台執行
fetch('/api/weather-stations')
  .then(r => r.json())
  .then(d => console.log(`✅ 成功載入 ${d.count} 個測站`))
  .catch(e => console.error('❌ 失敗:', e.message))
```

### 方法 3：檢查快取

```bash
# 應該看到 X-Cache: HIT 或 MISS
curl -i https://your-domain/api/weather-stations | grep X-Cache
```

---

## 📊 監控指標

### 性能

| 指標 | 目標 | 說明 |
|------|------|------|
| **API 回應時間** | < 100ms | 如果有快取，< 10ms |
| **地圖渲染** | < 500ms | 400+ 標記 |
| **首屏加載** | < 2s | 包括地圖初始化 |
| **快取命中率** | > 95% | 大部分請求命中快取 |

### Cloudflare Dashboard 查看

1. 進入專案 → **Analytics**
2. 檢查：
   - **Cache Ratio** - 應該 > 95%
   - **Requests** - 天氣站點 API 呼叫次數
   - **Error Rate** - 應該接近 0%

---

## 🐛 故障排查

### 問題：頁面空白或無資料

**檢查清單：**
1. ✅ CWA_API_KEY 是否設定在 Cloudflare 環境變數？
2. ✅ 有沒有重新部署 (Redeploy)？
3. ✅ 瀏覽器主控台 (F12) 有沒有錯誤訊息？

**解決方案：**
```javascript
// 在瀏覽器主控台執行診斷
fetch('/api/weather-stations')
  .then(r => {
    console.log('狀態碼:', r.status);
    console.log('快取:', r.headers.get('X-Cache'));
    return r.json();
  })
  .then(d => console.log('資料:', d))
  .catch(e => console.error('錯誤:', e))
```

### 問題：API Key 無效

**檢查：**
```bash
# 直接測試 CWA API (不透過 Cloudflare)
curl "https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/O-A0003-001?Authorization=YOUR_API_KEY&downloadType=WEB&format=JSON"
```

如果返回 `"error": "Invalid API Key"`，請確認 API Key 正確。

### 問題：某些測站無溫度資料

這是正常的，CWA 的某些測站沒有實時溫度。頁面會顯示 `無資料` 而不是報錯。

---

## 📈 後續改進建議

### 短期 (容易實現)

1. **搜尋和過濾** - 按縣市篩選測站
2. **趨勢圖表** - 顯示溫度時間序列
3. **預警功能** - 溫度超過 35°C 警告

### 中期 (需要資料庫)

1. **歷史資料** - 保存每小時快照
2. **比較功能** - 與去年同期比較
3. **排行榜** - 最熱/最冷縣市

### 長期 (進階功能)

1. **預報整合** - 加入 CWA 的 7 天預報
2. **移動應用** - 開發 Android/iOS 版本
3. **通知系統** - 推播極端天氣警告

---

## 📞 技術支援

### 常見問題

**Q: 為什麼不直接在前端呼叫 CWA API？**
A: CWA JSON 結構太複雜，前端代碼會很冗長且容易出錯。後端清洗後，前端代碼簡潔得多。

**Q: 快取 5 分鐘會不會太久？**
A: 氣象資料通常 10-15 分鐘更新一次，5 分鐘是個好的平衡點。如需更頻繁更新，改快取時間即可。

**Q: 可以自己部署在 Vercel/Netlify 嗎？**
A: 這份代碼是 Cloudflare Pages Functions 專用。如要用其他平台，需要改用相應的 serverless 框架 (如 Vercel Serverless Functions)。

### 聯繫方式

如有問題，請：
1. 檢查 Cloudflare Dashboard 的 **Workers** → **Logs**
2. 檢查瀏覽器 DevTools (F12) → **Console**
3. 參考本文檔的故障排查部分

---

## 📄 相關文檔

- `functions/api/weather-stations.js` - 後端代碼註解詳細
- `weather-dashboard.html` - 前端代碼註解清晰

---

**部署完成！祝你使用愉快！🌤️**
