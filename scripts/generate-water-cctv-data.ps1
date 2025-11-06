# 生成水利署 CCTV 監控站完整資料檔案
# Generate Water Resources Agency CCTV Station Data File

Write-Host "=== 水利署 CCTV 資料生成工具 ===" -ForegroundColor Cyan
Write-Host ""

# 讀取用戶提供的 JSON 資料
$sourceFile = Join-Path $PSScriptRoot "..\..\..\task-data-source.json"
$targetFile = Join-Path $PSScriptRoot "..\assets\water-cctv-data.json"

# 檢查是否有資料來源檔案
if (-not (Test-Path $sourceFile)) {
    Write-Host "提示：未找到資料來源檔案。" -ForegroundColor Yellow
    Write-Host "請將您提供的完整 JSON 資料儲存為: $sourceFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "您也可以直接將資料貼到此腳本的 `$jsonData 變數中。" -ForegroundColor Cyan
    Write-Host ""
    
    # 提供手動輸入選項
    $response = Read-Host "是否要手動輸入資料路徑? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        $customPath = Read-Host "請輸入 JSON 檔案的完整路徑"
        if (Test-Path $customPath) {
            $sourceFile = $customPath
        } else {
            Write-Host "找不到指定的檔案！" -ForegroundColor Red
            exit
        }
    } else {
        Write-Host "腳本已終止。" -ForegroundColor Red
        exit
    }
}

try {
    # 讀取並驗證 JSON 資料
    Write-Host "正在讀取資料..." -ForegroundColor Green
    $jsonContent = Get-Content $sourceFile -Raw -Encoding UTF8
    $stationsData = $jsonContent | ConvertFrom-Json
    
    # 驗證資料
    $totalStations = $stationsData.Count
    Write-Host "找到 $totalStations 個監控站" -ForegroundColor Green
    
    # 資料統計
    $activeStations = ($stationsData | Where-Object { $_.status -eq "1" }).Count
    $cities = ($stationsData | Select-Object -ExpandProperty countiesandcitieswherethemonitoringpointsarelocated -Unique).Count
    $basins = ($stationsData | Select-Object -ExpandProperty basinname -Unique | Where-Object { $_ }).Count
    
    Write-Host ""
    Write-Host "資料統計：" -ForegroundColor Cyan
    Write-Host "  總監控站數: $totalStations"
    Write-Host "  運作中站數: $activeStations"
    Write-Host "  涵蓋縣市數: $cities"
    Write-Host "  涵蓋流域數: $basins"
    Write-Host ""
    
    # 寫入目標檔案
    Write-Host "正在寫入資料到 $targetFile ..." -ForegroundColor Green
    
    # 確保目錄存在
    $targetDir = Split-Path $targetFile -Parent
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    
    # 轉換回 JSON 並寫入（格式化輸出）
    $stationsData | ConvertTo-Json -Depth 10 | Set-Content $targetFile -Encoding UTF8
    
    Write-Host "✓ 資料檔案已成功生成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "檔案位置: $targetFile" -ForegroundColor Cyan
    Write-Host "檔案大小: $([math]::Round((Get-Item $targetFile).Length / 1KB, 2)) KB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "接下來可以開啟 water-cctv.html 來查看監控站系統！" -ForegroundColor Yellow
    
} catch {
    Write-Host "錯誤：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
}

Write-Host ""
Write-Host "按任意鍵結束..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
