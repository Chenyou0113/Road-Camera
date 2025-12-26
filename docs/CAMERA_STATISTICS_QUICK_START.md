# 🚀 相機統計系統 - 5 分鐘快速開始

## ⚡ 超快設定 (按步驟執行)

### 1️⃣ 設定 D1 資料庫 (2 分鐘)

```bash
# 登入 Cloudflare Dashboard
# → Workers & Pages → 選擇你的頁面 → Settings → D1 Database

# 點擊 "Create Database"
# 輸入: road-camera-db
# 點擊 "Create"

# 複製 Database ID (例: 12345678-abcd-ef01-2345-6789abcdef01)
```

### 2️⃣ 建立資料表 (1 分鐘)

在 Cloudflare Dashboard → D1 Database → SQL Editor，執行：

```sql
CREATE TABLE IF NOT EXISTS camera_views (
  camera_id TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_views ON camera_views(views DESC);
```

點擊 **Execute** ✅

### 3️⃣ 更新配置 (1 分鐘)

編輯 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "road-camera-db"
database_id = "12345678-abcd-ef01-2345-6789abcdef01"  # 👈 替換為你的 ID
```

### 4️⃣ 部署到 GitHub (1 分鐘)

```bash
git add .
git commit -m "feat: Add camera view statistics system"
git push origin main
```

Cloudflare 會在 5-10 分鐘內自動部署 ✅

---

## 🎯 立即測試

### 測試增加觀看數

```bash
curl -X POST https://road-camera.pages.dev/api/view-camera \
  -H "Content-Type: application/json" \
  -d '{"id": "測試相機-1"}'
```

**預期回應:**
```json
{
  "success": true,
  "camera_id": "測試相機-1",
  "new_views": 1
}
```

### 測試獲取排行

```bash
curl https://road-camera.pages.dev/api/get-top-cameras
```

**預期回應:**
```json
[
  {
    "camera_id": "測試相機-1",
    "views": 1,
    "last_updated": "2025-11-22T10:30:45.000Z"
  }
]
```

---

## 📌 在你的網頁中使用

### 方法 A: 複製貼上 (最簡單)

在你的 HTML 中加入：

```html
<!-- 引入追蹤模組 -->
<script src="/assets/camera-tracker.js"></script>

<!-- 顯示排行 -->
<div id="top-cameras"></div>

<script>
  const tracker = new CameraViewTracker();

  // 點擊相機時追蹤
  async function onCameraClick(cameraId) {
    await tracker.trackCameraView(cameraId);
    await tracker.displayTopCameras('#top-cameras', 10);
  }

  // 頁面載入時顯示排行
  tracker.displayTopCameras('#top-cameras', 10);
</script>
```

### 方法 B: 在 combined-roads.html 中集成

```javascript
// 在你的地圖點擊事件中加入：
const tracker = new CameraViewTracker();

map.on('click', async function(e) {
  const cameraId = e.target.data?.camera_id;
  if (cameraId) {
    // 追蹤觀看
    await tracker.trackCameraView(cameraId);
    // 打開相機窗口
    showCameraPopup(cameraId);
  }
});
```

### 方法 C: 完整示例頁面

已為你建立 `camera-statistics.html`，可直接訪問：
```
https://road-camera.pages.dev/camera-statistics.html
```

功能包括：
- 🎯 快速追蹤按鈕
- 🏆 實時排行榜
- 📊 統計數據
- 🔄 自動更新

---

## 📝 API 速查表

| 操作 | 端點 | 方法 | 請求 |
|------|------|------|------|
| 追蹤相機 | `/api/view-camera` | POST | `{"id":"相機ID"}` |
| 取得排行 | `/api/get-top-cameras` | GET | `?limit=10` |

---

## 🛠️ 常見問題排查

| 問題 | 解決方案 |
|------|---------|
| API 返回 404 | 檢查 Cloudflare 是否已部署；在 Network 標籤查看請求狀態 |
| 資料庫配置錯誤 | 確認 `wrangler.toml` 中的 `database_id` 正確 |
| 排行不更新 | 清除快取: `tracker.cache.clear()` |
| 頁面無法載入 | 檢查 `camera-tracker.js` 路徑是否正確 |

---

## 📂 新增檔案

已為你建立以下檔案：

```
Road-Camera/
├── functions/api/
│   ├── view-camera.js          ← POST 端點
│   └── get-top-cameras.js      ← GET 端點
├── assets/
│   └── camera-tracker.js       ← 前端模組
├── camera-statistics.html      ← 完整示例頁面
├── wrangler.toml              ← 已更新配置
├── D1_DATABASE_SETUP.md        ← 詳細設定指南
└── CAMERA_STATISTICS_GUIDE.md  ← 完整整合指南
```

---

## ✅ 完成檢查清單

- [ ] D1 資料庫已建立
- [ ] 資料表已建立
- [ ] `wrangler.toml` 已更新 `database_id`
- [ ] 代碼已 push 至 GitHub
- [ ] Cloudflare 已部署 (檢查 Dashboard)
- [ ] `/api/view-camera` 測試成功
- [ ] `/api/get-top-cameras` 測試成功
- [ ] HTML 中已引入 `camera-tracker.js`
- [ ] 排行頁面可正常顯示

---

## 🎉 完成！

你現在擁有一個完整的相機觀看統計系統！

**下一步：**
1. 自訂相機 ID (根據你的實際相機列表)
2. 整合到 `combined-roads.html` 地圖中
3. 在排行頁面上添加更多分析功能
4. 監控使用者的點擊行為

---

## 📚 更多詳情

詳見：
- [`D1_DATABASE_SETUP.md`](./D1_DATABASE_SETUP.md) - 資料庫設定
- [`CAMERA_STATISTICS_GUIDE.md`](./CAMERA_STATISTICS_GUIDE.md) - 完整整合指南
