/**
 * 台鐵即時看板管理系統
 * 功能：列車資訊即時更新、篩選、排序、延誤警示
 */

class TrainLiveboardManager {
    constructor() {
        this.trains = [];
        this.currentStationId = '';
        this.currentStationName = '';
        this.autoRefreshInterval = null;
        this.autoRefreshEnabled = true;
        this.lastUpdateTime = null;
        this.filterMode = 'all'; // all, arrival, departure, delayed
        this.sortMode = 'time'; // time, trainNo, type, delay
        this.notificationEnabled = true;
        this.soundNotificationEnabled = false;
    }

    /**
     * 設定自動更新
     */
    setupAutoRefresh(callback, intervalMs = 120000) {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        if (this.autoRefreshEnabled) {
            this.autoRefreshInterval = setInterval(() => {
                console.log('🔄 自動更新台鐵看板...');
                callback();
            }, intervalMs);
        }
    }

    /**
     * 停止自動更新
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    /**
     * 篩選列車資料
     */
    filterTrains(trains, mode = 'all') {
        const now = new Date();
        
        return trains.filter(train => {
            switch (mode) {
                case 'arrival':
                    // 只顯示即將到站的列車
                    return train.ScheduledArrivalTime && !train.ScheduledDepartureTime;
                
                case 'departure':
                    // 只顯示即將離站的列車
                    return train.ScheduledDepartureTime;
                
                case 'delayed':
                    // 只顯示延誤列車
                    return (train.DelayTime || 0) > 5;
                
                case 'all':
                default:
                    // 顯示全部（除了已經離站的）
                    return true;
            }
        });
    }

    /**
     * 排序列車資料
     */
    sortTrains(trains, mode = 'time') {
        const trainsCopy = [...trains];
        
        switch (mode) {
            case 'time':
                // 按時間排序（到站時間優先）
                trainsCopy.sort((a, b) => {
                    const timeA = a.ScheduledArrivalTime || a.ScheduledDepartureTime || '23:59:59';
                    const timeB = b.ScheduledArrivalTime || b.ScheduledDepartureTime || '23:59:59';
                    return timeA.localeCompare(timeB);
                });
                break;
            
            case 'trainNo':
                // 按車次排序
                trainsCopy.sort((a, b) => {
                    const numA = parseInt(a.TrainNo || '0');
                    const numB = parseInt(b.TrainNo || '0');
                    return numA - numB;
                });
                break;
            
            case 'type':
                // 按車種排序
                trainsCopy.sort((a, b) => {
                    const typeA = a.TrainTypeCode || '99';
                    const typeB = b.TrainTypeCode || '99';
                    return typeA.localeCompare(typeB);
                });
                break;
            
            case 'delay':
                // 按延誤時間排序（最晚優先）
                trainsCopy.sort((a, b) => {
                    const delayA = -(a.DelayTime || 0);
                    const delayB = -(b.DelayTime || 0);
                    return delayA - delayB;
                });
                break;
        }
        
        return trainsCopy;
    }

    /**
     * 取得列車狀態
     */
    getTrainStatus(train) {
        const delayTime = train.DelayTime || 0;
        const runningStatus = train.RunningStatus || 0;
        
        // RunningStatus: 0=準點, 1=誤點, 2=停駛, 3=未發車, 4=已開始
        if (runningStatus === 2) {
            return { text: '停駛', class: 'delayed', icon: 'fas fa-ban' };
        } else if (runningStatus === 3 || runningStatus === 0) {
            if (delayTime > 5) {
                return { 
                    text: `誤點 ${delayTime}分`, 
                    class: 'delayed', 
                    icon: 'fas fa-exclamation-triangle',
                    severity: Math.min(Math.floor(delayTime / 5), 5) // 1-5 分級
                };
            } else if (delayTime < -2) {
                return { text: `早到 ${Math.abs(delayTime)}分`, class: 'early', icon: 'fas fa-forward' };
            } else {
                return { text: '準點', class: 'ontime', icon: 'fas fa-check' };
            }
        } else if (runningStatus === 1) {
            return { 
                text: '運行中', 
                class: 'running', 
                icon: 'fas fa-play'
            };
        }
        
        return { text: '未知', class: 'unknown', icon: 'fas fa-question' };
    }

    /**
     * 取得列車類型資訊
     */
    getTrainTypeInfo(train) {
        const typeName = train.TrainTypeName?.Zh_tw || train.TrainTypeCode || '';
        const typeCode = train.TrainTypeCode || '';
        
        const typeMap = {
            '110G': { name: '自強(3000)', class: 'tze-chiang', icon: 'fas fa-bolt' },
            '1109': { name: '自強', class: 'tze-chiang', icon: 'fas fa-bolt' },
            '1108': { name: '自強', class: 'tze-chiang', icon: 'fas fa-bolt' },
            '1107': { name: '普悠瑪', class: 'express', icon: 'fas fa-rocket' },
            '1111': { name: '莒光', class: 'chu-kuang', icon: 'fas fa-train' },
            '1131': { name: '區間', class: 'local', icon: 'fas fa-circle' },
            '1132': { name: '區間快', class: 'express', icon: 'fas fa-circle-notch' }
        };
        
        if (typeMap[typeCode]) {
            return typeMap[typeCode];
        }
        
        // 備用：根據名稱判斷
        for (const [key, value] of Object.entries(typeMap)) {
            if (typeName.includes(value.name)) {
                return value;
            }
        }
        
        return { name: typeName || '一般車', class: 'local', icon: 'fas fa-train' };
    }

    /**
     * 檢測異常列車（需要警示）
     */
    detectAnomalies(trains) {
        return {
            delayed: trains.filter(t => (t.DelayTime || 0) > 15), // 誤點超過15分鐘
            cancelled: trains.filter(t => (t.RunningStatus || 0) === 2), // 停駛
            critical: trains.filter(t => (t.DelayTime || 0) > 30) // 誤點超過30分鐘
        };
    }

    /**
     * 生成看板摘要
     */
    generateBoardSummary(trains) {
        const anomalies = this.detectAnomalies(trains);
        const delayedCount = trains.filter(t => (t.DelayTime || 0) > 5).length;
        
        return {
            total: trains.length,
            ontime: trains.filter(t => (t.DelayTime || 0) <= 5).length,
            delayed: delayedCount,
            cancelled: anomalies.cancelled.length,
            avgDelay: trains.length > 0 
                ? Math.round(trains.reduce((sum, t) => sum + (t.DelayTime || 0), 0) / trains.length)
                : 0
        };
    }

    /**
     * 播放通知聲音
     */
    playNotificationSound(type = 'normal') {
        if (!this.soundNotificationEnabled) return;
        
        // 使用 Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        
        if (type === 'delayed') {
            // 延誤警示音：低音三聲
            const frequencies = [440, 440, 440];
            for (let i = 0; i < frequencies.length; i++) {
                this.playTone(audioContext, frequencies[i], now + i * 0.2, 0.15);
            }
        } else if (type === 'critical') {
            // 嚴重警示音：警笛
            this.playTone(audioContext, 800, now, 0.3);
            this.playTone(audioContext, 600, now + 0.35, 0.3);
        } else {
            // 普通通知音：高音
            this.playTone(audioContext, 880, now, 0.2);
        }
    }

    /**
     * 播放音調
     */
    playTone(audioContext, frequency, startTime, duration) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    /**
     * 顯示通知
     */
    showNotification(title, options = {}) {
        if (!this.notificationEnabled) return;
        
        // 瀏覽器通知
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/Road-Camera/assets/train-icon.png',
                badge: '/Road-Camera/assets/train-badge.png',
                ...options
            });
        }
        
        // 頁面內通知（toast）
        this.showToast(title, options.body || '');
    }

    /**
     * 顯示 Toast 提示
     */
    showToast(title, message) {
        const toast = document.createElement('div');
        toast.className = 'train-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #1e40af, #0891b2);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 9999;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        toast.innerHTML = `
            <strong>${title}</strong>
            ${message ? `<br><small>${message}</small>` : ''}
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * 要求通知權限
     */
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    /**
     * 計算列車進度
     */
    calculateTrainProgress(train) {
        const now = new Date();
        const arrivalTime = this.parseTime(train.ScheduledArrivalTime);
        const departureTime = this.parseTime(train.ScheduledDepartureTime);
        
        if (!arrivalTime && !departureTime) return null;
        
        const startTime = arrivalTime || departureTime;
        const endTime = departureTime || arrivalTime;
        
        // 如果時間已過，返回 100%
        if (now > endTime) return 100;
        
        // 如果時間未到，返回進度
        if (now < startTime) {
            const minutesUntil = Math.round((startTime - now) / 60000);
            return { status: 'waiting', minutesUntil };
        }
        
        // 站點內停留進度
        const total = endTime - startTime;
        const elapsed = now - startTime;
        return Math.round((elapsed / total) * 100);
    }

    /**
     * 解析時間字符串
     */
    parseTime(timeStr) {
        if (!timeStr) return null;
        
        let timePart = timeStr;
        if (timeStr.includes(' ')) {
            timePart = timeStr.split(' ')[1];
        }
        
        const [hours, minutes, seconds] = timePart.split(':');
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                       parseInt(hours), parseInt(minutes), parseInt(seconds) || 0);
    }

    /**
     * 格式化時間
     */
    formatTime(timeStr) {
        if (!timeStr) return '--:--';
        const timePart = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
        return timePart.substring(0, 5);
    }

    /**
     * 取得下次列車
     */
    getNextTrain(trains) {
        const now = new Date();
        return trains.find(train => {
            const arrivalTime = this.parseTime(train.ScheduledArrivalTime);
            return arrivalTime && arrivalTime > now;
        });
    }

    /**
     * 統計延誤分佈
     */
    analyzeDelayDistribution(trains) {
        const distribution = {
            ontime: 0,      // 0-5分
            slight: 0,      // 6-10分
            moderate: 0,    // 11-20分
            heavy: 0,       // 21-30分
            critical: 0,    // 30分以上
            cancelled: 0    // 停駛
        };
        
        trains.forEach(train => {
            const delay = train.DelayTime || 0;
            const status = train.RunningStatus || 0;
            
            if (status === 2) {
                distribution.cancelled++;
            } else if (delay <= 5) {
                distribution.ontime++;
            } else if (delay <= 10) {
                distribution.slight++;
            } else if (delay <= 20) {
                distribution.moderate++;
            } else if (delay <= 30) {
                distribution.heavy++;
            } else {
                distribution.critical++;
            }
        });
        
        return distribution;
    }

    /**
     * 取得系統狀態
     */
    getSystemStatus(trains) {
        const anomalies = this.detectAnomalies(trains);
        
        if (anomalies.critical.length > 0) {
            return { status: 'critical', text: '⚠️ 列車嚴重延誤', color: '#e74c3c' };
        } else if (anomalies.delayed.length > trains.length * 0.3) {
            return { status: 'warning', text: '⚡ 多班列車延誤', color: '#f39c12' };
        } else if (anomalies.delayed.length > 0) {
            return { status: 'caution', text: '△ 部分列車延誤', color: '#f1c40f' };
        } else {
            return { status: 'normal', text: '✓ 系統正常', color: '#27ae60' };
        }
    }

    /**
     * 匯出列車資訊（CSV格式）
     */
    exportToCSV(trains) {
        const headers = ['車次', '車種', '方向', '終點站', '預計到站', '預計離站', '延誤(分)', '狀態'];
        const rows = trains.map(train => {
            const status = this.getTrainStatus(train);
            const direction = train.Direction === 0 ? '南下' : '北上';
            return [
                train.TrainNo,
                train.TrainTypeName?.Zh_tw || '',
                direction,
                train.EndingStationName?.Zh_tw || '',
                this.formatTime(train.ScheduledArrivalTime),
                this.formatTime(train.ScheduledDepartureTime),
                train.DelayTime || 0,
                status.text
            ];
        });
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `train_board_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    }
}

// 全域實例
const trainLiveboardManager = new TrainLiveboardManager();

// 要求通知權限
if ('Notification' in window && Notification.permission === 'default') {
    console.log('要求通知權限...');
    // trainLiveboardManager.requestNotificationPermission();
}
