/**
 * 台鐵列車資料轉換工具 (Train Data Transformer)
 * 用於處理 TDX API 回傳的列車時刻表資料
 * 
 * @file assets/train-data-transformer.js
 * @version 1.0.0
 */

class TrainDataTransformer {
    /**
     * 時間格式轉換 (HH:MM:SS -> HH:MM)
     * @param {string} timeStr - 時間字串 (HH:MM:SS 格式)
     * @returns {string} 格式化後的時間 (HH:MM)
     */
    static formatTime(timeStr) {
        if (!timeStr) return '--';
        if (typeof timeStr !== 'string') return '--';
        
        const match = timeStr.match(/^(\d{2}):(\d{2})/);
        return match ? `${match[1]}:${match[2]}` : '--';
    }

    /**
     * ISO 8601 時間轉換為本地時間字串
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
     * 計算列車延誤狀態
     * @param {number} delayMinutes - 延誤分鐘數
     * @returns {Object} 狀態物件 { status, cssClass, icon }
     */
    static getDelayStatus(delayMinutes) {
        if (delayMinutes === null || delayMinutes === undefined) {
            return { 
                status: '準點', 
                cssClass: 'ontime', 
                icon: 'check-circle',
                color: '#27ae60'
            };
        }

        if (delayMinutes > 0) {
            return { 
                status: `延誤 ${delayMinutes} 分`, 
                cssClass: 'delayed', 
                icon: 'hourglass-end',
                color: '#e74c3c'
            };
        }

        if (delayMinutes < 0) {
            return { 
                status: `提前 ${Math.abs(delayMinutes)} 分`, 
                cssClass: 'early', 
                icon: 'bolt',
                color: '#3498db'
            };
        }

        return { 
            status: '準點', 
            cssClass: 'ontime', 
            icon: 'check-circle',
            color: '#27ae60'
        };
    }

    /**
     * 解析列車方向
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
     * 分類列車類型
     * @param {string} typeCode - 車種代碼
     * @returns {Object} 車種資訊 { name, badge, color }
     */
    static getTrainTypeInfo(typeCode) {
        const trainTypeMap = {
            '0': { name: '普通', badge: 'other', color: '#95a5a6' },
            '1': { name: '自強號', badge: 'express', color: '#ff6b6b' },
            '2': { name: '莒光號', badge: 'tze-chiang', color: '#e74c3c' },
            '3': { name: '復興號', badge: 'chu-kuang', color: '#ff8c42' },
            '4': { name: '區間快', badge: 'limited', color: '#ffd93d' },
            '5': { name: '特快', badge: 'special', color: '#c0392b' },
            '6': { name: '區間', badge: 'local', color: '#4ecdc4' },
            '21': { name: '觀光列車', badge: 'tourist', color: '#f39c12' }
        };
        return trainTypeMap[typeCode] || { 
            name: '其他', 
            badge: 'other', 
            color: '#95a5a6' 
        };
    }

    /**
     * 計算統計資訊
     * @param {Array} trains - 列車陣列
     * @returns {Object} 統計資訊 { total, arrival, departure, delayed }
     */
    static calculateStats(trains) {
        if (!Array.isArray(trains)) {
            return { total: 0, arrival: 0, departure: 0, delayed: 0 };
        }

        let stats = {
            total: trains.length,
            arrival: 0,      // 即將到站（預計到站時間 < 5分鐘）
            departure: 0,    // 即將離站（預計離站時間 < 5分鐘）
            delayed: 0       // 延誤列車（DelayTime > 0）
        };

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        trains.forEach(train => {
            // 計算延誤列車
            if (train.DelayTime && train.DelayTime > 0) {
                stats.delayed++;
            }

            // 計算即將到站
            if (train.ScheduledArrivalTime) {
                const [h, m] = train.ScheduledArrivalTime.split(':').map(Number);
                const arrivalMinutes = h * 60 + m;
                const minutesDiff = arrivalMinutes - currentMinutes;
                if (minutesDiff >= 0 && minutesDiff < 5) {
                    stats.arrival++;
                }
            }

            // 計算即將離站
            if (train.ScheduledDepartureTime) {
                const [h, m] = train.ScheduledDepartureTime.split(':').map(Number);
                const departureMinutes = h * 60 + m;
                const minutesDiff = departureMinutes - currentMinutes;
                if (minutesDiff >= 0 && minutesDiff < 5) {
                    stats.departure++;
                }
            }
        });

        return stats;
    }

    /**
     * 生成列車表格行 HTML
     * @param {Object} train - 列車物件
     * @returns {string} HTML 字串
     */
    static createTrainRow(train) {
        const direction = this.getDirectionInfo(train.Direction);
        const typeInfo = this.getTrainTypeInfo(train.TrainTypeCode);
        const delayStatus = this.getDelayStatus(train.DelayTime);
        
        const arrivalTime = this.formatTime(train.ScheduledArrivalTime);
        const departureTime = this.formatTime(train.ScheduledDepartureTime);
        
        const endingStationName = train.EndingStationName?.Zh_tw || 
                                 train.EndingStationName || 
                                 train.EndingStationID || 
                                 '終點';
        
        return `
            <tr>
                <td>
                    <span class="train-number">
                        <i class="fas fa-train"></i> ${train.TrainNo}
                    </span>
                </td>
                <td>
                    <span class="train-type ${typeInfo.badge}">
                        ${typeInfo.name}
                    </span>
                </td>
                <td>
                    <span class="direction-badge" style="background: ${direction.color}">
                        <i class="fas fa-${direction.icon}"></i>
                        ${direction.text}
                    </span>
                </td>
                <td>${endingStationName}</td>
                <td>${arrivalTime}</td>
                <td>${departureTime}</td>
                <td>
                    <span class="status-badge ${delayStatus.cssClass}">
                        <i class="fas fa-${delayStatus.icon}"></i>
                        ${delayStatus.status}
                    </span>
                </td>
            </tr>
        `;
    }

    /**
     * 批量轉換列車資料為表格行
     * @param {Array} trains - 列車陣列
     * @returns {string} HTML 字串
     */
    static createTrainRows(trains) {
        if (!Array.isArray(trains) || trains.length === 0) {
            return `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-info-circle"></i>
                        <p>目前沒有列車資訊</p>
                    </td>
                </tr>
            `;
        }

        return trains.map(train => this.createTrainRow(train)).join('');
    }

    /**
     * 篩選最近 N 分鐘內的列車
     * @param {Array} trains - 列車陣列
     * @param {number} minutes - 分鐘數（預設 30）
     * @returns {Array} 篩選後的列車陣列
     */
    static filterRecentTrains(trains, minutes = 30) {
        if (!Array.isArray(trains)) return [];

        const now = new Date();
        const cutoffTime = new Date(now - minutes * 60 * 1000);

        return trains.filter(train => {
            if (!train.ScheduledDepartureTime) return false;

            const [h, m] = train.ScheduledDepartureTime.split(':').map(Number);
            const trainTime = new Date();
            trainTime.setHours(h, m, 0, 0);

            return trainTime >= cutoffTime;
        });
    }

    /**
     * 篩選延誤列車
     * @param {Array} trains - 列車陣列
     * @returns {Array} 延誤列車陣列
     */
    static filterDelayedTrains(trains) {
        if (!Array.isArray(trains)) return [];
        return trains.filter(train => train.DelayTime && train.DelayTime > 0);
    }

    /**
     * 按方向分類列車
     * @param {Array} trains - 列車陣列
     * @returns {Object} 分類結果 { northbound: [...], southbound: [...] }
     */
    static groupByDirection(trains) {
        if (!Array.isArray(trains)) {
            return { northbound: [], southbound: [] };
        }

        return {
            northbound: trains.filter(t => t.Direction === 1),    // 北上
            southbound: trains.filter(t => t.Direction === 0)     // 南下
        };
    }

    /**
     * 按車種分類列車
     * @param {Array} trains - 列車陣列
     * @returns {Object} 分類結果 { trainType: [...] }
     */
    static groupByTrainType(trains) {
        if (!Array.isArray(trains)) return {};

        const grouped = {};
        trains.forEach(train => {
            const typeCode = train.TrainTypeCode || 'unknown';
            if (!grouped[typeCode]) {
                grouped[typeCode] = [];
            }
            grouped[typeCode].push(train);
        });

        return grouped;
    }

    /**
     * 排序列車
     * @param {Array} trains - 列車陣列
     * @param {string} sortBy - 排序欄位 ('time', 'delay', 'trainNo')
     * @returns {Array} 排序後的列車陣列
     */
    static sortTrains(trains, sortBy = 'time') {
        if (!Array.isArray(trains)) return [];

        const sortFunctions = {
            'time': (a, b) => (a.ScheduledDepartureTime || '').localeCompare(b.ScheduledDepartureTime || ''),
            'delay': (a, b) => (b.DelayTime || 0) - (a.DelayTime || 0),
            'trainNo': (a, b) => (a.TrainNo || '').localeCompare(b.TrainNo || '')
        };

        const sortFn = sortFunctions[sortBy] || sortFunctions['time'];
        return [...trains].sort(sortFn);
    }

    /**
     * 驗證列車資料完整性
     * @param {Object} train - 列車物件
     * @returns {boolean} 是否有效
     */
    static isValidTrain(train) {
        return (
            train &&
            typeof train === 'object' &&
            train.TrainNo &&
            train.StationID &&
            train.ScheduledArrivalTime &&
            train.ScheduledDepartureTime
        );
    }

    /**
     * 批量驗證列車資料
     * @param {Array} trains - 列車陣列
     * @returns {Object} 驗證結果 { valid: [...], invalid: [...] }
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
     * 導出列車資料為 CSV 格式
     * @param {Array} trains - 列車陣列
     * @returns {string} CSV 字串
     */
    static exportToCSV(trains) {
        if (!Array.isArray(trains) || trains.length === 0) {
            return '';
        }

        const headers = ['車次', '車站', '車種', '方向', '終點站', '到站時間', '離站時間', '延誤(分)', '更新時間'];
        const rows = trains.map(train => [
            train.TrainNo,
            train.StationName?.Zh_tw || train.StationID,
            this.getTrainTypeInfo(train.TrainTypeCode).name,
            this.getDirectionInfo(train.Direction).text,
            train.EndingStationName?.Zh_tw || train.EndingStationID,
            train.ScheduledArrivalTime,
            train.ScheduledDepartureTime,
            train.DelayTime || 0,
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
     * @param {string} filename - 檔案名稱（預設為 'trains.csv'）
     */
    static downloadCSV(trains, filename = 'trains.csv') {
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
}

// 匯出為全域物件
if (typeof window !== 'undefined') {
    window.TrainDataTransformer = TrainDataTransformer;
}

// Node.js 環境支援
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrainDataTransformer;
}
