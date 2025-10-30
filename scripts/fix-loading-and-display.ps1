# Fix loading mechanism and display issues
# Author: BAILUCODE AI IDE
# Date: 2025-10-30

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

Write-Host "=== Starting Fix Process ===" -ForegroundColor Cyan
Write-Host ""

$fixedCount = 0

foreach ($page in $pages) {
    $filePath = Join-Path $PSScriptRoot "..\$page"
    
    if (Test-Path $filePath) {
        Write-Host "Checking: $page" -ForegroundColor Green
        
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $modified = $false
        
        # Fix garbled text in theme toggle button
        if ($content -match '\?\?[^\?]{1,10}\?') {
            Write-Host "  -> Fixing theme toggle button text" -ForegroundColor Yellow
            $content = $content -replace 'title="[^\"]+" style="width: 45px', 'title="Toggle Dark Mode" style="width: 45px'
            $modified = $true
        }
        
        # Fix back to top button comment
        if ($content -match '<!-- [^\-]{1,20} -->[\s\n]*<div class="back-to-top"') {
            Write-Host "  -> Fixing back to top button comment" -ForegroundColor Yellow
            $content = $content -replace '<!-- [^\-]{1,20} -->([\s\n]*<div class="back-to-top")', '<!-- Back to Top Button -->$1'
            $modified = $true
        }
        
        # Ensure loading progress script is included
        if ($content -notmatch 'loading-progress\.js') {
            Write-Host "  -> Adding loading progress script" -ForegroundColor Yellow
            $loadingScript = "`n    <!-- Loading Progress Bar -->`n    <script src=`"assets/loading-progress.js`"></script>`n"
            $content = $content -replace '</head>', "$loadingScript</head>"
            $modified = $true
        }
        
        if ($modified) {
            $content | Out-File -FilePath $filePath -Encoding UTF8 -NoNewline
            Write-Host "  [OK] Fixed: $page`n" -ForegroundColor Green
            $fixedCount++
        } else {
            Write-Host "  [-] No fix needed: $page`n" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [X] Not found: $page`n" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Cyan
Write-Host "Fixed $fixedCount / $($pages.Count) pages" -ForegroundColor Green
Write-Host ""
Write-Host "Fixes applied:" -ForegroundColor Yellow
Write-Host "  - Fixed garbled text display" -ForegroundColor White
Write-Host "  - Ensured loading progress script reference" -ForegroundColor White
Write-Host "  - Fixed button tooltips and comments" -ForegroundColor White
Write-Host ""
