# 全面更新所有 HTML 頁面腳本
# 包括深色模式、響應式設計、性能優化

$pages = @(
    "index.html",
    "dashboard.html",
    "highway.html",
    "expressway.html",
    "road.html",
    "city.html",
    "train-liveboard.html",
    "metro-liveboard.html",
    "river-monitoring.html",
    "water-resources.html",
    "air-quality.html",
    "debris-flow.html",
    "soil-observation.html",
    "landslide-monitoring.html"
)

Write-Host "=== 開始全面更新所有頁面 ===" -ForegroundColor Cyan
Write-Host "更新內容：深色模式 + 響應式設計 + 性能優化`n" -ForegroundColor Yellow

$updateCount = 0

foreach ($page in $pages) {
    $filePath = Join-Path $PSScriptRoot "..\$page"
    
    if (Test-Path $filePath) {
        Write-Host "正在更新: $page" -ForegroundColor Green
        
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $modified = $false
        
        # 檢查並添加 dark-mode.css
        if ($content -notmatch 'dark-mode\.css') {
            Write-Host "  -> 添加深色模式支援" -ForegroundColor Gray
            $content = $content -replace '(font-awesome[^>]+>)', "`$1`n    <link rel=`"stylesheet`" href=`"assets/dark-mode.css`">"
            $modified = $true
        }
        
        # 檢查並添加 dark-mode.js
        if ($content -notmatch 'dark-mode\.js') {
            Write-Host "  -> 添加深色模式腳本" -ForegroundColor Gray
            $scriptTag = "    <script src=`"assets/dark-mode.js`"></script>`n"
            $content = $content -replace '</body>', "$scriptTag</body>"
            $modified = $true
        }
        
        # 添加深色模式切換按鈕
        if (($content -notmatch 'themeToggle') -and ($content -notmatch 'theme-toggle')) {
            Write-Host "  -> 添加深色模式切換按鈕" -ForegroundColor Gray
            $themeButton = @"
            <button class="theme-toggle" id="themeToggle" title="切換深色模式" style="width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; cursor: pointer; margin-left: 15px; font-size: 1.2rem;">
                <i class="fas fa-moon"></i>
            </button>
"@
            # 在導航欄返回首頁按鈕後添加
            $content = $content -replace '(<a[^>]*href="index\.html"[^>]*>.*?</a>)', "`$1`n$themeButton"
            $modified = $true
        }
        
        # 添加返回頂部按鈕
        if (($content -notmatch 'back-to-top') -and ($content -notmatch 'backToTop')) {
            Write-Host "  -> 添加返回頂部按鈕" -ForegroundColor Gray
            $backToTopButton = @"

    <!-- 返回頂部按鈕 -->
    <div class="back-to-top" id="backToTop" style="position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: none; align-items: center; justify-content: center; color: white; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 999; font-size: 1.2rem;">
        <i class="fas fa-arrow-up"></i>
    </div>
"@
            $content = $content -replace '</body>', "$backToTopButton`n</body>"
            $modified = $true
        }
        
        # 確保有 viewport meta 標籤
        if ($content -notmatch 'viewport') {
            Write-Host "  -> 添加 viewport meta 標籤" -ForegroundColor Gray
            $content = $content -replace '(<meta charset="UTF-8">)', "`$1`n    <meta name=`"viewport`" content=`"width=device-width, initial-scale=1.0`">"
            $modified = $true
        }
        
        # 保存更新後的內容
        if ($modified) {
            $content | Out-File -FilePath $filePath -Encoding UTF8 -NoNewline
            Write-Host "  OK 完成更新: $page`n" -ForegroundColor Green
            $updateCount++
        }
        else {
            Write-Host "  - 無需更新: $page`n" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  X 找不到檔案: $page`n" -ForegroundColor Red
    }
}

Write-Host "`n=== 更新完成 ===" -ForegroundColor Cyan
Write-Host "已更新 $updateCount / $($pages.Count) 個頁面" -ForegroundColor Green
Write-Host "`n更新內容總結：" -ForegroundColor Yellow
Write-Host "  • 深色模式支援（CSS + JS）" -ForegroundColor White
Write-Host "  • 深色模式切換按鈕" -ForegroundColor White
Write-Host "  • 返回頂部按鈕" -ForegroundColor White
Write-Host "  • Viewport 支援" -ForegroundColor White
Write-Host "`n建議：請在瀏覽器中測試所有頁面功能" -ForegroundColor Cyan
