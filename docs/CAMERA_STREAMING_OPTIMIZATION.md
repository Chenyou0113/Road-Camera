# 🎬 監視器播放最佳化 - 完整實作指南

**適用場景：** 任何影片串流服務（監視器、直播、天氣影像等）

---

## 核心理念：「三方平衡」

在公開服務中，必須同時保護：
1. **來源端 (TDX)：** 避免 DDoS 效果、尊重人家的頻寬
2. **中介端 (你的 API)：** 節省流量成本、避免額度耗盡
3. **客戶端 (使用者)：** 保護手機流量、減少電池消耗

**關鍵原則：預設 Click-to-Play，絕不自動播放多支影片。**

---

## 問題分析

### ❌ 錯誤做法：頁面載入時自動播放多支監視器

```javascript
// 危險代碼 - 千萬不要這樣做！
function loadAllCameras() {
  cameras.forEach(camera => {
    const video = document.createElement('video');
    const hls = new Hls();
    hls.loadSource(camera.streamUrl);  // ❌ 一口氣開 50 個連線
    hls.attachMedia(video);
  });
}
```

**災難場景：**
- 🔴 **瀏覽器限制：** 同一網域最多 **6 個 TCP 連線**
  - 前 6 支影片開始緩衝
  - **後 44 支直接卡死 (Pending)** ，永遠轉不動
- 🔴 **頻寬炸裂：** 50 支 × 500kbps = 25Mbps 瞬間消耗
- 🔴 **TDX 受不了：** 可能直接把你的 IP 加黑名單
- 🔴 **使用者體驗爛：** 整個網站都在排隊，CSS/JS/API 全都卡住

---

## 策略一：靜態封面 + Click-to-Play

這是標準做法，兼顧 UX 和資源效率。

### HTML 結構

```html
<div class="camera-grid">
  <div class="camera-card" data-camera-id="taipei-1" 
       data-stream-url="https://tdx.example.com/streams/taipei-1.m3u8"
       data-snapshot-url="https://tdx.example.com/snapshots/taipei-1.jpg">
    
    <!-- 預設狀態：只顯示靜態圖片 + 播放按鈕 -->
    <div class="camera-placeholder">
      <img src="https://tdx.example.com/snapshots/taipei-1.jpg" 
           alt="台北氣象監視器" class="snapshot">
      <div class="overlay">
        <button class="play-btn" onclick="playStream(event)">▶</button>
        <span class="label">台北市松山區</span>
      </div>
    </div>

    <!-- 動態產生的影片播放器 (初始隱藏) -->
    <div class="video-container" style="display: none;">
      <video id="video-taipei-1" controls></video>
      <button class="close-btn" onclick="closeStream(event)">✕ 關閉</button>
    </div>
  </div>
</div>
```

### JavaScript 實作

```javascript
// 全域狀態：記錄當前播放的監視器
let currentPlayingCamera = null;
let currentHls = null;

/**
 * 播放監視器影片
 */
function playStream(event) {
  const card = event.target.closest('.camera-card');
  const cameraId = card.dataset.cameraId;
  const streamUrl = card.dataset.streamUrl;

  console.log(`▶ 開始播放: ${cameraId}`);

  // 1️⃣ 如果已有其他監視器在播放，先關掉 (保護頻寬)
  if (currentPlayingCamera && currentPlayingCamera !== cameraId) {
    closeStream(currentPlayingCamera);
  }

  // 2️⃣ 隱藏靜態圖片，顯示影片播放器
  const placeholder = card.querySelector('.camera-placeholder');
  const videoContainer = card.querySelector('.video-container');
  
  placeholder.style.display = 'none';
  videoContainer.style.display = 'block';

  // 3️⃣ 建立 HLS 連線
  const videoElement = document.getElementById(`video-${cameraId}`);
  
  if (Hls.isSupported()) {
    const hls = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
      maxBufferLength: 10,  // 限制快取大小 (節省記憶體)
      fragLoadingTimeOut: 20000  // 20 秒超時
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('✅ 串流已就緒');
      videoElement.play().catch(e => {
        console.warn('⚠️ 自動播放被瀏覽器阻止 (隱私保護):', e);
      });
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.error('❌ 致命錯誤，嘗試復原:', data);
        hls.startLoad();
      }
    });

    hls.loadSource(streamUrl);
    hls.attachMedia(videoElement);

    // 4️⃣ 更新全域狀態
    currentPlayingCamera = cameraId;
    currentHls = hls;

  } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari 原生支援 HLS
    videoElement.src = streamUrl;
    videoElement.play().catch(e => console.warn('⚠️ 播放失敗:', e));
    currentPlayingCamera = cameraId;
  }
}

/**
 * 關閉監視器影片
 */
function closeStream(cameraIdOrEvent) {
  // 支援兩種呼叫方式: closeStream('taipei-1') 或 closeStream(event)
  let cameraId = typeof cameraIdOrEvent === 'string' 
    ? cameraIdOrEvent 
    : cameraIdOrEvent.target?.closest('.camera-card')?.dataset.cameraId;

  if (!cameraId) return;

  const card = document.querySelector(`[data-camera-id="${cameraId}"]`);
  if (!card) return;

  console.log(`⏹️ 停止播放: ${cameraId}`);

  // 1️⃣ 銷毀 HLS 實例 (釋放記憶體和連線)
  if (currentHls && currentPlayingCamera === cameraId) {
    currentHls.destroy();
    currentHls = null;
    currentPlayingCamera = null;
  }

  // 2️⃣ 隱藏影片，顯示靜態圖
  const placeholder = card.querySelector('.camera-placeholder');
  const videoContainer = card.querySelector('.video-container');
  const videoElement = videoContainer.querySelector('video');

  videoElement.pause();
  videoElement.src = '';  // 清空 src，完全斷開連線

  videoContainer.style.display = 'none';
  placeholder.style.display = 'block';
}

/**
 * 頁面卸載時，務必清理 (防止背景連線浪費)
 */
window.addEventListener('beforeunload', () => {
  if (currentHls) {
    currentHls.destroy();
  }
});
```

### CSS 美化

```css
.camera-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

.camera-card {
  position: relative;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.camera-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.camera-placeholder {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;  /* 16:9 比例 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.camera-placeholder .snapshot {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-placeholder .overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.3s;
}

.camera-card:hover .overlay {
  opacity: 1;
}

.play-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s;
}

.play-btn:hover {
  transform: scale(1.1);
  background: white;
}

.label {
  color: white;
  margin-top: 15px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.video-container {
  position: relative;
  width: 100%;
  background: black;
}

.video-container video {
  width: 100%;
  display: block;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}
```

---

## 策略二：智慧資源釋放

即使只能同時播放一支，也要確保關閉時**完全銷毀**相關資源。

```javascript
/**
 * 更進階的資源管理：追蹤記憶體使用
 */
class CameraPlayer {
  constructor(cameraId, streamUrl) {
    this.cameraId = cameraId;
    this.streamUrl = streamUrl;
    this.hls = null;
    this.isPlaying = false;
    this.memoryUsage = 0;
  }

  play(videoElement) {
    if (Hls.isSupported()) {
      this.hls = new Hls({
        maxBufferLength: 10,  // ⭐ 限制快取 (防止記憶體爆炸)
        maxMaxBufferLength: 30,
        backBufferLength: 0,  // 不保留舊資料
      });
      
      this.hls.loadSource(this.streamUrl);
      this.hls.attachMedia(videoElement);
      
      this.isPlaying = true;
    }
  }

  destroy() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.isPlaying = false;
    console.log(`✅ ${this.cameraId} 的資源已完全釋放`);
  }

  getStats() {
    if (this.hls) {
      const level = this.hls.currentLevel;
      const bitrate = this.hls.levels[level]?.bitrate || 0;
      return {
        bitrate,
        isPlaying: this.isPlaying,
        cameraId: this.cameraId
      };
    }
    return null;
  }
}

// 使用範例
let playerManager = {};

function createAndPlayCamera(cameraId, streamUrl, videoElement) {
  // 清理舊的
  if (playerManager[cameraId]?.isPlaying) {
    playerManager[cameraId].destroy();
  }

  // 建立新的
  const player = new CameraPlayer(cameraId, streamUrl);
  player.play(videoElement);
  playerManager[cameraId] = player;

  console.log('📊 當前播放器狀態:', player.getStats());
}
```

---

## 策略三：「省流模式」- 靜態快照

如果 TDX API 支援靜態圖片，優先使用，對網速爛的使用者最友善。

```javascript
/**
 * 省流模式：定期更新靜態快照
 */
class SnapshotMode {
  constructor(cameraId, snapshotUrl, updateInterval = 60000) {
    this.cameraId = cameraId;
    this.snapshotUrl = snapshotUrl;
    this.updateInterval = updateInterval;
    this.intervalId = null;
  }

  start(imgElement) {
    console.log(`📸 啟動省流模式: ${this.cameraId}`);
    
    // 立即載入一張
    this.updateSnapshot(imgElement);

    // 每 60 秒更新一次
    this.intervalId = setInterval(() => {
      this.updateSnapshot(imgElement);
    }, this.updateInterval);
  }

  updateSnapshot(imgElement) {
    const timestamp = new Date().getTime();
    // 加上時間戳防止快取
    imgElement.src = `${this.snapshotUrl}?t=${timestamp}`;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log(`⏹️ 省流模式已關閉`);
  }
}

// 使用：在使用者切換到「省流模式」時啟動
const snapshot = new SnapshotMode('taipei-1', 'https://tdx.example.com/snapshots/taipei-1.jpg');
snapshot.start(document.getElementById('snapshot-img'));

// 使用者想看動畫時，停止快照，開始串流
snapshot.stop();
playStream(videoElement);
```

---

## 策略四：Modal / Lightbox 實作

影片通常不在列表頁直接播放，而是點擊後彈出視窗。

### HTML

```html
<!-- Modal HTML -->
<div id="camera-modal" class="modal" style="display: none;">
  <div class="modal-content">
    <button class="modal-close" onclick="closeCameraModal()">✕</button>
    
    <div id="modal-camera-player"></div>
    
    <div class="modal-info">
      <h3 id="modal-camera-title"></h3>
      <p id="modal-camera-desc"></p>
    </div>
  </div>
</div>

<style>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  z-index: 1001;
}

#modal-camera-player {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;  /* 16:9 */
  background: black;
}

#modal-camera-player video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
```

### JavaScript

```javascript
function openCameraModal(cameraId, streamUrl, title) {
  const modal = document.getElementById('camera-modal');
  const playerDiv = document.getElementById('modal-camera-player');

  // 1️⃣ 清空舊內容
  playerDiv.innerHTML = '';

  // 2️⃣ 建立 video 元素
  const video = document.createElement('video');
  video.controls = true;
  playerDiv.appendChild(video);

  // 3️⃣ 啟動串流
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(streamUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    
    // 🔑 保存 hls 實例到 modal，方便後續銷毀
    modal._currentHls = hls;
  }

  // 4️⃣ 更新標題
  document.getElementById('modal-camera-title').textContent = title;

  // 5️⃣ 顯示 modal
  modal.style.display = 'flex';

  // 6️⃣ ESC 鍵關閉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCameraModal();
  });
}

function closeCameraModal() {
  const modal = document.getElementById('camera-modal');
  
  // 🔑 關鍵：銷毀 HLS 連線
  if (modal._currentHls) {
    modal._currentHls.destroy();
    modal._currentHls = null;
  }

  // 清空 video
  const video = modal.querySelector('video');
  if (video) {
    video.pause();
    video.src = '';
  }

  modal.style.display = 'none';
}
```

---

## 效能對比表

| 策略 | 初始流量 | 每月成本 | 使用者體驗 | 複雜度 |
|------|---------|---------|-----------|--------|
| ❌ 自動播放所有監視器 | 25Mbps | 💸💸💸 | 💔💔 (卡死) | 低 |
| ✅ 靜態圖 + Click-to-Play | ~100KB | 💰 | 👍 (快速) | 中 |
| ✅ 省流模式 (快照) | ~50KB | 💵 | 👍 (即時) | 中 |
| ✅ Modal + 單一播放 | ~500KB | 💰 | 👍👍 (清楚) | 中 |
| ⭐ 以上全部結合 | ~100KB | 💵 | 👍👍👍 | 高 |

---

## 部署檢查清單

- [ ] **列表頁** - 只顯示靜態圖片，絕不載入 Video 或 HLS.js
- [ ] **Click 事件** - 點擊時動態建立 HLS 連線
- [ ] **單一播放限制** - 同時只能播 1 支，切換時銷毀舊的
- [ ] **關閉時銷毀** - 呼叫 `hls.destroy()`、清空 `video.src`
- [ ] **Modal 關閉** - 必須銷毀 HLS (不只是隱藏)
- [ ] **頁面卸載** - `beforeunload` 事件中銷毀所有 HLS 實例
- [ ] **記憶體監測** - 用瀏覽器開發者工具檢查是否有洩漏
- [ ] **測試快速切換** - 點擊 10 支不同監視器，確認記憶體穩定
- [ ] **網速測試** - Throttle 到 3G，確認沒有無限轉圈
- [ ] **成本驗證** - 監控實際 TDX API 呼叫數 (應該遠低於訪客數)

---

## 結論

**好的設計讓每個人都贏。🏆**

- ✅ 使用者體驗快速、流暢
- ✅ 你的成本保持最低
- ✅ TDX 的伺服器不被打死
- ✅ 整個生態系統健康永續
