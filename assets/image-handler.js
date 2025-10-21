/**
 * 通用圖片載入處理函數
 * 處理監視器影像載入失敗、白框問題和重試機制
 */

// 全域圖片載入配置
window.IMAGE_CONFIG = {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10000,
    fallbackImage: 'data:image/svg+xml,<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="%23f8f9fa"/><text x="50%" y="45%" font-family="Arial" font-size="14" fill="%236c757d" text-anchor="middle">影像載入失敗</text><text x="50%" y="65%" font-family="Arial" font-size="12" fill="%236c757d" text-anchor="middle">請稍後重試</text></svg>'
};

/**
 * 處理圖片載入錯誤 - 簡化版本
 * @param {HTMLImageElement} img - 圖片元素
 * @param {string} originalUrl - 原始URL
 * @param {string} name - 監視器名稱（可選）
 */
function handleImageError(img, originalUrl, name = '') {
    console.warn(`圖片載入失敗: ${originalUrl}`);
    
    // 簡單的錯誤處理，直接替換為錯誤圖示
    img.parentElement.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #999; background: #f5f5f5;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px; color: #f44336;"></i>
            <span style="font-size: 0.85rem; text-align: center;">${name || '監視器'}<br>影像載入失敗</span>
        </div>
    `;
}

/**
 * 顯示圖片載入錯誤界面
 * @param {HTMLImageElement} img - 圖片元素
 * @param {string} name - 監視器名稱
 */
function showImageError(img, name) {
    // 簡單的錯誤顯示，不替換整個容器
    img.style.display = 'none';
    const container = img.parentElement;
    
    // 檢查是否已經有錯誤訊息
    if (!container.querySelector('.image-error')) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'image-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #f44336; margin-bottom: 8px;"></i>
            <span style="font-size: 0.85rem; color: #666;">${name}<br>影像載入失敗</span>
        `;
        container.appendChild(errorDiv);
    }
}

/**
 * 重試載入圖片
 * @param {HTMLElement} button - 重試按鈕
 * @param {string} url - 圖片URL
 * @param {string} name - 監視器名稱
 */
function retryImageLoad(button, url, name) {
    const container = button.closest('.camera-image') || button.parentElement;
    
    container.innerHTML = `
        <div class="image-loading">
            載入中...
        </div>
    `;
    
    // 創建新的圖片元素
    const img = document.createElement('img');
    img.alt = name + '監視器影像';
    img.loading = 'lazy';
    img.dataset.retryCount = '0';
    
    img.onload = () => {
        container.innerHTML = '';
        container.appendChild(img);
    };
    
    img.onerror = () => {
        handleImageError(img, url, name);
    };
    
    // 設置載入超時
    setTimeout(() => {
        if (!img.complete) {
            handleImageError(img, url, name);
        }
    }, window.IMAGE_CONFIG.timeout);
    
    img.src = addTimestamp(url);
}

/**
 * 為URL添加時間戳避免緩存
 * @param {string} url - 原始URL
 * @returns {string} 添加時間戳的URL
 */
function addTimestamp(url) {
    if (!url) return '';
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
}

/**
 * 嘗試將URL轉換為JPG格式
 * @param {string} url - 原始URL
 * @returns {string} 轉換後的URL
 */
function convertToJpg(url) {
    if (!url) return '';
    
    // 將 .mjpg 或 .mjpeg 轉換為 .jpg
    return url.replace(/\.(mjpg|mjpeg)(\?|$)/i, '.jpg$2');
}

/**
 * 修復協議問題
 * @param {string} url - 原始URL
 * @returns {string} 修復後的URL
 */
function fixProtocol(url) {
    if (!url) return '';
    
    // 如果URL是相對協議，使用當前頁面的協議
    if (url.startsWith('//')) {
        return window.location.protocol + url;
    }
    
    // 如果是HTTP而當前頁面是HTTPS，嘗試升級到HTTPS
    if (url.startsWith('http://') && window.location.protocol === 'https:') {
        return url.replace('http://', 'https://');
    }
    
    return url;
}

/**
 * 預載入圖片並處理錯誤
 * @param {string} url - 圖片URL
 * @param {string} name - 監視器名稱
 * @returns {Promise<HTMLImageElement>} Promise包裝的圖片元素
 */
function preloadImage(url, name = '') {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        let retryCount = 0;
        const maxRetries = window.IMAGE_CONFIG.retryCount;
        
        function tryLoad(currentUrl) {
            img.onload = () => resolve(img);
            
            img.onerror = () => {
                retryCount++;
                
                if (retryCount <= maxRetries) {
                    let newUrl = currentUrl;
                    
                    if (retryCount === 1) {
                        newUrl = addTimestamp(currentUrl);
                    } else if (retryCount === 2) {
                        newUrl = convertToJpg(currentUrl);
                    } else if (retryCount === 3) {
                        newUrl = fixProtocol(currentUrl);
                    }
                    
                    setTimeout(() => tryLoad(newUrl), window.IMAGE_CONFIG.retryDelay * retryCount);
                } else {
                    reject(new Error(`圖片載入失敗: ${url}`));
                }
            };
            
            // 設置超時
            setTimeout(() => {
                if (!img.complete) {
                    img.onerror();
                }
            }, window.IMAGE_CONFIG.timeout);
            
            img.src = currentUrl;
        }
        
        tryLoad(url);
    });
}

/**
 * 批量預載入圖片
 * @param {Array} urls - 圖片URL陣列
 * @param {Function} onProgress - 進度回調函數
 * @returns {Promise<Array>} Promise包裝的結果陣列
 */
function batchPreloadImages(urls, onProgress) {
    let loaded = 0;
    const total = urls.length;
    
    const promises = urls.map(async (url, index) => {
        try {
            const img = await preloadImage(url);
            loaded++;
            if (onProgress) onProgress(loaded, total, index, img);
            return { success: true, img, url };
        } catch (error) {
            loaded++;
            if (onProgress) onProgress(loaded, total, index, null);
            return { success: false, error, url };
        }
    });
    
    return Promise.all(promises);
}

/**
 * 初始化圖片懶載入
 */
function initImageLazyLoad() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        // 觀察所有有 data-src 屬性的圖片
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    initImageLazyLoad();
});

// 導出函數供全域使用
window.handleImageError = handleImageError;
window.retryImageLoad = retryImageLoad;
window.preloadImage = preloadImage;
window.batchPreloadImages = batchPreloadImages;