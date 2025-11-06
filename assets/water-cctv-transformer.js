/**
 * 水利署 CCTV 監控站資料轉換工具
 * 用於處理水利署監控站系統的即時資料
 * 
 * @file assets/water-cctv-transformer.js
 * @version 1.0.0
 */

class WaterCCTVTransformer {
    /**
     * 流域顏色對應表
     * @type {Object}
     */
    static BASIN_COLORS = {
        '淡水河': { color: '#1e90ff', bgColor: '#e6f2ff', icon: 'water' },
        '大安溪': { color: '#00a878', bgColor: '#e6f9f5', icon: 'water' },
        '大甲溪': { color: '#ff7f50', bgColor: '#fff0e6', icon: 'water' },
        '烏溪': { color: '#ffa500', bgColor: '#fff5e6', icon: 'water' },
        '濁水溪': { color: '#8b6914', bgColor: '#f5f0e6', icon: 'water' },
        '北港溪': { color: '#d4a574', bgColor: '#f9f3ed', icon: 'water' },
        '朴子溪': { color: '#9b7653', bgColor: '#f7f3ed', icon: 'water' },
        '八掌溪': { color: '#4a90e2', bgColor: '#e8f1fa', icon: 'water' },
        '鹽水溪': { color: '#50c878', bgColor: '#e8f9f0', icon: 'water' },
        '高屏溪': { color: '#ff6b6b', bgColor: '#ffe6e6', icon: 'water' },
        '東港溪': { color: '#a78bfa', bgColor: '#f3e8ff', icon: 'water' },
        '隘寮溪': { color: '#ec4899', bgColor: '#ffe8f5', icon: 'water' },
        '荖濃溪': { color: '#8b4789', bgColor: '#f5e6f5', icon: 'water' },
        '旗山溪': { color: '#22c55e', bgColor: '#e6fae6', icon: 'water' },
        '美濃溪': { color: '#84cc16', bgColor: '#f0fae6', icon: 'water' },
        '楠梓仙溪': { color: '#0891b2', bgColor: '#e6f9fb', icon: 'water' },
        '林邊溪': { color: '#f59e0b', bgColor: '#fffae6', icon: 'water' },
        '北冬瓜溪': { color: '#14b8a6', bgColor: '#e6fdf8', icon: 'water' },
        '秀姑巒溪': { color: '#dc2626', bgColor: '#ffe6e6', icon: 'water' },
        '花蓮溪': { color: '#ea580c', bgColor: '#ffe8d6', icon: 'water' }
    };

    /**
     * 監控站狀態代碼
     * @type {Object}
     */
    static STATUS_MAP = {
        '0': { text: '離線', icon: 'circle-xmark', color: '#999999', badge: '●' },
        '1': { text: '線上', icon: 'circle-check', color: '#27ae60', badge: '●' },
        '2': { text: '異常', icon: 'circle-exclamation', color: '#f39c12', badge: '●' },
        '3': { text: '維護中', icon: 'circle-pause', color: '#3498db', badge: '●' }
    };

    /**
     * 獲取流域資訊
     * @param {string} basinName - 流域名稱
     * @returns {Object} 流域資訊 { color, bgColor, icon }
     */
    static getBasinInfo(basinName) {
        return this.BASIN_COLORS[basinName] || {
            color: '#95a5a6',
            bgColor: '#f5f5f5',
            icon: 'water'
        };
    }

    /**
     * 獲取狀態資訊
     * @param {string|number} status - 狀態代碼
     * @returns {Object} 狀態資訊 { text, icon, color, badge }
     */
    static getStatusInfo(status) {
        const statusStr = String(status);
        return this.STATUS_MAP[statusStr] || this.STATUS_MAP['0'];
    }

    /**
     * 計算統計資訊
     * @param {Array} stations - 監控站陣列
     * @returns {Object} 統計資訊
     */
    static calculateStats(stations) {
        if (!Array.isArray(stations)) {
            return {
                total: 0,
                online: 0,
                offline: 0,
                abnormal: 0,
                maintenance: 0
            };
        }

        const stats = {
            total: stations.length,
            online: 0,
            offline: 0,
            abnormal: 0,
            maintenance: 0
        };

        stations.forEach(station => {
            const status = String(station.status || '0');
            if (status === '1') stats.online++;
            else if (status === '0') stats.offline++;
            else if (status === '2') stats.abnormal++;
            else if (status === '3') stats.maintenance++;
        });

        return stats;
    }

    /**
     * 驗證單個監控站資料
     * @param {Object} station - 監控站物件
     * @returns {boolean} 是否有效
     */
    static isValidStation(station) {
        return (
            station &&
            typeof station === 'object' &&
            station.cameraid &&
            station.cameraname &&
            (station.latitude_4326 || station.latitude) &&
            (station.longitude_4326 || station.longitude)
        );
    }

    /**
     * 批量驗證監控站資料
     * @param {Array} stations - 監控站陣列
     * @returns {Object} 驗證結果 { valid: [], invalid: [] }
     */
    static validateStations(stations) {
        if (!Array.isArray(stations)) {
            return { valid: [], invalid: stations || [] };
        }

        return {
            valid: stations.filter(s => this.isValidStation(s)),
            invalid: stations.filter(s => !this.isValidStation(s))
        };
    }

    /**
     * 按流域分組
     * @param {Array} stations - 監控站陣列
     * @returns {Object} 分組結果
     */
    static groupByBasin(stations) {
        if (!Array.isArray(stations)) return {};

        return stations.reduce((acc, station) => {
            const basin = station.basinname || '未知';
            if (!acc[basin]) acc[basin] = [];
            acc[basin].push(station);
            return acc;
        }, {});
    }

    /**
     * 按縣市分組
     * @param {Array} stations - 監控站陣列
     * @returns {Object} 分組結果
     */
    static groupByCounty(stations) {
        if (!Array.isArray(stations)) return {};

        return stations.reduce((acc, station) => {
            const county = station.countiesandcitieswherethemonitoringpointsarelocated || '未知';
            if (!acc[county]) acc[county] = [];
            acc[county].push(station);
            return acc;
        }, {});
    }

    /**
     * 按行政區分組
     * @param {Array} stations - 監控站陣列
     * @returns {Object} 分組結果
     */
    static groupByDistrict(stations) {
        if (!Array.isArray(stations)) return {};

        return stations.reduce((acc, station) => {
            const district = station.administrativedistrictwherethemonitoringpointislocated || '未知';
            if (!acc[district]) acc[district] = [];
            acc[district].push(station);
            return acc;
        }, {});
    }

    /**
     * 按狀態分組
     * @param {Array} stations - 監控站陣列
     * @returns {Object} 分組結果
     */
    static groupByStatus(stations) {
        if (!Array.isArray(stations)) {
            return { '1': [], '0': [], '2': [], '3': [] };
        }

        return stations.reduce((acc, station) => {
            const status = String(station.status || '0');
            if (!acc[status]) acc[status] = [];
            acc[status].push(station);
            return acc;
        }, {});
    }

    /**
     * 篩選線上監控站
     * @param {Array} stations - 監控站陣列
     * @returns {Array} 篩選結果
     */
    static filterOnline(stations) {
        if (!Array.isArray(stations)) return [];
        return stations.filter(s => String(s.status || '0') === '1');
    }

    /**
     * 篩選離線監控站
     * @param {Array} stations - 監控站陣列
     * @returns {Array} 篩選結果
     */
    static filterOffline(stations) {
        if (!Array.isArray(stations)) return [];
        return stations.filter(s => String(s.status || '0') === '0');
    }

    /**
     * 篩選異常監控站
     * @param {Array} stations - 監控站陣列
     * @returns {Array} 篩選結果
     */
    static filterAbnormal(stations) {
        if (!Array.isArray(stations)) return [];
        return stations.filter(s => String(s.status || '0') === '2');
    }

    /**
     * 按流域篩選
     * @param {Array} stations - 監控站陣列
     * @param {string} basinName - 流域名稱
     * @returns {Array} 篩選結果
     */
    static filterByBasin(stations, basinName) {
        if (!Array.isArray(stations)) return [];
        return stations.filter(s => s.basinname === basinName);
    }

    /**
     * 按縣市篩選
     * @param {Array} stations - 監控站陣列
     * @param {string} county - 縣市名稱
     * @returns {Array} 篩選結果
     */
    static filterByCounty(stations, county) {
        if (!Array.isArray(stations)) return [];
        return stations.filter(s => s.countiesandcitieswherethemonitoringpointsarelocated === county);
    }

    /**
     * 搜尋監控站
     * @param {Array} stations - 監控站陣列
     * @param {string} keyword - 搜尋關鍵字
     * @returns {Array} 搜尋結果
     */
    static search(stations, keyword) {
        if (!Array.isArray(stations) || !keyword) return stations || [];

        const kw = keyword.toLowerCase();
        return stations.filter(s => {
            return (
                (s.cameraname && s.cameraname.toLowerCase().includes(kw)) ||
                (s.basinname && s.basinname.toLowerCase().includes(kw)) ||
                (s.administrativedistrictwherethemonitoringpointislocated && 
                 s.administrativedistrictwherethemonitoringpointislocated.toLowerCase().includes(kw)) ||
                (s.videosurveillancestationname && 
                 s.videosurveillancestationname.toLowerCase().includes(kw))
            );
        });
    }

    /**
     * 排序監控站
     * @param {Array} stations - 監控站陣列
     * @param {string} sortBy - 排序欄位 ('name'|'status'|'basin'|'county')
     * @param {string} order - 排序順序 ('asc'|'desc')
     * @returns {Array} 排序結果
     */
    static sort(stations, sortBy = 'name', order = 'asc') {
        if (!Array.isArray(stations)) return [];

        const sortFunctions = {
            'name': (a, b) => {
                const nameA = (a.cameraname || '').localeCompare(b.cameraname || '');
                return order === 'asc' ? nameA : -nameA;
            },
            'status': (a, b) => {
                const statusA = String(a.status || '0');
                const statusB = String(b.status || '0');
                const diff = statusB.localeCompare(statusA);
                return order === 'asc' ? -diff : diff;
            },
            'basin': (a, b) => {
                const basinA = (a.basinname || '').localeCompare(b.basinname || '');
                return order === 'asc' ? basinA : -basinA;
            },
            'county': (a, b) => {
                const countyA = (a.countiesandcitieswherethemonitoringpointsarelocated || '')
                    .localeCompare(b.countiesandcitieswherethemonitoringpointsarelocated || '');
                return order === 'asc' ? countyA : -countyA;
            }
        };

        const sortFn = sortFunctions[sortBy] || sortFunctions['name'];
        return [...stations].sort(sortFn);
    }

    /**
     * 生成監控站卡片 HTML
     * @param {Object} station - 監控站物件
     * @returns {string} HTML 字串
     */
    static createStationCard(station) {
        const basinInfo = this.getBasinInfo(station.basinname);
        const statusInfo = this.getStatusInfo(station.status);
        const stationName = station.cameraname || station.videosurveillancestationname || '--';
        const basinName = station.basinname || '--';
        const county = station.countiesandcitieswherethemonitoringpointsarelocated || '--';
        const district = station.administrativedistrictwherethemonitoringpointislocated || '--';
        const imageUrl = station.imageurl || '';

        const cardHtml = `
            <div class="cctv-station-card" data-station-id="${station.cameraid}">
                <div class="card-header" style="background-color: ${basinInfo.bgColor}; border-left: 4px solid ${basinInfo.color};">
                    <div class="card-title">
                        <span class="station-name">${stationName}</span>
                        <span class="status-badge" style="color: ${statusInfo.color};">
                            <i class="fas fa-${statusInfo.icon}"></i>
                            ${statusInfo.text}
                        </span>
                    </div>
                </div>
                
                <div class="card-body">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${stationName}" class="station-image" loading="lazy">` : ''}
                    
                    <div class="station-info">
                        <div class="info-row">
                            <span class="info-label">流域:</span>
                            <span class="info-value">${basinName}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">縣市:</span>
                            <span class="info-value">${county}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">行政區:</span>
                            <span class="info-value">${district}</span>
                        </div>
                    </div>
                </div>
                
                <div class="card-footer">
                    <span class="station-id">ID: ${station.cameraid}</span>
                    <a href="${imageUrl}" target="_blank" class="view-image-btn" ${imageUrl ? '' : 'disabled'}>
                        檢視影像
                    </a>
                </div>
            </div>
        `;

        return cardHtml;
    }

    /**
     * 批量生成監控站卡片
     * @param {Array} stations - 監控站陣列
     * @returns {string} HTML 字串
     */
    static createStationCards(stations) {
        if (!Array.isArray(stations) || stations.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>目前沒有監控站資訊</p>
                </div>
            `;
        }

        return stations.map(station => this.createStationCard(station)).join('');
    }

    /**
     * 生成監控站列表 HTML (表格形式)
     * @param {Array} stations - 監控站陣列
     * @returns {string} HTML 字串
     */
    static createStationTable(stations) {
        if (!Array.isArray(stations) || stations.length === 0) {
            return `
                <table class="station-table">
                    <thead>
                        <tr>
                            <th>監控站名稱</th>
                            <th>流域</th>
                            <th>縣市</th>
                            <th>行政區</th>
                            <th>狀態</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="5" style="text-align: center; padding: 20px;">沒有資料</td></tr>
                    </tbody>
                </table>
            `;
        }

        const rows = stations.map(station => {
            const statusInfo = this.getStatusInfo(station.status);
            const stationName = station.cameraname || station.videosurveillancestationname || '--';

            return `
                <tr class="station-row" data-station-id="${station.cameraid}">
                    <td class="station-name-cell">${stationName}</td>
                    <td class="basin-cell">${station.basinname || '--'}</td>
                    <td class="county-cell">${station.countiesandcitieswherethemonitoringpointsarelocated || '--'}</td>
                    <td class="district-cell">${station.administrativedistrictwherethemonitoringpointislocated || '--'}</td>
                    <td class="status-cell">
                        <span class="status-badge" style="color: ${statusInfo.color};">
                            ${statusInfo.badge} ${statusInfo.text}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <table class="station-table">
                <thead>
                    <tr>
                        <th>監控站名稱</th>
                        <th>流域</th>
                        <th>縣市</th>
                        <th>行政區</th>
                        <th>狀態</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    /**
     * 生成統計面板 HTML
     * @param {Array} stations - 監控站陣列
     * @returns {string} HTML 字串
     */
    static createStatsPanel(stations) {
        const stats = this.calculateStats(stations);

        return `
            <div class="cctv-stats-panel">
                <div class="stat-card">
                    <div class="stat-icon" style="color: #2c3e50;">
                        <i class="fas fa-video"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-number">${stats.total}</div>
                        <div class="stat-label">總監控站數</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon" style="color: #27ae60;">
                        <i class="fas fa-circle-check"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-number">${stats.online}</div>
                        <div class="stat-label">線上</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon" style="color: #e74c3c;">
                        <i class="fas fa-circle-xmark"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-number">${stats.offline}</div>
                        <div class="stat-label">離線</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon" style="color: #f39c12;">
                        <i class="fas fa-circle-exclamation"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-number">${stats.abnormal}</div>
                        <div class="stat-label">異常</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon" style="color: #3498db;">
                        <i class="fas fa-circle-pause"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-number">${stats.maintenance}</div>
                        <div class="stat-label">維護中</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 生成流域概覽卡片
     * @param {Object} groupedByBasin - groupByBasin() 的結果
     * @returns {string} HTML 字串
     */
    static createBasinOverview(groupedByBasin) {
        const basins = Object.entries(groupedByBasin);

        if (basins.length === 0) {
            return '<div style="text-align: center; padding: 20px; color: #999;">沒有流域資料</div>';
        }

        return basins.map(([basin, stations]) => {
            const basinInfo = this.getBasinInfo(basin);
            const onlineCount = stations.filter(s => String(s.status) === '1').length;

            return `
                <div class="basin-card" style="border-left: 4px solid ${basinInfo.color}; background-color: ${basinInfo.bgColor};">
                    <div class="basin-header">
                        <span class="basin-name">${basin}</span>
                        <span class="basin-count">${stations.length} 站 / ${onlineCount} 線上</span>
                    </div>
                    <div class="basin-status-bar">
                        <div class="status-bar-item online" style="width: ${(onlineCount/stations.length*100).toFixed(1)}%;">
                            <span class="status-text">${onlineCount}</span>
                        </div>
                        <div class="status-bar-item offline" style="width: ${((stations.length-onlineCount)/stations.length*100).toFixed(1)}%;">
                            <span class="status-text">${stations.length - onlineCount}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * 導出為 CSV
     * @param {Array} stations - 監控站陣列
     * @returns {string} CSV 字串
     */
    static exportToCSV(stations) {
        if (!Array.isArray(stations) || stations.length === 0) {
            return '';
        }

        const headers = ['監控站ID', '監控站名稱', '流域', '縣市', '行政區', '狀態', '緯度', '經度'];
        
        const rows = stations.map(station => {
            const statusInfo = this.getStatusInfo(station.status);
            return [
                station.cameraid || '--',
                station.cameraname || '--',
                station.basinname || '--',
                station.countiesandcitieswherethemonitoringpointsarelocated || '--',
                station.administrativedistrictwherethemonitoringpointislocated || '--',
                statusInfo.text,
                station.latitude_4326 || station.latitude || '--',
                station.longitude_4326 || station.longitude || '--'
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * 下載 CSV 檔案
     * @param {Array} stations - 監控站陣列
     * @param {string} filename - 檔案名稱
     */
    static downloadCSV(stations, filename = 'water_cctv_stations.csv') {
        const csv = this.exportToCSV(stations);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 導出為 JSON
     * @param {Array} stations - 監控站陣列
     * @returns {string} JSON 字串
     */
    static exportToJSON(stations) {
        return JSON.stringify(stations, null, 2);
    }

    /**
     * 下載 JSON 檔案
     * @param {Array} stations - 監控站陣列
     * @param {string} filename - 檔案名稱
     */
    static downloadJSON(stations, filename = 'water_cctv_stations.json') {
        const json = this.exportToJSON(stations);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 計算監控站之間的距離 (使用 Haversine 公式)
     * @param {number} lat1 - 緯度1
     * @param {number} lon1 - 經度1
     * @param {number} lat2 - 緯度2
     * @param {number} lon2 - 經度2
     * @returns {number} 距離 (公里)
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // 地球半徑 (公里)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * 查詢附近的監控站
     * @param {Array} stations - 監控站陣列
     * @param {number} lat - 查詢緯度
     * @param {number} lon - 查詢經度
     * @param {number} radiusKm - 半徑 (公里)
     * @returns {Array} 符合條件的監控站
     */
    static findNearbyStations(stations, lat, lon, radiusKm = 5) {
        if (!Array.isArray(stations)) return [];

        return stations.filter(station => {
            const stationLat = parseFloat(station.latitude_4326 || station.latitude || 0);
            const stationLon = parseFloat(station.longitude_4326 || station.longitude || 0);
            
            const distance = this.calculateDistance(lat, lon, stationLat, stationLon);
            return distance <= radiusKm;
        }).sort((a, b) => {
            const distA = this.calculateDistance(lat, lon, 
                parseFloat(a.latitude_4326 || a.latitude), 
                parseFloat(a.longitude_4326 || a.longitude));
            const distB = this.calculateDistance(lat, lon, 
                parseFloat(b.latitude_4326 || b.latitude), 
                parseFloat(b.longitude_4326 || b.longitude));
            return distA - distB;
        });
    }
}

// 全域匯出
if (typeof window !== 'undefined') {
    window.WaterCCTVTransformer = WaterCCTVTransformer;
}

// Node.js 支援
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaterCCTVTransformer;
}
