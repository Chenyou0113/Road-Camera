// 現代化導航列組件
function createNavbar(currentPage = '') {
    const pages = [
        { 
            category: '交通監控', 
            items: [
                { id: 'highway', icon: 'fa-road', text: '國道監視器', color: '#2196F3', file: 'highway.html' },
                { id: 'road', icon: 'fa-traffic-light', text: '省道監視器', color: '#FF9800', file: 'road.html' },
                { id: 'city', icon: 'fa-city', text: '市區道路', color: '#4CAF50', file: 'city.html' }
            ]
        },
        { 
            category: '環境監控', 
            items: [
                { id: 'water', icon: 'fa-water', text: '水資源', color: '#00BCD4', file: 'water.html' },
                { id: 'soil-observation', icon: 'fa-mountain', text: '河川流域', color: '#8D6E63', file: 'soil-observation.html' },
                { id: 'air-quality', icon: 'fa-wind', text: '空氣品質', color: '#9C27B0', file: 'air-quality.html' }
            ]
        },
        { 
            category: '災防監控', 
            items: [
                { id: 'debris-flow', icon: 'fa-mountain', text: '土石流', color: '#795548', file: 'debris-flow.html' },
                { id: 'landslide-monitoring', icon: 'fa-layer-group', text: '邊坡監測', color: '#FF5722', file: 'landslide-monitoring.html' }
            ]
        }
    ];

    // 生成分類導航
    const navCategories = pages.map(category => {
        const categoryItems = category.items.map(page => {
            const isActive = currentPage === page.id;
            const activeClass = isActive ? 'nav-item-active' : '';
            const activeIndicator = isActive ? '<span class="active-dot"></span>' : '';
            
            return `
                <a href="${page.file}" class="nav-item ${activeClass}" data-color="${page.color}">
                    <i class="fas ${page.icon}"></i>
                    <span>${page.text}</span>
                    ${activeIndicator}
                </a>
            `;
        }).join('');

        return `
            <div class="nav-category">
                <div class="nav-category-title">${category.category}</div>
                <div class="nav-category-items">
                    ${categoryItems}
                </div>
            </div>
        `;
    }).join('');

    // 返回完整導航列HTML
    return `
        <style>
            .modern-navbar {
                background: linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,249,250,0.95) 100%);
                backdrop-filter: blur(10px);
                padding: 20px;
                margin: 20px 0;
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                position: sticky;
                top: 0;
                z-index: 999;
                border: 1px solid rgba(255,255,255,0.5);
            }

            .navbar-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid rgba(102,126,234,0.1);
            }

            .navbar-brand {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 1.3rem;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .navbar-brand i {
                font-size: 1.5rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .home-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 20px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                text-decoration: none;
                border-radius: 25px;
                font-size: 0.9rem;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 2px 10px rgba(102,126,234,0.3);
            }

            .home-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(102,126,234,0.4);
            }

            .navbar-content {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
            }

            .nav-category {
                background: rgba(255,255,255,0.5);
                padding: 15px;
                border-radius: 12px;
                border: 1px solid rgba(0,0,0,0.05);
            }

            .nav-category-title {
                font-size: 0.85rem;
                font-weight: 700;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 12px;
                padding-left: 5px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .nav-category-title::before {
                content: '';
                width: 3px;
                height: 14px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 2px;
            }

            .nav-category-items {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .nav-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 15px;
                background: white;
                color: #333;
                text-decoration: none;
                border-radius: 10px;
                font-size: 0.95rem;
                font-weight: 500;
                transition: all 0.3s ease;
                position: relative;
                border: 2px solid transparent;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            }

            .nav-item i {
                font-size: 1.1rem;
                width: 20px;
                text-align: center;
                transition: transform 0.3s ease;
            }

            .nav-item:hover {
                transform: translateX(5px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .nav-item:hover i {
                transform: scale(1.2);
            }

            .nav-item-active {
                font-weight: 700;
                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            }

            .active-dot {
                position: absolute;
                right: 12px;
                width: 8px;
                height: 8px;
                background: #4CAF50;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.5;
                    transform: scale(1.3);
                }
            }

            /* 手機版樣式 */
            @media (max-width: 768px) {
                .modern-navbar {
                    padding: 15px;
                }

                .navbar-header {
                    flex-direction: column;
                    gap: 15px;
                    text-align: center;
                }

                .navbar-content {
                    grid-template-columns: 1fr;
                }

                .nav-item {
                    font-size: 0.9rem;
                    padding: 12px 15px;
                }
            }

            /* 動態顏色效果 */
            .nav-item[data-color="#2196F3"]:hover { border-color: #2196F3; color: #2196F3; }
            .nav-item[data-color="#FF9800"]:hover { border-color: #FF9800; color: #FF9800; }
            .nav-item[data-color="#4CAF50"]:hover { border-color: #4CAF50; color: #4CAF50; }
            .nav-item[data-color="#00BCD4"]:hover { border-color: #00BCD4; color: #00BCD4; }
            .nav-item[data-color="#8D6E63"]:hover { border-color: #8D6E63; color: #8D6E63; }
            .nav-item[data-color="#9C27B0"]:hover { border-color: #9C27B0; color: #9C27B0; }
            .nav-item[data-color="#795548"]:hover { border-color: #795548; color: #795548; }
            .nav-item[data-color="#FF5722"]:hover { border-color: #FF5722; color: #FF5722; }

            .nav-item-active[data-color="#2196F3"] { border-color: #2196F3; background: linear-gradient(135deg, #E3F2FD, #BBDEFB); }
            .nav-item-active[data-color="#FF9800"] { border-color: #FF9800; background: linear-gradient(135deg, #FFF3E0, #FFE0B2); }
            .nav-item-active[data-color="#4CAF50"] { border-color: #4CAF50; background: linear-gradient(135deg, #E8F5E9, #C8E6C9); }
            .nav-item-active[data-color="#00BCD4"] { border-color: #00BCD4; background: linear-gradient(135deg, #E0F7FA, #B2EBF2); }
            .nav-item-active[data-color="#8D6E63"] { border-color: #8D6E63; background: linear-gradient(135deg, #EFEBE9, #D7CCC8); }
            .nav-item-active[data-color="#9C27B0"] { border-color: #9C27B0; background: linear-gradient(135deg, #F3E5F5, #E1BEE7); }
            .nav-item-active[data-color="#795548"] { border-color: #795548; background: linear-gradient(135deg, #EFEBE9, #D7CCC8); }
            .nav-item-active[data-color="#FF5722"] { border-color: #FF5722; background: linear-gradient(135deg, #FBE9E7, #FFCCBC); }
        </style>
        
        <nav class="modern-navbar">
            <div class="navbar-header">
                <div class="navbar-brand">
                    <i class="fas fa-video"></i>
                    台灣即時監控系統
                </div>
                <a href="index.html" class="home-btn">
                    <i class="fas fa-home"></i>
                    返回首頁
                </a>
            </div>
            <div class="navbar-content">
                ${navCategories}
            </div>
        </nav>
    `;
}

// 導航列已停用 - 改為使用各頁面頂部的返回按鈕
// 如需在特定頁面啟用導航列，可調用 createNavbar(currentPage) 函數
