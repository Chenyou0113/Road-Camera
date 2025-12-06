# 停駛列車狀態處理實現報告

**完成日期**: 2024年12月7日  
**狀態**: ✅ 完全實現

## 實現概要

成功為兩個 PIDS 顯示檔案（tra_liveboard.html 和 tra-pids.html）添加全面的停駛列車狀態處理。

---

## 修改詳情

### 1. CSS 樣式添加 ✅

#### tra_liveboard.html (第~210行)
```css
.status-cancelled { background-color: #212121; color: #FF5252; border: 1px solid #FF5252; }
.train-cancelled-row { opacity: 0.6; filter: grayscale(100%); background-color: #1a1a1a !important; }
```

#### tra-pids.html (第247-248行)
```css
.status-cancelled { background-color: #212121; color: #FF5252; border: 1px solid #FF5252; padding: 2px 6px; border-radius: 3px; }
.train-cancelled-row { opacity: 0.6; filter: grayscale(100%); background-color: #1a1a1a !important; }
```

**效果**:
- 停駛列車顯示紅色警告徽章 (#FF5252)
- 整行列車卡片變為灰度 (grayscale) + 半透明 (opacity 0.6)
- 深色背景 (#1a1a1a) 視覺上進一步突出不同狀態

---

### 2. 延遲狀態偵測函數修改 ✅

#### tra_liveboard.html - getDelayStatus() (第845-858行)
```javascript
function getDelayStatus(train) {
    // 停駛狀態優先檢查
    if (String(train.TrainStatus) === '2' || train.TrainStatus === 2) {
        return '<span class="delay-badge status-cancelled"><i class="fas fa-ban"></i> 停駛</span>';
    }
    // 明日班次檢查
    if (train.IsTomorrow) {
        return '<span class="delay-badge" ...>未發車</span>';
    }
    const d = parseInt(train.DelayTime || 0);
    if (d === 0) return '<span class="delay-badge delay-ok">準點</span>';
    return `<span class="delay-badge delay-warn">晚 ${d} 分</span>`;
}
```

**邏輯流程**:
1. **第一優先**：檢查 `TrainStatus === 2` → 返回"停駛"
2. 第二優先：檢查 `IsTomorrow` → 返回"未發車"
3. 第三優先：檢查延遲時間 → 返回"準點"或"晚 X 分"

**防止誤判**: 停駛列車不會因 DelayTime=0 而顯示為"準點"

---

### 3. 排序邏輯修正 ✅

#### tra_liveboard.html - renderBoard() 排序部分 (第745-757行)
```javascript
// 2. 加上誤點時間（停駛列車不計算誤點）
const isCancelled = (String(t.TrainStatus) === '2' || t.TrainStatus === 2);
if (!isCancelled) {
    mins += parseInt(t.DelayTime || 0);
}
```

**效果**:
- 停駛列車 (TrainStatus=2) **不加入延遲時間權重**
- 保持原表定時間進行排序
- 避免停駛列車被誤排到延遲列車上方

**Example**:
- 08:00 停駛列車 → 排序權重: 480 分 (表定時間)
- 08:10 延遲30分列車 → 排序權重: 490 + 30 = 520 分
- **結果**: 08:00 停駛 排在 08:10 延遲30 之上 ✅

---

### 4. tra-pids.html renderScreen() 修改 ✅

#### 偵測與視覺化 (第749-769行)
```javascript
const isCancelled = (String(train.TrainStatus) === '2' || train.TrainStatus === 2);
const delay = parseInt(train.DelayTime || train.Delay || 0);
let delayText = '準點';
let statusClass = 'status-ontime';

if (isCancelled) {
    delayText = '停駛';
    statusClass = 'status-cancelled';
} else if (train.IsTomorrow) {
    delayText = '未發車';
    statusClass = 'status-future';
} else if (delay > 0) {
    delayText = `晚 ${delay} 分`;
    statusClass = 'status-delay';
}
// ...
if (isCancelled) row.classList.add('train-cancelled-row');
```

**顯示效果**:
- 停駛列車在 PIDS 表格中顯示為灰度 + 半透明
- 狀態欄位顯示"停駛"（紅色徽章）
- 首班車即使停駛也不會受到 highlight-row 的干擾

---

### 5. 底部跑馬燈特殊處理 ✅

#### tra-pids.html - updateBottomMarquee() (第820-826行)
```javascript
const isCancelled = (String(train.TrainStatus) === '2' || train.TrainStatus === 2);
// ...
if (isCancelled) {
    textHTML = `<span style="color: #ff5252; font-weight:bold; font-size: 1.1em;">
        🚫 ${trainNo} 次 往 ${train.EndingStationName} 本日停駛
    </span> ... 請改搭其他班次列車`;
} else {
    // 正常的位置/延遲訊息處理
    // ...
}
```

**效果**:
- 當下一班車為停駛時，提前返回警告訊息
- 避免查詢不必要的即時位置資料
- 乘客立即看到警告，能更快改搭其他班次

**警告訊息格式**: `🚫 1234 次 往 高雄 本日停駛 | 請改搭其他班次列車`

---

## 完整流程驗證

### 情境 1: 大規模延誤 + 停駛列車混合
```
表定   停駛/延誤  顯示
08:00  停駛  →  排序權重 480, 顯示灰色"停駛"
08:10  延30  →  排序權重 520, 顯示紅色"晚30分"
08:20  延45  →  排序權重 545, 顯示紅色"晚45分"
08:30  準點  →  排序權重 510, 顯示綠色"準點"

排序結果 (正確):
1. 08:00 停駛 (480) [灰色]
2. 08:30 準點 (510) [綠色]
3. 08:10 延30 (520) [紅色]
4. 08:20 延45 (545) [紅色]
```

### 情境 2: 凌晨首班車停駛
```
表定   停駛/延誤  顯示
23:50  延10  →  排序權重 1430 + 10 = 1440, 顯示"晚10分"
00:10  停駛  →  排序權重 10 + 1440 = 1450, 顯示灰色"停駛"

排序結果 (正確):
1. 23:50 延10 (1440) [紅色]
2. 00:10 停駛 (1450) [灰色]
```

---

## 代碼更改統計

| 檔案 | 修改位置 | 修改內容 |
|------|---------|--------|
| tra_liveboard.html | L209-210 | +2 行 CSS 樣式 |
| tra_liveboard.html | L845-858 | 修改 getDelayStatus() +停駛檢查 |
| tra_liveboard.html | L750-754 | 修改排序邏輯 +停駛排除 |
| tra_liveboard.html | L795-796 | 修改列車卡片 +CSS 類別條件 |
| tra-pids.html | L247-248 | +2 行 CSS 樣式 |
| tra-pids.html | L749-769 | 修改 renderScreen() +停駛處理 |
| tra-pids.html | L820-826 | 修改 updateBottomMarquee() +停駛警告 |

**總計**: 7 個檔案位置，~25 行代碼修改/新增

---

## 測試場景

### ✅ 已實現並驗證的場景

1. **單一停駛列車**
   - 顯示灰度 + "停駛" 徽章
   - 不影響排序邏輯

2. **大規模停駛 + 延誤混合** (用戶最關心)
   - 停駛列車不參與誤點時間計算
   - 表定時間在前的停駛車排在延遲車上方
   - 視覺區分明確

3. **跨日邊界 + 停駛**
   - 00:10 停駛 + 23:50 延誤 → 正確排序
   - 凌晨時段偵測不受影響

4. **PIDS 首班車停駛**
   - 首班車即使停駛也保持為首行
   - 底部跑馬燈顯示"本日停駛"警告
   - 不會查詢即時位置數據

5. **Liveboard 停駛列車篩選**
   - 南下/北上篩選正常工作
   - 停駛列車卡片視覺不同但可點擊查詢

---

## 設計決策說明

### 為什麼停駛列車保持表定時間順序？
- **乘客心智模型**: 乘客按表定時間尋找班次，停駛列車應在原時間位置顯示
- **視覺區分足夠**: 灰度 + "停駛" 徽章已經明確表達不可搭乘
- **避免混亂**: 如果停駛列車排到最後，乘客容易遺漏

### 為什麼停駛檢查在 IsTomorrow 之前？
- **優先級合理**: 停駛是"列車不運作"，比"明日班次"更重要
- **誤判防止**: DelayTime=0 的停駛列車不會被誤判為"準點"

### 為什麼底部跑馬燈要特別處理停駛？
- **性能考慮**: 停駛列車無需查詢即時位置/停靠站資料
- **用戶體驗**: 直接看到警告，不需等待 API 回應

---

## 向後兼容性

✅ **完全兼容**:
- 所有修改都是防守式的 (`String(train.TrainStatus) === '2' || train.TrainStatus === 2`)
- 不修改 API 響應格式
- 不添加必需的新欄位
- 舊的列車數據 (無 TrainStatus) 會被視為正常運作列車

---

## 部署檢查清單

- [x] 兩個檔案無 JavaScript 語法錯誤
- [x] TrainStatus 欄位檢查使用防守式編程
- [x] CSS 樣式完整且不影響現有元素
- [x] 排序邏輯經過跨日邊界驗證
- [x] 底部跑馬燈條件分支正確關閉
- [x] 視覺設計與現有配色方案一致

---

## 後續建議

1. **監控 API 響應**: 確認 TRA Worker 是否正確返回 TrainStatus 欄位
2. **大規模災害測試**: 在實際颱風/地震場景下驗證顯示效果
3. **無障礙檢查**: 確認灰度視覺對色盲用戶的影響
4. **前端效能**: 檢查大量停駛列車對 DOM 操作的影響

---

**最後更新**: 2024年12月7日  
**開發者**: GitHub Copilot  
**版本**: 1.0 完全實現版本
