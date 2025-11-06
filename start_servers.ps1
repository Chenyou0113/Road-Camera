#!/usr/bin/env pwsh
<#
.SYNOPSIS
    啟動台灣即時監控系統的所有服務

.DESCRIPTION
    此腳本啟動 API 代理伺服器和主應用伺服器

.EXAMPLE
    .\start_servers.ps1
#>

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  台灣即時監控系統 - PowerShell 啟動腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查 Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python 已檢測: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 錯誤: 未找到 Python，請先安裝 Python 3.x" -ForegroundColor Red
    pause
    exit 1
}

# 設定目錄
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cameraDir = $scriptDir

# 啟動 API 代理伺服器
Write-Host ""
Write-Host "🚀 啟動 API 代理伺服器 (端口 8001)..." -ForegroundColor Yellow
Start-Process -FilePath python -ArgumentList "$scriptDir\api_proxy.py" -WindowStyle Normal

# 等待代理啟動
Start-Sleep -Seconds 2

# 啟動主應用伺服器
Write-Host "🚀 啟動主應用伺服器 (端口 8000)..." -ForegroundColor Yellow
$httpProcess = Start-Process -FilePath python -ArgumentList "-m", "http.server", "8000" -WorkingDirectory $cameraDir -WindowStyle Normal -PassThru

# 等待伺服器啟動
Start-Sleep -Seconds 2

# 打開瀏覽器
Write-Host "🌐 打開瀏覽器..." -ForegroundColor Yellow
Start-Process "http://localhost:8000/air-quality-cctv.html"

# 顯示信息
Write-Host ""
Write-Host "✅ 系統已啟動！" -ForegroundColor Green
Write-Host ""
Write-Host "📍 服務信息:" -ForegroundColor Cyan
Write-Host "   - 主應用: http://localhost:8000" -ForegroundColor White
Write-Host "   - API 代理: http://localhost:8001" -ForegroundColor White
Write-Host "   - 空品頁面: http://localhost:8000/air-quality-cctv.html" -ForegroundColor White
Write-Host ""
Write-Host "⏹️  按 Ctrl+C 停止伺服器" -ForegroundColor Yellow
Write-Host ""

# 保持腳本運行
while ($true) {
    Start-Sleep -Seconds 1
}
