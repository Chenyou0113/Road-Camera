/**
 * 🎥 監視器統計模組
 * 用於記錄使用者對監視器的點擊和瀏覽行為
 * 
 * 使用方式：
 * recordCameraView('國道一號-15k', '國道一號', 'highway');
 */

/**
 * 記錄監視器瀏覽統計
 * @param {string} cameraId - 監視器 ID (唯一識別符)
 * @param {string} locationName - 監視器位置名稱 (如：國道一號、台北信義路)
 * @param {string} type - 監視器類型 (highway/road/city/water/expressway)
 * @returns {Promise<Object>} 記錄結果
 */
async function recordCameraView(cameraId, locationName, type = 'unknown') {
    // 參數驗證
    if (!cameraId || typeof cameraId !== 'string') {
        console.warn('⚠️ 統計記錄：無效的 cameraId');
        return { success: false, error: 'Invalid camera ID' };
    }

    try {
        const payload = {
            id: cameraId,
            location: locationName || cameraId,
            type: type
        };

        const response = await fetch('https://taiwan-traffic-cctv.xiaoyouwu5-fd3.workers.dev/api/view-camera', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.warn(`⚠️ 統計記錄失敗 (HTTP ${response.status})`);
            return { success: false, error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ 已記錄「${locationName}」，總瀏覽次數: ${data.new_views}`);
        }
        
        return data;

    } catch (error) {
        // 不中斷使用者體驗，靜默失敗
        console.log(`ℹ️ 統計記錄失敗（網路問題）: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 批量記錄多個監視器
 * @param {Array} cameras - 監視器陣列 [{ id, location, type }]
 */
async function recordCameraViews(cameras) {
    if (!Array.isArray(cameras)) return;
    
    for (const camera of cameras) {
        await recordCameraView(camera.id, camera.location, camera.type);
        // 避免發送過多請求，每個間隔 100ms
        await new Promise(r => setTimeout(r, 100));
    }
}

/**
 * 取得熱門監視器排行榜
 * @param {number} limit - 返回數量 (預設 10)
 * @returns {Promise<Array>} 排行榜數據
 */
async function getTopCameras(limit = 10) {
    try {
        const response = await fetch(`https://taiwan-traffic-cctv.xiaoyouwu5-fd3.workers.dev/api/get-top-cameras?limit=${Math.min(limit, 100)}`);
        
        if (!response.ok) {
            console.warn(`⚠️ 取得排行榜失敗 (HTTP ${response.status})`);
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.warn(`⚠️ 取得排行榜失敗: ${error.message}`);
        return [];
    }
}

/**
 * 提示使用者記錄成功 (可選)
 * @param {string} message - 提示訊息
 * @param {number} duration - 顯示時間 (毫秒)
 */
function showStatisticNotification(message = '已記錄', duration = 2000) {
    // 檢查是否已有通知元素
    let notif = document.getElementById('statistic-notification');
    
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'statistic-notification';
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1e40af, #0891b2);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(notif);
        
        // 添加動畫
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    notif.textContent = message;
    notif.style.display = 'block';
    
    clearTimeout(notif.hideTimeout);
    notif.hideTimeout = setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            notif.style.display = 'none';
        }, 300);
    }, duration);
}

// 導出到全域 (如果在模組化環境中)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        recordCameraView,
        recordCameraViews,
        getTopCameras,
        showStatisticNotification
    };
}
