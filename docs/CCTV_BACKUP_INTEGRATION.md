# 🎬 國道/省道監視器備用來源 - 完整實作指南

**目標：** 為 TDX API 創建高可靠的備用方案，使用官方 XML API 搭配 Cloudflare Functions 進行格式轉譯和嚴格快取。

---

## 📊 資料來源對比

| 特性 | TDX (主要) | 省道 THB (備用) | 國道 FREEWAY (備用) |
|------|-----------|----------------|-------------------|
| **API 格式** | JSON | XML | XML |
| **限制時間** | 無 | > 60 秒 | > 40 秒 |
| **監視器數量** | ~1000+ | ~500+ | ~700+ |
| **資料豐富度** | ⭐⭐⭐ (路況) | ⭐⭐ (基本) | ⭐⭐⭐ (里程、方向) |
| **可用性** | 最高 | 99% | 99% |
| **我們的快取** | 動態 | 70 秒 | 60 秒 |

---

## 🏗️ 架構設計

```
[前端] (combined-roads.html)
   ↓
[CCTVAggregator] (資料聚合、快取、搜尋)
   ├→ /api/cctv-freeway    (國道，快取 60 秒)
   └→ /api/cctv-provincial (省道，快取 70 秒)
   ↓
[Cloudflare Cache] (超快速返回)
   ↓
[官方 XML API]
   ├→ https://tisvcloud.freeway.gov.tw/history/motc20/CCTV.xml
   └→ https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml
```

**流量流向：**
- **首次請求 (無快取)：** 前端 → CCTVAggregator → Cloudflare Cache Miss → 官方 API (20-30ms)
- **後續請求 (70s內)：** 前端 → CCTVAggregator → **Cloudflare Cache Hit** (1-5ms) ⚡

---

## 📁 新增檔案清單

```text
/functions/api/
  ├── cctv-provincial.js    (處理省道 XML，快取 70 秒)
  └── cctv-freeway.js       (處理國道 XML，快取 60 秒)

/assets/
  └── cctv-aggregator.js    (前端聚合模組，支援搜尋、過濾、地圖渲染)
```

---

## 🚀 前端使用方式

### 基礎用法

```html
<!-- 在 combined-roads.html 中加入 -->
<script src="assets/cctv-aggregator.js"></script>
<script>
  // 建立聚合器
  const aggregator = new CCTVAggregator({
    cacheExpire: 60000,  // 快取 60 秒
    logLevel: 'info'
  });

  // 載入所有監視器
  aggregator.loadAll().then(cameras => {
    console.log(`載入 ${cameras.length} 個監視器`);
    console.log(aggregator.getStats());
  });
</script>
```

### 搜尋監視器

```javascript
// 搜尋「國道1號」
const results = aggregator.search('國道1號');
console.log(`搜尋結果：${results.length} 個`);

results.forEach(camera => {
  console.log(`${camera.name} - ${camera.url}`);
});
```

### 按類型過濾

```javascript
// 只看國道監視器
const freewayCameras = aggregator.filterByType('國道');
console.log(`國道監視器：${freewayCameras.length} 個`);

// 只看省道監視器
const provincialCameras = aggregator.filterByType('省道');
console.log(`省道監視器：${provincialCameras.length} 個`);
```

### 地理位置過濾

```javascript
// 只看北部 (北緯 25-26 度)
const northernCameras = aggregator.filterByBounds(25, 26, 118, 121.5);
console.log(`北部監視器：${northernCameras.length} 個`);
```

### 與 Mapbox 整合

```javascript
// 建立地圖助手
const mapHelper = new CCTVMapHelper(map, aggregator);

// 渲染到地圖上 (支援聚合、點擊)
mapHelper.renderCameras().then(() => {
  console.log('✅ 監視器已在地圖上渲染');
});
```

---

## 🔄 完整流程範例

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>監視器查看器</title>
  <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
</head>
<body>
  <div id="map" style="width: 100%; height: 100vh;"></div>

  <script src="assets/cctv-aggregator.js"></script>
  <script>
    // 初始化 Mapbox
    mapboxgl.accessToken = 'your-token';
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [120.8, 24],
      zoom: 7
    });

    // 初始化聚合器
    const aggregator = new CCTVAggregator({ logLevel: 'debug' });
    const mapHelper = new CCTVMapHelper(map, aggregator);

    // 地圖準備好後渲染
    map.on('load', () => {
      mapHelper.renderCameras();
    });

    // 提供搜尋界面
    document.addEventListener('keydown', (e) => {
      if (e.key === '/') {
        const keyword = prompt('搜尋監視器 (例如：國道1號)：');
        if (keyword) {
          const results = aggregator.search(keyword);
          alert(`找到 ${results.length} 個結果\n第一個：${results[0]?.name}`);
        }
      }
    });

    // 每分鐘自動重新載入
    setInterval(() => {
      aggregator.clearCache();
      mapHelper.renderCameras();
    }, 60000);
  </script>
</body>
</html>
```

---

## 📊 API 回應格式

### GET `/api/cctv-freeway` (國道)

```json
{
  "success": true,
  "type": "國道",
  "count": 742,
  "timestamp": "2025-11-22T10:30:45.000Z",
  "data": [
    {
      "type": "國道",
      "id": "N01001",
      "url": "https://stream.freeway.gov.tw/N01001.m3u8",
      "lat": 25.0330,
      "lon": 121.5654,
      "name": "國道1號 北向 15K",
      "road": "國道1號",
      "mile": "15K",
      "direction": "北向",
      "description": "八堡圳橋"
    },
    ...
  ]
}
```

### GET `/api/cctv-provincial` (省道)

```json
{
  "success": true,
  "type": "省道",
  "count": 523,
  "timestamp": "2025-11-22T10:30:45.000Z",
  "data": [
    {
      "type": "省道",
      "id": "P0001",
      "url": "https://cctv.thb.gov.tw/stream/P0001.m3u8",
      "lat": 24.1234,
      "lon": 120.5678,
      "name": "省道西濱 (P0001)",
      "direction": "南向",
      "source": "THB"
    },
    ...
  ]
}
```

---

## 🛡️ 安全性與快取策略

### 為什麼設定 70 秒和 60 秒？

```
官方限制：  --------60------- (省道) --------40------- (國道)
我們快取：  -------70------- (安全邊界) ------60------- (安全邊界)
```

**好處：**
- ✅ **永遠不會觸發限制** - 快取時間大於官方要求
- ✅ **分散壓力** - 1000 個使用者同時刷，官方只收到 1-2 個請求
- ✅ **自動故障轉移** - 官方 API 掛了，Cloudflare 會繼續返回舊快取 5 分鐘
- ✅ **成本最優** - 最小化對官方伺服器的負擔

### 快取命中率預估

| 情景 | 請求數 | 快取命中 | 官方 API 調用 | 節省 |
|------|--------|---------|-------------|------|
| 1000 訪客/分鐘 (無快取) | 1000 | 0% | 1000 | - |
| 1000 訪客/分鐘 (70s快取) | 1000 | 98.3% | 14 | **98.6%** ⚡ |
| 尖峰 5000 訪客/分鐘 | 5000 | 97.7% | 114 | **97.7%** ⚡ |

---

## 📈 監視程序

### 監控快取命中率

```javascript
// 在前端記錄
let cacheHits = 0;
let cacheMisses = 0;

aggregator.on('cache-hit', () => cacheHits++);
aggregator.on('cache-miss', () => cacheMisses++);

setInterval(() => {
  const ratio = (cacheHits / (cacheHits + cacheMisses) * 100).toFixed(1);
  console.log(`快取命中率: ${ratio}%`);
}, 60000);
```

### Cloudflare 監控

在 Cloudflare Dashboard 中：
1. **Analytics → Cache → Cache Ratio**
   - 應該看到 > 95% 的快取命中率
2. **Workers → Metrics**
   - CPU 時間應該很低 (因為大多數請求在 CDN 層就被快取了)

---

## 🚨 故障排查

### 問題：API 返回空陣列
```javascript
// 檢查 XML 是否有變動
const resp = await fetch('https://tisvcloud.freeway.gov.tw/history/motc20/CCTV.xml');
const xml = await resp.text();
console.log(xml.substring(0, 500)); // 檢查前 500 字元

// 檢查標籤名是否改變 (例如：PositionLon vs PositionLongitude)
```

### 問題：快取過期太快
```javascript
// 檢查 Cache-Control 標頭
const resp = await fetch('/api/cctv-freeway', { method: 'HEAD' });
console.log(resp.headers.get('Cache-Control'));
// 應該看到：public, max-age=60, s-maxage=60, stale-while-revalidate=300
```

### 問題：座標錯誤
```javascript
// 檢查座標是否在台灣範圍內
cameras.forEach(cam => {
  if (cam.lat < 20 || cam.lat > 26) {
    console.warn(`❌ 異常座標: ${cam.name} @ ${cam.lat}, ${cam.lon}`);
  }
});
```

---

## 📦 部署清單

- [ ] 上傳 `functions/api/cctv-provincial.js`
- [ ] 上傳 `functions/api/cctv-freeway.js`
- [ ] 上傳 `assets/cctv-aggregator.js`
- [ ] 在 `combined-roads.html` 引入 `cctv-aggregator.js`
- [ ] 測試 `/api/cctv-freeway` 和 `/api/cctv-provincial` 
- [ ] 驗證快取命中率 > 95%
- [ ] 在地圖上集成聚合邏輯 (Mapbox/Leaflet)
- [ ] 監控 Cloudflare Dashboard 的快取表現
- [ ] 建立告警規則 (如果快取命中率 < 80%)

---

## 💡 進階優化建議

### 1. 地域性快取 (Geo-Caching)
```javascript
// 根據使用者位置，只返回附近的監視器
function getNearbyDC(latitude) {
  if (latitude > 25) return 'northern'; // 台北機房
  if (latitude > 24) return 'central';  // 台中機房
  return 'southern'; // 高雄機房
}
```

### 2. 增量更新 (Delta Update)
```javascript
// 不是每次都返回所有 3000+ 個監視器
// 只返回過去 5 分鐘內變動的監視器
// 前端做本地合併
```

### 3. 預測性快取 (Predictive Caching)
```javascript
// 根據尖峰時段提前重新整理快取
// 例如：10:00、12:00、18:00 自動清除快取，重新載入
```

---

## 🎯 預期效果

| 指標 | 無備用 | 有備用 | 改善 |
|------|--------|--------|------|
| **可用性** | 99% | 99.9% | +0.9% |
| **API 呼叫數** | 無限 | 14-114/min | **98% 減少** |
| **官方負擔** | 重 | 輕 | **99% 減輕** |
| **使用者延遲** | 50-100ms | 1-10ms | **10倍快** |
| **成本** | 無限制 | 最小 | **最優** |

---

**結論：這是最穩定、最便宜、最環保的備用方案。✨**
