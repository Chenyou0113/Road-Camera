# 省道監視器修正報告

## 問題描述
省道監視器頁面 (`road.html`) 顯示標題為「省道監視器」，但實際顯示的是國道監視器資料（CCTV-N1-S-0.000-M 等），頁面內容與標題不符。

## 根本原因
原始程式碼使用了 TDX Highway API endpoint (`/v2/Road/Traffic/CCTV/Highway`)，該端點包含所有道路類型的監視器資料，包括國道、省道和快速道路，但篩選邏輯不夠精確，導致國道資料也被顯示。

## 解決方案

### 1. 改進篩選邏輯
新增了專門的 `isProvincialRoad()` 函數，更精確地識別省道：

```javascript
function isProvincialRoad(camera) {
    const roadName = camera.RoadName || '';
    const locationDesc = camera.LocationDescription || '';
    const cctvId = camera.CCTVID || '';
    const allText = `${roadName} ${locationDesc}`;
    
    // 排除國道（編號以 CCTV-N 開頭）
    if (cctvId.startsWith('CCTV-N')) {
        return false;
    }
    
    // 排除明確標示為國道的
    if (allText.includes('國道')) {
        return false;
    }
    
    // 匹配省道格式：台1線、台9甲線等
    const match = allText.match(/[台臺](\d+)([甲乙丙丁]?)線?/);
    if (match) {
        const roadNum = parseInt(match[1]);
        const roadCode = `台${match[1]}`;
        
        // 排除快速道路
        if (EXPRESSWAYS.includes(roadCode)) {
            return false;
        }
        
        // 省道通常編號在 1-200 範圍內
        if (roadNum >= 1 && roadNum <= 200) {
            return true;
        }
    }
    
    return false;
}
```

### 2. 篩選規則
- **排除國道**: CCTV ID 以 "CCTV-N" 開頭的監視器
- **排除快速道路**: 台61、台62、台74等快速道路
- **保留省道**: 台1線到台200線範圍內的省道
- **支援支線**: 台3甲、台9乙等支線道路

### 3. 更新資料處理流程
```javascript
if (cameras.length > 0) {
    // 篩選並處理省道監視器資料
    allCamerasFromSources = cameras
        .filter(camera => isProvincialRoad(camera)) // 只保留省道
        .map(camera => {
            const roadNumber = extractroadNumber(camera);
            return {...camera, source: 'tdx', RoadNumber: roadNumber || camera.RoadName || '省道'};
        })
        .filter(camera => camera.RoadNumber); // 只保留有道路編號的
}
```

## 測試工具

### 1. 省道篩選邏輯測試 (`filter-logic-test.html`)
- 測試各種監視器資料的篩選邏輯
- 驗證國道、省道、快速道路的正確分類
- 提供測試結果統計

### 2. 省道API測試 (`provincial-test.html`)
- 測試不同API端點的可用性
- 驗證資料格式和內容
- 提供API響應分析

## 預期結果
修正後的省道監視器頁面應該：
1. ✅ 只顯示省道監視器（台1線、台9線等）
2. ✅ 排除所有國道監視器（國道1號、國道3號等）
3. ✅ 排除快速道路監視器（台61線、台74線等）
4. ✅ 保持原有的里程排序和方向篩選功能
5. ✅ 維持K+格式的里程顯示和地標資訊

## 驗證方法
1. 開啟 `road.html` 頁面
2. 檢查顯示的監視器編號不應包含 "CCTV-N" 格式
3. 確認道路名稱為台X線格式，而非國道X號
4. 使用測試工具驗證篩選邏輯正確性

## 檔案異動清單
- `road.html`: 更新篩選邏輯和資料處理流程
- `filter-logic-test.html`: 新增篩選邏輯測試頁面
- `provincial-test.html`: 新增API測試頁面
- `system-status.html`: 新增測試工具連結

---
*修正時間: 2025年10月21日*
*版本: v1.1*