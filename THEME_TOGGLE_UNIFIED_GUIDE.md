# 🎨 深色模式按鈕統一樣式實施指南

> **作者**：BAILUCODE AI IDE  
> **最後更新**：2025/11/30  
> **目標**：統一所有頁面的深色模式按鈕樣式（圓形深色底 + 白色邊框）

---

## 📦 已完成項目

✅ **已建立統一 CSS 檔案**：`Road-Camera/assets/theme-toggle-unified.css`

---

## 🎯 實施步驟

### **步驟 1：在 HTML 中引入統一 CSS**

在每個需要深色模式按鈕的 HTML 檔案的 `<head>` 區塊中，加入以下這行：

```html
<link rel="stylesheet" href="assets/theme-toggle-unified.css">
```

**完整範例**：
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>您的頁面標題</title>
    
    <!-- 其他 CSS -->
    <link rel="stylesheet" href="assets/modern-theme.css">
    
    <!-- 統一深色模式按鈕樣式 -->
    <link rel="stylesheet" href="assets/theme-toggle-unified.css">
</head>
```

---

### **步驟 2：清理按鈕的 Inline Style**

找到每個 HTML 檔案中的 `<button id="themeToggle">` 標籤，**刪除所有 `style="..."` 屬性**。

#### ❌ 修改前（需要刪除）：
```html
<button id="themeToggle" 
        style="width: 40px; height: 40px; background: #2c3e50; border-radius: 50%; ..." 
        title="切換深色模式">
    <i class="fas fa-moon"></i>
</button>
```

#### ✅ 修改後（乾淨簡潔）：
```html
<button id="themeToggle" title="切換深色模式">
    <i class="fas fa-moon"></i>
</button>
```

---

### **步驟 3：移除 `<style>` 中的舊按鈕樣式**

在每個 HTML 檔案的 `<style>` 區塊中，**搜尋並刪除** 所有關於 `#themeToggle` 的 CSS 規則。

#### ❌ 需要刪除的內容範例：
```css
/* 這些舊樣式全部刪除 */
#themeToggle {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    /* ... 更多樣式 ... */
}

#themeToggle:hover {
    /* ... */
}
```

#### ✅ 刪除後的結果：
不需要在 `<style>` 區塊中保留任何 `#themeToggle` 相關的 CSS，因為已經統一由 `theme-toggle-unified.css` 管理。

---

## 📋 需要修改的主要檔案清單

根據您的專案結構，以下是需要更新的主要 HTML 檔案：

### **核心頁面**（優先處理）
- ✅ `Road-Camera/index.html` - 首頁
- ✅ `Road-Camera/metro-liveboard.html` - 捷運看板
- ✅ `Road-Camera/train-liveboard.html` - 台鐵看板
- ✅ `Road-Camera/pids-live.html` - 台鐵 PIDS
- ✅ `Road-Camera/dashboard.html` - 控制台

### **監測相關頁面**
- ✅ `Road-Camera/road.html` - 省道監測
- ✅ `Road-Camera/highway.html` - 高速公路
- ✅ `Road-Camera/city.html` - 市區道路
- ✅ `Road-Camera/water.html` - 水資源監測
- ✅ `Road-Camera/air-quality.html` - 空氣品質
- ✅ `Road-Camera/weather-dashboard.html` - 氣象儀表板
- ✅ `Road-Camera/debris-flow.html` - 土石流監測
- ✅ `Road-Camera/river-level.html` - 河川水位

### **其他頁面**
- ✅ `Road-Camera/contact.html` - 聯絡頁面
- ✅ `Road-Camera/admin.html` - 管理後台

---

## 🎨 統一後的視覺效果

### **淺色模式（預設）**
- 🌑 深灰色圓形底色：`#2c3e50`
- ⭕ 半透明白色邊框環：`rgba(255, 255, 255, 0.2)`
- 🌙 白色月亮圖示

### **深色模式**
- 🌕 橘黃色圓形底色：`#f39c12`（太陽色）
- ⭕ 更亮的白色邊框環：`rgba(255, 255, 255, 0.5)`
- ☀️ 白色太陽圖示

### **互動效果**
- **Hover（滑鼠移過）**：
  - 背景變亮
  - 邊框變全白
  - 按鈕放大至 1.1 倍
  - 陰影加深

- **Active（點擊）**：
  - 按鈕縮小至 0.95 倍
  - 給予點擊回饋

- **過渡動畫**：
  - 所有變化都有 0.3 秒流暢動畫

### **響應式設計**
- 📱 **手機版（≤768px）**：42px × 42px
- 💻 **平板版（769-1024px）**：46px × 46px
- 🖥️ **桌面版（>1024px）**：50px × 50px

---

## 🔧 快速批次更新方法

### **方法 1：使用 PowerShell 腳本（Windows）**

建立 `Road-Camera/scripts/update-theme-toggle.ps1`：

```powershell
# 批次更新所有 HTML 檔案的深色模式按鈕

$htmlFiles = Get-ChildItem -Path "Road-Camera" -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # 檢查是否包含 themeToggle
    if ($content -match 'id="themeToggle"') {
        Write-Host "正在處理: $($file.Name)" -ForegroundColor Green
        
        # 1. 在 </head> 前加入 CSS 連結（如果還沒有）
        if ($content -notmatch 'theme-toggle-unified.css') {
            $content = $content -replace '</head>', "    <link rel=`"stylesheet`" href=`"assets/theme-toggle-unified.css`">`n</head>"
        }
        
        # 2. 移除按鈕的 inline style
        $content = $content -replace '<button\s+id="themeToggle"[^>]*style="[^"]*"([^>]*)>', '<button id="themeToggle"$1>'
        
        # 儲存檔案
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "✓ 完成: $($file.Name)" -ForegroundColor Cyan
    }
}

Write-Host "`n所有檔案已更新完成！" -ForegroundColor Yellow
```

**執行方式**：
```powershell
cd Road-Camera
.\scripts\update-theme-toggle.ps1
```

---

### **方法 2：使用 VS Code 搜尋取代**

1. **按 `Ctrl + Shift + H`** 開啟搜尋取代面板

2. **移除 inline style**：
   - 搜尋（使用正則表達式）：
     ```regex
     (<button\s+id="themeToggle"[^>]*)\s+style="[^"]*"
     ```
   - 取代為：
     ```
     $1
     ```

3. **加入 CSS 連結**：
   - 在每個檔案的 `</head>` 前手動加入：
     ```html
     <link rel="stylesheet" href="assets/theme-toggle-unified.css">
     ```

---

## ✅ 驗證檢查清單

完成更新後，請逐一檢查：

- [ ] 所有 HTML 檔案都已引入 `theme-toggle-unified.css`
- [ ] 所有 `<button id="themeToggle">` 標籤都已移除 inline style
- [ ] 所有 `<style>` 區塊中的 `#themeToggle` 舊樣式都已刪除
- [ ] 按鈕在淺色模式下顯示為深灰色圓形
- [ ] 按鈕在深色模式下顯示為橘黃色圓形
- [ ] Hover 效果正常（放大、變亮）
- [ ] 點擊效果正常（縮小回饋）
- [ ] 手機版尺寸正確（42px）
- [ ] 桌面版尺寸正確（50px）
- [ ] 圖示切換正常（🌙 ↔️ ☀️）

---

## 🐛 常見問題排解

### **問題 1：按鈕沒有套用新樣式**

**可能原因**：
- CSS 檔案路徑錯誤
- 舊的 inline style 沒有刪除乾淨
- 瀏覽器快取

**解決方法**：
1. 檢查 CSS 連結路徑是否正確
2. 確認 `theme-toggle-unified.css` 檔案存在
3. 按 `Ctrl + Shift + R` 強制重新整理
4. 開啟開發者工具（F12）→ Network 標籤確認 CSS 有載入

---

### **問題 2：按鈕位置不對**

**可能原因**：
- Header 使用了 `position: relative`，按鈕的 `position: absolute` 被限制在 Header 內

**解決方法**：
將按鈕的 CSS 改為 `position: fixed`：
```css
#themeToggle {
    position: fixed;  /* 改成 fixed */
    top: 20px;
    right: 20px;
    z-index: 1000;
}
```

---

### **問題 3：深色模式切換後按鈕沒變色**

**可能原因**：
- JavaScript 沒有正確切換 `body.dark-mode` class

**解決方法**：
確認 `assets/dark-mode.js` 包含：
```javascript
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    
    // 切換圖示
    const icon = themeToggle.querySelector('i');
    if (body.classList.contains('dark-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
});
```

---

## 📞 技術支援

如果在實施過程中遇到問題，請檢查：

1. **瀏覽器控制台**（F12）→ Console 標籤查看錯誤訊息
2. **Network 標籤**確認 `theme-toggle-unified.css` 是否成功載入（狀態 200）
3. **Elements 標籤**檢查按鈕的實際套用樣式

---

## 📊 實施進度追蹤

| 頁面名稱 | 引入 CSS | 移除 Inline Style | 移除舊 CSS | 測試通過 |
|---------|---------|------------------|-----------|---------|
| index.html | ⬜ | ⬜ | ⬜ | ⬜ |
| metro-liveboard.html | ⬜ | ⬜ | ⬜ | ⬜ |
| train-liveboard.html | ⬜ | ⬜ | ⬜ | ⬜ |
| pids-live.html | ⬜ | ⬜ | ⬜ | ⬜ |
| dashboard.html | ⬜ | ⬜ | ⬜ | ⬜ |
| road.html | ⬜ | ⬜ | ⬜ | ⬜ |
| highway.html | ⬜ | ⬜ | ⬜ | ⬜ |
| city.html | ⬜ | ⬜ | ⬜ | ⬜ |

**圖例**：⬜ 待處理 / ✅ 已完成

---

## 🎉 完成後的效果

統一完成後，您的所有頁面將擁有：

✨ **一致的視覺體驗**  
✨ **流暢的互動動畫**  
✨ **完美的響應式設計**  
✨ **易於維護的程式碼結構**

只需要在一個 CSS 檔案（`theme-toggle-unified.css`）中修改，就能同步更新所有頁面的按鈕樣式！

---

**祝您實施順利！** 🚀
