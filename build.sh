#!/bin/bash

# 創建 public 目錄（如果不存在）
mkdir -p public

# 複製所有 HTML 文件
cp *.html public/ 2>/dev/null

# 複製所有 JavaScript 文件
cp *.js public/ 2>/dev/null

# 複製所有 CSS 文件（如果有的話）
cp *.css public/ 2>/dev/null

# 複製 PowerShell 腳本（可選）
cp *.ps1 public/ 2>/dev/null

echo "✅ 文件已複製到 public 目錄"
echo "📁 準備部署的文件："
ls -la public/

echo ""
echo "🚀 現在可以執行以下命令之一："
echo "   npm run deploy    # 部署到 Cloudflare Pages"
echo "   npm run preview   # 本地預覽"
echo "   wrangler pages deploy public  # 直接使用 wrangler 部署"