#!/bin/bash
# 🚀 TRA PIDS 部署腳本 - 解決編碼與硬編碼問題
# 作者：Taiwan Transportation Dashboard Team
# 用途：確保 UTF-8 編碼 + 動態環境變數替換

set -e  # 遇到錯誤立即退出

echo "🔧 開始部署流程..."

# 配置
SOURCE_DIR="."
DIST_DIR="dist"
PROD_API_URL="${PROD_API_URL:-https://tra-schedule-worker.xiaoyouwu5-fd3.workers.dev}"
ENV="${ENV:-production}"

# 創建部署目錄
mkdir -p "$DIST_DIR"
echo "✅ 創建部署目錄: $DIST_DIR"

# 1️⃣ 確保所有 HTML 檔案為 UTF-8 編碼
echo "📝 正在轉換編碼為 UTF-8..."
for file in *.html; do
    if [ -f "$file" ]; then
        # 檢測當前編碼並轉換為 UTF-8
        file_encoding=$(file -b --mime-encoding "$file")
        if [ "$file_encoding" != "utf-8" ] && [ "$file_encoding" != "us-ascii" ]; then
            echo "  ⚠️  $file 當前編碼: $file_encoding，正在轉換..."
            iconv -f "$file_encoding" -t UTF-8 "$file" > "$DIST_DIR/$file"
        else
            cp "$file" "$DIST_DIR/$file"
            echo "  ✅ $file 已是 UTF-8"
        fi
    fi
done

# 2️⃣ 複製 assets 資源
echo "📦 複製靜態資源..."
cp -r assets "$DIST_DIR/" 2>/dev/null || true
cp -r backup "$DIST_DIR/" 2>/dev/null || true

# 3️⃣ 動態替換 API URL（解決硬編碼問題）
echo "🔄 正在替換 API 端點為環境變數..."
if [ "$ENV" = "production" ]; then
    for file in "$DIST_DIR"/*.html; do
        if [ -f "$file" ]; then
            # 替換 API_BASE 為生產環境 URL
            sed -i.bak "s|API_BASE: \"https://tra-schedule-worker.xiaoyouwu5-fd3.workers.dev\"|API_BASE: \"$PROD_API_URL\"|g" "$file"
            rm -f "$file.bak"
            echo "  ✅ 已替換 $file 中的 API 端點"
        fi
    done
fi

# 4️⃣ 壓縮 HTML（選用）
if command -v html-minifier &> /dev/null; then
    echo "🗜️  正在壓縮 HTML..."
    for file in "$DIST_DIR"/*.html; do
        if [ -f "$file" ]; then
            html-minifier --collapse-whitespace \
                          --remove-comments \
                          --minify-css true \
                          --minify-js true \
                          "$file" -o "$file.min"
            mv "$file.min" "$file"
        fi
    done
else
    echo "⚠️  html-minifier 未安裝，跳過壓縮步驟"
fi

# 5️⃣ 生成部署報告
echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo "部署目錄: $DIST_DIR"
echo "環境: $ENV"
echo "API 端點: $PROD_API_URL"
echo ""
echo "檔案清單:"
ls -lh "$DIST_DIR"/*.html | awk '{print "  - " $9 " (" $5 ")"}'
echo ""
echo "💡 提示：將 $DIST_DIR 內容上傳至生產伺服器"
echo "=========================================="
