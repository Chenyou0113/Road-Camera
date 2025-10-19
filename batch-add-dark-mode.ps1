# 批次為所有主要頁面添加深色模式
$pages = @(
    'city.html',
    'water-resources.html',
    'soil-observation.html',
    'air-quality.html',
    'debris-flow.html',
    'landslide-monitoring.html'
)

$cssLink = '    <link rel="stylesheet" href="assets/dark-mode.css">'
$jsScript = '    <script src="assets/dark-mode.js"></script>'

Write-Host "開始為主要頁面添加深色模式...`n" -ForegroundColor Cyan

foreach ($page in $pages) {
    $filePath = Join-Path $PSScriptRoot $page
    
    if (-not (Test-Path $filePath)) {
        Write-Host "跳過 $page (檔案不存在)" -ForegroundColor Yellow
        continue
    }
    
    try {
        $content = Get-Content -Path $filePath -Raw -Encoding UTF8
        $modified = $false
        
        # 檢查並添加 CSS
        if ($content -notmatch 'dark-mode\.css') {
            $content = $content -replace '(<link[^>]*font-awesome[^>]*>)', "`$1`n$cssLink"
            $modified = $true
            Write-Host "✓ 已添加深色模式 CSS 到 $page" -ForegroundColor Green
        }
        
        # 檢查並添加 JS
        if ($content -notmatch 'dark-mode\.js') {
            $content = $content -replace '(</body>)', "$jsScript`n`$1"
            $modified = $true
            Write-Host "✓ 已添加深色模式 JS 到 $page" -ForegroundColor Green
        }
        
        if ($modified) {
            $content | Out-File -FilePath $filePath -Encoding UTF8 -NoNewline
            Write-Host "✅ $page 更新完成`n" -ForegroundColor Green
        } else {
            Write-Host "⏭️  $page 已有深色模式`n" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ 處理 $page 時發生錯誤: $_`n" -ForegroundColor Red
    }
}

Write-Host "`n🎉 批次處理完成！" -ForegroundColor Green
