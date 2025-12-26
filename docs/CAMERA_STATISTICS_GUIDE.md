# 📊 相機觀看統計 - 完整整合指南

## 📋 目錄
1. [概述](#概述)
2. [系統架構](#系統架構)
3. [API 端點](#api-端點)
4. [前端整合](#前端整合)
5. [使用範例](#使用範例)
6. [監控和分析](#監控和分析)
7. [效能最佳化](#效能最佳化)
8. [常見問題](#常見問題)

---

## 概述

這個相機觀看統計系統讓你能夠：

✅ **追蹤觀看** - 當使用者點擊相機時，自動增加觀看次數
✅ **熱門排行** - 顯示觀看次數最多的相機
✅ **統計分析** - 計算平均觀看、最多觀看等數據
✅ **實時更新** - 自動刷新排行，無需手動重載
✅ **快取優化** - 減少數據庫查詢，提高效能

### 關鍵特性

| 功能 | 說明 |
|------|------|
| 📍 自動追蹤 | 點擊相機時自動計數 |
| 🏆 排行榜 | 實時顯示熱門相機 |
| 💾 資料持久化 | 使用 Cloudflare D1 資料庫 |
| ⚡ 邊緣計算 | 在全球 CDN 上執行 |
| 🔒 安全 | 伺服器端驗證，無客戶端直接數據庫訪問 |
| 📦 快取支援 | 前端和後端快取，減少查詢 |

---

## 系統架構

### 整體流程圖

```
前端 (Browser)
    ↓
    └─→ [點擊相機按鈕]
        ↓
        └─→ trackCameraView(id)
            ↓
            └─→ POST /api/view-camera
                ↓
                └─→ Cloudflare Pages Function
                    ↓
                    ├─→ 驗證相機 ID
                    ├─→ 執行 Upsert 操作
                    │   ├─ 如果存在: views + 1
                    │   └─ 如果不存在: 插入新紀錄
                    ├─→ 返回新的 views 數
                    └─→ 清除快取
                        ↓
                        └─→ 顯示更新成功
```

### 資料庫架構

```sql
CREATE TABLE camera_views (
  camera_id TEXT PRIMARY KEY,        -- 相機唯一識別碼
  views INTEGER NOT NULL DEFAULT 0,  -- 觀看次數
  last_updated DATETIME              -- 最後更新時間
);

CREATE INDEX idx_views ON camera_views(views DESC);  -- 加速排序
```

---

## API 端點

### 1. 增加觀看數 (POST /api/view-camera)

**請求:**
```bash
curl -X POST https://road-camera.pages.dev/api/view-camera \
  -H "Content-Type: application/json" \
  -d '{"id": "國道一號-15k"}'
```

**請求體:**
```json
{
  "id": "國道一號-15k"  // 或使用 "camera_id"
}
```

**成功回應 (200):**
```json
{
  "success": true,
  "camera_id": "國道一號-15k",
  "new_views": 5
}
```

**錯誤回應 (400):**
```json
{
  "error": "Missing or invalid camera ID",
  "message": "請提供有效的相機 ID (id 欄位)"
}
```

**錯誤回應 (500):**
```json
{
  "error": "Database not configured",
  "message": "請在 Cloudflare Dashboard 中配置 D1 資料庫"
}
```

---

### 2. 取得熱門排行 (GET /api/get-top-cameras)

**請求:**
```bash
curl "https://road-camera.pages.dev/api/get-top-cameras?limit=10"
```

**查詢參數:**
| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| limit | number | 10 | 返回的數量 (最多 100) |

**成功回應 (200):**
```json
[
  {
    "camera_id": "國道一號-15k",
    "views": 120,
    "last_updated": "2025-11-22T10:30:45.000Z"
  },
  {
    "camera_id": "國道二號-10k",
    "views": 95,
    "last_updated": "2025-11-22T10:25:30.000Z"
  },
  ...
]
```

**錯誤回應 (500):**
```json
{
  "error": "Database not configured",
  "message": "請在 Cloudflare Dashboard 中配置 D1 資料庫"
}
```

---

## 前端整合

### 方法 1️⃣: 使用 CameraViewTracker 類 (推薦)

#### 初始化

```javascript
// 建立追蹤器實例
const tracker = new CameraViewTracker({
  trackingEnabled: true,        // 啟用追蹤
  logEnabled: true,             // 啟用日誌
  cacheExpiry: 60000,           // 快取過期時間 (毫秒)
  apiBaseUrl: '/api'            // API 基礎 URL
});
```

#### 追蹤相機觀看

```javascript
// 追蹤相機觀看次數
async function onCameraClick(cameraId) {
  const result = await tracker.trackCameraView(cameraId);
  
  if (result.success) {
    console.log(`✅ 相機 ${cameraId} 計數已更新至 ${result.new_views}`);
  } else {
    console.error(`❌ 追蹤失敗: ${result.error}`);
  }
}
```

#### 載入熱門排行

```javascript
// 取得前 10 個最熱門的相機
const topCameras = await tracker.loadTopCameras(10);

console.log("🏆 熱門相機:", topCameras);
// [{ camera_id: '...', views: 120, last_updated: '...' }, ...]
```

#### 顯示在 DOM 中

```javascript
// 在 #top-cameras 容器中顯示排行
await tracker.displayTopCameras('#top-cameras', 10);

// 自動每 60 秒更新一次
tracker.autoRefreshTopCameras('#top-cameras', 60000);
```

#### 取得特定相機統計

```javascript
// 查詢特定相機的觀看次數
const stats = await tracker.getCameraStats('國道一號-15k');

if (stats) {
  console.log(`${stats.camera_id} 已被觀看 ${stats.views} 次`);
} else {
  console.log("暫無此相機的統計數據");
}
```

---

### 方法 2️⃣: 直接使用 Fetch API

如果你想手動控制而不使用封裝類：

```javascript
// 追蹤相機
async function trackCamera(cameraId) {
  try {
    const response = await fetch('/api/view-camera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cameraId })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("追蹤失敗:", error.message);
      return;
    }

    const data = await response.json();
    console.log(`計數已更新: ${data.new_views}`);
  } catch (error) {
    console.error("請求失敗:", error);
  }
}

// 取得排行
async function getTopCameras(limit = 10) {
  try {
    const response = await fetch(`/api/get-top-cameras?limit=${limit}`);
    const data = await response.json();
    
    // 渲染到頁面
    data.forEach((camera, index) => {
      console.log(`#${index + 1}: ${camera.camera_id} (${camera.views} 次)`);
    });
  } catch (error) {
    console.error("載入排行失敗:", error);
  }
}
```

---

## 使用範例

### 範例 1: 在現有 HTML 中集成

```html
<!-- 在你的 HTML 中新增相機按鈕 -->
<button class="camera-btn" onclick="trackAndOpen('國道一號-15k')">
  📹 打開國道一號監視器
</button>

<!-- 顯示熱門排行 -->
<div id="top-cameras"></div>

<script src="/assets/camera-tracker.js"></script>
<script>
  const tracker = new CameraViewTracker();

  async function trackAndOpen(cameraId) {
    // 追蹤觀看
    await tracker.trackCameraView(cameraId);
    
    // 打開相機視窗
    openCameraWindow(cameraId);
    
    // 重新整理排行
    await tracker.displayTopCameras('#top-cameras', 10);
  }

  // 頁面載入時顯示排行
  document.addEventListener('DOMContentLoaded', async () => {
    await tracker.displayTopCameras('#top-cameras', 10);
  });
</script>
```

### 範例 2: 在 React 中使用

```jsx
import { useEffect, useState } from 'react';

function CameraTracker() {
  const [topCameras, setTopCameras] = useState([]);
  const [tracker] = useState(new CameraViewTracker());

  useEffect(() => {
    loadTopCameras();
    const interval = setInterval(loadTopCameras, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadTopCameras() {
    const cameras = await tracker.loadTopCameras(10);
    setTopCameras(cameras);
  }

  async function handleCameraClick(cameraId) {
    await tracker.trackCameraView(cameraId);
    await loadTopCameras();
  }

  return (
    <div>
      <h2>🏆 熱門監視器排行</h2>
      {topCameras.map((cam, idx) => (
        <div key={cam.camera_id} style={{ padding: '10px' }}>
          <span>#{idx + 1}</span>
          <span>{cam.camera_id}</span>
          <span>👁️ {cam.views}</span>
        </div>
      ))}
      <button onClick={() => handleCameraClick('國道一號-15k')}>
        追蹤
      </button>
    </div>
  );
}

export default CameraTracker;
```

### 範例 3: 在 Vue 中使用

```vue
<template>
  <div>
    <h2>🏆 熱門監視器排行</h2>
    <div v-if="topCameras.length > 0" class="rank-list">
      <div v-for="(cam, idx) in topCameras" :key="cam.camera_id" class="rank-item">
        <span class="rank">#{{ idx + 1 }}</span>
        <span class="camera-id">{{ cam.camera_id }}</span>
        <span class="views">👁️ {{ cam.views }}</span>
      </div>
    </div>
    <div v-else>⏳ 載入中...</div>
  </div>
</template>

<script>
import CameraViewTracker from '@/assets/camera-tracker.js';

export default {
  data() {
    return {
      tracker: new CameraViewTracker(),
      topCameras: []
    };
  },
  mounted() {
    this.loadTopCameras();
    this.autoRefreshInterval = setInterval(() => this.loadTopCameras(), 60000);
  },
  beforeUnmount() {
    clearInterval(this.autoRefreshInterval);
  },
  methods: {
    async loadTopCameras() {
      this.topCameras = await this.tracker.loadTopCameras(10);
    },
    async trackCamera(cameraId) {
      await this.tracker.trackCameraView(cameraId);
      await this.loadTopCameras();
    }
  }
};
</script>
```

---

## 監控和分析

### 在 combined-roads.html 中集成

```javascript
// 在你的地圖點擊事件中加入追蹤
map.on('click', async function(e) {
  const { camera_id } = e.target.data;
  
  if (camera_id) {
    // 追蹤觀看
    await window.cameraTracker.trackCameraView(camera_id);
    
    // 打開相機資訊窗口
    showCameraPopup(e.target, camera_id);
    
    // 更新排行
    await updateTopCameras();
  }
});
```

### 分析相機熱度

```javascript
async function analyzeCameraPopularity() {
  const allCameras = await tracker.loadTopCameras(100);
  
  const analysis = {
    totalViews: allCameras.reduce((sum, cam) => sum + cam.views, 0),
    avgViews: Math.round(
      allCameras.reduce((sum, cam) => sum + cam.views, 0) / allCameras.length
    ),
    maxViews: Math.max(...allCameras.map(cam => cam.views)),
    minViews: Math.min(...allCameras.map(cam => cam.views)),
    topCamera: allCameras[0],
    unpopularCameras: allCameras.slice(-5).reverse()
  };

  console.log("📊 相機熱度分析:", analysis);
  return analysis;
}
```

---

## 效能最佳化

### 1. 快取策略

```javascript
const tracker = new CameraViewTracker({
  cacheExpiry: 120000  // 增加到 2 分鐘，減少查詢
});

// 手動清除快取
tracker.cache.clear();

// 只快取特定查詢
const cacheKey = 'top-cameras-10';
tracker.cache.set(cacheKey, {
  data: cameras,
  timestamp: Date.now()
});
```

### 2. 批量操作

```javascript
// ❌ 不推薦: 一個一個追蹤
for (let id of cameraIds) {
  await tracker.trackCameraView(id);
}

// ✅ 推薦: 批量請求並行發送
const promises = cameraIds.map(id => 
  tracker.trackCameraView(id)
);
await Promise.all(promises);
```

### 3. 分頁載入

```javascript
// 不要載入所有相機，只載入需要的
const topCameras = await tracker.loadTopCameras(10);   // 前 10 個
// 需要更多時再載入
const more = await tracker.loadTopCameras(50);         // 前 50 個
```

### 4. 防止快速重複點擊

```javascript
let lastTrackTime = 0;
const TRACK_COOLDOWN = 1000; // 1 秒

async function safeTrack(cameraId) {
  const now = Date.now();
  if (now - lastTrackTime < TRACK_COOLDOWN) {
    console.warn("⚠️ 點擊過快，已忽略");
    return;
  }
  
  lastTrackTime = now;
  await tracker.trackCameraView(cameraId);
}
```

---

## 常見問題

### Q: API 返回 404?
A: 確保：
1. Cloudflare Pages 已部署 (`git push` 後檢查 Dashboard)
2. 檢查路由是否正確 (`/api/view-camera` 而不是 `api/view-camera`)
3. 檢查瀏覽器開發者工具的 Network 標籤

### Q: 資料庫顯示 "Database not configured"?
A: 檢查：
1. D1 資料庫已在 Cloudflare Dashboard 建立
2. `wrangler.toml` 中的 `database_id` 正確
3. 在本機測試時，需要 `wrangler pages dev` 支援

### Q: 追蹤數字沒有增加?
A: 檢查：
1. 瀏覽器 F12 → Network 標籤，確認請求已發送並返回 200
2. 檢查請求體格式是否正確 (`{"id": "..."}`)
3. 檢查相機 ID 是否包含特殊字符或空格

### Q: 排行更新太慢?
A: 優化方法：
1. 增加快取過期時間 (`cacheExpiry: 120000`)
2. 使用 `tracker.cache.delete('top-cameras-10')` 手動清除快取
3. 減少自動刷新頻率

### Q: 能否看到誰點擊了相機?
A: 目前系統只記錄計數，不記錄使用者身份。若需要，可：
1. 擴展資料表：`user_id`, `ip_address`, `timestamp`
2. 在 API 中驗證使用者身份
3. 記錄詳細的存取日誌

### Q: 如何定期備份資料?
A: Cloudflare D1 支援：
1. 自動備份 (免費方案每天一次)
2. 手動導出: Dashboard → D1 Database → Export
3. 使用 Wrangler: `wrangler d1 export road-camera-db > backup.sql`

---

## 📚 相關檔案

| 檔案 | 用途 |
|------|------|
| `functions/api/view-camera.js` | POST 端點 - 增加觀看數 |
| `functions/api/get-top-cameras.js` | GET 端點 - 取得排行 |
| `assets/camera-tracker.js` | 前端追蹤模組 |
| `camera-statistics.html` | 完整排行示例頁面 |
| `D1_DATABASE_SETUP.md` | 資料庫設定指南 |
| `wrangler.toml` | Cloudflare 配置 |

---

## ✅ 整合檢查清單

- [ ] D1 資料庫已建立並配置
- [ ] API 端點已部署至 Cloudflare
- [ ] 前端 HTML 已引入 `camera-tracker.js`
- [ ] 點擊相機時呼叫 `trackCameraView()`
- [ ] 顯示排行區域已設置
- [ ] 測試 POST 請求返回 200
- [ ] 測試 GET 請求返回資料
- [ ] 驗證排行頁面正常顯示
- [ ] 手機和桌面都能正常使用
- [ ] 效能測試 (快取是否有效)

完成這些步驟後，你就擁有一個完整的相機觀看統計系統！🎉
