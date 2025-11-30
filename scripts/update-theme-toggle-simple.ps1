# 批次更新深色模式按鈕統一樣式（簡化版）
# 作者：BAILUCODE AI IDE
# 最後更新：2025/11/30

Write-Host "`n深色模式按鈕統一樣式批次更新工具`n" -ForegroundColor Cyan

$cssLink = '    <link rel="stylesheet" href="assets/theme-toggle-unified.css">'
$totalProcessed = 0
$totalUpdated = 0

$htmlFiles = Get-ChildItem -Path "." -Filter "*.html" -File | Where-Object { $_.Name -notmatch "backup|test" }

Write-Host "找到 $($htmlFiles.Count) 個 HTML 檔案`n" -ForegroundColor Yellow

foreach ($file in $htmlFiles) {
    $updated = $false
    $lines = Get-Content $file.FullName -Encoding UTF8
    $newContent = @()
    
    $hasThemeToggle = ($lines | Select-String -Pattern 'id="themeToggle"' -Quiet)
    
    if ($hasThemeToggle) {
        $totalProcessed++
        Write-Host "[$totalProcessed] 處理: $($file.Name)" -ForegroundColor Green
        
        $hasCssLink = ($lines | Select-String -Pattern 'theme-toggle-unified.css' -Quiet)
        
        foreach ($line in $lines) {
            # 加入 CSS 連結
            if ($line -match '</head>' -and -not $hasCssLink) {
                $newContent += $cssLink
                $updated = $true
                Write-Host "  √ 已加入 CSS 連結" -ForegroundColor Cyan
            }
            
            # 移除 inline style
            if ($line -match 'id="themeToggle"' -and $line -match 'style=') {
                $startPos = $line.IndexOf('style=')
                if ($startPos -ge 0) {
                    $quoteChar = $line[$startPos + 6]
                    $endPos = $line.IndexOf($quoteChar, $startPos + 7)
                    if ($endPos -gt $startPos) {
                        $beforeStyle = $line.Substring(0, $startPos)
                        $afterStyle = $line.Substring($endPos + 1)
                        $line = $beforeStyle.TrimEnd() + ' ' + $afterStyle.TrimStart()
                        $updated = $true
                        Write-Host "  √ 已移除 inline style" -ForegroundColor Cyan
                    }
                }
            }
            
            $newContent += $line
        }
        
        if ($updated) {
            $newContent | Set-Content -Path $file.FullName -Encoding UTF8
            $totalUpdated++
            Write-Host "  ✓ 檔案已更新`n" -ForegroundColor Green
        } else {
            Write-Host "  → 無需更新`n" -ForegroundColor Gray
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "更新完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "處理的檔案：$totalProcessed" -ForegroundColor White
Write-Host "更新的檔案：$totalUpdated" -ForegroundColor Green
Write-Host ""
