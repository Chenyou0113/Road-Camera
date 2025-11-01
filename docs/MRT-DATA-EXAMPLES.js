/**
 * 捷運資料轉換工具 - 使用範例集
 * @file docs/MRT-DATA-EXAMPLES.js
 * 
 * 包含 15+ 個實用的捷運資料處理範例
 */

// ============================================================
// 1. 基本時間轉換
// ============================================================

console.log('=== 1. 基本時間轉換 ===');

// 例子 1.1: 格式化估計到站時間
const times = [0, 30, 60, 180, 600, 3600];
times.forEach(time => {
    const formatted = MRTDataTransformer.formatEstimateTime(time);
    console.log(`${time} 秒 => "${formatted}"`);
});
// 輸出:
// 0 秒 => "進站中"
// 30 秒 => "即將進站"
// 60 秒 => "1 分"
// 180 秒 => "3 分"
// 600 秒 => "10 分"
// 3600 秒 => "1h0m"

// 例子 1.2: 解析 ISO 8601 更新時間
const isoTimes = [
    "2025-11-02T08:30:45+08:00",
    "2025-11-02T23:59:59+08:00",
    "2025-11-02T00:00:00+08:00"
];
isoTimes.forEach(isoTime => {
    const parsed = MRTDataTransformer.parseUpdateTime(isoTime);
    console.log(`${isoTime} => "${parsed}"`);
});
// 輸出:
// 2025-11-02T08:30:45+08:00 => "08:30:45"
// 2025-11-02T23:59:59+08:00 => "23:59:59"
// 2025-11-02T00:00:00+08:00 => "00:00:00"

// ============================================================
// 2. 路線信息查詢
// ============================================================

console.log('=== 2. 路線信息查詢 ===');

// 例子 2.1: 獲取路線顏色和名稱
const lineIDs = ['BL', 'R', 'G', 'SL', 'CL', 'LC'];
lineIDs.forEach(lineID => {
    const lineInfo = MRTDataTransformer.getLineInfo(lineID);
    console.log(`${lineID}: ${lineInfo.name} (${lineInfo.color})`);
});
// 輸出:
// BL: 板南線 (#0070C0)
// R: 紅線 (#E4002B)
// G: 綠線 (#00A65E)
// SL: 淡水線 (#E4002B)
// CL: 新店線 (#FCC300)
// LC: 環狀線 (#C1A501)

// ============================================================
// 3. 營運狀態查詢
// ============================================================

console.log('=== 3. 營運狀態查詢 ===');

// 例子 3.1: 獲取營運狀態信息
const serviceStatuses = [0, 1, 2, 3, 255];
serviceStatuses.forEach(status => {
    const statusInfo = MRTDataTransformer.getServiceStatus(status);
    console.log(`狀態 ${status}: ${statusInfo.text} (${statusInfo.color})`);
});
// 輸出:
// 狀態 0: 正常 (#27ae60)
// 狀態 1: 班次疏運 (#f39c12)
// 狀態 2: 單線運行 (#e74c3c)
// 狀態 3: 全線停駛 (#8b0000)
// 狀態 255: 未知 (#95a5a6)

// ============================================================
// 4. 樣本資料集
// ============================================================

const sampleTrains = [
    {
        "LineID": "BL",
        "LineName": { "Zh_tw": "板南線", "En": "Bannan Line" },
        "StationID": "BL10",
        "StationName": { "Zh_tw": "龍山寺", "En": "Longshan Temple" },
        "TripHeadSign": "往亞東醫院",
        "DestinationStationID": "BL05",
        "DestinationStationName": { "Zh_tw": "亞東醫院", "En": "Far Eastern Hospital" },
        "ServiceStatus": 0,
        "EstimateTime": 0,
        "UpdateTime": "2025-11-02T08:30:00+08:00"
    },
    {
        "LineID": "R",
        "LineName": { "Zh_tw": "紅線", "En": "Red Line" },
        "StationID": "R08",
        "StationName": { "Zh_tw": "市政府", "En": "Taipei City Hall" },
        "TripHeadSign": "往南港軟體園區",
        "DestinationStationID": "R24",
        "DestinationStationName": { "Zh_tw": "南港軟體園區", "En": "Nankang Software Park" },
        "ServiceStatus": 0,
        "EstimateTime": 180,
        "UpdateTime": "2025-11-02T08:31:00+08:00"
    },
    {
        "LineID": "G",
        "LineName": { "Zh_tw": "綠線", "En": "Green Line" },
        "StationID": "G17",
        "StationName": { "Zh_tw": "中山國小", "En": "Zhongshan Elementary School" },
        "TripHeadSign": "往松山",
        "DestinationStationID": "G01",
        "DestinationStationName": { "Zh_tw": "松山", "En": "Songshan" },
        "ServiceStatus": 1,
        "EstimateTime": 450,
        "UpdateTime": "2025-11-02T08:32:00+08:00"
    }
];

// ============================================================
// 5. 單個列車卡片生成
// ============================================================

console.log('=== 5. 單個列車卡片生成 ===');

const trainCard = MRTDataTransformer.createTrainCard(sampleTrains[0]);
console.log('生成的 HTML:');
console.log(trainCard);

// ============================================================
// 6. 批量列車卡片生成
// ============================================================

console.log('=== 6. 批量列車卡片生成 ===');

// 例子 6.1: 生成全部列車卡片
const allCardsHTML = MRTDataTransformer.createTrainCards(sampleTrains);
console.log('已生成', sampleTrains.length, '個列車卡片');

// 例子 6.2: 空列車集合處理
const emptyCardsHTML = MRTDataTransformer.createTrainCards([]);
console.log('空列表卡片:', emptyCardsHTML);

// ============================================================
// 7. 按路線分類
// ============================================================

console.log('=== 7. 按路線分類 ===');

const groupedByLine = MRTDataTransformer.groupByLine(sampleTrains);
console.log('按路線分類結果:');
Object.entries(groupedByLine).forEach(([lineID, trains]) => {
    console.log(`${lineID}: ${trains.length} 班列車`);
});

// ============================================================
// 8. 按到站狀態分類
// ============================================================

console.log('=== 8. 按到站狀態分類 ===');

const groupedByStatus = MRTDataTransformer.groupByArrivalStatus(sampleTrains);
console.log('進站中:', groupedByStatus.inStation.length);
console.log('即將到站 (5分鐘內):', groupedByStatus.arriving.length);
console.log('尚未進站 (5分鐘以上):', groupedByStatus.delayed.length);

// ============================================================
// 9. 數據篩選
// ============================================================

console.log('=== 9. 數據篩選 ===');

// 例子 9.1: 篩選正常營運的列車
const normalTrains = MRTDataTransformer.filterNormalService(sampleTrains);
console.log('正常營運列車:', normalTrains.length);

// 例子 9.2: 篩選異常營運的列車
const abnormalTrains = MRTDataTransformer.filterAbnormalService(sampleTrains);
console.log('異常營運列車:', abnormalTrains.length);

// ============================================================
// 10. 數據排序
// ============================================================

console.log('=== 10. 數據排序 ===');

// 例子 10.1: 按到站時間排序
const sortedByTime = MRTDataTransformer.sortTrains(sampleTrains, 'time');
console.log('按到站時間排序:');
sortedByTime.forEach((train, index) => {
    console.log(`${index + 1}. ${train.StationName.Zh_tw} - 估計 ${MRTDataTransformer.formatEstimateTime(train.EstimateTime)}`);
});

// 例子 10.2: 按路線排序
const sortedByLine = MRTDataTransformer.sortTrains(sampleTrains, 'line');
console.log('按路線排序:', sortedByLine.map(t => t.LineID).join(', '));

// 例子 10.3: 按營運狀態排序
const sortedByStatus = MRTDataTransformer.sortTrains(sampleTrains, 'status');
console.log('按狀態排序:', sortedByStatus.map(t => `${t.LineID}(${t.ServiceStatus})`).join(', '));

// ============================================================
// 11. 統計計算
// ============================================================

console.log('=== 11. 統計計算 ===');

const stats = MRTDataTransformer.calculateStats(sampleTrains);
console.log('統計信息:');
console.log('  列車總數:', stats.total);
console.log('  進站中:', stats.inStation);
console.log('  即將到站:', stats.arriving);
console.log('  尚未進站:', stats.delayed);
console.log('  異常營運:', stats.abnormal);

// ============================================================
// 12. 數據驗證
// ============================================================

console.log('=== 12. 數據驗證 ===');

// 例子 12.1: 完整驗證
const validationResult = MRTDataTransformer.validateTrains(sampleTrains);
console.log('有效資料:', validationResult.valid.length);
console.log('無效資料:', validationResult.invalid.length);

// 例子 12.2: 驗證單筆資料
const isValid = MRTDataTransformer.isValidTrain(sampleTrains[0]);
console.log('第一筆資料有效:', isValid);

// ============================================================
// 13. 統計面板生成
// ============================================================

console.log('=== 13. 統計面板生成 ===');

const statsPanel = MRTDataTransformer.createStatsPanel(sampleTrains);
console.log('統計面板 HTML 已生成 (長度:', statsPanel.length, 'chars)');

// ============================================================
// 14. 路線卡片生成
// ============================================================

console.log('=== 14. 路線卡片生成 ===');

const lineCards = MRTDataTransformer.createLineCards(groupedByLine);
console.log('路線卡片 HTML 已生成 (長度:', lineCards.length, 'chars)');

// ============================================================
// 15. 數據導出
// ============================================================

console.log('=== 15. 數據導出 ===');

// 例子 15.1: 導出為 CSV
const csv = MRTDataTransformer.exportToCSV(sampleTrains);
console.log('CSV 導出 (前 200 個字符):');
console.log(csv.substring(0, 200));

// 例子 15.2: 導出為 JSON
const json = MRTDataTransformer.exportToJSON(sampleTrains);
console.log('JSON 導出 (前 200 個字符):');
console.log(json.substring(0, 200));

// ============================================================
// 16. 完整的頁面加載函數
// ============================================================

/**
 * 完整的捷運即時看板加載函數
 * 實際應用時應替換成真實的 API 呼叫
 */
async function loadMRTLiveboard() {
    try {
        console.log('正在加載捷運即時資訊...');

        // Step 1: 取得資料 (實際應用時從 TDX API 取得)
        // const response = await fetch('https://api.tdx.transportdata.tw/...');
        // const trainsData = await response.json();
        
        // 使用樣本資料演示
        const trainsData = sampleTrains;

        // Step 2: 驗證資料
        const { valid, invalid } = MRTDataTransformer.validateTrains(trainsData);
        console.log(`驗證完成: ${valid.length} 筆有效, ${invalid.length} 筆無效`);

        // Step 3: 排序資料
        const sortedTrains = MRTDataTransformer.sortTrains(valid, 'time');

        // Step 4: 生成統計面板
        const statsHTML = MRTDataTransformer.createStatsPanel(sortedTrains);
        if (document.getElementById('stats-panel')) {
            document.getElementById('stats-panel').innerHTML = statsHTML;
        }

        // Step 5: 按路線分組並顯示
        const groupedByLine = MRTDataTransformer.groupByLine(sortedTrains);
        const lineCardsHTML = MRTDataTransformer.createLineCards(groupedByLine);
        if (document.getElementById('lines-container')) {
            document.getElementById('lines-container').innerHTML = lineCardsHTML;
        }

        // Step 6: 顯示所有列車
        const trainsHTML = MRTDataTransformer.createTrainCards(sortedTrains);
        if (document.getElementById('trains-container')) {
            document.getElementById('trains-container').innerHTML = trainsHTML;
        }

        console.log('捷運即時資訊已加載');

    } catch (error) {
        console.error('加載失敗:', error);
        if (document.getElementById('trains-container')) {
            document.getElementById('trains-container').innerHTML = 
                '<div style="color: red; padding: 20px; text-align: center;">' +
                '❌ 無法加載列車資訊，請稍後再試' +
                '</div>';
        }
    }
}

// ============================================================
// 17. 高級用途: 實時監控和警報系統
// ============================================================

class MRTMonitor {
    constructor(updateInterval = 10000) {
        this.updateInterval = updateInterval;
        this.lastUpdate = null;
        this.abnormalLines = new Set();
    }

    /**
     * 檢查是否有異常情況
     */
    checkAbnormalities(trains) {
        const abnormal = MRTDataTransformer.filterAbnormalService(trains);
        
        if (abnormal.length > 0) {
            console.warn('⚠️ 偵測到異常營運:', abnormal.length, '班列車');
            abnormal.forEach(train => {
                const status = MRTDataTransformer.getServiceStatus(train.ServiceStatus);
                console.warn(`  ${train.LineID}: ${status.text}`);
            });
        }

        return abnormal;
    }

    /**
     * 監控延誤情況
     */
    monitorDelays(trains, thresholdSeconds = 300) {
        const delayed = trains.filter(t => (t.EstimateTime || 0) > thresholdSeconds);
        
        if (delayed.length > 0) {
            console.info('ℹ️ 延誤列車:', delayed.length, '班');
            delayed.forEach(train => {
                const delayText = MRTDataTransformer.formatEstimateTime(train.EstimateTime);
                console.info(`  ${train.LineID} ${train.StationName.Zh_tw}: ${delayText}`);
            });
        }

        return delayed;
    }

    /**
     * 開始監控
     */
    start(dataFetchFunction) {
        setInterval(async () => {
            try {
                const trains = await dataFetchFunction();
                this.lastUpdate = new Date();
                
                this.checkAbnormalities(trains);
                this.monitorDelays(trains);
                
            } catch (error) {
                console.error('監控失敗:', error);
            }
        }, this.updateInterval);
    }
}

// 使用示例
// const monitor = new MRTMonitor(10000); // 每 10 秒檢查一次
// monitor.start(async () => {
//     // 這裡應該是實際的 API 呼叫
//     return sampleTrains;
// });

// ============================================================
// 18. 效能測試
// ============================================================

console.log('=== 18. 效能測試 ===');

function performanceBenchmark() {
    const largeDataset = [];
    for (let i = 0; i < 1000; i++) {
        largeDataset.push({
            ...sampleTrains[i % sampleTrains.length],
            StationID: `ST${i}`,
            EstimateTime: Math.floor(Math.random() * 600)
        });
    }

    // 測試排序效能
    console.time('排序 1000 筆列車');
    const sorted = MRTDataTransformer.sortTrains(largeDataset, 'time');
    console.timeEnd('排序 1000 筆列車');

    // 測試分組效能
    console.time('分組 1000 筆列車');
    const grouped = MRTDataTransformer.groupByLine(largeDataset);
    console.timeEnd('分組 1000 筆列車');

    // 測試驗證效能
    console.time('驗證 1000 筆列車');
    const validated = MRTDataTransformer.validateTrains(largeDataset);
    console.timeEnd('驗證 1000 筆列車');

    // 測試 CSV 導出效能
    console.time('導出 1000 筆為 CSV');
    const csvData = MRTDataTransformer.exportToCSV(largeDataset);
    console.timeEnd('導出 1000 筆為 CSV');

    console.log('CSV 大小:', Math.round(csvData.length / 1024), 'KB');
}

// performanceBenchmark(); // 執行效能測試 (可選)

console.log('=== 所有範例已完成 ===');
