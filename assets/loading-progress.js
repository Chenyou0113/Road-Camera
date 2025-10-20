// 全域載入進度條組件
class LoadingProgressBar {
    constructor(options = {}) {
        this.options = {
            color: options.color || '#667eea',
            height: options.height || '3px',
            speed: options.speed || 300,
            trickle: options.trickle !== false,
            trickleSpeed: options.trickleSpeed || 200,
            showLabel: options.showLabel !== false,
            labelText: options.labelText || '載入中...',
            position: options.position || 'top',
            ...options
        };
        
        this.progress = 0;
        this.isStarted = false;
        this.isFinished = false;
        this.timer = null;
        this.element = null;
        
        this.createProgressBar();
    }
    
    createProgressBar() {
        // 創建進度條容器
        this.element = document.createElement('div');
        this.element.className = 'loading-progress-container';
        this.element.innerHTML = `
            <div class="loading-progress-bar">
                <div class="loading-progress-fill"></div>
                <div class="loading-progress-glow"></div>
            </div>
            ${this.options.showLabel ? `<div class="loading-progress-label">${this.options.labelText}</div>` : ''}
        `;
        
        // 添加樣式
        this.addStyles();
        
        // 隱藏進度條
        this.element.style.display = 'none';
        document.body.appendChild(this.element);
    }
    
    addStyles() {
        if (document.getElementById('loading-progress-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'loading-progress-styles';
        style.textContent = `
            .loading-progress-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10000;
                pointer-events: none;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(2px);
                transition: opacity 0.3s ease;
            }
            
            .loading-progress-bar {
                position: relative;
                height: ${this.options.height};
                background: rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            .loading-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, ${this.options.color}, ${this.options.color}AA, ${this.options.color});
                width: 0%;
                transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                box-shadow: 0 0 10px ${this.options.color}66;
            }
            
            .loading-progress-glow {
                position: absolute;
                top: 0;
                right: 0;
                height: 100%;
                width: 50px;
                background: linear-gradient(90deg, transparent, ${this.options.color}77, transparent);
                transform: translateX(100%);
                animation: progressGlow 2s infinite;
            }
            
            .loading-progress-label {
                text-align: center;
                padding: 12px 20px;
                font-family: 'Microsoft JhengHei', Arial, sans-serif;
                font-size: 14px;
                color: #333;
                font-weight: 500;
                background: rgba(255, 255, 255, 0.95);
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            @keyframes progressGlow {
                0% { transform: translateX(-100%); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateX(200%); opacity: 0; }
            }
            
            /* 深色模式樣式 */
            body.dark-mode .loading-progress-container {
                background: rgba(40, 40, 50, 0.95);
            }
            
            body.dark-mode .loading-progress-bar {
                background: rgba(255, 255, 255, 0.1);
            }
            
            body.dark-mode .loading-progress-label {
                color: #e0e0e0;
                background: rgba(40, 40, 50, 0.95);
                border-bottom-color: rgba(255, 255, 255, 0.1);
            }
            
            /* 隱藏狀態 */
            .loading-progress-container.hidden {
                opacity: 0;
                pointer-events: none;
            }
            
            /* 不同位置選項 */
            .loading-progress-container.bottom {
                top: auto;
                bottom: 0;
            }
        `;
        document.head.appendChild(style);
    }
    
    start() {
        if (this.isStarted) return this;
        
        this.isStarted = true;
        this.isFinished = false;
        this.progress = 0;
        
        // 顯示進度條
        this.element.style.display = 'block';
        this.element.classList.remove('hidden');
        
        // 開始進度
        this.set(0);
        
        if (this.options.trickle) {
            this.trickle();
        }
        
        return this;
    }
    
    set(percentage) {
        this.progress = Math.max(0, Math.min(100, percentage));
        const fillElement = this.element.querySelector('.loading-progress-fill');
        if (fillElement) {
            fillElement.style.width = this.progress + '%';
        }
        return this;
    }
    
    inc(amount) {
        if (!this.isStarted) return this;
        
        if (amount == null) {
            if (this.progress >= 0 && this.progress < 20) amount = 10;
            else if (this.progress >= 20 && this.progress < 50) amount = 4;
            else if (this.progress >= 50 && this.progress < 80) amount = 2;
            else if (this.progress >= 80 && this.progress < 99) amount = 0.5;
            else amount = 0;
        }
        
        this.set(this.progress + amount);
        return this;
    }
    
    trickle() {
        if (!this.isStarted) return;
        
        this.inc();
        this.timer = setTimeout(() => {
            if (this.isStarted && this.progress < 99) {
                this.trickle();
            }
        }, this.options.trickleSpeed);
    }
    
    finish() {
        if (!this.isStarted) return this;
        
        this.isFinished = true;
        clearTimeout(this.timer);
        
        // 快速完成到100%
        this.set(100);
        
        // 延遲隱藏
        setTimeout(() => {
            this.hide();
        }, this.options.speed);
        
        return this;
    }
    
    hide() {
        if (!this.isStarted) return this;
        
        this.element.classList.add('hidden');
        
        setTimeout(() => {
            this.element.style.display = 'none';
            this.isStarted = false;
            this.progress = 0;
        }, 300);
        
        return this;
    }
    
    updateLabel(text) {
        const labelElement = this.element.querySelector('.loading-progress-label');
        if (labelElement) {
            labelElement.textContent = text;
        }
        return this;
    }
    
    setColor(color) {
        this.options.color = color;
        const fillElement = this.element.querySelector('.loading-progress-fill');
        if (fillElement) {
            fillElement.style.background = `linear-gradient(90deg, ${color}, ${color}AA, ${color})`;
            fillElement.style.boxShadow = `0 0 10px ${color}66`;
        }
        return this;
    }
}

// 創建全域實例
window.LoadingProgress = new LoadingProgressBar();

// 便捷方法
window.startLoading = (options) => {
    if (options) {
        window.LoadingProgress = new LoadingProgressBar(options);
    }
    return window.LoadingProgress.start();
};

window.setLoadingProgress = (percentage) => {
    return window.LoadingProgress.set(percentage);
};

window.incLoadingProgress = (amount) => {
    return window.LoadingProgress.inc(amount);
};

window.updateLoadingLabel = (text) => {
    return window.LoadingProgress.updateLabel(text);
};

window.finishLoading = () => {
    return window.LoadingProgress.finish();
};

// 自動監聽頁面載入事件
document.addEventListener('DOMContentLoaded', () => {
    // 如果頁面有特定的載入需求，可以自動啟動
    if (window.AUTO_START_LOADING !== false) {
        window.startLoading();
        
        // 模擬載入進度
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 90) {
                clearInterval(interval);
                progress = 90;
            }
            window.setLoadingProgress(progress);
        }, 200);
        
        // 當頁面完全載入後完成進度
        window.addEventListener('load', () => {
            clearInterval(interval);
            setTimeout(() => {
                window.finishLoading();
            }, 300);
        });
    }
});

// API 請求進度監聽器
if (typeof fetch !== 'undefined') {
    const originalFetch = window.fetch;
    let activeRequests = 0;
    
    window.fetch = async (...args) => {
        activeRequests++;
        if (activeRequests === 1) {
            window.startLoading({
                labelText: '載入資料中...',
                color: '#667eea'
            });
        }
        
        try {
            const response = await originalFetch(...args);
            return response;
        } finally {
            activeRequests--;
            if (activeRequests === 0) {
                setTimeout(() => {
                    window.finishLoading();
                }, 200);
            }
        }
    };
}