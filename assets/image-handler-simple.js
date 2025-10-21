/**
 * 簡化的圖片處理器 - 專注於基本功能
 * 避免複雜的重試機制和載入狀態管理
 */

// 全域配置
window.IMAGE_CONFIG = {
    timeout: 10000,        // 10秒超時
    retryDelay: 1000,      // 重試延遲
    retryCount: 1,         // 只重試一次
    lazyLoad: true         // 開啟懶載入
};

/**
 * 載入單張監視器圖片 - 極簡版本
 * @param {HTMLElement} container - 圖片容器
 * @param {string} url - 圖片URL  
 * @param {string} name - 監視器名稱
 */
function loadCameraImage(container, url, name) {
    if (!container || !url) {
        console.warn('容器或URL為空');
        return;
    }
    
    // 創建圖片元素
    const img = document.createElement('img');
    img.alt = name + '監視器影像';
    img.loading = 'lazy';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 8px;';
    
    // 成功載入
    img.onload = () => {
        container.innerHTML = '';
        container.appendChild(img);
    };
    
    // 載入失敗
    img.onerror = () => {
        showError(container, name);
    };
    
    // 設置載入超時
    const timeoutId = setTimeout(() => {
        if (!img.complete) {
            showError(container, name);
        }
    }, window.IMAGE_CONFIG.timeout);
    
    // 載入成功後清除超時
    img.onload = () => {
        clearTimeout(timeoutId);
        container.innerHTML = '';
        container.appendChild(img);
    };
    
    // 直接載入圖片
    img.src = url;
}

/**
 * 顯示錯誤信息
 * @param {HTMLElement} container - 容器
 * @param {string} name - 監視器名稱
 */
function showError(container, name) {
    container.innerHTML = `
        <div style="
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100%; 
            color: #999; 
            background: #f5f5f5; 
            border-radius: 8px;
            padding: 20px;
            box-sizing: border-box;
        ">
            <i class="fas fa-exclamation-triangle" style="
                font-size: 2rem; 
                margin-bottom: 8px; 
                color: #f44336;
            "></i>
            <span style="
                font-size: 0.85rem; 
                text-align: center;
                line-height: 1.4;
            ">
                ${name || '監視器'}<br>影像載入失敗
            </span>
            <button 
                onclick="retryLoad(this, '${name}')" 
                style="
                    margin-top: 10px;
                    padding: 6px 12px;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                "
            >
                重新載入
            </button>
        </div>
    `;
}

/**
 * 重新載入圖片
 * @param {HTMLButtonElement} button - 重試按鈕
 * @param {string} name - 監視器名稱
 */
function retryLoad(button, name) {
    const container = button.closest('.camera-image') || button.parentElement;
    const img = container.querySelector('img');
    
    if (img && img.dataset.originalUrl) {
        loadCameraImage(container, img.dataset.originalUrl, name);
    } else {
        console.warn('無法找到原始URL進行重試');
    }
}

/**
 * 批量載入監視器圖片
 * @param {Array} cameras - 監視器數據陣列
 * @param {string} containerId - 容器ID
 */
function loadAllCameraImages(cameras, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !cameras.length) return;
    
    cameras.forEach((camera, index) => {
        setTimeout(() => {
            const imageContainer = container.querySelector(`[data-camera-id="${camera.id}"] .camera-image`);
            if (imageContainer && camera.imageUrl) {
                loadCameraImage(imageContainer, camera.imageUrl, camera.name);
            }
        }, index * 100); // 錯開載入避免同時請求過多
    });
}

/**
 * 為URL添加時間戳（可選使用）
 * @param {string} url - 原始URL
 * @returns {string} 添加時間戳的URL
 */
function addTimestamp(url) {
    if (!url) return '';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
}

/**
 * 初始化懶載入觀察器
 */
function initLazyLoading() {
    if (!window.IMAGE_CONFIG.lazyLoad) return;
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const container = entry.target;
                const url = container.dataset.src;
                const name = container.dataset.name;
                
                if (url) {
                    loadCameraImage(container, url, name);
                    observer.unobserve(container);
                }
            }
        });
    }, {
        rootMargin: '50px'
    });
    
    // 觀察所有待載入的圖片容器
    document.querySelectorAll('.camera-image[data-src]').forEach(container => {
        imageObserver.observe(container);
    });
}

// 頁面載入完成後初始化懶載入
document.addEventListener('DOMContentLoaded', () => {
    initLazyLoading();
});

console.log('簡化圖片處理器已載入 - v2.0');