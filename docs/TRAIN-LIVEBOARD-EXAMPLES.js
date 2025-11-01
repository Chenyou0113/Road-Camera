/**
 * 台鐵 LiveBoard 工具 - 使用範例
 * @file docs/TRAIN-LIVEBOARD-EXAMPLES.js
 * 
 * 包含 20+ 個實用的台鐵列車即時看板處理範例
 */

// ============================================================
// 樣本資料 (用於示範)
// ============================================================

const sampleTrains = [
    {
        "StationID": "0900",
        "StationName": { "Zh_tw": "基隆", "En": "Keelung" },
        "TrainNo": "1288",
        "Direction": 0,
        "TrainTypeID": "1131",
        "TrainTypeCode": "6",
        "TrainTypeName": { "Zh_tw": "區間", "En": "Local Train" },
        "TripLine": 1,
        "EndingStationID": "0900",
        "EndingStationName": { "Zh_tw": "基隆", "En": "Keelung" },
        "ScheduledArrivalTime": "12:30:00",
        "ScheduledDepartureTime": "12:31:00",
        "ActualArrivalTime": "2025-11-02T12:32:00+08:00",
        "DelayTime": 2,
        "UpdateTime": "2025-11-02T12:32:30+08:00"
    },
    {
        "StationID": "0900",
        "StationName": { "Zh_tw": "基隆", "En": "Keelung" },
        "TrainNo": "901",
        "Direction": 1,
        "TrainTypeCode": "1",
        "TrainTypeName": { "Zh_tw": "自強", "En": "Express Train" },
        "EndingStationName": { "Zh_tw": "台北", "En": "Taipei" },
        "ScheduledArrivalTime": "13:00:00",
        "ScheduledDepartureTime": "13:02:00",
        "DelayTime": 5,
        "UpdateTime": "2025-11-02T12:58:00+08:00"
    },
    {
        "StationID": "0900",
        "StationName": { "Zh_tw": "基隆", "En": "Keelung" },
        "TrainNo": "2050",
        "Direction": 0,
        "TrainTypeCode": "4",
        "TrainTypeName": { "Zh_tw": "莒光", "En": "Tjlight Train" },
        "EndingStationName": { "Zh_tw": "高雄", "En": "Kaohsiung" },
        "ScheduledArrivalTime": "13:15:00",
        "ScheduledDepartureTime": "13:17:00",
        "DelayTime": 0,
        "UpdateTime": "2025-11-02T13:14:00+08:00"
    }
];

// ============================================================
// 1. 基本時間轉換
// ============================================================

console.log('=== 1. 基本時間轉換 ===');

// 格式化時間
const times = [
    "12:34:56",
    "00:05:30",
    "23:59:59"
];

times.forEach(time => {
    const formatted = TrainLiveboardTransformer.formatTime(time);
    console.log(`${time} → ${formatted}`);
});

// 解析 ISO 8601
const isoTimes = [
    "2025-11-02T12:34:56+08:00",
    "2025-11-02T00:05:30+08:00"
];

isoTimes.forEach(iso => {
    const parsed = TrainLiveboardTransformer.parseUpdateTime(iso);
    console.log(`${iso} → ${parsed}`);
});

// ============================================================
// 2. 列車類型查詢
// ============================================================

console.log('=== 2. 列車類型查詢 ===');

const typeCodes = ['0', '1', '4', '5', '6', '21'];
typeCodes.forEach(code => {
    const info = TrainLiveboardTransformer.getTrainTypeInfo(code);
    console.log(`代碼 ${code}: ${info.name} (徽章: ${info.badge})`);
});

// ============================================================
// 3. 方向查詢
// ============================================================

console.log('=== 3. 方向查詢 ===');

const directions = [0, 1];
directions.forEach(dir => {
    const info = TrainLiveboardTransformer.getDirectionInfo(dir);
    console.log(`方向 ${dir}: ${info.text}`);
});

// ============================================================
// 4. 延誤狀態查詢
// ============================================================

console.log('=== 4. 延誤狀態查詢 ===');

const delays = [0, 5, -3, null];
delays.forEach(delay => {
    const status = TrainLiveboardTransformer.getDelayStatus(delay);
    console.log(`${delay} 分 → ${status.text}`);
});

// ============================================================
// 5. 列車狀態判斷
// ============================================================

console.log('=== 5. 列車狀態判斷 ===');

const train1 = {
    ScheduledArrivalTime: "12:30:00",
    ActualArrivalTime: "2025-11-02T12:32:00+08:00"
};

const train2 = {
    ScheduledDepartureTime: "13:00:00",
    ActualDepartureTime: "2025-11-02T13:05:00+08:00"
};

const train3 = {
    ScheduledArrivalTime: "13:30:00"
};

console.log('已到達列車:', TrainLiveboardTransformer.getTrainStatus(train1));
console.log('已離站列車:', TrainLiveboardTransformer.getTrainStatus(train2));
console.log('預定列車:', TrainLiveboardTransformer.getTrainStatus(train3));

// ============================================================
// 6. 單個列車行生成
// ============================================================

console.log('=== 6. 單個列車行生成 ===');

const row = TrainLiveboardTransformer.createTrainRow(sampleTrains[0]);
console.log('生成的 HTML 列:', row.substring(0, 100) + '...');

// ============================================================
// 7. 批量列車行生成
// ============================================================

console.log('=== 7. 批量列車行生成 ===');

const rows = TrainLiveboardTransformer.createTrainRows(sampleTrains);
console.log('生成 3 個列車行');

// ============================================================
// 8. 完整表格生成
// ============================================================

console.log('=== 8. 完整表格生成 ===');

const table = TrainLiveboardTransformer.createTrainTable(sampleTrains);
console.log('生成完整表格 HTML (長度:', table.length, 'chars)');

// ============================================================
// 9. 統計面板生成
// ============================================================

console.log('=== 9. 統計面板生成 ===');

const statsPanel = TrainLiveboardTransformer.createStatsPanel(sampleTrains);
console.log('統計面板已生成');

// ============================================================
// 10. 按方向分組
// ============================================================

console.log('=== 10. 按方向分組 ===');

const groupedByDir = TrainLiveboardTransformer.groupByDirection(sampleTrains);
console.log('南下:', groupedByDir[0].length, '班');
console.log('北上:', groupedByDir[1].length, '班');

// ============================================================
// 11. 按列車類型分組
// ============================================================

console.log('=== 11. 按列車類型分組 ===');

const groupedByType = TrainLiveboardTransformer.groupByTrainType(sampleTrains);
Object.entries(groupedByType).forEach(([type, trains]) => {
    const typeInfo = TrainLiveboardTransformer.getTrainTypeInfo(type);
    console.log(`${typeInfo.name}: ${trains.length} 班`);
});

// ============================================================
// 12. 按終點站分組
// ============================================================

console.log('=== 12. 按終點站分組 ===');

const groupedByStation = TrainLiveboardTransformer.groupByEndingStation(sampleTrains);
Object.entries(groupedByStation).forEach(([station, trains]) => {
    console.log(`${station}: ${trains.length} 班`);
});

// ============================================================
// 13. 篩選延誤列車
// ============================================================

console.log('=== 13. 篩選延誤列車 ===');

const delayed = TrainLiveboardTransformer.filterDelayedTrains(sampleTrains);
console.log('延誤列車:', delayed.length, '班');
delayed.forEach(train => {
    console.log(`  列車 ${train.TrainNo}: 延誤 ${train.DelayTime} 分`);
});

// ============================================================
// 14. 篩選準點列車
// ============================================================

console.log('=== 14. 篩選準點列車 ===');

const ontime = TrainLiveboardTransformer.filterOntimeTrains(sampleTrains);
console.log('準點列車:', ontime.length, '班');

// ============================================================
// 15. 篩選已到達列車
// ============================================================

console.log('=== 15. 篩選已到達列車 ===');

const arrived = TrainLiveboardTransformer.filterArrivedTrains(sampleTrains);
console.log('已到達列車:', arrived.length, '班');

// ============================================================
// 16. 篩選已離站列車
// ============================================================

console.log('=== 16. 篩選已離站列車 ===');

const departed = TrainLiveboardTransformer.filterDepartedTrains(sampleTrains);
console.log('已離站列車:', departed.length, '班');

// ============================================================
// 17. 篩選預定列車
// ============================================================

console.log('=== 17. 篩選預定列車 ===');

const scheduled = TrainLiveboardTransformer.filterScheduledTrains(sampleTrains);
console.log('預定列車:', scheduled.length, '班');

// ============================================================
// 18. 排序 - 按到達時間
// ============================================================

console.log('=== 18. 排序 - 按到達時間 ===');

const sortedByTime = TrainLiveboardTransformer.sortByArrivalTime(sampleTrains);
console.log('按到達時間排序 (升序):');
sortedByTime.forEach((train, idx) => {
    console.log(`${idx + 1}. ${train.TrainNo} - ${train.ScheduledArrivalTime}`);
});

// ============================================================
// 19. 排序 - 按列車號
// ============================================================

console.log('=== 19. 排序 - 按列車號 ===');

const sortedByNo = TrainLiveboardTransformer.sortByTrainNo(sampleTrains);
console.log('按列車號排序:');
sortedByNo.forEach(train => {
    console.log(`  ${train.TrainNo}`);
});

// ============================================================
// 20. 排序 - 按延誤
// ============================================================

console.log('=== 20. 排序 - 按延誤 ===');

const sortedByDelay = TrainLiveboardTransformer.sortByDelay(sampleTrains);
console.log('按延誤排序 (最多優先):');
sortedByDelay.forEach(train => {
    console.log(`  ${train.TrainNo}: ${train.DelayTime || 0} 分`);
});

// ============================================================
// 21. 統計計算
// ============================================================

console.log('=== 21. 統計計算 ===');

const stats = TrainLiveboardTransformer.calculateStats(sampleTrains);
console.log('統計信息:');
console.log(`  列車總數: ${stats.total}`);
console.log(`  已到達: ${stats.arrived}`);
console.log(`  已離站: ${stats.departed}`);
console.log(`  預定中: ${stats.scheduled}`);
console.log(`  延誤: ${stats.delayed}`);
console.log(`  準點: ${stats.ontime}`);

// ============================================================
// 22. 資料驗證
// ============================================================

console.log('=== 22. 資料驗證 ===');

const { valid, invalid } = TrainLiveboardTransformer.validateTrains(sampleTrains);
console.log(`有效: ${valid.length}, 無效: ${invalid.length}`);

// ============================================================
// 23. 導出 CSV
// ============================================================

console.log('=== 23. 導出 CSV ===');

const csv = TrainLiveboardTransformer.exportToCSV(sampleTrains);
console.log('CSV 內容 (前 200 字):');
console.log(csv.substring(0, 200) + '...');

// ============================================================
// 24. 導出 JSON
// ============================================================

console.log('=== 24. 導出 JSON ===');

const json = TrainLiveboardTransformer.exportToJSON(sampleTrains);
console.log('JSON 內容 (前 200 字):');
console.log(json.substring(0, 200) + '...');

// ============================================================
// 25. 完整的頁面加載函數
// ============================================================

/**
 * 完整的台鐵 LiveBoard 頁面加載函數
 * 
 * HTML 需要包含:
 * <div id="stats-container"></div>
 * <div id="table-container"></div>
 */
async function loadTrainLiveboard(stationID = '0900') {
    try {
        console.log('正在加載列車即時資訊...');

        // Step 1: 取得資料
        const apiUrl = `https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/LiveBoard?StationID=${stationID}&$top=50`;
        const response = await fetch(apiUrl);
        const trainsData = await response.json();

        console.log(`收到 ${trainsData.length} 班列車資訊`);

        // Step 2: 驗證資料
        const { valid, invalid } = TrainLiveboardTransformer.validateTrains(trainsData);
        console.log(`驗證完成: ${valid.length} 筆有效, ${invalid.length} 筆無效`);

        // Step 3: 排序資料
        const sortedTrains = TrainLiveboardTransformer.sortByArrivalTime(valid);

        // Step 4: 顯示統計資訊
        const statsHTML = TrainLiveboardTransformer.createStatsPanel(sortedTrains);
        if (document.getElementById('stats-container')) {
            document.getElementById('stats-container').innerHTML = statsHTML;
        }

        // Step 5: 顯示列車表格
        const tableHTML = TrainLiveboardTransformer.createTrainTable(sortedTrains);
        if (document.getElementById('table-container')) {
            document.getElementById('table-container').innerHTML = tableHTML;
        }

        console.log('列車即時資訊已加載完成');

        return true;

    } catch (error) {
        console.error('加載失敗:', error);
        if (document.getElementById('table-container')) {
            document.getElementById('table-container').innerHTML =
                '<div style="color: red; padding: 20px; text-align: center;">' +
                '❌ 無法加載列車資訊，請稍後再試' +
                '</div>';
        }
        return false;
    }
}

// ============================================================
// 26. 進階：實時監控系統
// ============================================================

class TrainLiveboardMonitor {
    constructor(stationID, updateInterval = 30000) {
        this.stationID = stationID;
        this.updateInterval = updateInterval;
        this.lastUpdate = null;
        this.delayedTrains = new Map();
    }

    /**
     * 檢查是否有新的延誤列車
     */
    checkNewDelays(currentTrains) {
        const delayed = TrainLiveboardTransformer.filterDelayedTrains(currentTrains);
        const alerts = [];

        delayed.forEach(train => {
            const key = train.TrainNo;
            if (!this.delayedTrains.has(key)) {
                alerts.push(`⚠️ 列車 ${train.TrainNo} 開始延誤: ${train.DelayTime} 分`);
                this.delayedTrains.set(key, train.DelayTime);
            }
        });

        return alerts;
    }

    /**
     * 監控並通知異常狀態
     */
    async start() {
        setInterval(async () => {
            try {
                const response = await fetch(
                    `https://tdx.transportdata.tw/api/basic/v2/Rail/TRA/LiveBoard?StationID=${this.stationID}`
                );
                const trains = await response.json();
                this.lastUpdate = new Date();

                // 檢查新的延誤
                const alerts = this.checkNewDelays(trains);
                if (alerts.length > 0) {
                    console.warn('🔔 延誤警報:');
                    alerts.forEach(alert => console.warn(alert));
                }

                // 計算統計
                const stats = TrainLiveboardTransformer.calculateStats(trains);
                console.info(`📊 目前狀態 - 延誤: ${stats.delayed}, 準點: ${stats.ontime}`);

            } catch (error) {
                console.error('監控失敗:', error);
            }
        }, this.updateInterval);
    }
}

// 使用示例
// const monitor = new TrainLiveboardMonitor('0900', 30000);
// monitor.start();

// ============================================================
// 27. 高級用途：資料分析
// ============================================================

/**
 * 分析延誤趨勢
 */
function analyzeDelayTrends(trains) {
    const stats = TrainLiveboardTransformer.calculateStats(trains);
    const delayRate = ((stats.delayed / stats.total) * 100).toFixed(2);
    const avgDelay = TrainLiveboardTransformer.filterDelayedTrains(trains)
        .reduce((sum, t) => sum + (t.DelayTime || 0), 0) /
        (stats.delayed || 1);

    return {
        totalTrains: stats.total,
        delayedCount: stats.delayed,
        delayRate: `${delayRate}%`,
        averageDelay: avgDelay.toFixed(1),
        recommendation: delayRate > 20 ? '延誤率高' : '正常'
    };
}

// 使用示例
// const analysis = analyzeDelayTrends(sampleTrains);
// console.log('延誤分析:', analysis);

console.log('\n=== 所有範例已完成 ===');
