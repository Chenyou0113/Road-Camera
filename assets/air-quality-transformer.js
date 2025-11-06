/**
 * 環保署空氣品質監測站 - 資料轉換工具
 * 用於處理空品測站即時影像資料
 * API: https://data.moenv.gov.tw/api/v2/aqx_p_01
 */

class AirQualityTransformer {
    // API 端點
    static API_BASE = 'https://data.moenv.gov.tw/api/v2/aqx_p_01';
    static API_KEY = '4c89a32a-a214-461b-bf29-30ff32a61a8a';
    
    // 空品測站編碼對應的中文名稱與座標
    static STATIONS_MAP = {
        '01': { name: '基隆', lat: 25.1226, lon: 121.7340, county: '基隆市' },
        '02': { name: '汐止', lat: 25.0651, lon: 121.6554, county: '新北市' },
        '03': { name: '萬里', lat: 25.1982, lon: 121.6945, county: '新北市' },
        '04': { name: '新店', lat: 24.9983, lon: 121.5442, county: '新北市' },
        '05': { name: '土城', lat: 24.9761, lon: 121.4393, county: '新北市' },
        '06': { name: '板橋', lat: 25.0121, lon: 121.4629, county: '新北市' },
        '07': { name: '新莊', lat: 25.0368, lon: 121.4317, county: '新北市' },
        '08': { name: '林口', lat: 25.0788, lon: 121.3279, county: '新北市' },
        '09': { name: '淡水', lat: 25.1706, lon: 121.4490, county: '新北市' },
        '10': { name: '士林', lat: 25.1119, lon: 121.5292, county: '臺北市' },
        '11': { name: '中山', lat: 25.0640, lon: 121.5292, county: '臺北市' },
        '12': { name: '松山', lat: 25.0536, lon: 121.5754, county: '臺北市' },
        '13': { name: '南港', lat: 25.0537, lon: 121.5810, county: '臺北市' },
        '14': { name: '中正', lat: 25.0256, lon: 121.5165, county: '臺北市' },
        '15': { name: '萬華', lat: 25.0322, lon: 121.5013, county: '臺北市' },
        '16': { name: '古亭', lat: 25.0163, lon: 121.5276, county: '臺北市' },
        '17': { name: '士林', lat: 25.1119, lon: 121.5292, county: '臺北市' },
        '18': { name: '內湖', lat: 25.0633, lon: 121.5817, county: '臺北市' },
        '19': { name: '三重', lat: 25.0704, lon: 121.4909, county: '新北市' },
        '20': { name: '竹子山', lat: 24.9489, lon: 121.5254, county: '新北市' },
        '21': { name: '新竹', lat: 24.8197, lon: 120.9608, county: '新竹市' },
        '22': { name: '頭份', lat: 24.6525, lon: 120.8830, county: '苗栗縣' },
        '23': { name: '苗栗', lat: 24.5597, lon: 120.8219, county: '苗栗縣' },
        '24': { name: '三義', lat: 24.3720, lon: 120.7632, county: '苗栗縣' },
        '25': { name: '豐原', lat: 24.2516, lon: 120.7356, county: '臺中市' },
        '26': { name: '后里', lat: 24.3149, lon: 120.8238, county: '臺中市' },
        '27': { name: '東勢', lat: 24.2640, lon: 120.8319, county: '臺中市' },
        '28': { name: '西屯', lat: 24.1776, lon: 120.6363, county: '臺中市' },
        '29': { name: '霧峰', lat: 24.0637, lon: 120.8027, county: '臺中市' },
        '30': { name: '大里', lat: 24.0976, lon: 120.6749, county: '臺中市' },
        '31': { name: '沙鹿', lat: 24.2265, lon: 120.5805, county: '臺中市' },
        '32': { name: '彰化', lat: 24.0761, lon: 120.5403, county: '彰化縣' },
        '33': { name: '線西', lat: 24.1037, lon: 120.4583, county: '彰化縣' },
        '34': { name: '二林', lat: 23.7721, lon: 120.4230, county: '彰化縣' },
        '35': { name: '南投', lat: 23.8132, lon: 120.6728, county: '南投縣' },
        '36': { name: '斗六', lat: 23.7100, lon: 120.5506, county: '雲林縣' },
        '37': { name: '朴子', lat: 23.4540, lon: 120.1920, county: '嘉義縣' },
        '38': { name: '嘉義', lat: 23.4764, lon: 120.4434, county: '嘉義市' },
        '39': { name: '新港', lat: 23.5761, lon: 120.3530, county: '嘉義縣' },
        '40': { name: '六腳', lat: 23.4307, lon: 120.2602, county: '嘉義縣' },
        '41': { name: '臺南', lat: 22.9951, lon: 120.2195, county: '臺南市' },
        '42': { name: '善化', lat: 22.9762, lon: 120.2930, county: '臺南市' },
        '43': { name: '安南', lat: 23.0686, lon: 120.2354, county: '臺南市' },
        '44': { name: '馬公', lat: 23.5680, lon: 119.5873, county: '澎湖縣' },
        '45': { name: '九如', lat: 22.5727, lon: 120.3565, county: '屏東縣' },
        '46': { name: '潮州', lat: 22.5170, lon: 120.5549, county: '屏東縣' },
        '47': { name: '恆春', lat: 22.0077, lon: 120.7769, county: '屏東縣' },
        '48': { name: '屏東', lat: 22.6742, lon: 120.4875, county: '屏東縣' },
        '49': { name: '高雄', lat: 22.6151, lon: 120.3112, county: '高雄市' },
        '50': { name: '仁武', lat: 22.6436, lon: 120.3892, county: '高雄市' },
        '51': { name: '鳳山', lat: 22.6152, lon: 120.3517, county: '高雄市' },
        '52': { name: '大寮', lat: 22.5594, lon: 120.3932, county: '高雄市' },
        '53': { name: '林園', lat: 22.4725, lon: 120.2847, county: '高雄市' },
        '54': { name: '左營', lat: 22.6862, lon: 120.2790, county: '高雄市' },
        '55': { name: '前鎮', lat: 22.5751, lon: 120.2825, county: '高雄市' },
        '56': { name: '小港', lat: 22.5618, lon: 120.3417, county: '高雄市' },
        '57': { name: '永安', lat: 22.6893, lon: 120.1918, county: '高雄市' },
        '58': { name: '橋頭', lat: 22.7610, lon: 120.2831, county: '高雄市' },
        '59': { name: '美濃', lat: 22.8907, lon: 120.5424, county: '高雄市' },
        '60': { name: '岡山', lat: 22.7772, lon: 120.2903, county: '高雄市' },
        '61': { name: '旗山', lat: 22.7843, lon: 120.4807, county: '高雄市' },
        '62': { name: '花蓮', lat: 23.9915, lon: 121.6039, county: '花蓮縣' },
        '63': { name: '臺東', lat: 22.7490, lon: 121.1489, county: '臺東縣' }
    };

    /**
     * 從環保署 API 取得最新的空品測站影像清單
     * @returns {Promise<Array>} 空品測站影像資料陣列
     */
    static async fetchLatestImagesList() {
        try {
            const url = `${this.API_BASE}?api_key=${this.API_KEY}&limit=1000&format=JSON&sort=ImportDate%20desc`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API 錯誤: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.records || !Array.isArray(data.records)) {
                throw new Error('無效的 API 回應格式');
            }
            
            return data.records;
        } catch (error) {
            console.error('取得空品影像清單失敗:', error);
            return [];
        }
    }

    /**
     * 解析檔案名稱以提取時間戳記和編碼
     * 檔案格式: 空氣品質監測即時影像資料(發布)_20251106_221502.zip
     * @param {string} filename 檔案名稱
     * @returns {Object} { timestamp, date }
     */
    static parseFilename(filename) {
        const match = filename.match(/(\d{8})_(\d{6})/);
        if (!match) return null;
        
        const [, date, time] = match;
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        const hour = time.substring(0, 2);
        const minute = time.substring(2, 4);
        const second = time.substring(4, 6);
        
        return {
            timestamp: `${year}-${month}-${day}T${hour}:${minute}:${second}`,
            date: `${year}/${month}/${day} ${hour}:${minute}`
        };
    }

    /**
     * 取得最新的 zip 檔案 URL
     * @returns {Promise<Object>} { url, timestamp, date }
     */
    static async getLatestZipUrl() {
        const records = await this.fetchLatestImagesList();
        
        if (records.length === 0) {
            console.warn('沒有找到空品影像資料');
            return null;
        }
        
        const latest = records[0];
        const parsed = this.parseFilename(latest.filename);
        
        return {
            url: latest.url,
            filename: latest.filename,
            timestamp: parsed?.timestamp || new Date().toISOString(),
            date: parsed?.date || new Date().toLocaleString('zh-TW'),
            description: latest.description
        };
    }

    /**
     * 取得測站資訊
     * @param {string} stationCode 測站編碼 (如 '01')
     * @returns {Object} 測站資訊
     */
    static getStationInfo(stationCode) {
        const paddedCode = String(stationCode).padStart(2, '0');
        return this.STATIONS_MAP[paddedCode] || null;
    }

    /**
     * 取得所有測站清單
     * @returns {Array} 所有測站資訊
     */
    static getAllStations() {
        return Object.entries(this.STATIONS_MAP).map(([code, info]) => ({
            code,
            ...info
        }));
    }

    /**
     * 建立空品測站卡片 HTML
     * @param {Object} station 測站資訊
     * @returns {string} HTML 字符串
     */
    static createStationCard(station) {
        const statusIcon = '🎥';
        
        return `
            <div class="air-quality-station-card">
                <div class="card-header">
                    <span class="station-code">${station.code}</span>
                    <span class="station-name">${station.name}</span>
                </div>
                <div class="card-body">
                    <p><strong>${statusIcon} 測站名稱：</strong>${station.name}</p>
                    <p><strong>📍 縣市：</strong>${station.county}</p>
                    <p><strong>📡 座標：</strong>${station.lat}, ${station.lon}</p>
                    <button class="btn btn-small" onclick="openStationImage('${station.code}')">
                        查看即時影像
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 批量建立卡片
     * @param {Array} stations 測站陣列
     * @returns {string} HTML 字符串
     */
    static createStationCards(stations) {
        return stations.map(station => this.createStationCard(station)).join('');
    }

    /**
     * 建立統計面板
     * @param {Array} stations 測站陣列
     * @returns {string} HTML 字符串
     */
    static createStatsPanel(stations) {
        const byCounty = {};
        stations.forEach(station => {
            byCounty[station.county] = (byCounty[station.county] || 0) + 1;
        });
        
        const countyCount = Object.keys(byCounty).length;
        
        return `
            <div class="air-quality-stats">
                <div class="stat-item">
                    <div class="stat-icon">🎥</div>
                    <div class="stat-info">
                        <div class="stat-number">${stations.length}</div>
                        <div class="stat-label">總測站數</div>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon">📍</div>
                    <div class="stat-info">
                        <div class="stat-number">${countyCount}</div>
                        <div class="stat-label">涵蓋縣市</div>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-info">
                        <div class="stat-label" id="update-time">更新中...</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 建立測站清單表格
     * @param {Array} stations 測站陣列
     * @returns {string} HTML 字符串
     */
    static createStationsTable(stations) {
        const rows = stations.map(station => `
            <tr>
                <td>${station.code}</td>
                <td>${station.name}</td>
                <td>${station.county}</td>
                <td>${station.lat.toFixed(4)}</td>
                <td>${station.lon.toFixed(4)}</td>
                <td>
                    <button class="btn btn-small" onclick="openStationImage('${station.code}')">
                        查看
                    </button>
                </td>
            </tr>
        `).join('');
        
        return `
            <table class="air-quality-table">
                <thead>
                    <tr>
                        <th>編碼</th>
                        <th>測站名稱</th>
                        <th>縣市</th>
                        <th>緯度</th>
                        <th>經度</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    /**
     * 按縣市分組測站
     * @param {Array} stations 測站陣列
     * @returns {Object} 按縣市分組的測站
     */
    static groupByCounty(stations) {
        const grouped = {};
        stations.forEach(station => {
            if (!grouped[station.county]) {
                grouped[station.county] = [];
            }
            grouped[station.county].push(station);
        });
        return grouped;
    }

    /**
     * 搜尋測站
     * @param {Array} stations 測站陣列
     * @param {string} keyword 搜尋關鍵字
     * @returns {Array} 符合的測站
     */
    static search(stations, keyword) {
        const lower = keyword.toLowerCase();
        return stations.filter(station => 
            station.name.includes(lower) || 
            station.county.includes(lower) ||
            station.code.includes(lower)
        );
    }

    /**
     * 排序測站
     * @param {Array} stations 測站陣列
     * @param {string} sortBy 排序欄位 ('name', 'county', 'code')
     * @param {string} order 排序順序 ('asc', 'desc')
     * @returns {Array} 排序後的測站
     */
    static sort(stations, sortBy = 'name', order = 'asc') {
        const sorted = [...stations].sort((a, b) => {
            const aVal = a[sortBy] || '';
            const bVal = b[sortBy] || '';
            
            if (typeof aVal === 'string') {
                return order === 'asc' ? 
                    aVal.localeCompare(bVal, 'zh-TW') : 
                    bVal.localeCompare(aVal, 'zh-TW');
            }
            
            return order === 'asc' ? aVal - bVal : bVal - aVal;
        });
        
        return sorted;
    }

    /**
     * 根據測站代碼生成影像檔案名稱
     * 測站代碼 01 -> 影像檔案名 001.jpg
     * @param {string} stationCode 測站代碼 (如 '01')
     * @returns {string} 影像檔案名稱 (如 '001.jpg')
     */
    static getImageFilename(stationCode) {
        const paddedCode = String(stationCode).padStart(3, '0');
        return `${paddedCode}.jpg`;
    }

    /**
     * 根據測站代碼和 ZIP URL 生成影像完整 URL
     * @param {string} stationCode 測站代碼
     * @param {string} zipUrl ZIP 檔案的 URL
     * @returns {string} 影像 URL
     */
    static getImageUrl(stationCode, zipUrl) {
        const imageFilename = this.getImageFilename(stationCode);
        // 假設 ZIP 檔案內的結構是 /images/001.jpg
        return `${zipUrl}?file=images/${imageFilename}`;
    }

    /**
     * 生成測站的直接影像預覽 URL
     * 使用 data.moenv.gov.tw 的直接圖片存取
     * @param {string} stationCode 測站代碼 (如 '01')
     * @returns {string} 影像預覽 URL
     */
    static getImagePreviewUrl(stationCode) {
        const paddedCode = String(stationCode).padStart(3, '0');
        // 構建環保署 CDX 影像預覽 URL
        return `https://newcdx.moenv.gov.tw/image/AQX_P_01/${paddedCode}.jpg`;
    }

    /**
     * 獲取測站的最新影像資訊
     * @param {string} stationCode 測站代碼
     * @returns {Promise<Object>} { imageUrl, previewUrl, timestamp }
     */
    static async getStationImageInfo(stationCode) {
        try {
            const latestZip = await this.getLatestZipUrl();
            if (!latestZip) return null;

            const imageFilename = this.getImageFilename(stationCode);
            
            return {
                stationCode,
                filename: imageFilename,
                imageUrl: this.getImageUrl(stationCode, latestZip.url),
                previewUrl: this.getImagePreviewUrl(stationCode),
                zipUrl: latestZip.url,
                zipFilename: latestZip.filename,
                timestamp: latestZip.timestamp,
                date: latestZip.date
            };
        } catch (error) {
            console.error(`獲取測站 ${stationCode} 的影像資訊失敗:`, error);
            return null;
        }
    }
}

// 導出（支援 ES6 模組和全域變數）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AirQualityTransformer;
} else {
    window.AirQualityTransformer = AirQualityTransformer;
}

console.log('✅ 空品測站轉換工具已加載');
