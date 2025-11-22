/**
 * 📊 相機觀看統計模組
 * 
 * 這個模組提供:
 * 1. trackCameraView(id) - 在使用者點擊相機時增加計數
 * 2. loadTopCameras(limit) - 載入熱門排行
 * 3. displayTopCameras(selector) - 在 DOM 中顯示排行
 * 4. getCameraStats(id) - 取得特定相機的統計
 */

class CameraViewTracker {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || '/api';
    this.trackingEnabled = options.trackingEnabled !== false;
    this.logEnabled = options.logEnabled !== false;
    this.cacheExpiry = options.cacheExpiry || 60000; // 60 秒快取
    this.cache = new Map();
  }

  /**
   * 📊 追蹤相機觀看次數
   * @param {string} cameraId - 相機 ID
   * @returns {Promise<Object>} { success: true, camera_id: '...', new_views: 5 }
   */
  async trackCameraView(cameraId) {
    if (!this.trackingEnabled) {
      this._log("⚠️  追蹤功能已禁用");
      return { success: false, disabled: true };
    }

    if (!cameraId) {
      console.error("❌ 相機 ID 為空");
      return { success: false, error: "Missing camera ID" };
    }

    try {
      this._log(`📍 追蹤相機: ${cameraId}`);

      const response = await fetch(`${this.apiBaseUrl}/view-camera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cameraId })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ 追蹤失敗:", error);
        return { success: false, error: error.error };
      }

      const data = await response.json();

      if (data.success) {
        this._log(`✅ ${cameraId} 計數已更新至 ${data.new_views}`);
        
        // 清除快取以重新加載排行
        this.cache.delete('top-cameras');
      }

      return data;
    } catch (error) {
      console.error("❌ 追蹤請求失敗:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🏆 取得熱門相機排行
   * @param {number} limit - 返回的數量 (預設 10)
   * @returns {Promise<Array>} [{ camera_id: '...', views: 120 }, ...]
   */
  async loadTopCameras(limit = 10) {
    const cacheKey = `top-cameras-${limit}`;

    // 檢查快取
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        this._log(`📦 使用快取的排行列表 (${cached.data.length} 筆)`);
        return cached.data;
      }
    }

    try {
      this._log(`🔄 載入前 ${limit} 名熱門相機...`);

      const response = await fetch(
        `${this.apiBaseUrl}/get-top-cameras?limit=${limit}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ 載入排行失敗:", error);
        return [];
      }

      const data = await response.json();

      // 儲存至快取
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      this._log(`🏆 成功載入 ${data.length} 個相機`);
      return data;
    } catch (error) {
      console.error("❌ 載入排行請求失敗:", error);
      return [];
    }
  }

  /**
   * 🎨 在 DOM 中顯示熱門排行
   * @param {string} selector - CSS 選擇器 (例: '#top-cameras')
   * @param {number} limit - 顯示的數量 (預設 10)
   * @returns {Promise<void>}
   */
  async displayTopCameras(selector, limit = 10) {
    const container = document.querySelector(selector);
    if (!container) {
      console.error(`❌ 找不到容器: ${selector}`);
      return;
    }

    // 顯示載入中
    container.innerHTML = '<div class="loading">⏳ 載入中...</div>';

    const cameras = await this.loadTopCameras(limit);

    if (cameras.length === 0) {
      container.innerHTML = '<div class="no-data">📊 暫無資料</div>';
      return;
    }

    // 建立排行 HTML
    const html = cameras.map((cam, index) => {
      const medal = ['🥇', '🥈', '🥉'];
      const icon = medal[index] || `#${index + 1}`;

      return `
        <div class="rank-item" data-camera-id="${cam.camera_id}">
          <span class="medal">${icon}</span>
          <div class="camera-info">
            <div class="camera-id">${this._escapeHtml(cam.camera_id)}</div>
            <div class="camera-time">更新: ${this._formatTime(cam.last_updated)}</div>
          </div>
          <div class="views">
            <span class="view-count">👁️ ${cam.views.toLocaleString()}</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="top-cameras-header">🏆 熱門監視器排行</div>
      <div class="rank-list">
        ${html}
      </div>
    `;

    // 綁定點擊事件 (可選)
    this._attachRankItemEvents(container);
  }

  /**
   * 📈 取得特定相機的統計
   * @param {string} cameraId - 相機 ID
   * @returns {Promise<Object|null>} { camera_id: '...', views: 120, last_updated: '...' }
   */
  async getCameraStats(cameraId) {
    const cameras = await this.loadTopCameras(100); // 載入前 100 個
    return cameras.find(cam => cam.camera_id === cameraId) || null;
  }

  /**
   * 🔄 自動更新排行 (每 N 秒)
   * @param {string} selector - DOM 容器選擇器
   * @param {number} interval - 更新間隔 (毫秒，預設 60000 = 60秒)
   * @returns {number} interval ID (可用於 clearInterval)
   */
  autoRefreshTopCameras(selector, interval = 60000) {
    this._log(`🔄 每 ${interval / 1000} 秒自動更新排行`);

    // 立即執行一次
    this.displayTopCameras(selector);

    // 定期更新
    return setInterval(() => {
      this.displayTopCameras(selector);
    }, interval);
  }

  /**
   * 🛠️ 私有方法
   */

  _log(message) {
    if (this.logEnabled) {
      console.log(`[CameraTracker] ${message}`);
    }
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _formatTime(isoString) {
    if (!isoString) return '未知';
    
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diff = now - date;

      // 小於 1 分鐘
      if (diff < 60000) return '剛才';

      // 小於 1 小時
      if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins} 分鐘前`;
      }

      // 小於 1 天
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} 小時前`;
      }

      // 顯示日期
      return date.toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '未知';
    }
  }

  _attachRankItemEvents(container) {
    container.querySelectorAll('.rank-item').forEach(item => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => {
        const cameraId = item.dataset.cameraId;
        // 可以在這裡觸發點擊相機事件
        console.log(`📹 點擊相機: ${cameraId}`);
        // 例: window.dispatchEvent(new CustomEvent('camera-selected', { detail: { cameraId } }));
      });
    });
  }
}

/**
 * 🚀 全局使用
 * 
 * // 初始化
 * const tracker = new CameraViewTracker();
 * 
 * // 追蹤觀看
 * tracker.trackCameraView('國道一號-15k');
 * 
 * // 顯示排行
 * tracker.displayTopCameras('#top-cameras', 10);
 * 
 * // 自動更新
 * tracker.autoRefreshTopCameras('#top-cameras', 60000);
 */

// 如果在瀏覽器中，將其掛載到全局
if (typeof window !== 'undefined') {
  window.CameraViewTracker = CameraViewTracker;
}

// 供 Node.js / 模組導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CameraViewTracker;
}
