@echo off
REM 🔐 Road Camera System - Pre-commit Security Check (Windows)
REM 此批次文件在 git commit 前執行，確保沒有敏感信息被提交

setlocal enabledelayedexpansion

echo 🔍 執行安全性檢查...
echo.

set SECURITY_OK=true

REM ========== 檢查 1: 搜尋硬編碼的 CLIENT_SECRET ==========
echo 📋 檢查 1: 搜尋硬編碼密鑰...

findstr /I "CLIENT_SECRET" assets\config.js | findstr /V "//" > nul 2>&1
if !errorlevel! equ 0 (
    echo ❌ 發現硬編碼的 CLIENT_SECRET！
    findstr /I "CLIENT_SECRET" assets\config.js
    set SECURITY_OK=false
) else (
    echo ✅ config.js 中無硬編碼密鑰
)

findstr /R "CLIENT_ID.*xiaoyouwu" assets\*.js > nul 2>&1
if !errorlevel! equ 0 (
    echo ❌ 發現硬編碼的 TDX CLIENT_ID！
    set SECURITY_OK=false
) else (
    echo ✅ 無硬編碼的 TDX CLIENT_ID
)

echo.

REM ========== 檢查 2: 搜尋 API Secret 模式 ==========
echo 📋 檢查 2: 搜尋 API Secret 模式...

findstr /R "cdb74a75-972a-42a8-a647-be6988a40bfd" assets\*.js > nul 2>&1
if !errorlevel! equ 0 (
    echo ⚠️  可能發現敏感信息: TDX_SECRET
)

findstr /I "password.*:" assets\*.js > nul 2>&1
if !errorlevel! equ 0 (
    echo ⚠️  可能發現敏感信息: password
)

echo ✅ 完成 API Secret 模式掃描

echo.

REM ========== 檢查 3: 確認 .env 檔案已被 gitignore ==========
echo 📋 檢查 3: 驗證 .env 檔案管理...

if exist ".env" (
    echo ⚠️  發現 .env 檔案在工作目錄中
    findstr ".env" .gitignore > nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ .env 已在 .gitignore 中
    ) else (
        echo ❌ .env 未在 .gitignore 中！
        set SECURITY_OK=false
    )
) else (
    echo ✅ 工作目錄中無 .env 檔案
)

if exist ".env.local" (
    echo ⚠️  發現 .env.local 檔案在工作目錄中
)

echo.

REM ========== 檢查 4: Git 歷史記錄 ==========
echo 📋 檢查 4: 掃描 Git 歷史記錄...

where git > nul 2>&1
if !errorlevel! equ 0 (
    git log -n 10 --pretty=format:%%h | findstr "." > nul 2>&1
    if !errorlevel! equ 0 (
        REM Git 倉庫存在
        git log -n 10 -p 2>nul | findstr /I "client_secret" > nul 2>&1
        if !errorlevel! equ 0 (
            echo ❌ Git 歷史記錄中發現 client_secret！
            set SECURITY_OK=false
        ) else (
            echo ✅ Git 歷史記錄中無發現敏感信息
        )
    ) else (
        echo ⚠️  未在 Git 倉庫中，跳過歷史記錄檢查
    )
) else (
    echo ⚠️  未找到 Git 命令，跳過歷史記錄檢查
)

echo.

REM ========== 最終結果 ==========
echo ==========================================

if "%SECURITY_OK%"=="true" (
    echo 🎉 安全性檢查通過！可以安心提交
    exit /b 0
) else (
    echo ❌ 發現安全問題，請修復後再提交
    echo.
    echo 修復建議：
    echo 1. 檢查並清空 assets/config.js 中的 CLIENT_ID 和 CLIENT_SECRET
    echo 2. 確認 .env 和 .env.local 已在 .gitignore 中
    echo 3. 不要在代碼中硬編碼任何密鑰
    echo 4. 使用環境變數來管理敏感信息
    exit /b 1
)

endlocal
