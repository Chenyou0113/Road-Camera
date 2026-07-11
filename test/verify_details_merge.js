const fs = require('fs');
const path = require('path');

try {
    console.log('🧪 開始進行車站等級與聯絡資訊合併測試...');

    // 1. 載入 station-code-mapping.js
    const mappingPath = path.join(__dirname, '../assets/station-code-mapping.js');
    const mappingCode = fs.readFileSync(mappingPath, 'utf8');
    
    // 用簡單的 eval 或封裝成函數獲取 stationDataMap
    // 這裡我們把程式碼中的 "const stationDataMap = {" 改寫成一個 sandbox 能讀取的形式
    const sandbox = {};
    const wrappedCode = `(function() {
        var stationDataMap;
        ${mappingCode.replace('const stationDataMap =', 'stationDataMap = sandbox.stationDataMap =')}
    })()`;
    eval(wrappedCode);

    const stationDataMap = sandbox.stationDataMap;
    if (!stationDataMap) {
        throw new Error('❌ 無法從 station-code-mapping.js 解析出 stationDataMap');
    }
    console.log(`✅ 已載入 station-code-mapping.js，共 ${Object.keys(stationDataMap).length} 個車站。`);

    // 2. 載入 train-station-details.json
    const detailsPath = path.join(__dirname, '../assets/train-station-details.json');
    if (!fs.existsSync(detailsPath)) {
        throw new Error('❌ assets/train-station-details.json 檔案不存在！');
    }
    const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
    console.log(`✅ 已載入 train-station-details.json，共 ${Object.keys(details).length} 筆詳細資料。`);

    // 3. 模擬前端合併邏輯
    Object.entries(details).forEach(([sid, info]) => {
        if (stationDataMap[sid]) {
            stationDataMap[sid].class = info.class;
            stationDataMap[sid].address = info.address;
            stationDataMap[sid].phone = info.phone;
        }
    });
    console.log('✅ 已完成資料合併模擬。');

    // 4. 驗證特定車站的合併結果
    const testCases = [
        { id: '0900', name: '基隆', expectedClass: '1', expectedPhone: '02-24263743' },
        { id: '0910', name: '三坑', expectedClass: '4', expectedPhone: '02-24230289' },
        { id: '1000', name: '臺北', expectedClass: '0', expectedPhone: '02-23713558' },
        { id: '0920', name: '八堵', expectedClass: '2', expectedPhone: '02-24560841' }
    ];

    let passed = true;
    testCases.forEach(tc => {
        const station = stationDataMap[tc.id];
        if (!station) {
            console.error(`❌ 測試失敗: stationDataMap 中找不到車站 ${tc.name} (${tc.id})`);
            passed = false;
            return;
        }

        console.log(`\n🔍 檢查車站: ${tc.name} (${tc.id})`);
        console.log(`   - 等級: 實際 = "${station.class}", 預期 = "${tc.expectedClass}"`);
        console.log(`   - 電話: 實際 = "${station.phone}", 預期 = "${tc.expectedPhone}"`);
        console.log(`   - 地址: "${station.address}"`);

        if (station.class !== tc.expectedClass) {
            console.error(`   ❌ 等級不相符！`);
            passed = false;
        }
        if (station.phone !== tc.expectedPhone) {
            console.error(`   ❌ 電話不相符！`);
            passed = false;
        }
        if (!station.address) {
            console.error(`   ❌ 地址為空！`);
            passed = false;
        }
    });

    if (passed) {
        console.log('\n🎉 所有測試案例皆通過！車站等級與聯絡資訊合併邏輯正確。');
        process.exit(0);
    } else {
        console.error('\n❌ 部份測試案例失敗，請檢查資料或邏輯。');
        process.exit(1);
    }

} catch (err) {
    console.error('❌ 測試過程中發生異常錯誤:', err);
    process.exit(1);
}
