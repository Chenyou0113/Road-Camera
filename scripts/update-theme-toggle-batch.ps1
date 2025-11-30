# ===============================================
# 批次更新深色模式按鈕統一樣式
# 作者：BAILUCODE AI IDE
# 最後更新：2025/11/30
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  深色模式按鈕統一樣式批次更新工具" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 設定路徑
$rootPath = "Road-Camera"
$cssLink = '<link rel="stylesheet" href="assets/theme-toggle-unified.css">'

# 統計變數
$totalProcessed = 0
$totalUpdated = 0
$filesWithThemeToggle = @()

# 獲取所有 HTML 檔案（排除 backup 和 test 目錄）
$htmlFiles = Get-ChildItem -Path $rootPath -Filter "*.html" -Recurse | Where-Object { $_.FullName -notmatch "backup|test|node_modules" }

Write-Host "找到 $($htmlFiles.Count) 個 HTML 檔案`n" -ForegroundColor Yellow

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $fileUpdated = $false
    
    # 檢查是否包含 themeToggle
    if ($content -match 'id="themeToggle"') {
        $totalProcessed++
        $relativePath = $file.FullName.Replace($PWD.Path + "\", "")
        Write-Host "[$totalProcessed] 處理: " -NoNewline -ForegroundColor Green
        Write-Host $relativePath -ForegroundColor White
        
        $filesWithThemeToggle += $relativePath
        
        # 步驟 1: 加入 CSS 連結（如果還沒有）
        if ($content -notmatch 'theme-toggle-unified\.css') {
            if ($content -match '</head>') {
                $content = $content -replace '</head>', "    $cssLink`n</head>"
                Write-Host "  √ 已加入 CSS 連結" -ForegroundColor Cyan
                $fileUpdated = $true
            }
        } else {
            Write-Host "  → CSS 連結已存在" -ForegroundColor Gray
        }
        
        # 步驟 2: 移除按鈕的 inline style（使用簡單的方法）
        $pattern = 'style\s*=\s*"[^"]*"'
        if ($content -match '<button[^>]*id="themeToggle"[^>]*style=') {
            # 找到 themeToggle 按鈕的開始位置
            $buttonStart = $content.IndexOf('<button', $content.IndexOf('id="themeToggle"') - 50)
            $buttonEnd = $content.IndexOf('>', $buttonStart) + 1
            $buttonHTML = $content.Substring($buttonStart, $buttonEnd - $buttonStart)
            
            # 移除 style 屬性
            $newButtonHTML = $buttonHTML -replace '\s*style\s*=\s*"[^"]*"', ''
            $content = $content.Replace($buttonHTML, $newButtonHTML)
            
            Write-Host "  √ 已移除 inline style" -ForegroundColor Cyan
            $fileUpdated = $true
        } else {
            Write-Host "  → 無 inline style 需移除" -ForegroundColor Gray
        }
        
        # 儲存檔案
        if ($content -ne $originalContent) {
            try {
                Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
                Write-Host "  ✓ 檔案已更新" -ForegroundColor Green
                $totalUpdated++
            } catch {
                Write-Host "  × 更新失敗: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "  → 無需更新" -ForegroundColor Gray
        }
        
        Write-Host ""
    }
}

# 顯示摘要報告
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  更新完成！" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "統計資料：" -ForegroundColor Yellow
Write-Host "  • 掃描檔案總數：$($htmlFiles.Count)" -ForegroundColor White
Write-Host "  • 包含 themeToggle 的檔案：$totalProcessed" -ForegroundColor White
Write-Host "  • 成功更新的檔案：$totalUpdated" -ForegroundColor Green

if ($filesWithThemeToggle.Count -gt 0) {
    Write-Host "`n已處理的檔案清單：" -ForegroundColor Yellow
    $filesWithThemeToggle | ForEach-Object {
        Write-Host "  • $_" -ForegroundColor White
    }
}

Write-Host "`n✓ 所有頁面的深色模式按鈕已統一！" -ForegroundColor Green
Write-Host ""
