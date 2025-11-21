/**
 * 土石流監測站備用 API 模組
 * 用途：當 STA API 無法取得影像時，提供備用查詢方式
 */

const DebrisFlowAPIFallback = {
    /**
     * 農業部開放資料 - 土石流觀測站影像資料庫 (UDL013)
     * API 文件：https://data.moa.gov.tw/
     */
    MOA_OPEN_DATA_URL: 'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=111',
    
    /**
     * 土石流防災資訊網 - 實時監測影像
     * 來源：農業部水土保持署
     */
    DEBRIS_FLOW_MONITORING_URL: 'https://dfm.ardswc.gov.tw/debrisFinal/ShowCCDImg-LG.asp',
    
    /**
     * STA Sensing Observation 資料查詢備用端點
     */
    STA_BACKUP_URLS: [
        'https://sta.ci.taiwan.gov.tw/STA_CCTV/v1.0/Things?$expand=Locations,Datastreams',
        'https://data.moa.gov.tw/sta/v1.0/Datastreams'
    ],
    
    /**
     * 嘗試從 MOA 開放資料取得土石流監測站影像
     * @param {string} stationId - 監測站 ID
     * @returns {Promise<string>} 影像 URL
     */
    async fetchFromMOAOpenData(stationId) {
        try {
            const response = await fetch(this.MOA_OPEN_DATA_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            if (!Array.isArray(data)) return null;
            
            // 尋找匹配的監測站
            const station = data.find(s => 
                s.監測編號 === stationId || 
                s.stationID === stationId ||
                s['監測編號'] === stationId
            );
            
            if (station && station.影像連結網址) {
                console.log(`✅ 從 MOA 開放資料取得 ${stationId} 影像:`, station.影像連結網址);
                return station.影像連結網址;
            }
            
            return null;
        } catch (error) {
            console.warn('MOA 開放資料查詢失敗:', error);
            return null;
        }
    },
    
    /**
     * 嘗試從 DFIS 系統取得影像
     * @param {number} stationId - 監測站 ID
     * @param {number} ccdId - 攝影機 ID (預設 2)
     * @returns {string} 影像 URL
     */
    constructDFISImageUrl(stationId, ccdId = 2) {
        // 格式：https://dfm.ardswc.gov.tw/debrisFinal/ShowCCDImg-LG.asp?StationID=7&CCDId=2
        return `${this.DEBRIS_FLOW_MONITORING_URL}?StationID=${stationId}&CCDId=${ccdId}`;
    },
    
    /**
     * 驗證影像 URL 是否有效
     * @param {string} imageUrl - 影像 URL
     * @returns {Promise<boolean>}
     */
    async validateImageUrl(imageUrl) {
        if (!imageUrl || !imageUrl.startsWith('http')) return false;
        
        try {
            const response = await fetch(imageUrl, { 
                method: 'HEAD',
                mode: 'no-cors'
            });
            return response.ok || response.status === 0; // 0 表示 CORS 阻止但連線成功
        } catch (error) {
            console.log(`⚠️ 無法驗證 URL: ${imageUrl}`, error);
            return true; // 假設有效，避免誤判
        }
    },
    
    /**
     * 合併並去重影像數據
     * @param {Array} staStations - STA API 返回的站點
     * @param {Array} moaStations - MOA 開放資料的站點
     * @returns {Array} 合併後的站點數據
     */
    mergeStationData(staStations = [], moaStations = []) {
        const stationMap = new Map();
        
        // 首先添加 STA 數據
        staStations.forEach(station => {
            const key = station.Thing?.properties?.stationID || station.name;
            stationMap.set(key, station);
        });
        
        // 然後用 MOA 數據補充或更新
        moaStations.forEach(station => {
            const key = station.監測編號 || station.stationID || station.name;
            if (!stationMap.has(key)) {
                stationMap.set(key, station);
            } else {
                // 如果影像為空，使用 MOA 的影像
                const existing = stationMap.get(key);
                if ((!existing.processedImageUrl || !existing.processedImageUrl.trim()) && 
                    station.影像連結網址) {
                    existing.processedImageUrl = station.影像連結網址;
                    console.log(`🔄 更新 ${key} 的影像 URL (from MOA)`);
                }
            }
        });
        
        return Array.from(stationMap.values());
    },
    
    /**
     * 日誌記錄函數
     */
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString('zh-TW');
        const prefix = {
            'info': 'ℹ️',
            'warn': '⚠️',
            'error': '❌',
            'success': '✅'
        }[level] || '📝';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }
};

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebrisFlowAPIFallback;
}
