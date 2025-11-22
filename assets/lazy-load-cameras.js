/**
 * 懶加載監視器模組
 * 
 * 功能：
 * - 初始不加載圖片，只顯示佔位符
 * - 用戶點擊時才真正加載影像
 * - 避免一次性消耗大量流量
 * - 保護 API 額度
 * - 改善頁面首次加載速度
 */

class LazyLoadCameras {
  /**
   * 初始化懶加載
   * @param {string} containerSelector - 容器選擇器 (例如 '#camera-grid')
   * @param {Object} options - 配置選項
   */
  static init(containerSelector, options = {}) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error(`❌ 找不到容器: ${containerSelector}`);
      return;
    }

    // 為所有相機卡片綁定懶加載
    const cards = container.querySelectorAll('[data-camera-src]');
    console.log(`📸 初始化懶加載: 發現 ${cards.length} 個相機`);

    cards.forEach(card => {
      this._initCardLazyLoad(card, options);
    });
  }

  /**
   * 為單個卡片設置懶加載
   * @private
   */
  static _initCardLazyLoad(card, options = {}) {
    const cameraSrc = card.dataset.cameraSrc;
    const cameraId = card.dataset.cameraId || 'unknown';
    const cameraName = card.dataset.cameraName || '監視器';

    // 查找占位符和真實圖片
    const placeholder = card.querySelector('.camera-placeholder');
    const realImg = card.querySelector('.camera-image');
    const playBtn = card.querySelector('.play-btn');

    if (!placeholder || !realImg) {
      console.warn(`⚠️ 卡片 ${cameraId} 缺少必要元素`);
      return;
    }

    // 為占位符綁定點擊事件
    placeholder.addEventListener('click', () => {
      this._loadCameraImage(
        card,
        cameraSrc,
        cameraId,
        cameraName,
        realImg,
        placeholder,
        playBtn,
        options
      );
    });

    // 為占位符添加視覺反饋（鼠標懸停）
    placeholder.style.cursor = 'pointer';
    placeholder.addEventListener('mouseenter', () => {
      placeholder.style.opacity = '0.8';
    });
    placeholder.addEventListener('mouseleave', () => {
      placeholder.style.opacity = '1';
    });
  }

  /**
   * 真正加載相機圖片
   * @private
   */
  static _loadCameraImage(
    card,
    cameraSrc,
    cameraId,
    cameraName,
    realImg,
    placeholder,
    playBtn,
    options = {}
  ) {
    // 避免重複加載
    if (realImg.src && realImg.src !== '') {
      return;
    }

    console.log(`▶️ 用戶點擊了 "${cameraName}" (ID: ${cameraId})，開始加載...`);

    // 顯示加載狀態
    if (playBtn) {
      playBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>';
    }

    // 設置圖片 src 以開始加載
    realImg.src = cameraSrc;

    // 成功加載
    realImg.addEventListener('load', () => {
      console.log(`✅ "${cameraName}" 加載成功`);
      realImg.style.display = 'block';
      placeholder.style.display = 'none';
      
      // 記錄統計信息 (如果有相機統計模組)
      if (typeof recordCameraView === 'function') {
        const type = card.dataset.cameraType || 'CCTV';
        recordCameraView(cameraId, cameraName, type);
      }
    }, { once: true });

    // 加載失敗
    realImg.addEventListener('error', () => {
      console.warn(`❌ "${cameraName}" 加載失敗`);
      if (playBtn) {
        playBtn.innerHTML = `
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #ff6b6b;"></i>
          <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #ff6b6b;">圖片載入失敗</p>
        `;
      }
      realImg.style.display = 'none';
    }, { once: true });
  }

  /**
   * 動態渲染相機卡片 (HTML 結構)
   * @static
   * @param {Array} cameras - 相機資料陣列
   * @param {string} containerSelector - 容器選擇器
   * @param {Object} options - 配置選項
   */
  static renderCameras(cameras, containerSelector, options = {}) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error(`❌ 找不到容器: ${containerSelector}`);
      return;
    }

    container.innerHTML = ''; // 清空現有內容

    cameras.forEach((camera, index) => {
      const cameraSrc = camera.VideoStreamURL || camera.ImageUrl || '';
      const cameraId = camera.LocationID || camera.CameraID || camera.ID || `cam-${index}`;
      const cameraName = camera.RoadName || camera.LocationDescription || camera.Description || '監視器';
      const cameraType = options.type || 'CCTV';

      // 建立卡片 HTML
      const card = document.createElement('div');
      card.className = 'camera-card';
      card.setAttribute('data-camera-src', cameraSrc);
      card.setAttribute('data-camera-id', cameraId);
      card.setAttribute('data-camera-name', cameraName);
      card.setAttribute('data-camera-type', cameraType);

      card.innerHTML = `
        <div class="camera-container">
          <div class="camera-placeholder" style="
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
            transition: opacity 0.3s ease;
          ">
            <div class="play-btn" style="
              text-align: center;
              color: white;
              transition: transform 0.3s ease;
            ">
              <i class="fas fa-play-circle" style="font-size: 3rem; margin-bottom: 0.5rem;"></i>
              <p style="margin: 0; font-size: 0.9rem; font-weight: 500;">點擊載入影像</p>
              <p style="margin: 0.5rem 0 0 0; font-size: 0.75rem; color: #999;">節省流量 • 按需加載</p>
            </div>
            <img class="camera-image" style="
              display: none;
              width: 100%;
              height: 100%;
              object-fit: cover;
            " alt="${cameraName}" />
          </div>
          <div class="camera-info" style="
            padding: 12px;
            background: white;
            border-top: 1px solid #eee;
          ">
            <h4 style="
              margin: 0 0 4px 0;
              font-size: 0.95rem;
              color: #333;
              font-weight: 600;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            " title="${cameraName}">${cameraName}</h4>
            <p style="
              margin: 0;
              font-size: 0.8rem;
              color: #999;
            ">ID: ${cameraId}</p>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    // 初始化所有卡片的懶加載
    this.init(containerSelector, options);
    console.log(`✅ 渲染完成: ${cameras.length} 個相機卡片`);
  }

  /**
   * 批量預加載指定的相機 (可選用於首屏相機)
   * @static
   * @param {string} containerSelector - 容器選擇器
   * @param {number} count - 預加載前幾個相機
   */
  static preloadTop(containerSelector, count = 3) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const cards = container.querySelectorAll('[data-camera-src]');
    for (let i = 0; i < Math.min(count, cards.length); i++) {
      const placeholder = cards[i].querySelector('.camera-placeholder');
      if (placeholder) {
        console.log(`⏳ 預加載第 ${i + 1} 個相機...`);
        placeholder.click(); // 模擬點擊以觸發加載
      }
    }
  }

  /**
   * 獲取已加載的相機統計
   * @static
   */
  static getLoadedStats(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return null;

    const total = container.querySelectorAll('[data-camera-src]').length;
    const loaded = container.querySelectorAll('.camera-image[src]').length;

    return {
      total,
      loaded,
      pending: total - loaded,
      percentage: Math.round((loaded / total) * 100)
    };
  }
}

// 如果需要，導出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LazyLoadCameras;
}
