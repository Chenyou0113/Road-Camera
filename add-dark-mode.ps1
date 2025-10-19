# 自動為所有 HTML 頁面添加深色模式支持
$pages = @(
    'expressway.html',
    'city.html',
    'water-resources.html',
    'soil-observation.html',
    'air-quality.html',
    'debris-flow.html',
    'landslide-monitoring.html',
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
)

$darkModeCSSLink = '    <link rel="stylesheet" href="assets/dark-mode.css">'
$darkModeJSScript = '    <script src="assets/dark-mode.js"></script>'

$successCount = 0
$skipCount = 0
$errorCount = 0

Write-Host "🚀 開始為頁面添加深色模式支持...`n" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray

foreach ($page in $pages) {
    $filePath = Join-Path $PSScriptRoot $page
    
    if (-not (Test-Path $filePath)) {
        Write-Host "⚠️  $page 不存在，跳過`n" -ForegroundColor Yellow
        $skipCount++
        continue
    }
    
    try {
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8
        $modified = $false
        
        # 檢查是否已經引用了深色模式文件
        if ($content -match 'dark-mode\.css') {
            Write-Host "✓ $page 已有深色模式 CSS" -ForegroundColor Green
        } else {
            $content = $content -replace '</head>', "$darkModeCSSLink`n</head>"
            $modified = $true
            Write-Host "+ 已添加深色模式 CSS 到 $page" -ForegroundColor Cyan
        }
        
        if ($content -match 'dark-mode\.js') {
            Write-Host "✓ $page 已有深色模式 JS" -ForegroundColor Green
        } else {
            $content = $content -replace '</body>', "$darkModeJSScript`n</body>"
            $modified = $true
            Write-Host "+ 已添加深色模式 JS 到 $page" -ForegroundColor Cyan
        }
        
        if ($modified) {
            $content | Out-File -FilePath $filePath -Encoding UTF8 -NoNewline
            Write-Host "✅ $page 更新完成`n" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "⏭️  $page 無需更新`n" -ForegroundColor Gray
            $skipCount++
        }
    } catch {
        Write-Host "❌ 處理 $page 時發生錯誤: $_`n" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ("=" * 60) -ForegroundColor Gray
Write-Host "`n📊 處理結果統計：" -ForegroundColor Cyan
Write-Host "✅ 成功更新：$successCount 個頁面" -ForegroundColor Green
Write-Host "⏭️  跳過：$skipCount 個頁面" -ForegroundColor Gray
Write-Host "❌ 錯誤：$errorCount 個頁面" -ForegroundColor Red
Write-Host "`n🎉 深色模式添加完成！" -ForegroundColor Green
