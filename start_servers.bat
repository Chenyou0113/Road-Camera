@echo off
REM 啟動 API 代理伺服器和主應用伺服器

echo.
echo ========================================
echo   台灣即時監控系統 - 啟動腳本
echo ========================================
echo.

REM 檢查 Python 是否安裝
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: 未找到 Python，請先安裝 Python 3.x
    pause
    exit /b 1
)

echo ✅ Python 已檢測

REM 設定目錄
set SCRIPT_DIR=%~dp0
set CAMERA_DIR=%SCRIPT_DIR%

REM 啟動 API 代理伺服器
echo.
echo 🚀 啟動 API 代理伺服器 (端口 8001)...
start "API Proxy Server" python "%SCRIPT_DIR%api_proxy.py"
timeout /t 2 /nobreak

REM 啟動主應用伺服器
echo.
echo 🚀 啟動主應用伺服器 (端口 8000)...
start "HTTP Server" cmd /k "cd /d "%CAMERA_DIR%" && python -m http.server 8000"
timeout /t 2 /nobreak

REM 打開瀏覽器
echo.
echo 🌐 打開瀏覽器...
start http://localhost:8000/air-quality-cctv.html

echo.
echo ✅ 系統已啟動！
echo.
echo 📍 服務信息:
echo    - 主應用: http://localhost:8000
echo    - API 代理: http://localhost:8001
echo    - 空品頁面: http://localhost:8000/air-quality-cctv.html
echo.
echo ⏹️  關閉此窗口以停止伺服器
pause
