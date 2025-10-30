# 批量更新所有頁面為現代化設計
# 此腳本會在每個 HTML 頁面的 head 中添加 modern-theme.css

$pages = @(
    "highway.html",
    "expressway.html", 
    "road.html",
    "city.html",
    "train-liveboard.html",
    "metro-liveboard.html",
    "water-resources.html",
    "river-monitoring.html",
    "soil-observation.html",
    "air-quality.html",
    "debris-flow.html",
    "landslide-monitoring.html",
    "dashboard.html"
)

Write-Host "開始更新頁面設計..." -ForegroundColor Green
Write-Host "=" * 50

foreach ($page in $pages) {
    $filePath = Join-Path $PSScriptRoot "..\$page"
    
    if (Test-Path $filePath) {
        Write-Host "處理: $page" -ForegroundColor Cyan
        
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # 檢查是否已經包含 modern-theme.css
        if ($content -notmatch 'modern-theme\.css') {
            # 在 </head> 之前插入 modern-theme.css 連結
            $modernThemeLink = '    <link rel="stylesheet" href="assets/modern-theme.css">'
            $content = $content -replace '</head>', "$modernThemeLink`n</head>"
            
            # 保存文件
            Set-Content $filePath $content -Encoding UTF8 -NoNewline
            Write-Host "  ✓ 已添加 modern-theme.css" -ForegroundColor Green
        } else {
            Write-Host "  - 已包含 modern-theme.css，跳過" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ 文件不存在: $page" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 50
Write-Host "更新完成！" -ForegroundColor Green
Write-Host ""
Write-Host "建議下一步:" -ForegroundColor Yellow
Write-Host "1. 在瀏覽器中測試各個頁面"
Write-Host "2. 檢查樣式是否正確套用"
Write-Host "3. 測試深色模式功能"
