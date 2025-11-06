// 水利署監視器示範資料生成器

// 生成示範資料
function generateDemoData() {
    const locations = [
        { name: '淡水河', location: '新北市淡水區', type: 'direct', river: '淡水河' },
        { name: '大漢溪', location: '新北市樹林區', type: 'direct', river: '淡水河' },
        { name: '新店溪', location: '新北市新店區', type: 'local', river: '淡水河' },
        { name: '基隆河', location: '台北市內湖區', type: 'direct', river: '淡水河' },
        { name: '磺溪', location: '台北市北投區', type: 'local', river: '淡水河' },
        { name: '景美溪', location: '台北市文山區', type: 'local', river: '淡水河' },
        { name: '頭前溪', location: '新竹縣竹北市', type: 'direct', river: '頭前溪' },
        { name: '中港溪', location: '苗栗縣竹南鎮', type: 'direct', river: '中港溪' },
        { name: '大安溪', location: '台中市后里區', type: 'local', river: '大安溪' },
        { name: '烏溪', location: '台中市烏日區', type: 'direct', river: '烏溪' },
        { name: '濁水溪', location: '彰化縣溪州鄉', type: 'direct', river: '濁水溪' },
        { name: '北港溪', location: '雲林縣北港鎮', type: 'local', river: '北港溪' },
        { name: '朴子溪', location: '嘉義縣朴子市', type: 'direct', river: '朴子溪' },
        { name: '八掌溪', location: '嘉義市西區', type: 'local', river: '八掌溪' },
        { name: '急水溪', location: '台南市鹽水區', type: 'direct', river: '急水溪' },
        { name: '曾文溪', location: '台南市官田區', type: 'direct', river: '曾文溪' },
        { name: '鹽水溪', location: '台南市安南區', type: 'local', river: '鹽水溪' },
        { name: '二仁溪', location: '高雄市湖內區', type: 'local', river: '二仁溪' },
        { name: '阿公店溪', location: '高雄市燕巢區', type: 'direct', river: '阿公店溪' },
        { name: '高屏溪', location: '高雄市大樹區', type: 'direct', river: '高屏溪' },
        { name: '東港溪', location: '屏東縣東港鎮', type: 'local', river: '東港溪' },
        { name: '林邊溪', location: '屏東縣林邊鄉', type: 'direct', river: '林邊溪' },
        { name: '卑南溪', location: '台東縣卑南鄉', type: 'direct', river: '卑南溪' },
        { name: '秀姑巒溪', location: '花蓮縣瑞穗鄉', type: 'local', river: '秀姑巒溪' },
        { name: '花蓮溪', location: '花蓮縣吉安鄉', type: 'direct', river: '花蓮溪' },
        { name: '蘭陽溪', location: '宜蘭縣員山鄉', type: 'direct', river: '蘭陽溪' }
    ];

    const cameras = [];
    
    locations.forEach((loc, index) => {
        // 每個地點生成多個監視器
        const cameraCount = Math.floor(Math.random() * 3) + 2; // 2-4個監視器
        
        for (let i = 0; i < cameraCount; i++) {
            const cameraId = `WRA-${String(index + 1).padStart(3, '0')}-${i + 1}`;
            const isOnline = Math.random() > 0.1; // 90% 線上率
            
            cameras.push({
                id: cameraId,
                name: `${loc.name}監視站 #${i + 1}`,
                location: loc.location,
                river: loc.river,
                type: loc.type,
                status: isOnline ? 'online' : 'offline',
                latitude: 25.0330 + (Math.random() - 0.5) * 2,
                longitude: 121.5654 + (Math.random() - 0.5) * 2,
                altitude: Math.floor(Math.random() * 500),
                imageUrl: isOnline ? generatePlaceholderImage(loc.name, i + 1) : null,
                lastUpdate: isOnline ? new Date().toISOString() : null,
                waterLevel: isOnline ? (Math.random() * 5).toFixed(2) : null,
                flow: isOnline ? Math.floor(Math.random() * 1000) : null
            });
        }
    });

    return cameras;
}

// 生成佔位圖片 URL
function generatePlaceholderImage(name, num) {
    const colors = ['4a90e2', '50c878', 'e94b3c', 'f39c12', '9b59b6', '1abc9c'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const encodedText = encodeURIComponent(`${name} #${num}`);
    return `https://via.placeholder.com/800x600/${color}/ffffff?text=${encodedText}`;
}

// 更新統計數據
function updateStats() {
    const total = allCameras.length;
    const direct = allCameras.filter(c => c.type === 'direct').length;
    const local = allCameras.filter(c => c.type === 'local').length;
    const active = allCameras.filter(c => c.status === 'online').length;

    document.getElementById('totalCameras').textContent = total;
    document.getElementById('directCameras').textContent = direct;
    document.getElementById('localCameras').textContent = local;
    document.getElementById('activeCameras').textContent = active;
}

// 更新時間顯示
function updateTime() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? '下午' : '上午';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    
    const timeString = `${month}/${day} ${period}${String(displayHours).padStart(2, '0')}:${minutes}`;
    document.getElementById('currentTime').textContent = timeString;
}

// 渲染監視器卡片
function renderCameras() {
    const container = document.getElementById('camerasContainer');
    
    if (filteredCameras.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <h3>找不到符合條件的監視器</h3>
                <p>請調整篩選條件或搜尋關鍵字</p>
            </div>
        `;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'cameras-grid';

    filteredCameras.forEach(camera => {
        const card = createCameraCard(camera);
        grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

// 創建監視器卡片
function createCameraCard(camera) {
    const card = document.createElement('div');
    card.className = 'camera-card';
    
    const statusClass = camera.status === 'online' ? 'online' : 'offline';
    const statusText = camera.status === 'online' ? '線上' : '離線';
    const statusIcon = camera.status === 'online' ? 'fa-circle' : 'fa-circle-xmark';
    
    const typeText = camera.type === 'direct' ? '水利署直轄' : '地方合建';
    const typeBadge = camera.type === 'direct' ? 'badge-direct' : 'badge-local';

    let imageContent = '';
    if (camera.status === 'online' && camera.imageUrl) {
        imageContent = `<img src="${camera.imageUrl}" alt="${camera.name}" loading="lazy">`;
    } else {
        imageContent = `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white;">
                <div style="text-align: center;">
                    <i class="fas fa-video-slash" style="font-size: 4em; margin-bottom: 15px;"></i>
                    <p style="font-size: 1.2em;">暫無影像</p>
                </div>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="camera-image">
            ${imageContent}
            <div class="camera-status ${statusClass}">
                <i class="fas ${statusIcon}"></i>
                ${statusText}
            </div>
        </div>
        <div class="camera-info">
            <div class="camera-title">
                <i class="fas fa-video"></i>
                ${camera.name}
            </div>
            <div class="camera-details">
                <div>
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${camera.location}</span>
                </div>
                <div>
                    <i class="fas fa-water"></i>
                    <span>河川：${camera.river}</span>
                </div>
                ${camera.waterLevel ? `
                <div>
                    <i class="fas fa-tint"></i>
                    <span>水位：${camera.waterLevel} 公尺</span>
                </div>
                ` : ''}
                ${camera.flow ? `
                <div>
                    <i class="fas fa-gauge-high"></i>
                    <span>流量：${camera.flow} CMS</span>
                </div>
                ` : ''}
                <div>
                    <i class="fas fa-barcode"></i>
                    <span>編號：${camera.id}</span>
                </div>
            </div>
            <span class="camera-badge ${typeBadge}">${typeText}</span>
        </div>
    `;

    return card;
}

// 篩選監視器
function filterCameras() {
    const agencyFilter = document.getElementById('agencyFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const sortOrder = document.getElementById('sortOrder').value;
    const searchText = document.getElementById('searchInput').value.toLowerCase();

    // 篩選
    filteredCameras = allCameras.filter(camera => {
        // 機關篩選
        if (agencyFilter !== 'all' && camera.type !== agencyFilter) {
            return false;
        }

        // 狀態篩選
        if (statusFilter !== 'all' && camera.status !== statusFilter) {
            return false;
        }

        // 搜尋篩選
        if (searchText) {
            const matchName = camera.name.toLowerCase().includes(searchText);
            const matchLocation = camera.location.toLowerCase().includes(searchText);
            const matchRiver = camera.river.toLowerCase().includes(searchText);
            if (!matchName && !matchLocation && !matchRiver) {
                return false;
            }
        }

        return true;
    });

    // 排序
    switch (sortOrder) {
        case 'name':
            filteredCameras.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
            break;
        case 'location':
            filteredCameras.sort((a, b) => a.location.localeCompare(b.location, 'zh-TW'));
            break;
        case 'status':
            filteredCameras.sort((a, b) => {
                if (a.status === b.status) return 0;
                return a.status === 'online' ? -1 : 1;
            });
            break;
    }

    renderCameras();
}
