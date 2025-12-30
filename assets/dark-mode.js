// 深色模式管理腳本
(function() {
    // 嘗試尋找現有的切換按鈕 (優先使用標準化 ID)
    let themeToggle = document.getElementById('themeToggle') || document.getElementById('darkModeToggle');
    let isDynamic = false;

    // 如果找不到現有按鈕，則創建一個浮動按鈕 (向下相容)
    if (!themeToggle) {
        themeToggle = document.createElement('button');
        themeToggle.className = 'dark-mode-toggle';
        themeToggle.id = 'darkModeToggle';
        themeToggle.title = '切換深色模式';
        document.body.appendChild(themeToggle);
        isDynamic = true;
    }

    // 確保按鈕內有圖示元素
    let icon = themeToggle.querySelector('i');
    if (!icon) {
        icon = document.createElement('i');
        // 預設為月亮 (代表目前是亮色，點擊變深色)
        icon.className = 'fas fa-moon'; 
        themeToggle.appendChild(icon);
    }
    
    // 初始化狀態
    // 同時支援 'theme' (新版 index.html 使用) 與 'darkMode' (舊版使用)
    const savedTheme = localStorage.getItem('theme');
    const savedDarkMode = localStorage.getItem('darkMode');
    const isDark = savedTheme === 'dark' || savedDarkMode === 'true';

    // 應用初始狀態
    if (isDark) {
        document.body.classList.add('dark-mode');
        // 深色模式下顯示太陽 (代表可切換回亮色)
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
    
    // 綁定點擊事件
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isCurrentDark = document.body.classList.contains('dark-mode');
        
        // 更新圖標與儲存狀態
        if (isCurrentDark) {
            icon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            icon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'light');
            localStorage.setItem('darkMode', 'false');
        }
    });

    // 如果是動態建立的舊版按鈕，可能需要額外樣式修正或確保它可見
    if (isDynamic) {
        // 確保預設樣式被套用 (如果原本依賴 dark-mode.css)
        if (!themeToggle.innerHTML.includes('fa-')) {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
})();
