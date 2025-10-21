// 自動為所有 HTML 頁面添加深色模式支持
const fs = require('fs');
const path = require('path');

// 需要添加深色模式的頁面列表（排除已有深色模式的頁面）
const pagesWithoutDarkMode = [
    'expressway.html',
    'city.html',
    'water-resources.html',
    'soil-observation.html',
    'air-quality.html',
    'debris-flow.html',
    'landslide-monitoring.html',
    // 測試頁面
    'water-test.html',
    'city-validation.html',
    'air-quality-test.html',
    'api-test-chiayi-yilan.html',
    'water-data-validator.html',
    'debris-test.html',
    'soil-observation-test.html',
    'air-quality-clean.html',
    'air-quality-diagnosis.html',
    'test-api.html',
    'soil-observation-fixed.html',
    'air-quality-debug.html',
    'quick-check.html',
    'coordinate-test.html',
    'tdx-test.html',
    'debug-classification.html',
    'test.html',
    'image-test.html'
];

// 深色模式 CSS 引用
const darkModeCSSLink = '    <link rel="stylesheet" href="assets/dark-mode.css">';

// 深色模式 JS 引用
const darkModeJSScript = '    <script src="assets/dark-mode.js"></script>';

function addDarkModeToPage(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // 檢查是否已經引用了深色模式文件
        if (content.includes('dark-mode.css')) {
            console.log(`✓ ${path.basename(filePath)} 已有深色模式 CSS`);
        } else {
            // 在 </head> 前添加 CSS 引用
            content = content.replace('</head>', `${darkModeCSSLink}\n</head>`);
            modified = true;
            console.log(`+ 已添加深色模式 CSS 到 ${path.basename(filePath)}`);
        }

        if (content.includes('dark-mode.js')) {
            console.log(`✓ ${path.basename(filePath)} 已有深色模式 JS`);
        } else {
            // 在 </body> 前添加 JS 引用
            content = content.replace('</body>', `${darkModeJSScript}\n</body>`);
            modified = true;
            console.log(`+ 已添加深色模式 JS 到 ${path.basename(filePath)}`);
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${path.basename(filePath)} 更新完成\n`);
            return true;
        } else {
            console.log(`⏭️  ${path.basename(filePath)} 無需更新\n`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 處理 ${filePath} 時發生錯誤:`, error.message);
        return false;
    }
}

// 主程序
console.log('🚀 開始為頁面添加深色模式支持...\n');
console.log('=' .repeat(60));

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

pagesWithoutDarkMode.forEach(page => {
    const filePath = path.join(__dirname, page);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${page} 不存在，跳過\n`);
        skipCount++;
        return;
    }

    const result = addDarkModeToPage(filePath);
    if (result) {
        successCount++;
    } else {
        skipCount++;
    }
});

console.log('=' .repeat(60));
console.log('\n📊 處理結果統計：');
console.log(`✅ 成功更新：${successCount} 個頁面`);
console.log(`⏭️  跳過：${skipCount} 個頁面`);
console.log(`❌ 錯誤：${errorCount} 個頁面`);
console.log('\n🎉 深色模式添加完成！');
