@echo off
REM 🚀 TRA PIDS 部署腳本 (Windows 版本)
REM 作者：Taiwan Transportation Dashboard Team
REM 用途：確保 UTF-8 編碼 + 動態環境變數替換

setlocal enabledelayedexpansion

echo 🔧 開始部署流程...

REM 配置
set SOURCE_DIR=.
set DIST_DIR=dist
set PROD_API_URL=https://tra-schedule-worker.xiaoyouwu5-fd3.workers.dev
if not defined ENV set ENV=production

REM 創建部署目錄
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
echo ✅ 創建部署目錄: %DIST_DIR%

REM 1️⃣ 複製 HTML 檔案並確保 UTF-8 編碼
echo 📝 正在複製並檢查編碼...
for %%f in (*.html) do (
    echo   複製 %%f...
    powershell -Command "$content = Get-Content -Path '%%f' -Raw -Encoding UTF8; Set-Content -Path '%DIST_DIR%\%%f' -Value $content -Encoding UTF8 -NoNewline"
)

REM 2️⃣ 複製 assets 資源
echo 📦 複製靜態資源...
if exist "assets" xcopy /E /I /Y "assets" "%DIST_DIR%\assets" > nul
if exist "backup" xcopy /E /I /Y "backup" "%DIST_DIR%\backup" > nul

REM 3️⃣ 動態替換 API URL
if "%ENV%"=="production" (
    echo 🔄 正在替換 API 端點為生產環境...
    for %%f in ("%DIST_DIR%\*.html") do (
        powershell -Command "(Get-Content '%%f' -Raw -Encoding UTF8) -replace 'API_BASE: \"https://tra-schedule-worker.xiaoyouwu5-fd3.workers.dev\"', 'API_BASE: \"%PROD_API_URL%\"' | Set-Content '%%f' -Encoding UTF8 -NoNewline"
        echo   ✅ 已替換 %%f
    )
)

REM 4️⃣ 生成部署報告
echo.
echo ==========================================
echo 🎉 部署完成！
echo ==========================================
echo 部署目錄: %DIST_DIR%
echo 環境: %ENV%
echo API 端點: %PROD_API_URL%
echo.
echo 檔案清單:
dir /B "%DIST_DIR%\*.html"
echo.
echo 💡 提示：將 %DIST_DIR% 內容上傳至生產伺服器
echo ==========================================

endlocal
