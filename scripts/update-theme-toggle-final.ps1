# Theme Toggle Button Unified Style Batch Update
# Author: BAILUCODE AI IDE
# Date: 2025/11/30

Write-Host "`nTheme Toggle Unified Style Update Tool`n" -ForegroundColor Cyan

$cssLink = '    <link rel="stylesheet" href="assets/theme-toggle-unified.css">'
$totalProcessed = 0
$totalUpdated = 0

$htmlFiles = Get-ChildItem -Path "." -Filter "*.html" -File | Where-Object { $_.Name -notmatch "backup|test" }

Write-Host "Found $($htmlFiles.Count) HTML files`n" -ForegroundColor Yellow

foreach ($file in $htmlFiles) {
    $updated = $false
    $lines = Get-Content $file.FullName -Encoding UTF8
    $newContent = @()
    
    $hasThemeToggle = ($lines | Select-String -Pattern 'id="themeToggle"' -Quiet)
    
    if ($hasThemeToggle) {
        $totalProcessed++
        Write-Host "[$totalProcessed] Processing: $($file.Name)" -ForegroundColor Green
        
        $hasCssLink = ($lines | Select-String -Pattern 'theme-toggle-unified.css' -Quiet)
        
        foreach ($line in $lines) {
            # Add CSS link
            if ($line -match '</head>' -and -not $hasCssLink) {
                $newContent += $cssLink
                $updated = $true
                Write-Host "  + Added CSS link" -ForegroundColor Cyan
            }
            
            # Remove inline style
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
                        Write-Host "  - Removed inline style" -ForegroundColor Cyan
                    }
                }
            }
            
            $newContent += $line
        }
        
        if ($updated) {
            $newContent | Set-Content -Path $file.FullName -Encoding UTF8
            $totalUpdated++
            Write-Host "  OK File updated`n" -ForegroundColor Green
        } else {
            Write-Host "  -- No changes needed`n" -ForegroundColor Gray
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Update Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files processed: $totalProcessed" -ForegroundColor White
Write-Host "Files updated: $totalUpdated" -ForegroundColor Green
Write-Host ""
