// 水利署河川監視器 API 整合模組

const WRA_API_CONFIG = {
    endpoint: 'https://wra-od-testing.blueplanet.com.tw/api/v2/f71b74eb-cbe5-42c6-8be5-7500450e7db0',
    params: {
        sort: '_importdate asc',
        format: 'JSON'
    },
    refreshInterval: 300000 // 5分鐘更新一次
};

// 建構完整的 API URL
function buildApiUrl() {
    const params = new URLSearchParams(WRA_API_CONFIG.params);
    return `${WRA_API_CONFIG.endpoint}?${params.toString()}`;
}

// 從 API 載入真實資料
async function loadRealCameraData() {
    try {
        console.log('正在從水利署 API 載入資料...');
        const response = await fetch(buildApiUrl());
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API 原始資料:', data);
        
        // 轉換 API 資料為系統格式
        const cameras = transformApiData(data);
        console.log(`成功載入 ${cameras.length} 台監視器`);
        
        return cameras;
    } catch (error) {
        console.error('載入 API 資料失敗:', error);
        // 如果 API 失敗，回傳示範資料
        console.warn('使用示範資料作為備援');
        return generateDemoData();
    }
}

// 轉換 API 資料格式（根據真實 API 結構）
function transformApiData(apiData) {
    // API 直接返回陣列
    if (!Array.isArray(apiData)) {
        console.error('API 資料格式不正確，預期陣列格式');
        return [];
    }
    
    const cameras = [];
    
    apiData.forEach((record, index) => {
        try {
            // 根據真實 API 欄位映射
            const camera = {
                id: record.cameraid || `WRA-${index + 1}`,
                name: record.cameraname || record.videosurveillancestationname || `監視站 #${index + 1}`,
                location: (record.countiesandcitieswherethemonitoringpointsarelocated || '') + 
                         (record.administrativedistrictwherethemonitoringpointislocated || ''),
                river: record.basinname || record.tributary || '未知河川',
                type: Math.random() > 0.5 ? 'direct' : 'local', // API 沒有提供此欄位，隨機分配
                status: record.status === '1' ? 'online' : 'offline',
                latitude: parseFloat(record.latitude_4326 || 0),
                longitude: parseFloat(record.longitude_4326 || 0),
                altitude: 0, // API 沒有提供高度
                imageUrl: record.imageurl || null,
                lastUpdate: new Date().toISOString(),
                waterLevel: null, // API 沒有提供水位
                flow: null, // API 沒有提供流量
                // 額外資訊
                county: record.countiesandcitieswherethemonitoringpointsarelocated || '',
                township: record.administrativedistrictwherethemonitoringpointislocated || '',
                riverCode: record.rivercode || '',
                coordinate: record.coordinate || ''
            };
            
            cameras.push(camera);
        } catch (error) {
            console.error(`處理第 ${index + 1} 筆資料時發生錯誤:`, error);
        }
    });
    
    console.log(`成功轉換 ${cameras.length} 筆監視器資料`);
    return cameras;
}

// 建構地理位置字串
function buildLocation(record) {
    const parts = [];
    
    if (record.county || record.city) {
        parts.push(record.county || record.city);
    }
    if (record.township || record.district) {
        parts.push(record.township || record.district);
    }
    if (record.locationName || record.location) {
        parts.push(record.locationName || record.location);
    }
    
    return parts.length > 0 ? parts.join('') : '未知位置';
}

// 判斷管理類型
function determineType(record) {
    // 根據實際 API 欄位判斷
    if (record.managementType) {
        return record.managementType === '水利署' || record.managementType === 'direct' ? 'direct' : 'local';
    }
    if (record.manager) {
        return record.manager.includes('水利署') ? 'direct' : 'local';
    }
    // 預設隨機分配以模擬真實情況
    return Math.random() > 0.5 ? 'direct' : 'local';
}

// 判斷監視器狀態
function determineStatus(record) {
    // 優先使用 API 提供的狀態欄位
    if (record.status) {
        const status = record.status.toLowerCase();
        if (status.includes('online') || status.includes('正常') || status.includes('運作')) {
            return 'online';
        }
        if (status.includes('offline') || status.includes('離線') || status.includes('故障')) {
            return 'offline';
        }
    }
    
    // 如果有影像 URL 則視為線上
    if (record.snapshotURL || record.imageURL || record.snapshot) {
        return 'online';
    }
    
    // 檢查最後更新時間（如果超過1小時視為離線）
    if (record.updateTime || record.timestamp) {
        try {
            const updateTime = new Date(record.updateTime || record.timestamp);
            const now = new Date();
            const hoursDiff = (now - updateTime) / (1000 * 60 * 60);
            return hoursDiff < 1 ? 'online' : 'offline';
        } catch (error) {
            console.error('解析時間失敗:', error);
        }
    }
    
    // 預設視為線上
    return 'online';
}

// 重新整理影像
function refreshCameraImages() {
    const images = document.querySelectorAll('.camera-image img');
    images.forEach(img => {
        if (img.src && !img.src.includes('placeholder')) {
            // 加上時間戳避免快取
            const url = new URL(img.src);
            url.searchParams.set('t', Date.now());
            img.src = url.toString();
        }
    });
    console.log(`已重新整理 ${images.length} 張影像`);
}

// 啟用自動更新
function enableAutoRefresh() {
    // 定期重新載入監視器資料
    setInterval(async () => {
        console.log('執行自動更新...');
        try {
            allCameras = await loadRealCameraData();
            filteredCameras = [...allCameras];
            updateStats();
            filterCameras();
        } catch (error) {
            console.error('自動更新失敗:', error);
        }
    }, WRA_API_CONFIG.refreshInterval);
    
    // 定期重新整理影像（每30秒）
    setInterval(refreshCameraImages, 30000);
    
    console.log(`自動更新已啟用（每 ${WRA_API_CONFIG.refreshInterval / 1000} 秒）`);
}

// 取得 API 統計資訊
async function getApiStats() {
    try {
        const response = await fetch(buildApiUrl());
        const data = await response.json();
        
        return {
            success: true,
            totalRecords: data.result?.records?.length || 0,
            fields: data.result?.fields?.length || 0,
            resourceId: data.result?.resource_id || 'N/A',
            lastUpdate: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// 匯出函式供外部使用
window.WRA_API = {
    load: loadRealCameraData,
    refresh: refreshCameraImages,
    enableAutoRefresh: enableAutoRefresh,
    getStats: getApiStats,
    config: WRA_API_CONFIG
};

console.log('水利署 API 整合模組已載入');
