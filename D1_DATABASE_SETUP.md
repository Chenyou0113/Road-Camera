# 🗄️ Cloudflare D1 資料庫設定指南

## 📋 目錄
1. [建立 D1 資料庫](#建立-d1-資料庫)
2. [初始化資料表](#初始化資料表)
3. [配置 wrangler.toml](#配置-wranglertoml)
4. [測試 API](#測試-api)
5. [監控和管理](#監控和管理)
6. [常見問題](#常見問題)

---

## 建立 D1 資料庫

### 步驟 1️⃣: 登入 Cloudflare Dashboard

訪問 [Cloudflare Dashboard](https://dash.cloudflare.com/)

### 步驟 2️⃣: 進入 Workers & Pages

左側菜單 → **Workers & Pages** → 選擇你的頁面項目 **road-camera**

### 步驟 3️⃣: 建立 D1 資料庫

1. 在左側菜單找到 **Settings**
2. 下拉到 **D1 Database**
3. 點擊 **Create Database**
4. 輸入資料庫名稱: `road-camera-db`
5. 點擊 **Create**

### 步驟 4️⃣: 取得 Database ID

建立後，你會看到資料庫詳情頁面，頂端會顯示:
```
Database ID: 12345678-abcd-ef01-2345-6789abcdef01
```

**複製這個 ID**，待會會用到。

---

## 初始化資料表

### 方法一: 使用 Cloudflare Dashboard SQL 編輯器 (推薦)

1. 在 D1 資料庫頁面，找到 **SQL Editor** 標籤
2. 複製以下 SQL，貼入編輯器:

```sql
-- 建立相機觀看計數表
CREATE TABLE IF NOT EXISTS camera_views (
  camera_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_views ON camera_views(views DESC);
```

3. 點擊 **Execute** 執行

### 方法二: 使用 Wrangler CLI

如果你已安裝 Wrangler (npm install -g wrangler):

```bash
# 連接到 D1 資料庫並執行 SQL
wrangler d1 execute road-camera-db --command "
CREATE TABLE IF NOT EXISTS camera_views (
  camera_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_views ON camera_views(views DESC);
"
```

**預期輸出:**
```
✅ Executed prepare.sql
```

---

## 配置 wrangler.toml

### 步驟 1️⃣: 更新 D1 Database ID

打開 `wrangler.toml`，找到:

```toml
[[d1_databases]]
binding = "DB"
database_name = "road-camera-db"
database_id = "your-database-id"  # 👈 替換這裡
```

替換成你的實際 Database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "road-camera-db"
database_id = "12345678-abcd-ef01-2345-6789abcdef01"  # ✅ 替換為你的 ID
```

### 步驟 2️⃣: 驗證配置

執行以下命令檢查配置是否正確:

```bash
wrangler d1 info road-camera-db
```

**預期輸出:**
```
🔗 Database Binding
 binding: DB
 database_name: road-camera-db
 database_id: 12345678-abcd-ef01-2345-6789abcdef01
```

---

## 測試 API

### 本機測試 (使用 Wrangler)

```bash
# 啟動開發伺服器
wrangler pages dev

# 在另一個終端測試增加觀看數
curl -X POST http://localhost:8788/api/view-camera \
  -H "Content-Type: application/json" \
  -d '{"id": "國道一號-15k"}'
```

**預期回應:**
```json
{
  "success": true,
  "camera_id": "國道一號-15k",
  "new_views": 1
}
```

### 測試取得熱門排行

```bash
curl http://localhost:8788/api/get-top-cameras
```

**預期回應:**
```json
[
  {
    "camera_id": "國道一號-15k",
    "views": 5,
    "last_updated": "2025-11-22 10:30:45"
  },
  {
    "camera_id": "國道二號-10k",
    "views": 3,
    "last_updated": "2025-11-22 10:25:30"
  }
]
```

### 線上測試 (部署後)

推送到 GitHub 後，Cloudflare 會自動部署。測試:

```bash
# 增加觀看數
curl -X POST https://road-camera.pages.dev/api/view-camera \
  -H "Content-Type: application/json" \
  -d '{"id": "國道一號-15k"}'

# 取得排行
curl https://road-camera.pages.dev/api/get-top-cameras
```

---

## 監控和管理

### 檢查資料庫內容

在 Cloudflare Dashboard → D1 Database → SQL Editor:

```sql
-- 查看所有相機及其觀看數
SELECT * FROM camera_views ORDER BY views DESC;

-- 查看特定相機的統計
SELECT * FROM camera_views WHERE camera_id = '國道一號-15k';

-- 查看觀看數統計
SELECT 
  COUNT(*) as total_cameras,
  SUM(views) as total_views,
  AVG(views) as avg_views,
  MAX(views) as max_views
FROM camera_views;
```

### 備份資料庫

1. 在 D1 資料庫頁面，點擊 **⋮ (更多選項)**
2. 選擇 **Export**
3. 下載 SQLite 檔案

### 重置資料庫

```sql
-- 清空所有觀看數 (保留相機 ID)
UPDATE camera_views SET views = 0, last_updated = CURRENT_TIMESTAMP;

-- 或完全刪除表格
DROP TABLE camera_views;

-- 重新建立表格
CREATE TABLE IF NOT EXISTS camera_views (
  camera_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 前端整合

### 在 HTML 中呼叫 API

```html
<!-- 點擊相機時增加計數 -->
<button onclick="trackCameraView('國道一號-15k')">
  打開國道一號監視器
</button>

<!-- 顯示熱門排行 -->
<div id="top-cameras"></div>

<script>
// 追蹤相機觀看
async function trackCameraView(cameraId) {
  try {
    const res = await fetch('/api/view-camera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cameraId })
    });
    
    const data = await res.json();
    if (data.success) {
      console.log(`✅ ${cameraId} 計數已更新至 ${data.new_views}`);
    }
  } catch (e) {
    console.error("❌ 計數失敗:", e);
  }
}

// 載入熱門排行
async function loadTopCameras() {
  try {
    const res = await fetch('/api/get-top-cameras?limit=10');
    const data = await res.json();
    
    console.log("🏆 熱門相機排行:", data);
    
    // 在網頁上顯示
    const html = data.map((cam, i) => `
      <div class="rank-item">
        <span class="rank">#${i + 1}</span>
        <span class="camera-id">${cam.camera_id}</span>
        <span class="views">👁️ ${cam.views} 次</span>
      </div>
    `).join('');
    
    document.getElementById('top-cameras').innerHTML = html;
  } catch (e) {
    console.error("❌ 載入排行失敗:", e);
  }
}

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', loadTopCameras);

// 每分鐘更新一次排行
setInterval(loadTopCameras, 60000);
</script>
```

### CSS 樣式示例

```css
/* 熱門排行容器 */
#top-cameras {
  max-width: 400px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 20px;
  color: white;
}

/* 排行項目 */
.rank-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  gap: 15px;
}

.rank-item:last-child {
  border-bottom: none;
}

/* 排名 */
.rank {
  font-weight: bold;
  font-size: 18px;
  min-width: 30px;
}

/* 相機名稱 */
.camera-id {
  flex: 1;
  font-size: 14px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

/* 觀看數 */
.views {
  font-weight: bold;
  font-size: 16px;
}
```

---

## 常見問題

### Q: 收到 "Database not found" 錯誤?
A: 檢查 `wrangler.toml` 中的 `database_id` 是否正確。執行:
```bash
wrangler d1 list
```
確認資料庫名稱和 ID。

### Q: 為什麼 POST 請求返回 400 錯誤?
A: 檢查請求格式是否正確:
```json
{
  "id": "相機ID"  // 或 "camera_id"
}
```

### Q: 如何監控 API 的錯誤率?
A: 在 Cloudflare Dashboard → Analytics & Logs:
1. 查看 Functions 的請求日誌
2. 過濾狀態碼為 4xx 和 5xx 的請求
3. 分析失敗的原因

### Q: 資料庫有大小限制嗎?
A: Cloudflare D1 免費方案有 3GB 的存儲空間，足以儲存數百萬筆相機觀看記錄。

### Q: 如何導出資料進行分析?
A: 在 D1 Database 頁面點擊 **Export**，下載 SQLite 檔案後可用任何 SQLite 客戶端開啟。

### Q: 能否在前端看到資料庫密鑰?
A: **不能**。D1 資料庫綁定只在 Cloudflare 伺服器側有效，前端無法直接存取。所有操作都必須透過 API 端點進行。

---

## 📚 相關資源

- [Cloudflare D1 文檔](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [SQLite 語言參考](https://www.sqlite.org/lang.html)
- [Wrangler CLI 指南](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

---

## ✅ 完整設定檢查清單

- [ ] 在 Cloudflare Dashboard 建立 D1 資料庫 `road-camera-db`
- [ ] 複製 Database ID
- [ ] 在 `wrangler.toml` 中更新 `database_id`
- [ ] 使用 SQL Editor 或 Wrangler 建立 `camera_views` 表格
- [ ] 建立索引 `idx_views`
- [ ] 測試 `/api/view-camera` POST 端點
- [ ] 測試 `/api/get-top-cameras` GET 端點
- [ ] 推送至 GitHub，等待 Cloudflare 自動部署
- [ ] 在生產環境測試 API
- [ ] 在前端整合觀看計數和排行顯示

完成這些步驟後，你就擁有一個完全運作的相機觀看統計系統！🎉
