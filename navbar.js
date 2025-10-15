// 統一導航列組件
function createNavbar(currentPage = '') {
    const pages = [
        { id: 'index', icon: 'fa-home', text: '首頁', color: '#667eea', file: 'index.html' },
        { id: 'highway', icon: 'fa-road', text: '國道', color: '#2196F3', file: 'highway.html' },
        { id: 'road', icon: 'fa-traffic-light', text: '公路', color: '#FF9800', file: 'road.html' },
        { id: 'city', icon: 'fa-city', text: '市區', color: '#4CAF50', file: 'city.html' },
        { id: 'water', icon: 'fa-water', text: '水利', color: '#00BCD4', file: 'water-resources.html' },
        { id: 'air-quality', icon: 'fa-wind', text: '空品', color: '#9C27B0', file: 'air-quality.html' },
        { id: 'debris-flow', icon: 'fa-mountain', text: '土石流', color: '#795548', file: 'debris-flow.html' },
        { id: 'soil-monitoring', icon: 'fa-layer-group', text: '土砂觀測', color: '#8D6E63', file: 'soil-monitoring.html' },
        { id: 'water-gov', icon: 'fa-video', text: '水利署', color: '#3F51B5', file: 'water-gov.html' },
        { id: 'water-local', icon: 'fa-camera', text: '地方合建', color: '#009688', file: 'water-local.html' }
    ];

    const navItems = pages.map(page => {
        const isActive = currentPage === page.id;
        const activeStyle = isActive ? `border: 2px solid ${page.color}; font-weight: bold;` : '';
        const checkmark = isActive ? ' ✓' : '';
        
        return `
            <a href="${page.file}" style="padding: 8px 16px; background: ${page.color}; color: white; text-decoration: none; border-radius: 20px; font-size: 0.9rem; transition: all 0.3s; display: inline-flex; align-items: center; gap: 6px; ${activeStyle}">
                <i class="fas ${page.icon}"></i> ${page.text}${checkmark}
            </a>
        `;
    }).join('\n');

    return `
        <div style="background: white; padding: 15px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 99;">
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center;">
                ${navItems}
            </div>
        </div>
    `;
}

// 自動插入導航列
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.container');
    if (container && window.CURRENT_PAGE) {
        const navbar = document.createElement('div');
        navbar.innerHTML = createNavbar(window.CURRENT_PAGE);
        container.insertBefore(navbar.firstElementChild, container.firstChild);
    }
});
