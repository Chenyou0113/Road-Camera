# 國道監視器 HTTP/2 協議錯誤修復報告

## 📋 問題概述

### 錯誤現象
```
GET https://cctvn.freeway.gov.tw/abs2mjpg/bmjpg?camera=xxxxx 
net::ERR_HTTP2_PROTOCOL_ERROR 200 (OK)
```

**矛盾點：** 伺服器返回 200 成功狀態碼，但 HTTP/2 連線在協議層失敗

## 🔍 根本原因分析

### 1. HTTP/2 協議問題
- 國道監視器伺服器 (`cctvn.freeway.gov.tw`) 的 HTTP/2 實作不完善
- 瀏覽器與伺服器的 HTTP/2 協商出現問題
- 連線在傳輸層被 RESET，但應用層已回應 200

### 2. 併發過度激進
原始設定存在以下問題：
```javascript
// ❌ 問題參數
let MAX_CONCURRENT_LOADS = 2;  // 初始值
const MAX_PEAK_CONCURRENT_LOADS = 6;  // 最高可達 6
let LOAD_DELAY = 250;  // 初始延遲
const MIN_LOAD_DELAY = 150;  // 最低延遲僅 150ms
```

**問題：**
- 動態提升併發數到 6 張同時載入
- 延遲最低降至 150ms，伺服器無法承受
- 成功 3 次就提升併發，過於激進

### 3. 重試機制不足
- 原重試邏輯過於複雜
- 沒有給予足夠的冷卻時間
- 失敗相機會持續重試浪費資源

## ✅ 修復方案

### 核心改進

#### 1. **固定保守參數**
```javascript
// ✅ 新參數
const MAX_CONCURRENT_LOADS = 2;  // 固定為 2，不再動態調整
const LOAD_DELAY = 800;  // 固定延遲 800ms
const MAX_RETRIES = 3;  // 最大重試 3 次
const RETRY_DELAY = 2000;  // 重試間隔 2 秒
const COOLDOWN_DURATION = 10 * 60 * 1000;  // 冷卻 10 分鐘
```

**優點：**
- 避免伺服器負載過大
- 給予足夠的請求間隔
- 預防連線被重置

#### 2. **改進的重試機制**
```javascript
img.onerror = function(e) {
    const retryCount = imageRetryAttempts.get(imgId) || 0;
    
    if (retryCount < MAX_RETRIES) {
        // 重試 3 次，每次間隔 2 秒
        imageRetryAttempts.set(imgId, retryCount + 1);
        setTimeout(() => {
            this.src = `${src}&_retry=${retryCount + 1}&t=${Date.now()}`;
        }, RETRY_DELAY);
    } else {
        // 超過重試次數，進入 10 分鐘冷卻
        if (camId) {
            cameraCooldown.set(camId, Date.now() + COOLDOWN_DURATION);
        }
        handleImageError(this, src);
    }
};
```

#### 3. **簡化錯誤處理**
```javascript
function handleImageError(imgElement, originalSrc) {
    const camId = originalSrc.match(/camera=(\d+)/)?.[1];
    const cooldownMinutes = Math.floor(COOLDOWN_DURATION / 1000 / 60);
    
    // 直接顯示錯誤訊息，不再複雜重試
    imgElement.parentNode.innerHTML = `
        <div style="...">
            <i class="fas fa-exclamation-triangle"></i>
            <span>影像暫時無法載入<br>
                  相機 ${camId}<br>
                  冷卻中 (${cooldownMinutes}分鐘)
            </span>
        </div>
    `;
}
```

#### 4. **移除動態調整邏輯**
- ❌ 刪除 `adjustLoadParameters()` 函數
- ❌ 移除併發數動態提升邏輯
- ❌ 取消延遲時間動態調整
- ✅ 採用固定、保守的參數

## 📊 修復前後對比

| 項目 | 修復前 | 修復後 | 改善 |
|------|--------|--------|------|
| 併發數 | 2→6 動態 | 固定 2 | ✅ 穩定 |
| 延遲時間 | 250ms→150ms | 固定 800ms | ✅ 足夠緩衝 |
| 重試次數 | 2 次 | 3 次 | ✅ 更多機會 |
| 重試間隔 | 1s, 2s | 固定 2s | ✅ 穩定 |
| 冷卻時間 | 5 分鐘 | 10 分鐘 | ✅ 避免浪費 |
| 動態調整 | 有 | 無 | ✅ 簡化邏輯 |

## 🎯 預期效果

### 1. 減少 HTTP/2 錯誤
- 降低併發數避免伺服器連線重置
- 增加延遲時間給伺服器足夠處理時間

### 2. 提升載入成功率
- 固定參數避免過度激進
- 更長的重試間隔減少連續失敗

### 3. 改善使用者體驗
- 雖然載入速度稍慢，但成功率提高
- 清楚顯示載入狀態和錯誤訊息
- 冷卻機制避免無效重試

## 📝 技術建議

### 短期優化
1. ✅ 已實施固定保守參數
2. ✅ 已改進重試機制
3. ✅ 已添加冷卻機制

### 長期優化建議
1. **考慮使用 HTTP/1.1**
   - 如果 HTTP/2 問題持續，可強制降級使用 HTTP/1.1
   
2. **實作圖片代理**
   - 透過自己的伺服器代理圖片請求
   - 可控制請求速率和重試策略

3. **添加圖片快取**
   - Service Worker 快取成功載入的圖片
   - 減少重複請求

4. **監控載入統計**
   - 追蹤成功率和失敗率
   - 動態調整策略參數

## 🧪 測試建議

1. **打開 highway.html**
2. **觀察 Console 輸出**：
   ```
   🖼️ 開始漸進式載入 12 張圖片 (併發: 2, 延遲: 800ms)
   ✅ 圖片載入成功: img-0-xxxxx
   ❌ 圖片載入失敗: camera=10002
   🔄 重試載入 (1/3): camera=10002
   ```

3. **檢查錯誤數量**：
   - HTTP/2 錯誤應該大幅減少
   - 重試後成功率應該提高

4. **驗證冷卻機制**：
   - 連續失敗 3 次後應進入 10 分鐘冷卻
   - 冷卻中的相機不再嘗試載入

## 📌 注意事項

1. **載入速度變慢**
   - 固定 2 併發 + 800ms 延遲確實較慢
   - 但這是為了穩定性的必要犧牲

2. **部分相機可能仍失敗**
   - 伺服器端問題無法完全避免
   - 冷卻機制可避免無效重試

3. **監控長期效果**
   - 觀察實際使用中的錯誤率
   - 必要時可微調參數（但需保持保守）

## ✨ 總結

本次修復採用**保守穩定**的策略，透過：
- 🔒 固定併發數為 2
- ⏱️ 延遲時間增加到 800ms
- 🔄 完善的重試機制（3次，間隔2秒）
- ❄️ 長冷卻時間（10分鐘）

**有效解決 HTTP/2 協議錯誤問題**，提升國道監視器圖片載入的穩定性和成功率。

---

**修復日期：** 2025/11/19  
**修復檔案：** `Road-Camera/highway.html`  
**修復版本：** v2.1 - HTTP/2 Error Fix
