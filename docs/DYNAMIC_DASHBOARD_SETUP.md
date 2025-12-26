# 🚀 動態儀表板系統設置指南

> 將靜態網站升級為**實時流量監控中心**

## 📊 系統架構

```
[使用者瀏覽器]
    ⬇️ (1. 點擊監視器)
[Cloudflare Pages Functions API]
    ⬇️ (2. SQL 寫入/讀取)
[D1 資料庫 (SQLite)]
```

---

## 第一步：配置 D1 資料庫

### 1.1 在 Cloudflare Dashboard 創建資料庫

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 找到你的 Cloudflare Pages 專案
3. 進入 **Settings > D1 Database**
4. 點擊 **Create Database**
5. 取得 **Database ID**（格式：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）

### 1.2 執行 SQL 初始化

在 Cloudflare Dashboard > D1 > 你的資料庫 > **Console (控制台)** 執行：

```sql
-- 建立監視器瀏覽統計表
CREATE TABLE IF NOT EXISTS camera_views (
    camera_id TEXT PRIMARY KEY,
    views INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 建立系統日誌表 (用於流量統計)
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入一些測試數據
INSERT INTO camera_views (camera_id, views) VALUES
  ('國道一號-15k', 45),
  ('國道一號-20k', 38),
  ('國道三號-50k', 52),
  ('省道台1-基隆', 28),
  ('省道台3-新竹', 35),
  ('市區台北信義路', 67),
  ('市區台中中港路', 41),
  ('市區高雄中山路', 33)
ON CONFLICT(camera_id) DO NOTHING;
```

---

## 第二步：更新 `wrangler.toml`

編輯 `wrangler.toml`，找到 D1 配置部分：

```toml
[[d1_databases]]
binding = "DB"
database_name = "road-camera-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ⬅️ 替換為你的 Database ID
```

**保存後會自動生效！** ✅

---

## 第三步：檢查 API 實現

已有的 API 文件：

### ✅ POST `/api/view-camera` - 記錄點擊統計

**位置：** `functions/api/view-camera.js`

**請求格式：**
```javascript
{
  "id": "國道一號-15k",
  "location": "基隆",
  "type": "highway"
}
```

**響應：**
```javascript
{
  "success": true,
  "camera_id": "國道一號-15k",
  "new_views": 46
}
```

### ✅ GET `/api/get-top-cameras` - 獲取排行榜

**位置：** `functions/api/get-top-cameras.js`

**查詢參數：**
- `limit`: 返回的數量（預設 10，最大 100）

**響應：**
```javascript
[
  { "camera_id": "市區台北信義路", "views": 67, "last_updated": "..." },
  { "camera_id": "國道三號-50k", "views": 52, "last_updated": "..." },
  ...
]
```

---

## 第四步：集成到前端頁面

### 4.1 修改監控頁面 (highway.html、road.html 等)

在打開監視器視窗時記錄點擊：

```javascript
// 當用戶點擊某個監視器時調用此函數
async function recordCameraView(cameraId, locationName) {
    try {
        const response = await fetch('/api/view-camera', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: cameraId,
                location: locationName,
                type: 'highway'  // 或 'road', 'city', 'water' 等
            })
        });
        
        if (!response.ok) {
            console.warn('統計記錄失敗');
            return;
        }
        
        const data = await response.json();
        console.log(`✅ 已記錄 ${cameraId}，總瀏覽次數: ${data.new_views}`);
    } catch (error) {
        console.log('統計發送失敗，但不影響使用者體驗', error);
    }
}
```

**在 Modal 打開時調用：**
```javascript
// 在你的 openModal 或點擊事件中加入：
recordCameraView(camera.id, camera.name);
```

---

### 4.2 修改 `dashboard.html` 顯示實時數據

在 `<script>` 區塊添加新函數：

```javascript
// 🏆 載入熱門監視器排行榜
async function loadTopCameras() {
    try {
        const response = await fetch('/api/get-top-cameras?limit=10');
        if (!response.ok) throw new Error('Failed to fetch');
        
        const topCameras = await response.json();
        
        // 更新頁面顯示
        const listHTML = topCameras.map((cam, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${cam.camera_id}</td>
                <td><strong>${cam.views}</strong></td>
                <td>${new Date(cam.last_updated).toLocaleTimeString('zh-TW')}</td>
            </tr>
        `).join('');
        
        document.getElementById('topCamerasTable').innerHTML = listHTML;
        
        console.log(`✅ 已載入 ${topCameras.length} 個熱門監視器`);
    } catch (error) {
        console.error('❌ 載入排行榜失敗:', error);
    }
}

// 頁面載入後調用
document.addEventListener('DOMContentLoaded', () => {
    loadTopCameras();
    
    // 每 30 秒自動更新一次
    setInterval(loadTopCameras, 30000);
});
```

---

## 第五步：新增排行榜 HTML 區域

在 `dashboard.html` 的適當位置添加排行榜表格：

```html
<!-- 🏆 熱門監視器排行榜 -->
<div class="chart-section" style="margin-top: 40px;">
    <h3><i class="fas fa-fire"></i> 🔥 熱門監視器排行榜</h3>
    <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
            <thead style="background: linear-gradient(135deg, #1e40af, #0891b2); color: white;">
                <tr>
                    <th style="padding: 12px; text-align: left;">排名</th>
                    <th style="padding: 12px; text-align: left;">監視器位置</th>
                    <th style="padding: 12px; text-align: center;">瀏覽次數</th>
                    <th style="padding: 12px; text-align: right;">最後更新</th>
                </tr>
            </thead>
            <tbody id="topCamerasTable">
                <tr>
                    <td colspan="4" style="padding: 20px; text-align: center; color: #999;">
                        <i class="fas fa-spinner fa-spin"></i> 載入中...
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
```

---

## 第六步：部署並測試

### 6.1 本地測試（可選）

```bash
# 安裝 Wrangler (如果還未安裝)
npm install -g wrangler

# 本地開發伺服器
wrangler pages dev . --d1 DB=YOUR_DATABASE_ID_HERE
```

### 6.2 部署上線

```bash
# Push 到 GitHub
git add .
git commit -m "feat: 實現動態儀表板系統 - 實時流量監控"
git push

# Cloudflare Pages 會自動部署
```

**檢查部署狀態：** Cloudflare Dashboard > Pages > 你的專案 > Deployments

---

## 第七步：驗證系統工作

### 7.1 測試記錄統計

打開瀏覽器開發者工具 (F12 > Console)，執行：

```javascript
// 模擬點擊記錄
fetch('/api/view-camera', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        id: '測試監視器',
        location: '測試位置',
        type: 'test'
    })
})
.then(r => r.json())
.then(data => console.log('✅ 記錄成功:', data))
.catch(e => console.error('❌ 失敗:', e));
```

### 7.2 測試讀取排行榜

```javascript
fetch('/api/get-top-cameras?limit=5')
.then(r => r.json())
.then(data => console.log('✅ 排行榜:', data))
.catch(e => console.error('❌ 失敗:', e));
```

---

## 常見問題

### Q1: 資料庫未配置錯誤
**A:** 確認 `wrangler.toml` 中的 `database_id` 正確，並與 Cloudflare Dashboard 中的 D1 ID 一致。

### Q2: 統計數據不更新
**A:** 
1. 檢查是否調用了 `recordCameraView()`
2. 確認 `/api/view-camera` 返回 200 狀態碼
3. 檢查 D1 表 `camera_views` 是否存在

### Q3: 如何清空所有統計數據？
**A:** 在 Cloudflare Dashboard D1 Console 執行：
```sql
DELETE FROM camera_views;
```

### Q4: 性能優化建議
**A:** 
- 使用 Cache-Control 頭加快響應：`max-age=60, stale-while-revalidate=120`
- 定期清理過舊的 `system_logs` 記錄
- 對大量數據查詢使用分頁

---

## 📈 下一步擴展功能

1. **按時間段統計**：添加每小時/每天的統計表
2. **地區熱力圖**：彙總各地區的觀看量
3. **實時通知**：當某監視器突然走紅時發送通知
4. **導出報告**：生成 CSV/PDF 格式的月度報告
5. **A/B 測試**：對比不同標題/位置的點擊率

---

## 🎉 成果

現在你有了一個**真正的實時監控中心**：
- ✅ 每一次點擊都被記錄
- ✅ 儀表板即時更新排行榜
- ✅ 無需額外伺服器
- ✅ 完全由 Cloudflare 託管
- ✅ 自動擴展，無需擔心流量爆炸

祝賀！🎊🎊🎊
