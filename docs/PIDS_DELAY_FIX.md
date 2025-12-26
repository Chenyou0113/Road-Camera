# 🚂 PIDS 誤點顯示修復指南

## 問題描述
PIDS 系統只顯示「準點」，即使列車有誤點也不會顯示延遲時間。

## 原因分析
後端 Worker 回傳的欄位名稱是 `DelayTime`，但前端讀取的是 `Delay`，導致欄位不匹配。

## 🔧 修復方案

### 修改 1：renderScreen 函式（列表顯示）

找到 `function renderScreen` 並修改誤點處理邏輯：

```javascript
function renderScreen(dirCode, trains, dirName) {
    const tbody = document.getElementById(`body${dirCode}`);
    const destLabel = document.getElementById(`dest${dirCode}`);
    tbody.innerHTML = '';
    destLabel.textContent = generateDirectionTitle(trains, dirName === '逆行' ? '北上' : '南下');

    const maxRows = 6;
    trains.forEach((train, index) => {
        // 🔥 修改：同時檢查 DelayTime 和 Delay 欄位
        const delay = parseInt(train.DelayTime || train.Delay || 0);
        
        let delayText = '準點';
        let statusClass = 'status-ontime';

        if (delay > 0) {
            delayText = `晚 ${delay} 分`;
            statusClass = 'status-delay'; // 紅色 + 閃爍
        }

        const trainInfo = getTrainDisplayInfo(train);
        const row = document.createElement('tr');
        if (index === 0) row.classList.add('highlight-row');
        
        const timeStr = formatTime(train.ScheduledDepartureTime);

        row.innerHTML = `
            <td style="color:#fff; font-family:Consolas;">${train.TrainNo}</td>
            <td><span class="train-type-badge type-${trainInfo.class}">${trainInfo.name}</span></td>
            <td style="color:#fff;">${train.EndingStationName}</td>
            <td style="color:#fff; font-family:Consolas;">${timeStr}</td>
            <td class="${statusClass}">${delayText}</td>
        `;
        tbody.appendChild(row);
    });
    
    // 補空行...
}
```

### 修改 2：updateBottomMarquee 函式（跑馬燈顯示）

找到 `function updateBottomMarquee` 並修改：

```javascript
async function updateBottomMarquee(elementId, trains, customMsg, currentStationID) {
    const marqueeText = document.getElementById(elementId);
    let textHTML = '';

    if (customMsg) {
        textHTML = customMsg;
    } else if (!trains || trains.length === 0) {
        textHTML = "目前無列車資訊";
    } else {
        const train = trains[0];
        const trainNo = train.TrainNo;
        const trainInfo = getTrainDisplayInfo(train);
        
        // 🔥 修改：同時檢查 DelayTime 和 Delay
        const delayTime = parseInt(train.DelayTime || train.Delay || 0);
        
        // ... 中間時刻表查詢邏輯 ...
        
        if (stopTimes && stopTimes.length > 0) {
            const currentStationIndex = stopTimes.findIndex(s => 
                s.StationID === currentStationID || s.StationName === currentStationName
            );
            
            if (currentStationIndex !== -1) {
                const tableTime = stopTimes[currentStationIndex].DepartureTime || 
                                stopTimes[currentStationIndex].ArrivalTime;
                
                // 🔥 使用 delayTime 計算預計時間
                const predictedTime = addMinutesToTime(tableTime, delayTime);
                const timeColor = delayTime > 0 ? '#ff5252' : '#00e676';
                
                if (delayTime > 0) {
                    textHTML += `本站預計：<span style="color: ${timeColor}; font-weight:bold; font-size: 1.1em;">${predictedTime} 抵達 (晚 ${delayTime} 分)</span>`;
                } else {
                    textHTML += `本站預計：<span style="color: ${timeColor}; font-weight:bold; font-size: 1.1em;">${predictedTime} 抵達 (準點)</span>`;
                }
            }
        }
    }
    
    marqueeText.innerHTML = textHTML;
}
```

## ✅ 驗證步驟

1. 修改完成後，重新整理 `pids-live.html`
2. 按 F12 開啟開發者工具
3. 切換到 **Network** 分頁
4. 找到 `station?station=...` 請求
5. 查看 **Response** 內容
6. 確認有 `"DelayTime": 數字` 或 `"Delay": 數字` 欄位
7. 檢查畫面是否正確顯示誤點資訊

## 🎯 預期效果

### 有誤點時
- 列表顯示：紅色「晚 5 分」並閃爍
- 跑馬燈：紅色預計時間 + 「(晚 5 分)」

### 準點時
- 列表顯示：綠色「準點」
- 跑馬燈：綠色預計時間 + 「(準點)」

## 📊 欄位相容性

此修復同時支援：
- `DelayTime` (TDX 標準格式)
- `Delay` (舊版相容格式)
- 預設值 `0` (無資料時)

## 🔍 除錯技巧

如果修改後仍顯示「準點」：

1. **檢查 Worker 回傳資料**
   ```javascript
   console.log('Train data:', train);
   console.log('Delay value:', train.DelayTime, train.Delay);
   ```

2. **確認資料型別**
   ```javascript
   const delay = parseInt(train.DelayTime || train.Delay || 0);
   console.log('Parsed delay:', delay, typeof delay);
   ```

3. **檢查 CSS 樣式**
   確認 `.status-delay` 和 `.status-ontime` 樣式已定義

---

📝 **更新日期**：2025/12/01  
🔧 **適用版本**：pids-live.html  
👤 **維護者**：BAILUCODE AI IDE
