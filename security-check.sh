#!/bin/bash

# 🔐 Road Camera System - Pre-commit Security Check
# 此腳本在 git commit 前執行，確保沒有敏感信息被提交

echo "🔍 執行安全性檢查..."
echo ""

# 定義顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 設定檢查結果
SECURITY_OK=true

# ========== 檢查 1: 搜尋硬編碼的 CLIENT_SECRET ==========
echo "📋 檢查 1: 搜尋硬編碼密鑰..."

if grep -r "CLIENT_SECRET.*=" assets/config.js | grep -v "^[[:space:]]*\/\/" | grep -v "^[[:space:]]*#" | grep -v "CLIENT_SECRET.*''" | grep -v 'CLIENT_SECRET.*""' > /dev/null; then
    echo -e "${RED}❌ 發現硬編碼的 CLIENT_SECRET！${NC}"
    grep -r "CLIENT_SECRET" assets/config.js | grep -v "^[[:space:]]*\/\/"
    SECURITY_OK=false
else
    echo -e "${GREEN}✅ config.js 中無硬編碼密鑰${NC}"
fi

if grep -r "CLIENT_ID.*xiaoyouwu" . --include="*.js" --include="*.html" 2>/dev/null; then
    echo -e "${RED}❌ 發現硬編碼的 TDX CLIENT_ID！${NC}"
    SECURITY_OK=false
else
    echo -e "${GREEN}✅ 無硬編碼的 TDX CLIENT_ID${NC}"
fi

echo ""

# ========== 檢查 2: 搜尋 API Secret 模式 ==========
echo "📋 檢查 2: 搜尋 API Secret 模式..."

SUSPECT_PATTERNS=(
    "cdb74a75-972a-42a8-a647-be6988a40bfd"  # TDX SECRET
    "api_key.*:"
    "secret.*:"
    "password.*:"
    "auth.*token.*:"
)

FOUND_SUSPECTS=false

for pattern in "${SUSPECT_PATTERNS[@]}"; do
    if grep -r "$pattern" . --include="*.js" --include="*.html" --include="*.json" 2>/dev/null | grep -v "\.git" | grep -v "\.md" | grep -v "node_modules" > /dev/null; then
        echo -e "${YELLOW}⚠️  可能發現敏感信息: $pattern${NC}"
        FOUND_SUSPECTS=true
    fi
done

if [ "$FOUND_SUSPECTS" = false ]; then
    echo -e "${GREEN}✅ 無發現可疑的敏感信息模式${NC}"
fi

echo ""

# ========== 檢查 3: 確認 .env 檔案已被 gitignore ==========
echo "📋 檢查 3: 驗證 .env 檔案管理..."

if [ -f ".env" ] || [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  發現 .env 檔案在工作目錄中${NC}"
    if grep -q "\.env" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✅ .env 已在 .gitignore 中${NC}"
    else
        echo -e "${RED}❌ .env 未在 .gitignore 中！${NC}"
        SECURITY_OK=false
    fi
else
    echo -e "${GREEN}✅ 工作目錄中無 .env 檔案${NC}"
fi

echo ""

# ========== 檢查 4: 驗證檔案權限 ==========
echo "📋 檢查 4: 驗證敏感檔案權限..."

if [ -f ".env.local" ]; then
    PERMS=$(stat -f %A .env.local 2>/dev/null || stat -c %a .env.local 2>/dev/null)
    if [ "$PERMS" != "600" ] && [ "$PERMS" != "644" ]; then
        echo -e "${YELLOW}⚠️  .env.local 檔案權限為 $PERMS (建議 600)${NC}"
    else
        echo -e "${GREEN}✅ .env.local 檔案權限正確${NC}"
    fi
fi

echo ""

# ========== 檢查 5: Git 歷史記錄 ==========
echo "📋 檢查 5: 掃描 Git 歷史記錄..."

if git rev-parse --git-dir > /dev/null 2>&1; then
    # 檢查最近 10 個提交中是否有敏感信息
    if git log -n 10 -p | grep -i "client_secret\|password\|api_key" | grep -v "^-" | grep -v "^+" > /dev/null; then
        echo -e "${RED}❌ Git 歷史記錄中發現可疑敏感信息！${NC}"
        echo "考慮使用 git-filter-repo 或 BFG Repo Cleaner 清除歷史"
        SECURITY_OK=false
    else
        echo -e "${GREEN}✅ Git 歷史記錄中無發現敏感信息${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  不在 Git 倉庫中，跳過歷史記錄檢查${NC}"
fi

echo ""

# ========== 檢查 6: 檔案大小檢查 ==========
echo "📋 檢查 6: 驗證檔案大小..."

JS_SIZE=$(find . -name "*.js" -type f | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
if [ ! -z "$JS_SIZE" ] && [ "$JS_SIZE" -gt 100000 ]; then
    echo -e "${YELLOW}⚠️  警告: 總 JavaScript 代碼行數超過 100K（可能包含依賴未壓縮）${NC}"
else
    echo -e "${GREEN}✅ 檔案大小合理${NC}"
fi

echo ""
echo "=========================================="

if [ "$SECURITY_OK" = true ]; then
    echo -e "${GREEN}🎉 安全性檢查通過！可以安心提交${NC}"
    exit 0
else
    echo -e "${RED}❌ 發現安全問題，請修復後再提交${NC}"
    echo ""
    echo "修復建議："
    echo "1. 檢查並清空 assets/config.js 中的 CLIENT_ID 和 CLIENT_SECRET"
    echo "2. 確認 .env 和 .env.local 已在 .gitignore 中"
    echo "3. 不要在代碼中硬編碼任何密鑰"
    echo "4. 使用環境變數或配置伺服器來管理敏感信息"
    exit 1
fi
