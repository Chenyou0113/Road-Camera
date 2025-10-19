// 深色模式管理腳本
(function() {
    // 創建深色模式切換按鈕
    const darkModeToggle = document.createElement('button');
    darkModeToggle.className = 'dark-mode-toggle';
    darkModeToggle.id = 'darkModeToggle';
    darkModeToggle.title = '切換深色模式';
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    document.body.appendChild(darkModeToggle);

    const darkModeIcon = darkModeToggle.querySelector('i');
    
    // 從 localStorage 載入深色模式狀態
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeIcon.className = 'fas fa-moon';
    }
    
    // 切換深色模式
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // 更新圖標
        if (isDarkMode) {
            darkModeIcon.className = 'fas fa-moon';
        } else {
            darkModeIcon.className = 'fas fa-sun';
        }
        
        // 儲存狀態
        localStorage.setItem('darkMode', isDarkMode);
    });
})();
