/**
 * 捷運列車資料轉換工具 (MRT Data Transformer)
 * 用於處理 TDX API 回傳的捷運即時到站資訊
 * 
 * @file assets/mrt-data-transformer.js
 * @version 1.0.0
 */

class MRTDataTransformer {
    /**
     * 捷運路線顏色對應表
     * @type {Object}
     */
    static LINE_COLORS = {
        'R': { name: '紅線', color: '#E4002B', bgColor: '#FFE5E8' },
        'G': { name: '綠線', color: '#00A65E', bgColor: '#E5F5ED' },
        'B': { name: '藍線', color: '#0070C0', bgColor: '#E5F1FA' },
        'O': { name: '橙線', color: '#F8931E', bgColor: '#FEF3E5' },
        'BR': { name: '棕線', color: '#A4622D', bgColor: '#F3EADD' },
        'Y': { name: '黃線', color: '#FCC300', bgColor: '#FFFAE5' },
        'BL': { name: '板南線', color: '#0070C0', bgColor: '#E5F1FA' },
        'SL': { name: '淡水線', color: '#E4002B', bgColor: '#FFE5E8' },
        'CL': { name: '新店線', color: '#FCC300', bgColor: '#FFFAE5' },
        'C': { name: '中和線', color: '#00A65E', bgColor: '#E5F5ED' },
        'LC': { name: '環狀線', color: '#C1A501', bgColor: '#F9F5E5' },
        'F': { name: '文湖線', color: '#8B4513', bgColor: '#F5F0E8' }
    };

    /**
     * 捷運營運狀態代碼
     * @type {Object}
     */
    static SERVICE_STATUS = {
        0: { text: '正常', icon: 'check-circle', color: '#27ae60' },
        1: { text: '班次疏運', icon: 'warning', color: '#f39c12' },
        2: { text: '單線運行', icon: 'alert-circle', color: '#e74c3c' },
        3: { text: '全線停駛', icon: 'x-circle', color: '#8b0000' },
        255: { text: '未知', icon: 'question-circle', color: '#95a5a6' }
    };

    /**
     * 計算到站時間
     * @param {number} estimateTime - 估計到站秒數
     * @returns {string} 格式化的到站時間
     */
    static formatEstimateTime(estimateTime) {
        if (estimateTime === null || estimateTime === undefined) return '--';
        if (estimateTime === 0) return '進站中';
        
        const minutes = Math.ceil(estimateTime / 60);
        if (minutes === 1) return '即將進站';
        if (minutes < 60) return `${minutes} 分`;
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h${mins}m`;
    }

    /**
     * 解析 ISO 8601 時間
     * @param {string} isoString - ISO 8601 格式的時間
     * @returns {string} 本地時間 (HH:MM:SS)
     */
    static parseUpdateTime(isoString) {
        if (!isoString) return '--:--:--';
        
        try {
            const date = new Date(isoString);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error('時間轉換錯誤:', error);
            return '--:--:--';
        }
    }

    /**
     * 獲取路線資訊
     * @param {string} lineID - 路線代碼
     * @returns {Object} 路線資訊 { name, color, bgColor }
     */
    static getLineInfo(lineID) {
        const lineCode = (lineID || '').substring(0, 2).toUpperCase();
        return this.LINE_COLORS[lineCode] || {
            name: lineID || '未知',
            color: '#95a5a6',
            bgColor: '#f5f5f5'
        };
    }

    /**
     * 獲取營運狀態
     * @param {number} serviceStatus - 營運狀態代碼
     * @returns {Object} 狀態資訊 { text, icon, color }
     */
    static getServiceStatus(serviceStatus) {
        return this.SERVICE_STATUS[serviceStatus] || this.SERVICE_STATUS[255];
    }

    /**
     * 生成捷運列車卡片 HTML
     * @param {Object} train - 列車物件
     * @returns {string} HTML 字串
     */
    static createTrainCard(train) {
        const lineInfo = this.getLineInfo(train.LineID);
        const timeText = this.formatEstimateTime(train.EstimateTime);
        const stationText = `${train.StationName?.Zh_tw || train.StationID}`;
        const destText = train.DestinationStationName?.Zh_tw || train.DestinationStationID || '終點';
        const updateTime = this.parseUpdateTime(train.UpdateTime);
        const status = this.getServiceStatus(train.ServiceStatus);

        return `
            <div class="mrt-train-card" style="border-left: 4px solid ${lineInfo.color}">
                <div class="mrt-card-header">
                    <span class="mrt-line-badge" style="background: ${lineInfo.color}; color: white;">
                        ${lineInfo.name}
                    </span>
                    <span class="mrt-service-status" style="color: ${status.color}">
                        <i class="fas fa-${status.icon}"></i>
                        ${status.text}
                    </span>
                </div>
                
                <div class="mrt-card-body">
                    <div class="mrt-from-to">
                        <div class="mrt-station-info">
                            <div class="mrt-label">現在位置</div>
                            <div class="mrt-station-name">${stationText}</div>
                        </div>
                        <i class="fas fa-arrow-right" style="margin: 0 10px; color: ${lineInfo.color}"></i>
                        <div class="mrt-station-info">
                            <div class="mrt-label">往</div>
                            <div class="mrt-destination">${destText}</div>
                        </div>
                    </div>
                </div>
                
                <div class="mrt-card-footer">
                    <div class="mrt-time-estimate" style="color: ${lineInfo.color}; font-size: 1.3em; font-weight: bold;">
                        ${timeText}
                    </div>
                    <div class="mrt-update-time">
                        更新: ${updateTime}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 批量生成卡片 HTML
     * @param {Array} trains - 列車陣列
     * @returns {string} HTML 字串
     */
    static createTrainCards(trains) {
        if (!Array.isArray(trains) || trains.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>目前沒有列車資訊</p>
                </div>
            `;
        }

        return trains.map(train => this.createTrainCard(train)).join('');
    }

    /**
     * 按路線分類
     * @param {Array} trains - 列車陣列
     * @returns {Object} 分類結果
     */
    static groupByLine(trains) {
        if (!Array.isArray(trains)) return {};

        const grouped = {};
        trains.forEach(train => {
            const lineID = train.LineID || 'unknown';
            if (!grouped[lineID]) {
                grouped[lineID] = [];
            }
            grouped[lineID].push(train);
        });

        return grouped;
    }

    /**
     * 按到站狀態分類
     * @param {Array} trains - 列車陣列
     * @returns {Object} 分類結果 { arriving, inStation, delayed }
     */
    static groupByArrivalStatus(trains) {
        if (!Array.isArray(trains)) {
            return { arriving: [], inStation: [], delayed: [] };
        }

        return {
            inStation: trains.filter(t => t.EstimateTime === 0),              // 進站中
            arriving: trains.filter(t => t.EstimateTime > 0 && t.EstimateTime <= 300), // 5分鐘內
            delayed: trains.filter(t => t.EstimateTime > 300)                 // 5分鐘以上
        };
    }

    /**
     * 篩選正常營運的列車
     * @param {Array} trains - 列車陣列
     * @returns {Array} 篩選後的列車
     */
    static filterNormalService(trains) {
        if (!Array.isArray(trains)) return [];
        return trains.filter(train => train.ServiceStatus === 0);
    }

    /**
     * 篩選異常狀態的列車
     * @param {Array} trains - 列車陣列
     * @returns {Array} 篩選後的列車
     */
    static filterAbnormalService(trains) {
        if (!Array.isArray(trains)) return [];
        return trains.filter(train => train.ServiceStatus !== 0 && train.ServiceStatus !== 255);
    }

    /**
     * 排序列車
     * @param {Array} trains - 列車陣列
     * @param {string} sortBy - 排序欄位 ('time' | 'line' | 'status')
     * @returns {Array} 排序後的列車
     */
    static sortTrains(trains, sortBy = 'time') {
        if (!Array.isArray(trains)) return [];

        const sortFunctions = {
            'time': (a, b) => (a.EstimateTime || 0) - (b.EstimateTime || 0),
            'line': (a, b) => (a.LineID || '').localeCompare(b.LineID || ''),
            'status': (a, b) => (a.ServiceStatus || 255) - (b.ServiceStatus || 255)
        };

        const sortFn = sortFunctions[sortBy] || sortFunctions['time'];
        return [...trains].sort(sortFn);
    }

    /**
     * 計算統計資訊
     * @param {Array} trains - 列車陣列
     * @returns {Object} 統計資訊
     */
    static calculateStats(trains) {
        if (!Array.isArray(trains)) {
            return { total: 0, inStation: 0, arriving: 0, delayed: 0, abnormal: 0 };
        }

        const grouped = this.groupByArrivalStatus(trains);

        return {
            total: trains.length,
            inStation: grouped.inStation.length,
            arriving: grouped.arriving.length,
            delayed: grouped.delayed.length,
            abnormal: this.filterAbnormalService(trains).length
        };
    }

    /**
     * 驗證列車資料
     * @param {Object} train - 列車物件
     * @returns {boolean} 是否有效
     */
    static isValidTrain(train) {
        return (
            train &&
            typeof train === 'object' &&
            train.LineID &&
            train.StationID &&
            (train.EstimateTime !== null && train.EstimateTime !== undefined)
        );
    }

    /**
     * 批量驗證列車資料
     * @param {Array} trains - 列車陣列
     * @returns {Object} 驗證結果
     */
    static validateTrains(trains) {
        if (!Array.isArray(trains)) {
            return { valid: [], invalid: trains || [] };
        }

        return {
            valid: trains.filter(t => this.isValidTrain(t)),
            invalid: trains.filter(t => !this.isValidTrain(t))
        };
    }

    /**
     * 導出為 JSON
     * @param {Array} trains - 列車陣列
     * @returns {string} JSON 字串
     */
    static exportToJSON(trains) {
        return JSON.stringify(trains, null, 2);
    }

    /**
     * 導出為 CSV
     * @param {Array} trains - 列車陣列
     * @returns {string} CSV 字串
     */
    static exportToCSV(trains) {
        if (!Array.isArray(trains) || trains.length === 0) {
            return '';
        }

        const headers = ['路線', '現在站點', '目標站點', '到站時間', '營運狀態', '更新時間'];
        const rows = trains.map(train => [
            this.getLineInfo(train.LineID).name,
            train.StationName?.Zh_tw || train.StationID,
            train.DestinationStationName?.Zh_tw || train.DestinationStationID,
            this.formatEstimateTime(train.EstimateTime),
            this.getServiceStatus(train.ServiceStatus).text,
            this.parseUpdateTime(train.UpdateTime)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * 下載 CSV 檔案
     * @param {Array} trains - 列車陣列
     * @param {string} filename - 檔案名稱
     */
    static downloadCSV(trains, filename = 'mrt_data.csv') {
        const csv = this.exportToCSV(trains);
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
     * 下載 JSON 檔案
     * @param {Array} trains - 列車陣列
     * @param {string} filename - 檔案名稱
     */
    static downloadJSON(trains, filename = 'mrt_data.json') {
        const json = this.exportToJSON(trains);
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
     * 生成簡單統計卡片 HTML
     * @param {Array} trains - 列車陣列
     * @returns {string} HTML 字串
     */
    static createStatsPanel(trains) {
        const stats = this.calculateStats(trains);

        return `
            <div class="mrt-stats-panel">
                <div class="mrt-stat-card">
                    <div class="mrt-stat-number">${stats.total}</div>
                    <div class="mrt-stat-label">列車總數</div>
                </div>
                <div class="mrt-stat-card">
                    <div class="mrt-stat-number" style="color: #27ae60;">${stats.inStation}</div>
                    <div class="mrt-stat-label">進站中</div>
                </div>
                <div class="mrt-stat-card">
                    <div class="mrt-stat-number" style="color: #3498db;">${stats.arriving}</div>
                    <div class="mrt-stat-label">即將到站</div>
                </div>
                <div class="mrt-stat-card">
                    <div class="mrt-stat-number" style="color: #f39c12;">${stats.delayed}</div>
                    <div class="mrt-stat-label">尚未進站</div>
                </div>
                <div class="mrt-stat-card">
                    <div class="mrt-stat-number" style="color: #e74c3c;">${stats.abnormal}</div>
                    <div class="mrt-stat-label">異常營運</div>
                </div>
            </div>
        `;
    }

    /**
     * 生成路線卡片 HTML
     * @param {Object} groupedByLine - groupByLine() 的結果
     * @returns {string} HTML 字串
     */
    static createLineCards(groupedByLine) {
        const lines = Object.entries(groupedByLine);
        
        return lines.map(([lineID, trains]) => {
            const lineInfo = this.getLineInfo(lineID);
            const count = trains.length;
            const abnormalCount = this.filterAbnormalService(trains).length;

            return `
                <div class="mrt-line-card" style="border-top: 3px solid ${lineInfo.color}">
                    <div class="mrt-line-header" style="background-color: ${lineInfo.bgColor}">
                        <span class="mrt-line-name" style="color: ${lineInfo.color}">
                            ${lineInfo.name}
                        </span>
                        <span class="mrt-train-count">
                            ${count} 班車
                            ${abnormalCount > 0 ? `<span style="color: #e74c3c;">(異常: ${abnormalCount})</span>` : ''}
                        </span>
                    </div>
                    <div class="mrt-line-body">
                        ${trains.slice(0, 3).map(train => `
                            <div class="mrt-train-item">
                                <span>${train.StationName?.Zh_tw}</span>
                                <span style="color: ${lineInfo.color}; font-weight: bold;">
                                    ${this.formatEstimateTime(train.EstimateTime)}
                                </span>
                            </div>
                        `).join('')}
                        ${count > 3 ? `<div class="mrt-more">... 還有 ${count - 3} 班車</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// 匯出為全域物件
if (typeof window !== 'undefined') {
    window.MRTDataTransformer = MRTDataTransformer;
}

// Node.js 環境支援
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MRTDataTransformer;
}
