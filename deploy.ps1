# Windows PowerShell 部署腳本

Write-Host "🚀 準備部署 Road Camera System..." -ForegroundColor Green

# 創建 public 目錄
if (!(Test-Path "public")) {
    New-Item -ItemType Directory -Path "public" -Force
    Write-Host "📁 已創建 public 目錄" -ForegroundColor Yellow
}

# 複製 HTML 文件
Write-Host "📄 複製 HTML 文件..." -ForegroundColor Cyan
Get-ChildItem -Filter "*.html" | Copy-Item -Destination "public\" -Force

# 複製 JavaScript 文件
Write-Host "📄 複製 JavaScript 文件..." -ForegroundColor Cyan
Get-ChildItem -Filter "*.js" | Copy-Item -Destination "public\" -Force

# 複製 CSS 文件（如果存在）
if (Get-ChildItem -Filter "*.css" -ErrorAction SilentlyContinue) {
    Write-Host "📄 複製 CSS 文件..." -ForegroundColor Cyan
    Get-ChildItem -Filter "*.css" | Copy-Item -Destination "public\" -Force
}

# 顯示複製的文件
Write-Host ""
Write-Host "✅ 文件已複製完成！" -ForegroundColor Green
Write-Host "📁 public 目錄中的文件：" -ForegroundColor Yellow
Get-ChildItem "public\" | Format-Table Name, Length, LastWriteTime -AutoSize

Write-Host ""
Write-Host "🌐 部署選項：" -ForegroundColor Magenta
Write-Host "1. Cloudflare Pages 部署: " -NoNewline -ForegroundColor White
Write-Host "wrangler pages deploy public" -ForegroundColor Green

Write-Host "2. 本地預覽: " -NoNewline -ForegroundColor White  
Write-Host "wrangler pages dev public --port 8080" -ForegroundColor Green

Write-Host "3. 使用 npm 腳本: " -NoNewline -ForegroundColor White
Write-Host "npm run deploy" -ForegroundColor Green

Write-Host ""
Write-Host "💡 提示：如果部署失敗，請檢查：" -ForegroundColor Yellow
Write-Host "   - Cloudflare 帳戶是否已登入 (wrangler auth login)" -ForegroundColor Gray
Write-Host "   - wrangler.toml 配置是否正確" -ForegroundColor Gray
Write-Host "   - 網路連線是否正常" -ForegroundColor Gray