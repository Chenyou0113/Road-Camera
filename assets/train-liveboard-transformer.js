/**
 * 台鐵車站別列車即時到離站看板工具
 * 用於處理 TDX API Rail/TRA/LiveBoard 端點資料
 * API 文檔: https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/LiveBoard
 * 
 * @file assets/train-liveboard-transformer.js
 * @version 1.0.0
 */

class TrainLiveboardTransformer {
    /**
     * 列車類型代碼映射表
     * @type {Object}
     */
    static TRAIN_TYPE_MAP = {
        '0': { name: '自強', badge: '自', color: '#E81B23', bgColor: '#FFE5E8' },
        '1': { name: '自強', badge: '自', color: '#E81B23', bgColor: '#FFE5E8' },
        '2': { name: '自強', badge: '自', color: '#E81B23', bgColor: '#FFE5E8' },
        '3': { name: '自強', badge: '自', color: '#E81B23', bgColor: '#FFE5E8' },
        '4': { name: '莒光', badge: '莒', color: '#FFC72C', bgColor: '#FFFAE5' },
        '5': { name: '莒光', badge: '莒', color: '#FFC72C', bgColor: '#FFFAE5' },
        '6': { name: '區間', badge: '區', color: '#0070C0', bgColor: '#E5F1FA' },
        '7': { name: '區間', badge: '區', color: '#0070C0', bgColor: '#E5F1FA' },
        '21': { name: '區間快', badge: '快', color: '#00A65E', bgColor: '#E5F5ED' }
    };

    /**
     * 時間轉換 (HH:MM:SS -> HH:MM)
     * @param {string} timeStr - 時間字串
     * @returns {string} 格式化時間
     */
    static formatTime(timeStr) {
        if (!timeStr) return '--';
        if (typeof timeStr !== 'string') return '--';
        
        const match = timeStr.match(/^(\d{2}):(\d{2})/);
        return match ? `${match[1]}:${match[2]}` : '--';
    }

    /**
     * 解析 ISO 8601 時間
     * @param {string} isoString - ISO 8601 格式時間
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
     * 獲取列車類型資訊
     * @param {string} typeCode - 列車類型代碼
     * @returns {Object} 類型資訊 { name, badge, color, bgColor }
     */
    static getTrainTypeInfo(typeCode) {
        const code = String(typeCode);
        return this.TRAIN_TYPE_MAP[code] || {
            name: '未知',
            badge: '?',
            color: '#95a5a6',
            bgColor: '#f5f5f5'
        };
    }

    /**
     * 獲取方向資訊
     * @param {number} direction - 方向代碼 (0:南下, 1:北上)
     * @returns {Object} 方向資訊 { text, icon, color }
     */
    static getDirectionInfo(direction) {
        const directionMap = {
            0: { text: '南下', icon: 'arrow-down', color: '#e74c3c' },
            1: { text: '北上', icon: 'arrow-up', color: '#3498db' }
        };
        return directionMap[direction] || {
            text: '未知',
            icon: 'question-circle',
            color: '#95a5a6'
        };
    }

    /**
     * 計算延誤狀態
     * @param {number} delayMinutes - 延誤分鐘數
     * @returns {Object} 狀態 { text, icon, color, cssClass }
     */
    static getDelayStatus(delayMinutes) {
        if (delayMinutes === null || delayMinutes === undefined) {
            return {
                text: '準點',
                icon: 'check-circle',
                color: '#27ae60',
                cssClass: 'ontime'
            };
        }

        if (delayMinutes > 0) {
            return {
                text: `延誤 ${delayMinutes} 分`,
                icon: 'hourglass-end',
                color: '#e74c3c',
                cssClass: 'delayed'
            };
        }

        if (delayMinutes < 0) {
            return {
                text: `提前 ${Math.abs(delayMinutes)} 分`,
                icon: 'bolt',
                color: '#3498db',
                cssClass: 'early'
            };
        }

        return {
            text: '準點',
            icon: 'check-circle',
            color: '#27ae60',
            cssClass: 'ontime'
        };
    }

    /**
     * 判斷列車狀態
     * @param {Object} train - 列車物件
     * @returns {string} 狀態 ('arrived'|'departed'|'scheduled'|'cancelled'|'delayed')
     */
    static getTrainStatus(train) {
        // 如果有離站時間，表示已經離站
        if (train.ActualDepartureTime) {
            return 'departed';
        }
        // 如果有到站時間，表示已經到達
        if (train.ActualArrivalTime) {
            return 'arrived';
        }
        // 如果有延誤時間且大於 0，表示延誤中
        if (train.DelayTime && train.DelayTime > 0) {
            return 'delayed';
        }
        // 預定時間內
        return 'scheduled';
    }

    /**
     * 生成單個列車列表行 (表格 TR)
     * @param {Object} train - 列車物件
     * @returns {string} HTML TR 標籤
     */
    static createTrainRow(train) {
        const trainNo = train.TrainNo || '--';
        const direction = this.getDirectionInfo(train.Direction);
        const typeInfo = this.getTrainTypeInfo(train.TrainTypeCode);
        const arrivalTime = this.formatTime(train.ScheduledArrivalTime || '--');
        const departureTime = this.formatTime(train.ScheduledDepartureTime || '--');
        const endStation = train.EndingStationName?.Zh_tw || '--';
        const delayStatus = this.getDelayStatus(train.DelayTime);
        const trainStatus = this.getTrainStatus(train);

        const statusMap = {
            'arrived': '已到達',
            'departed': '已離站',
            'scheduled': '準點',
            'delayed': '延誤',
            'cancelled': '取消'
        };

        const statusText = statusMap[trainStatus] || '--';

        return `
            <tr class="train-row train-${trainStatus}">
                <td class="train-no">
                    <span class="train-badge" style="background-color: ${typeInfo.color}; color: white;">
                        ${typeInfo.badge}
                    </span>
                    <strong>${trainNo}</strong>
                </td>
                <td class="train-type">
                    <span class="type-name">${typeInfo.name}</span>
                </td>
                <td class="direction-cell">
                    <span class="direction-badge" style="color: ${direction.color};">
                        <i class="fas fa-${direction.icon}"></i>
                        ${direction.text}
                    </span>
                </td>
                <td class="arrival-time">
                    ${arrivalTime}
                </td>
                <td class="departure-time">
                    ${departureTime}
                </td>
                <td class="destination">
                    ${endStation}
                </td>
                <td class="delay-status">
                    <span class="status-badge ${delayStatus.cssClass}" style="color: ${delayStatus.color};">
                        <i class="fas fa-${delayStatus.icon}"></i>
                        ${delayStatus.text}
                    </span>
                </td>
                <td class="train-status">
                    <span class="status-text">${statusText}</span>
                </td>
            </tr>
        `;
    }

    /**
     * 批量生成列車列表行
     * @param {Array} trains - 列車陣列
     * @returns {string} HTML 字串
     */
    static createTrainRows(trains) {
        if (!Array.isArray(trains) || trains.length === 0) {
            return '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #999;">目前沒有列車資訊</td></tr>';
        }

        return trains.map(train => this.createTrainRow(train)).join('');
    }

    /**
     * 生成完整的列車表格 HTML
     * @param {Array} trains - 列車陣列
     * @returns {string} 完整表格 HTML
     */
    static createTrainTable(trains) {
        if (!Array.isArray(trains)) trains = [];

        const headerRow = `
            <thead>
                <tr>
                    <th>列車號</th>
                    <th>列車種類</th>
                    <th>方向</th>
                    <th>預定到達</th>
                    <th>預定離站</th>
                    <th>終點站</th>
                    <th>延誤狀態</th>
                    <th>目前狀態</th>
                </tr>
            </thead>
        `;

        const bodyRow = `
            <tbody>
                ${this.createTrainRows(trains)}
            </tbody>
        `;

        return `<table class="train-table">${headerRow}${bodyRow}</table>`;
    }

    /**
     * 按方向分組
     * @param {Array} trains - 列車陣列
     * @returns {Object} 分組結果 { 0: [], 1: [] }
     */
    static groupByDirection(trains) {
        if (!Array.isArray(trains)) return { 0: [], 1: [] };

        return trains.reduce((acc, train) => {
            const dir = train.Direction || 0;
            if (!acc[dir]) acc[dir] = [];
            acc[dir].push(train);
            return acc;
        }, {});
    }

    /**
     * 按列車類型分組
     * @param {Array} trains - 列車陣列
     * @returns {Object} 分組結果
     */
    static groupByTrainType(trains) {
        if (!Array.isArray(trains)) return {};

        return trains.reduce((acc, train) => {
            const typeCode = train.TrainTypeCode;
            if (!acc[typeCode]) acc[typeCode] = [];
            acc[typeCode].push(train);
            return acc;
        }, {});
    }

    /**
     * 按終點站分組
     * @param {Array} trains - 列車陣列
     * @returns {Object} 分組結果
     */
    static groupByEndingStation(trains) {
        if (!Array.isArray(trains)) return {};

        return trains.reduce((acc, train) => {
            const stationName = train.EndingStationName?.Zh_tw || '未知';
            if (!acc[stationName]) acc[stationName] = [];
            acc[stationName].push(train);
            return acc;
        }, {});
    }

    /**
     * 篩選延誤列車
     * @param {Array} trains - 列車陣列
     * @returns {Array} 延誤列車
     */
    static filterDelayedTrains(trains) {
        if (!Array.isArray(trains)) return [];
        return trains.filter(t => (t.DelayTime || 0) > 0);
    }

    /**
     * 篩選準點列車
     * @param {Array} trains - 列車陣列
     * @returns {Array} 準點列車
     */
    static filterOntimeTrains(trains) {
        if (!Array.isArray(trains)) return [];
        return trains.filter(t => (t.DelayTime || 0) === 0);
    }

    /**
     * 篩選已到達列車
     * @param {Array} trains - 列車陣列
     * @returns {Array} 已到達列車
     */
    static filterArrivedTrains(trains) {
        if (!Array.isArray(trains)) return [];
        return trains.filter(t => t.ActualArrivalTime);
    }

    /**
     * 篩選已離站列車
     * @param {Array} trains - 列車陣列
     * @returns {Array} 已離站列車
     */
    static filterDepartedTrains(trains) {
        if (!Array.isArray(trains)) return [];
        return trains.filter(t => t.ActualDepartureTime);
    }

    /**
     * 篩選預定列車
     * @param {Array} trains - 列車陣列
     * @returns {Array} 預定列車
     */
    static filterScheduledTrains(trains) {
        if (!Array.isArray(trains)) return [];
        return trains.filter(t => !t.ActualArrivalTime && !t.ActualDepartureTime);
    }

    /**
     * 按預定到達時間排序
     * @param {Array} trains - 列車陣列
     * @param {string} order - 排序順序 ('asc'|'desc')
     * @returns {Array} 排序後的列車
     */
    static sortByArrivalTime(trains, order = 'asc') {
        if (!Array.isArray(trains)) return [];

        const sorted = [...trains].sort((a, b) => {
            const timeA = a.ScheduledArrivalTime || '99:99:99';
            const timeB = b.ScheduledArrivalTime || '99:99:99';
            return order === 'asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
        });

        return sorted;
    }

    /**
     * 按列車號排序
     * @param {Array} trains - 列車陣列
     * @param {string} order - 排序順序 ('asc'|'desc')
     * @returns {Array} 排序後的列車
     */
    static sortByTrainNo(trains, order = 'asc') {
        if (!Array.isArray(trains)) return [];

        const sorted = [...trains].sort((a, b) => {
            const noA = parseInt(a.TrainNo || 0);
            const noB = parseInt(b.TrainNo || 0);
            return order === 'asc' ? noA - noB : noB - noA;
        });

        return sorted;
    }

    /**
     * 按延誤時間排序 (延誤最多優先)
     * @param {Array} trains - 列車陣列
     * @returns {Array} 排序後的列車
     */
    static sortByDelay(trains) {
        if (!Array.isArray(trains)) return [];

        return [...trains].sort((a, b) => {
            return (b.DelayTime || 0) - (a.DelayTime || 0);
        });
    }

    /**
     * 計算統計資訊
     * @param {Array} trains - 列車陣列
     * @returns {Object} 統計資訊
     */
    static calculateStats(trains) {
        if (!Array.isArray(trains)) {
            return {
                total: 0,
                arrived: 0,
                departed: 0,
                scheduled: 0,
                delayed: 0,
                ontime: 0
            };
        }

        const arrived = trains.filter(t => t.ActualArrivalTime).length;
        const departed = trains.filter(t => t.ActualDepartureTime).length;
        const delayed = trains.filter(t => (t.DelayTime || 0) > 0).length;
        const ontime = trains.filter(t => (t.DelayTime || 0) === 0).length;
        const scheduled = trains.filter(t => !t.ActualArrivalTime && !t.ActualDepartureTime).length;

        return {
            total: trains.length,
            arrived,
            departed,
            scheduled,
            delayed,
            ontime
        };
    }

    /**
     * 驗證單個列車資料
     * @param {Object} train - 列車物件
     * @returns {boolean} 是否有效
     */
    static isValidTrain(train) {
        return (
            train &&
            typeof train === 'object' &&
            train.TrainNo &&
            train.StationID &&
            (train.ScheduledArrivalTime || train.ScheduledDepartureTime)
        );
    }

    /**
     * 批量驗證列車資料
     * @param {Array} trains - 列車陣列
     * @returns {Object} 驗證結果 { valid: [], invalid: [] }
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
     * 導出為 CSV
     * @param {Array} trains - 列車陣列
     * @returns {string} CSV 字串
     */
    static exportToCSV(trains) {
        if (!Array.isArray(trains) || trains.length === 0) {
            return '';
        }

        const headers = ['列車號', '列車種類', '方向', '預定到達', '預定離站', '終點站', '延誤分鐘', '更新時間'];
        
        const rows = trains.map(train => {
            const typeInfo = this.getTrainTypeInfo(train.TrainTypeCode);
            const direction = this.getDirectionInfo(train.Direction);
            
            return [
                train.TrainNo || '--',
                typeInfo.name,
                direction.text,
                this.formatTime(train.ScheduledArrivalTime || '--'),
                this.formatTime(train.ScheduledDepartureTime || '--'),
                train.EndingStationName?.Zh_tw || '--',
                train.DelayTime || 0,
                this.parseUpdateTime(train.UpdateTime)
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
     * @param {Array} trains - 列車陣列
     * @param {string} filename - 檔案名稱
     */
    static downloadCSV(trains, filename = 'train_liveboard.csv') {
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
     * 導出為 JSON
     * @param {Array} trains - 列車陣列
     * @returns {string} JSON 字串
     */
    static exportToJSON(trains) {
        return JSON.stringify(trains, null, 2);
    }

    /**
     * 下載 JSON 檔案
     * @param {Array} trains - 列車陣列
     * @param {string} filename - 檔案名稱
     */
    static downloadJSON(trains, filename = 'train_liveboard.json') {
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
     * 生成統計資訊卡片 HTML
     * @param {Array} trains - 列車陣列
     * @returns {string} HTML 字串
     */
    static createStatsPanel(trains) {
        const stats = this.calculateStats(trains);

        return `
            <div class="stats-panel">
                <div class="stat-card">
                    <div class="stat-label">列車總數</div>
                    <div class="stat-number">${stats.total}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">已到達</div>
                    <div class="stat-number" style="color: #27ae60;">${stats.arrived}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">已離站</div>
                    <div class="stat-number" style="color: #3498db;">${stats.departed}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">預定中</div>
                    <div class="stat-number" style="color: #f39c12;">${stats.scheduled}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">準點</div>
                    <div class="stat-number" style="color: #27ae60;">${stats.ontime}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">延誤</div>
                    <div class="stat-number" style="color: #e74c3c;">${stats.delayed}</div>
                </div>
            </div>
        `;
    }
}

// 全域匯出
if (typeof window !== 'undefined') {
    window.TrainLiveboardTransformer = TrainLiveboardTransformer;
}

// Node.js 支援
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrainLiveboardTransformer;
}
