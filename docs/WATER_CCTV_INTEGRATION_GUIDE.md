# 💧 水利署 CCTV 整合指南

**完成日期：** 2025年11月22日  
**狀態：** ✅ 後端 API 就緒

---

## 📋 快速摘要

### 水利署 vs. 交通部 CCTV 的差異

| 特性 | 水利署 | 交通部 |
|------|-------|-------|
| **資料格式** | 靜態 JPG 圖片 | HLS 影片串流 (.m3u8) |
| **更新頻率** | 1~5 分鐘 | 10~30 秒 |
| **是否需要 Token** | ❌ 否 (開放資料) | ⚠️ 是 (TDX) |
| **API 複雜度** | 簡單 (直接 JSON) | 複雜 (需要認證) |
| **快取策略** | 5 分鐘 (圖片更新慢) | 1-2 分鐘 (影片更新快) |
| **前端播放** | `<img>` 標籤 | HLS.js / video 標籤 |
| **監測對象** | 水庫、河川、堤防 | 高速公路、快速道路 |

---

## 🚀 部署步驟

### Step 1️⃣: 後端 API 已建立
✅ **檔案：** `functions/api/cctv-water.js` (已建立)

**特點：**
- 直接抓取水利署 OpenData (無需 Token)
- 每 5 分鐘更新一次 (圖片更新較慢)
- 自動過濾掉壞資料 (無圖片連結或經緯度)
- D1 資料庫快取

### Step 2️⃣: 確保 D1 資料庫已設定
水利署 API 依賴 D1 資料庫的 `api_cache` 表格。確認：

```sql
-- 應該已經存在 (由前面的氣象、空品 API 建立過)
CREATE TABLE api_cache (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Step 3️⃣: 部署到 Cloudflare

```bash
# 推送程式碼
git add functions/api/cctv-water.js
git commit -m "feat: 新增水利署 CCTV API (functions/api/cctv-water.js)"
git push

# Cloudflare 會自動偵測並部署
```

### Step 4️⃣: 測試 API

在瀏覽器主控台執行：
```javascript
fetch('/api/cctv-water')
  .then(r => r.json())
  .then(d => {
    console.log(`✅ 成功: ${d.length} 個監控點`);
    console.log('第一個:', d[0]);
  })
  .catch(e => console.error('❌ 失敗:', e.message));
```

**應該看到：**
```
✅ 成功: 150 個監控點
第一個: {
  id: "C1A03",
  name: "寶山第二水庫",
  city: "新竹縣",
  river: "頭前溪",
  url: "https://...",
  lat: 24.5678,
  lon: 120.8765,
  time: "2025-11-22T12:30:00Z"
}
```

---

## 💡 前端實裝注意事項

### ❌ 常見錯誤：把圖片當影片處理

```javascript
// ❌ 錯誤：不要用 HLS.js (這不是影片!)
if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(url);  // 水利署 URL 不是 .m3u8，會報錯！
    hls.attachMedia(video);
}
```

### ✅ 正確做法：當作圖片處理

```html
<!-- 最簡單的做法：直接用 img 標籤 -->
<div class="water-camera">
    <h3>寶山水庫</h3>
    <img 
        src="https://..." 
        alt="即時監控影像"
        style="width: 100%; border-radius: 8px;"
    >
    <p class="timestamp">最後更新: 12:30</p>
</div>
```

### 🚀 進階技巧：模擬即時感 (每分鐘自動刷新)

```javascript
// 因為水利署提供的是靜態圖片，可以每分鐘強制刷新
function refreshWaterCameras() {
    fetch('/api/cctv-water')
        .then(r => r.json())
        .then(cameras => {
            cameras.forEach(camera => {
                const img = document.getElementById(`water-cam-${camera.id}`);
                if (img) {
                    // 加上時間戳記參數，強制瀏覽器重新下載圖片
                    img.src = camera.url + '?t=' + new Date().getTime();
                }
            });
        });
}

// 初始載入
refreshWaterCameras();

// 每 60 秒刷新一次 (配合水利署 5 分鐘的更新頻率)
setInterval(refreshWaterCameras, 60000);
```

### 🎯 完整範例：水利署監控地圖

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>台灣水利監控</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
    <style>
        #map { height: 500px; }
        .camera-card {
            background: white;
            border-radius: 8px;
            padding: 12px;
            margin: 8px 0;
            border-left: 4px solid #0066cc;
        }
        .camera-card img {
            width: 100%;
            border-radius: 4px;
            margin: 8px 0;
        }
        .timestamp {
            font-size: 0.85em;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>💧 台灣水利監控</h1>
    
    <!-- 地圖 -->
    <div id="map"></div>
    
    <!-- 監控列表 -->
    <div id="camera-list"></div>

    <script>
        // 初始化 Leaflet 地圖
        let map = L.map('map').setView([23.6, 120.9], 7);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

        // 載入水利署 CCTV 資料
        async function loadWaterCameras() {
            try {
                const res = await fetch('/api/cctv-water');
                const cameras = await res.json();

                const listContainer = document.getElementById('camera-list');
                listContainer.innerHTML = '';

                cameras.forEach(camera => {
                    // 1. 在地圖上標記
                    L.circleMarker([camera.lat, camera.lon], {
                        radius: 6,
                        fillColor: '#0066cc',
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    })
                    .bindPopup(`
                        <b>${camera.name}</b><br>
                        ${camera.city} ${camera.river}<br>
                        <img src="${camera.url}" style="width: 200px; margin-top: 8px;">
                    `)
                    .addTo(map);

                    // 2. 在列表上顯示
                    const card = document.createElement('div');
                    card.className = 'camera-card';
                    card.innerHTML = `
                        <h3>${camera.name}</h3>
                        <p>${camera.city} - ${camera.river}</p>
                        <img src="${camera.url}?t=${new Date().getTime()}" alt="${camera.name}">
                        <p class="timestamp">ID: ${camera.id} | 時間: ${new Date(camera.time).toLocaleTimeString('zh-TW')}</p>
                    `;
                    listContainer.appendChild(card);
                });

                console.log(`✅ 成功載入 ${cameras.length} 個監控點`);
            } catch (e) {
                console.error('❌ 載入失敗:', e);
                document.getElementById('camera-list').innerHTML = '<p style="color: red;">無法載入資料</p>';
            }
        }

        // 初始載入
        loadWaterCameras();

        // 每 60 秒刷新一次
        setInterval(loadWaterCameras, 60000);
    </script>
</body>
</html>
```

---

## 📊 API 回應範例

### 請求
```
GET /api/cctv-water
```

### 回應 (200 OK)
```json
[
  {
    "id": "C1A03",
    "name": "寶山第二水庫",
    "city": "新竹縣",
    "river": "頭前溪",
    "url": "https://opendata.wra.gov.tw/...",
    "lat": 24.5678,
    "lon": 120.8765,
    "time": "2025-11-22T12:30:00Z"
  },
  {
    "id": "C1A04",
    "name": "竹東堤防",
    "city": "新竹縣",
    "river": "頭前溪",
    "url": "https://opendata.wra.gov.tw/...",
    "lat": 24.6789,
    "lon": 120.9876,
    "time": "2025-11-22T12:30:00Z"
  },
  ...
]
```

---

## 🔧 技術細節

### 為什麼要 5 分鐘快取？

| 原因 | 說明 |
|------|------|
| **水利署更新頻率** | 通常 1~5 分鐘更新一次 (圖片較小，更新較慢) |
| **頻繁刷新無益** | 圖片沒變，白白浪費頻寬 |
| **用戶體驗** | 5 分鐘一更新已經足夠監控水情 |
| **成本控制** | 減少 API 呼叫，節省頻寬 |

### D1 資料庫的作用

- **快速回傳**：直接從 D1 回傳，不用每次都去水利署拉資料
- **背景更新**：當資料過期時，在背景更新，不阻擋使用者請求
- **冷啟動保護**：如果水利署 API 故障，可以使用最後一次成功的資料

### 為什麼用 JPG 而不是 HLS？

水利署提供的是監控攝影機的「靜態快照」(每 1~5 分鐘拍一張)，而不是連續的影片串流。這樣做的好處：
- 省頻寬 (JPG 比 HLS 小很多)
- 減少伺服器負擔
- 對於監控水情來說足夠了 (不需要即時高幀率視頻)

---

## 📱 前端集成檢查清單

```
□ 已從 /api/cctv-water 讀取資料
□ 使用 <img> 標籤顯示圖片 (不要用 HLS.js)
□ 加入時間戳記參數強制刷新 (?t=...)
□ 每 60 秒自動刷新一次
□ 在 Leaflet 地圖上標記位置
□ 加入錯誤處理和 Loading 狀態
□ 測試在手機上的響應式設計
```

---

## 🐛 常見問題

### Q: 為什麼圖片不更新？

**原因 1：瀏覽器快取**
```javascript
// ❌ 直接設定 src，瀏覽器會快取
img.src = url;

// ✅ 加上時間戳記參數，強制重新下載
img.src = url + '?t=' + new Date().getTime();
```

**原因 2：水利署伺服器還沒更新**
- 水利署的更新頻率是 1~5 分鐘，有時候會延遲
- 不用特別刷新超過 1 次/分鐘

### Q: 為什麼有些監控點沒有圖片？

- 可能正在維修
- 可能網路斷線
- 可能權限問題
- API 會自動過濾掉沒有圖片連結的資料

### Q: 如何只顯示特定縣市？

```javascript
// 過濾只顯示新竹縣的監控點
const newhuiCameras = cameras.filter(c => c.city === '新竹縣');
```

### Q: 能不能整合天氣資料？

可以的！可以在水庫旁邊加上：
```javascript
// 例如在寶山水庫旁加上鄰近的氣象測站
const nearbyWeather = weatherStations.filter(w => 
    Math.abs(w.lat - camera.lat) < 0.1 && 
    Math.abs(w.lon - camera.lon) < 0.1
);
```

---

## 📚 相關資源

### 官方資料
- **水利署開放資料平台：** https://opendata.wra.gov.tw/
- **API 端點：** https://opendata.wra.gov.tw/api/v2/...

### 前端框架
- **Leaflet.js：** 地圖顯示
- **HLS.js：** 如果要播放影片 (但水利署是圖片，不需要)

### 相關 API
- `functions/api/air-quality.js` - 空品 API
- `functions/api/weather-stations.js` - 氣象 API
- `functions/api/cctv-water.js` - 水利署 CCTV

---

## ✨ 完成檢查清單

```
✅ 後端 API 已建立 (cctv-water.js)
✅ D1 資料庫表格已存在 (api_cache)
✅ 無需 Token (開放資料)
✅ 快取策略已設定 (5 分鐘)
⏳ 需要推送代碼到 GitHub
⏳ 需要在前端整合顯示
```

---

**部署就緒！💧**

下一步是在前端頁面整合顯示水利署的監控圖片。如果你想要一個完整的水利監控頁面，我可以幫你建立！
