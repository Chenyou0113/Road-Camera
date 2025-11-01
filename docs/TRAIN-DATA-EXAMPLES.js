/**
 * 台鐵列車資料轉換工具 - 使用示例
 * Train Data Transformer - Usage Examples
 * 
 * 本檔案展示如何在專案中使用 TrainDataTransformer
 */

// ============================================================
// 1️⃣ 基本使用 - 時間格式轉換
// ============================================================

// 將 HH:MM:SS 轉換為 HH:MM
console.log(TrainDataTransformer.formatTime("14:30:45")); 
// 輸出: "14:30"

// 處理無效輸入
console.log(TrainDataTransformer.formatTime(null)); 
// 輸出: "--"

// 解析 ISO 8601 時間
console.log(TrainDataTransformer.parseUpdateTime("2025-11-02T14:30:45+08:00")); 
// 輸出: "14:30:45"


// ============================================================
// 2️⃣ 延誤狀態判斷
// ============================================================

// 準點
let status = TrainDataTransformer.getDelayStatus(0);
console.log(status); 
// { status: "準點", cssClass: "ontime", icon: "check-circle", color: "#27ae60" }

// 延誤
status = TrainDataTransformer.getDelayStatus(5);
console.log(status); 
// { status: "延誤 5 分", cssClass: "delayed", icon: "hourglass-end", color: "#e74c3c" }

// 提前
status = TrainDataTransformer.getDelayStatus(-3);
console.log(status); 
// { status: "提前 3 分", cssClass: "early", icon: "bolt", color: "#3498db" }


// ============================================================
// 3️⃣ 列車方向
// ============================================================

// 南下
let direction = TrainDataTransformer.getDirectionInfo(0);
console.log(direction); 
// { text: "南下", icon: "arrow-down", color: "#e74c3c" }

// 北上
direction = TrainDataTransformer.getDirectionInfo(1);
console.log(direction); 
// { text: "北上", icon: "arrow-up", color: "#3498db" }


// ============================================================
// 4️⃣ 車種分類
// ============================================================

// 自強號
let type = TrainDataTransformer.getTrainTypeInfo('1');
console.log(type); 
// { name: "自強號", badge: "express", color: "#ff6b6b" }

// 區間
type = TrainDataTransformer.getTrainTypeInfo('6');
console.log(type); 
// { name: "區間", badge: "local", color: "#4ecdc4" }


// ============================================================
// 5️⃣ 統計資訊計算
// ============================================================

// 範例列車陣列
const sampleTrains = [
    {
        TrainNo: "1288",
        StationID: "0900",
        Direction: 0,
        TrainTypeCode: "6",
        DelayTime: 0,
        ScheduledArrivalTime: "14:30:00",
        ScheduledDepartureTime: "14:32:00"
    },
    {
        TrainNo: "1289",
        StationID: "0900",
        Direction: 0,
        TrainTypeCode: "1",
        DelayTime: 5,  // 延誤 5 分
        ScheduledArrivalTime: "14:45:00",
        ScheduledDepartureTime: "14:47:00"
    },
    {
        TrainNo: "1290",
        StationID: "0900",
        Direction: 1,
        TrainTypeCode: "2",
        DelayTime: 0,
        ScheduledArrivalTime: "15:00:00",
        ScheduledDepartureTime: "15:02:00"
    }
];

const stats = TrainDataTransformer.calculateStats(sampleTrains);
console.log(stats); 
// { total: 3, arrival: 1, departure: 0, delayed: 1 }


// ============================================================
// 6️⃣ 生成表格行 HTML
// ============================================================

// 單一列車
const trainRow = TrainDataTransformer.createTrainRow(sampleTrains[0]);
console.log(trainRow);
/*
<tr>
    <td>
        <span class="train-number">
            <i class="fas fa-train"></i> 1288
        </span>
    </td>
    <td>
        <span class="train-type local">
            區間
        </span>
    </td>
    ... 更多行 ...
</tr>
*/

// 批量列車
const trainRows = TrainDataTransformer.createTrainRows(sampleTrains);
console.log(trainRows); // 多個 <tr> 元素

// 在頁面中使用
document.getElementById('trainTableBody').innerHTML = trainRows;


// ============================================================
// 7️⃣ 篩選最近列車
// ============================================================

// 篩選 30 分鐘內的列車
const recentTrains = TrainDataTransformer.filterRecentTrains(sampleTrains, 30);
console.log(recentTrains.length); // 符合條件的列車數量

// 篩選延誤列車
const delayedTrains = TrainDataTransformer.filterDelayedTrains(sampleTrains);
console.log(delayedTrains); 
// 只返回 DelayTime > 0 的列車


// ============================================================
// 8️⃣ 分類列車
// ============================================================

// 按方向分類
const byDirection = TrainDataTransformer.groupByDirection(sampleTrains);
console.log(byDirection);
/*
{
    northbound: [train1, train2],  // Direction = 1
    southbound: [train0]            // Direction = 0
}
*/

// 按車種分類
const byType = TrainDataTransformer.groupByTrainType(sampleTrains);
console.log(byType);
/*
{
    '1': [train1],   // 自強號
    '2': [train2],   // 莒光號
    '6': [train0]    // 區間
}
*/


// ============================================================
// 9️⃣ 排序列車
// ============================================================

// 按時間排序（預設）
const sortedByTime = TrainDataTransformer.sortTrains(sampleTrains, 'time');

// 按延誤時間排序（延誤最多優先）
const sortedByDelay = TrainDataTransformer.sortTrains(sampleTrains, 'delay');

// 按車次排序
const sortedByNo = TrainDataTransformer.sortTrains(sampleTrains, 'trainNo');


// ============================================================
// 🔟 驗證列車資料
// ============================================================

// 單一列車驗證
const valid = TrainDataTransformer.isValidTrain(sampleTrains[0]);
console.log(valid); // true

// 批量驗證
const validation = TrainDataTransformer.validateTrains(sampleTrains);
console.log(validation);
/*
{
    valid: [train1, train2, train3],   // 有效的列車
    invalid: []                         // 無效的列車
}
*/


// ============================================================
// 1️⃣1️⃣ 資料匯出
// ============================================================

// 導出為 CSV
const csv = TrainDataTransformer.exportToCSV(sampleTrains);
console.log(csv);
/*
"車次","車站","車種","方向","終點站","到站時間","離站時間","延誤(分)","更新時間"
"1288","基隆","區間","南下","終點","14:30:00","14:32:00","0","14:30:45"
...
*/

// 下載 CSV 檔案
TrainDataTransformer.downloadCSV(sampleTrains, 'trains_2025-11-02.csv');


// ============================================================
// 🔗 完整流程示例 - 整合到 train-liveboard.html
// ============================================================

/**
 * 修改後的 loadLiveboard 函數
 * 使用 TrainDataTransformer 進行資料處理
 */
async function improvedLoadLiveboard() {
    const tableBody = document.getElementById('trainTableBody');
    
    try {
        // 1. 從 API 取得列車資訊
        const endpoint = `/v2/Rail/TRA/LiveTrainInfo?$format=JSON`;
        const response = await tdxApi.fetch(endpoint);
        
        let allTrains = Array.isArray(response) ? response : [];

        // 2. 篩選當前車站的列車
        const stationTrains = allTrains.filter(train => {
            if (!train.StopStations || !Array.isArray(train.StopStations)) {
                return false;
            }
            return train.StopStations.some(stop => stop.StationID === currentStationId);
        });

        // 3. 驗證資料完整性
        const validation = TrainDataTransformer.validateTrains(stationTrains);
        console.log(`有效列車: ${validation.valid.length}, 無效列車: ${validation.invalid.length}`);

        // 4. 篩選 30 分鐘內的列車
        const recentTrains = TrainDataTransformer.filterRecentTrains(validation.valid, 30);

        // 5. 排序列車（按時間）
        const sortedTrains = TrainDataTransformer.sortTrains(recentTrains, 'time');

        // 6. 生成表格內容
        const rows = TrainDataTransformer.createTrainRows(sortedTrains);
        tableBody.innerHTML = rows;

        // 7. 更新統計資訊
        const stats = TrainDataTransformer.calculateStats(sortedTrains);
        document.getElementById('totalTrains').textContent = stats.total;
        document.getElementById('arrivalTrains').textContent = stats.arrival;
        document.getElementById('departureTrains').textContent = stats.departure;
        document.getElementById('delayedTrains').textContent = stats.delayed;

        // 8. 更新時間
        const updateTime = TrainDataTransformer.parseUpdateTime(new Date().toISOString());
        document.getElementById('updateTime').textContent = updateTime;

        // 9. 可選：導出 CSV（用於調試或備份）
        // TrainDataTransformer.downloadCSV(sortedTrains, `trains_${currentStationName}.csv`);

    } catch (error) {
        console.error('載入看板資料失敗:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>載入失敗: ${error.message}</p>
                </td>
            </tr>
        `;
    }
}


// ============================================================
// 🎯 高級用法 - 實時監控延誤列車
// ============================================================

/**
 * 監控延誤列車並發送通知
 */
class DelayMonitor {
    constructor(checkInterval = 120000) { // 預設 2 分鐘檢查一次
        this.checkInterval = checkInterval;
        this.lastDelayedTrains = [];
        this.interval = null;
    }

    /**
     * 啟動監控
     */
    start(trains, stationName) {
        this.interval = setInterval(() => {
            const currentDelayed = TrainDataTransformer.filterDelayedTrains(trains);
            
            // 檢測新的延誤列車
            const newDelays = currentDelayed.filter(train => 
                !this.lastDelayedTrains.find(t => t.TrainNo === train.TrainNo)
            );

            if (newDelays.length > 0) {
                this.notifyDelays(newDelays, stationName);
            }

            // 檢測已解除延誤的列車
            const resolved = this.lastDelayedTrains.filter(train =>
                !currentDelayed.find(t => t.TrainNo === train.TrainNo)
            );

            if (resolved.length > 0) {
                this.notifyResolved(resolved, stationName);
            }

            this.lastDelayedTrains = currentDelayed;
        }, this.checkInterval);
    }

    /**
     * 停止監控
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * 發送延誤通知
     */
    notifyDelays(trains, stationName) {
        trains.forEach(train => {
            const message = `
                🚨 【${stationName}】
                ${train.TrainNo} 號 ${TrainDataTransformer.getTrainTypeInfo(train.TrainTypeCode).name}
                延誤 ${train.DelayTime} 分鐘
            `;
            console.warn(message);
            
            // 可以接入通知系統（如 Telegram, Email 等）
            // this.sendNotification(message);
        });
    }

    /**
     * 發送解除通知
     */
    notifyResolved(trains, stationName) {
        trains.forEach(train => {
            const message = `
                ✅ 【${stationName}】
                ${train.TrainNo} 號已恢復正常
            `;
            console.info(message);
        });
    }
}

// 使用範例
// const monitor = new DelayMonitor(120000);
// monitor.start(sampleTrains, '基隆');


// ============================================================
// 📊 性能測試
// ============================================================

/**
 * 測試大量列車資料的處理效能
 */
function performanceBench() {
    // 生成 1000 筆列車資料
    const largeTrain = Array(1000).fill(null).map((_, i) => ({
        TrainNo: String(i + 1000),
        StationID: "0900",
        Direction: i % 2,
        TrainTypeCode: String(i % 6),
        DelayTime: Math.random() > 0.7 ? Math.floor(Math.random() * 30) : 0,
        ScheduledArrivalTime: `${String(Math.floor(i / 41) + 5).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}:00`,
        ScheduledDepartureTime: `${String(Math.floor(i / 41) + 5).padStart(2, '0')}:${String((i * 13 + 2) % 60).padStart(2, '0')}:00`,
        StationName: { Zh_tw: "基隆" },
        EndingStationName: { Zh_tw: "高雄" }
    }));

    console.time('calculateStats');
    const stats = TrainDataTransformer.calculateStats(largeTrain);
    console.timeEnd('calculateStats');
    console.log('統計結果:', stats);

    console.time('filterDelayedTrains');
    const delayed = TrainDataTransformer.filterDelayedTrains(largeTrain);
    console.timeEnd('filterDelayedTrains');

    console.time('sortTrains');
    const sorted = TrainDataTransformer.sortTrains(largeTrain, 'time');
    console.timeEnd('sortTrains');

    console.time('createTrainRows');
    const rows = TrainDataTransformer.createTrainRows(largeTrain.slice(0, 100));
    console.timeEnd('createTrainRows');
}

// performanceBench();

