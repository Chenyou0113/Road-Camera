/**
 * 公路監視器綜合平台 - 主要應用邏輯
 * Combined Roads Camera System - Main Application Logic
 */

class CombinedRoadsCameraApp {
    constructor() {
        this.allCameras = [];
        this.filteredCameras = [];
        this.currentCity = '';
        this.currentRoadType = 'all';
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.map = null;
        this.markersLayer = null;
        
        // 從北到南的縣市順序
        this.cityOrder = [
            '基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣',
            '苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣', '嘉義市',
            '嘉義縣', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣',
            '台東縣', '澎湖縣', '金門縣', '連江縣'
        ];
        
        // 縣市坐標範圍定義
        this.cityCoordinates = {
            '台北市': { lat: [25.08, 25.20], lon: [121.45, 121.65] },
            '新北市': { lat: [24.90, 25.30], lon: [121.30, 121.80] },
            '桃園市': { lat: [24.80, 25.05], lon: [121.15, 121.45] },
            '台中市': { lat: [24.05, 24.35], lon: [120.50, 120.85] },
            '台南市': { lat: [22.90, 23.15], lon: [120.10, 120.35] },
            '高雄市': { lat: [22.50, 22.80], lon: [120.25, 120.45] },
            '基隆市': { lat: [25.10, 25.15], lon: [121.70, 121.80] },
            '新竹市': { lat: [24.78, 24.82], lon: [120.95, 121.00] },
            '新竹縣': { lat: [24.60, 24.90], lon: [120.80, 121.20] },
            '苗栗縣': { lat: [24.40, 24.70], lon: [120.70, 121.00] },
            '彰化縣': { lat: [23.85, 24.20], lon: [120.40, 120.70] },
            '南投縣': { lat: [23.60, 24.10], lon: [120.50, 121.20] },
            '雲林縣': { lat: [23.55, 23.85], lon: [120.20, 120.60] },
            '嘉義市': { lat: [23.47, 23.52], lon: [120.43, 120.48] },
            '嘉義縣': { lat: [23.25, 23.60], lon: [120.15, 120.50] },
            '屏東縣': { lat: [22.00, 22.70], lon: [120.40, 120.90] },
            '宜蘭縣': { lat: [24.60, 24.80], lon: [121.50, 122.00] },
            '花蓮縣': { lat: [23.50, 24.50], lon: [121.30, 121.80] },
            '台東縣': { lat: [22.70, 23.50], lon: [120.90, 121.40] },
            '澎湖縣': { lat: [23.50, 23.70], lon: [119.50, 119.70] },
            '金門縣': { lat: [24.40, 24.52], lon: [118.30, 118.45] },
            '連江縣': { lat: [26.15, 26.22], lon: [119.95, 120.00] }
        };

        this.init();
    }

    /**
     * 初始化應用程式
     */
    async init() {
        console.log('🚀 初始化公路監視器綜合平台...');
        
        try {
            // 等待DOM完全準備好
            await this.waitForDOM();
            
            // 初始化地圖
            this.initMap();
            
            // 設置事件監聽器
            this.setupEventListeners();
            
            // 載入監視器資料
            await this.loadCameraData();
            
            // 資料載入完成後，仍然顯示縣市選擇供使用者篩選
            this.showCitySelection();
            
        } catch (error) {
            console.error('❌ 初始化失敗:', error);
            this.showError('系統初始化失敗，請重新整理頁面');
        }
    }

    /**
     * 等待DOM元素準備就緒
     */
    async waitForDOM() {
        const requiredElements = [
            'map', 'city-filter', 'city-buttons', 'camera-grid',
            'loading', 'stat-national', 'stat-expressway', 'stat-provincial'
        ];
        
        return new Promise((resolve, reject) => {
            const checkElements = () => {
                const missingElements = requiredElements.filter(id => !document.getElementById(id));
                
                if (missingElements.length === 0) {
                    console.log('✅ 所有DOM元素都已準備就緒');
                    resolve();
                } else {
                    console.log('⏳ 等待DOM元素:', missingElements);
                    setTimeout(checkElements, 100);
                }
            };
            
            // 最多等待5秒
            setTimeout(() => {
                const missingElements = requiredElements.filter(id => !document.getElementById(id));
                if (missingElements.length > 0) {
                    console.error('❌ DOM元素載入超時，缺少:', missingElements);
                    reject(new Error(`DOM元素載入超時: ${missingElements.join(', ')}`));
                }
            }, 5000);
            
            checkElements();
        });
    }

    /**
     * 初始化 Leaflet 地圖
     */
    initMap() {
        console.log('🗺️ 初始化地圖...');
        
        // 創建地圖實例，設定為適合台灣全島的視野
        this.map = L.map('map').setView([23.8, 120.9], 7);
        
        // 添加地圖圖層
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // 創建標記圖層
        this.markersLayer = L.layerGroup().addTo(this.map);
        
        // 設定地圖最大邊界（台灣地區）
        const taiwanBounds = L.latLngBounds(
            [21.8, 118.0], // 西南角
            [25.5, 122.5]  // 東北角
        );
        this.map.setMaxBounds(taiwanBounds);
        this.map.setMinZoom(6);
        
        console.log('✅ 地圖初始化完成');
    }

    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        // 道路類型篩選
        const roadTypeSelect = document.getElementById('road-type');
        if (roadTypeSelect) {
            roadTypeSelect.addEventListener('change', (e) => {
                this.currentRoadType = e.target.value;
                this.filterAndDisplayCameras();
            });
        }

        // 縣市篩選
        const citySelect = document.getElementById('city-filter');
        if (citySelect) {
            citySelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.selectCity(e.target.value);
                }
            });
        }

        // ESC 鍵關閉模組視窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCameraDetails();
            }
        });
    }

    /**
     * 載入監視器資料
     */
    async loadCameraData() {
        console.log('📡 開始載入監視器資料...');
        
        // 檢查設定
        console.log('🔧 檢查設定:', {
            TDX_CONFIG_available: typeof TDX_CONFIG !== 'undefined',
            CLIENT_ID: TDX_CONFIG?.CLIENT_ID,
            tdxApi_available: typeof tdxApi !== 'undefined'
        });
        
        try {
            const loadingEl = document.getElementById('loading');
            if (loadingEl) loadingEl.style.display = 'block';

            // 獲取 TDX API 令牌
            console.log('🔑 正在獲取 TDX API 令牌...');
            const token = await tdxApi.getAccessToken();
            console.log('✅ Token 獲取成功:', token ? '有Token' : '無Token');
            
            // 並行載入國道和省道資料
            const [freewayData, highwayData] = await Promise.all([
                this.fetchRoadData('/v2/Road/Traffic/CCTV/Freeway?$format=JSON', token),
                this.fetchRoadData('/v2/Road/Traffic/CCTV/Highway?$format=JSON', token)
            ]);

            // 標準化和合併資料
            const nationalCameras = freewayData.map(camera => {
                // TDX API 國道監視器可能的圖片URL欄位
                const imageUrl = camera.SrcImageURL ||     // 國道常用欄位
                                camera.VideoImageURL || 
                                camera.ImageURL || 
                                camera.PictureURL || 
                                camera.SnapshotURL || 
                                camera.LiveImageURL || 
                                camera.CameraImageURL || 
                                camera.ImageUrl ||        // 可能的小寫變體
                                camera.imageURL || 
                                camera.imageUrl || '';
                
                return {
                    ...camera,
                    type: 'national',
                    typeName: '國道',
                    VideoName: this.generateCameraName(camera),
                    VideoImageURL: imageUrl,
                    RoadSectionStart: {
                        PositionLat: camera.PositionLat || camera.Latitude || 0,
                        PositionLon: camera.PositionLon || camera.Longitude || 0
                    },
                    RoadName: camera.RoadName || camera.RoadID || '國道',
                    LocationDescription: this.getCameraLocationDescription(camera)
                };
            });
            
            const provincialCameras = highwayData.map(camera => {
                const roadName = camera.RoadName || camera.RoadID || '';
                const roadId = camera.RoadID || '';
                
                // 改進的快速公路識別邏輯
                const isExpressway = this.isExpresswayRoad(roadName, roadId);
                
                // 嘗試多種可能的圖片URL欄位
                const imageUrl = camera.VideoImageURL || 
                                camera.ImageURL || 
                                camera.PictureURL || 
                                camera.SnapshotURL || 
                                camera.LiveImageURL || 
                                camera.CameraImageURL || '';
                
                return {
                    ...camera,
                    type: isExpressway ? 'expressway' : 'provincial',
                    typeName: isExpressway ? '快速公路' : '省道',
                    VideoName: this.generateCameraName(camera),
                    VideoImageURL: imageUrl,
                    RoadSectionStart: {
                        PositionLat: camera.PositionLat || camera.Latitude || 0,
                        PositionLon: camera.PositionLon || camera.Longitude || 0
                    },
                    RoadName: roadName,
                    LocationDescription: this.getCameraLocationDescription(camera)
                };
            });
            
            this.allCameras = [...nationalCameras, ...provincialCameras];
            
            // 如果沒有載入到任何監視器，添加一些測試資料
            if (this.allCameras.length === 0) {
                console.warn('⚠️ 沒有載入到任何監視器資料，添加測試資料');
                this.allCameras = [
                    {
                        VideoName: '測試國道監視器',
                        RoadName: '國道1號',
                        type: 'national',
                        VideoImageURL: 'https://via.placeholder.com/300x200/ff0000/ffffff?text=國道測試',
                        RoadSectionStart: {
                            PositionLat: 25.0330,
                            PositionLon: 121.5654
                        }
                    },
                    {
                        VideoName: '測試省道監視器',
                        RoadName: '台1線',
                        type: 'provincial',
                        VideoImageURL: 'https://via.placeholder.com/300x200/00ff00/ffffff?text=省道測試',
                        RoadSectionStart: {
                            PositionLat: 25.0430,
                            PositionLon: 121.5754
                        }
                    }
                ];
            }
            
            console.log(`✅ 成功載入 ${this.allCameras.length} 個監視器`);
            console.log('📊 分類統計:', {
                國道: nationalCameras.length,
                省道快速: provincialCameras.length
            });
            
            // 檢查是否有監視器具有圖片URL
            const camerasWithImages = this.allCameras.filter(camera => camera.VideoImageURL && camera.VideoImageURL !== '');
            console.log(`📷 具有圖片URL的監視器: ${camerasWithImages.length} / ${this.allCameras.length}`);
            
            if (camerasWithImages.length > 0) {
                console.log('✅ 第一個有圖片的監視器:', {
                    name: camerasWithImages[0].VideoName,
                    imageUrl: camerasWithImages[0].VideoImageURL,
                    type: camerasWithImages[0].type
                });
            } else {
                console.warn('⚠️ 沒有找到任何具有圖片URL的監視器！');
            }
            
            // 分類資料並更新統計
            this.updateStatistics();
            
            // 更新縣市選項
            this.updateCityOptions();
            
            // 在地圖上顯示所有監視器點位
            this.showAllCamerasOnMap();
            
        } catch (error) {
            console.error('❌ 載入監視器資料失敗:', error);
            
            let errorMessage = '載入監視器資料失敗';
            if (error.message.includes('CORS')) {
                errorMessage = 'CORS錯誤：請檢查網路設定或使用支援CORS的環境';
            } else if (error.message.includes('fetch')) {
                errorMessage = '網路錯誤：無法連接到TDX API服務';
            } else if (error.message.includes('401')) {
                errorMessage = 'API認證失敗：請檢查CLIENT_ID和CLIENT_SECRET';
            } else if (error.message.includes('403')) {
                errorMessage = 'API權限不足：請檢查API金鑰權限';
            }
            
            this.showError(errorMessage + '\n\n詳細錯誤：' + error.message);
        } finally {
            const loadingEl = document.getElementById('loading');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    /**
     * 從 API 獲取道路資料
     */
    async fetchRoadData(endpoint, token) {
        try {
            console.log(`📡 正在載入: ${endpoint}`);
            const data = await tdxApi.fetchCCTV(endpoint);
            
            // 處理不同的資料格式
            let cameras = [];
            if (Array.isArray(data)) {
                cameras = data;
            } else if (data && data.CCTVs && Array.isArray(data.CCTVs)) {
                cameras = data.CCTVs;
            } else if (data && Array.isArray(data.data)) {
                cameras = data.data;
            }
            
            // 調試：檢查前幾個監視器的資料結構
            if (cameras.length > 0) {
                console.log(`🔍 資料結構調試 (${endpoint}):`);
                console.log('第一個監視器的完整資料:', cameras[0]);
                console.log('可能的圖片URL欄位:', {
                    VideoImageURL: cameras[0].VideoImageURL,
                    ImageURL: cameras[0].ImageURL,
                    PictureURL: cameras[0].PictureURL,
                    SnapshotURL: cameras[0].SnapshotURL,
                    LiveImageURL: cameras[0].LiveImageURL
                });
            }
            
            console.log(`✅ 載入完成: ${cameras.length} 個監視器`);
            return cameras;
            
        } catch (error) {
            console.error(`❌ 獲取資料失敗 (${endpoint}):`, error);
            return [];
        }
    }

    /**
     * 判斷是否為快速公路
     */
    isExpresswayRoad(roadName, roadId) {
        if (!roadName && !roadId) return false;
        
        const name = (roadName || '').toString().toLowerCase();
        const id = (roadId || '').toString().toLowerCase();
        const combined = `${name} ${id}`.toLowerCase();
        
        // 快速公路識別模式
        const expresswayPatterns = [
            // 明確的快速公路關鍵字
            '快速公路', '快速道路', '快速路', 'expressway',
            // 台61線西濱快速道路
            '台61', '西濱', '西部濱海快速公路',
            // 完整的快速道路編號系統
            '台15', '台17', '台31', '台37', '台39', '台61', // 南北向快速道路
            '台62', '台63', '台64', '台65', '台66', '台68', '台72', '台74', '台76', '台78', '台82', '台84', '台86', '台88', // 東西向快速道路
            // 其他快速道路模式
            '東西向快速', '南北向快速', '環河快速', '建國快速', '信義快速',
            // 特殊快速道路名稱
            '中彰快速', '中投快速', '台中環線', '高雄環線', '淡金路快速道路',
            // 都會區快速道路
            '建國高架', '新生高架', '環河南路', '環河北路', '水源快速道路'
        ];
        
        // 特別處理台灣快速道路編號 (台XX線格式)
        const taiwanExpresswayNumbers = [
            '15', '17', '31', '37', '39', '61', // 南北向
            '62', '63', '64', '65', '66', '68', '72', '74', '76', '78', '82', '84', '86', '88' // 東西向
        ];
        
        // 檢查台XX線格式
        for (const num of taiwanExpresswayNumbers) {
            if (combined.includes(`台${num}線`) || 
                combined.includes(`台${num}`) ||
                name.includes(`台${num}線`) || 
                name.includes(`台${num}`) ||
                id.includes(`台${num}線`) || 
                id.includes(`台${num}`)) {
                return true;
            }
        }
        
        // 檢查是否匹配其他快速公路模式
        return expresswayPatterns.some(pattern => 
            combined.includes(pattern) || 
            name.includes(pattern) || 
            id.includes(pattern)
        );
    }

    /**
     * 創建影片元素
     */
    createVideoElement(camera, noVideoPlaceholder, errorPlaceholder) {
        const videoUrl = this.getVideoStreamUrl(camera);
        const imageUrl = camera.VideoImageURL || camera.ImageURL || noVideoPlaceholder;
        
        if (videoUrl) {
            return `
                <div class="video-container">
                    <video class="camera-video" 
                           autoplay 
                           muted 
                           loop 
                           playsinline
                           poster="${imageUrl}"
                           onloadstart="this.style.display='block'; this.nextElementSibling.style.display='none';"
                           onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <source src="${videoUrl}" type="video/mp4">
                        <source src="${videoUrl.replace('.mp4', '.webm')}" type="video/webm">
                        <source src="${videoUrl.replace('.mp4', '.m3u8')}" type="application/x-mpegURL">
                        您的瀏覽器不支援影片播放
                    </video>
                    <img class="camera-image fallback-image" 
                         src="${imageUrl}" 
                         alt="${camera.VideoName || '監視器'}"
                         style="display: none;"
                         onerror="this.src='${errorPlaceholder}'">
                    <div class="video-controls">
                        <button class="play-pause-btn" onclick="app.toggleVideoPlayback(this)">
                            <i class="fas fa-pause"></i>
                        </button>
                        <button class="fullscreen-btn" onclick="app.toggleFullscreen(this)">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
            `;
        } else {
            // 如果沒有影片來源，使用靜態圖片
            const refreshInterval = camera.type === 'national' ? 60000 : 30000; // 國道60秒，其他30秒
            
            // 檢查是否有有效的圖片URL
            if (!imageUrl || imageUrl === noVideoPlaceholder) {
                console.warn('⚠️ 監視器無圖片URL:', camera.VideoName, camera);
                return `
                    <div class="image-container">
                        <img class="camera-image" 
                             src="${noVideoPlaceholder}" 
                             alt="無影像資料"
                             onload="this.style.opacity='1'">
                        <div class="image-badge"><i class="fas fa-exclamation-triangle"></i> 無影像資料</div>
                    </div>
                `;
            }
            
            // 清理和驗證圖片URL
            let finalImageUrl = imageUrl.trim();
            if (!finalImageUrl.startsWith('http')) {
                console.warn('⚠️ 非 HTTP URL:', finalImageUrl);
                finalImageUrl = noVideoPlaceholder;
            }
            
            console.log('📷 正在載入圖片:', {
                camera: camera.VideoName,
                type: camera.type,
                url: finalImageUrl
            });
            
            return `
                <div class="image-container">
                    <img class="camera-image" 
                         src="${finalImageUrl}${finalImageUrl.includes('?') ? '&' : '?'}t=${Date.now()}" 
                         alt="${camera.VideoName || '監視器'}"
                         onload="console.log('✅ 圖片載入成功:', '${camera.VideoName}'); this.style.opacity='1'; app.scheduleImageRefresh(this, '${finalImageUrl}', ${refreshInterval})"
                         onerror="console.error('❌ 圖片載入失敗:', '${camera.VideoName}', '${finalImageUrl}'); this.src='${errorPlaceholder}'; this.alt='圖片載入失敗'">
                    ${camera.type === 'national' ? '<div class="image-badge"><i class="fas fa-camera"></i> 即時影像</div>' : ''}
                    ${camera.type === 'national' ? `<button class="image-refresh-btn" onclick="app.refreshCameraImage(this, '${finalImageUrl}')" title="重新載入圖片"><i class="fas fa-sync-alt"></i></button>` : ''}
                </div>
            `;
        }
    }

    /**
     * 獲取影片串流 URL
     */
    getVideoStreamUrl(camera) {
        // 檢查各種可能的影片來源欄位
        const possibleVideoFields = [
            'VideoStreamURL',
            'videoStreamURL', 
            'VideoURL',
            'videoURL',
            'StreamURL',
            'streamURL',
            'LiveURL',
            'liveURL',
            'RTMPURL',
            'rtmpURL'
        ];
        
        for (const field of possibleVideoFields) {
            if (camera[field]) {
                return camera[field];
            }
        }
        
        // 國道監視器通常不提供影片流，直接返回null使用靜態圖片
        if (camera.type === 'national') {
            return null;
        }
        
        // 對於省道和快速公路，嘗試將圖片 URL 轉換為影片 URL
        if (camera.VideoImageURL && (camera.type === 'provincial' || camera.type === 'expressway')) {
            const imageUrl = camera.VideoImageURL;
            // 嘗試一些常見的轉換模式
            const videoUrl = imageUrl
                .replace(/\.jpg$/i, '.mp4')
                .replace(/\.jpeg$/i, '.mp4')
                .replace(/\.png$/i, '.mp4')
                .replace('/snapshot/', '/stream/')
                .replace('/image/', '/video/')
                .replace('/img/', '/stream/')
                .replace('/picture/', '/live/')
                .replace('_s.jpg', '.mp4')
                .replace('_snapshot.jpg', '_stream.mp4');
            
            if (videoUrl !== imageUrl) {
                return videoUrl;
            }
        }
        
        return null;
    }

    /**
     * 產生佔位圖片 Data URL
     */
    generatePlaceholderImage(width, height, text, bgColor = '#e5e7eb', textColor = '#6b7280') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // 背景
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        
        // 文字
        ctx.fillStyle = textColor;
        ctx.font = '16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 自動換行
        const lines = text.split('\n');
        const lineHeight = 20;
        const startY = height / 2 - (lines.length - 1) * lineHeight / 2;
        
        lines.forEach((line, index) => {
            ctx.fillText(line, width / 2, startY + index * lineHeight);
        });
        
        return canvas.toDataURL();
    }

    /**
     * 生成監視器名稱
     */
    generateCameraName(camera) {
        // 如果已經有明確的監視器名稱且不是道路名稱
        if (camera.VideoName && 
            camera.VideoName !== camera.RoadName && 
            camera.VideoName !== camera.RoadID &&
            !camera.VideoName.match(/^台\d+線?$/) &&
            camera.VideoName.length > 5) {  // 避免太短的名稱
            return camera.VideoName;
        }
        
        // 生成更有意義的名稱
        let name = '';
        
        // 道路名稱
        const roadName = camera.RoadName || camera.RoadID || '';
        if (roadName) {
            name = roadName;
        }
        
        // 檢查所有可能的資料來源
        const possibleSources = [
            camera.RoadSectionStart, 
            camera.RoadSectionEnd, 
            camera,
            camera.LocationInfo
        ].filter(Boolean);
        
        let hasLocationInfo = false;
        
        // 添加里程數
        for (const source of possibleSources) {
            const mileageFields = ['Mileage', 'mileage', 'Kilometer', 'kilometer', 'KM', 'km'];
            for (const field of mileageFields) {
                if (source[field] && source[field] !== 0) {
                    name += ` ${source[field]}K`;
                    hasLocationInfo = true;
                    break;
                }
            }
            if (hasLocationInfo) break;
        }
        
        // 添加方向
        for (const source of possibleSources) {
            const directionFields = ['Direction', 'direction', 'Dir', 'dir'];
            for (const field of directionFields) {
                if (source[field]) {
                    let dir = source[field].toString();
                    if (dir.match(/^[NSEW]$/i)) {
                        const dirMap = { 'N': '北', 'S': '南', 'E': '東', 'W': '西' };
                        dir = dirMap[dir.toUpperCase()] || dir;
                    }
                    name += ` ${dir}${dir.includes('向') ? '' : '向'}`;
                    hasLocationInfo = true;
                    break;
                }
            }
            if (hasLocationInfo) break;
        }
        
        // 添加位置名稱或描述
        const locationFields = ['LocationName', 'locationName', 'LocationDescription', 'Description'];
        for (const field of locationFields) {
            if (camera[field] && 
                camera[field] !== '位置資訊不可用' &&
                !camera[field].match(/^\d+\.\d+,\s*\d+\.\d+$/) && // 不是坐標
                !name.includes(camera[field]) &&
                camera[field].length > 2) {
                name += ` ${camera[field]}`;
                hasLocationInfo = true;
                break;
            }
        }
        
        // 如果沒有其他資訊，根據坐標生成簡單的地理位置
        if (!hasLocationInfo && camera.RoadSectionStart) {
            const lat = camera.RoadSectionStart.PositionLat;
            const lon = camera.RoadSectionStart.PositionLon;
            if (lat && lon) {
                const city = this.getCityFromCoordinates(lat, lon);
                if (city && city !== '未知' && city !== '其他縣市') {
                    name += ` ${city}`;
                }
            }
        }
        
        return name || camera.VideoName || camera.LocationName || '未命名監視器';
    }

    /**
     * 獲取監視器位置描述（優先顯示里程數和方向）
     */
    getCameraLocationDescription(camera) {
        let description = '';
        
        // 嘗試從多個可能的資料來源獲取位置資訊
        const possibleSources = [
            camera.RoadSectionStart,
            camera.RoadSectionEnd,
            camera
        ];
        
        // 檢查每個可能的資料來源
        for (const source of possibleSources) {
            if (!source) continue;
            
            let tempDesc = '';
            
            // 里程數 - 檢查多種可能的欄位名
            const mileageFields = ['Mileage', 'mileage', 'Kilometer', 'kilometer', 'KM', 'km'];
            for (const field of mileageFields) {
                if (source[field] && source[field] !== 0) {
                    tempDesc += `${source[field]}K`;
                    break;
                }
            }
            
            // 方向 - 檢查多種可能的欄位名
            const directionFields = ['Direction', 'direction', 'Dir', 'dir', 'Bearing', 'bearing'];
            for (const field of directionFields) {
                if (source[field]) {
                    if (tempDesc) tempDesc += ' ';
                    // 處理不同的方向格式
                    let dir = source[field].toString();
                    if (dir.match(/^[NSEW]$/i)) {
                        const dirMap = { 'N': '北', 'S': '南', 'E': '東', 'W': '西' };
                        dir = dirMap[dir.toUpperCase()] || dir;
                    }
                    tempDesc += `${dir}${dir.includes('方向') ? '' : '方向'}`;
                    break;
                }
            }
            
            // 位置名稱 - 檢查多種可能的欄位名
            const locationFields = ['LocationName', 'locationName', 'Location', 'location', 'Place', 'place'];
            for (const field of locationFields) {
                if (source[field] && source[field] !== '位置資訊不可用' && source[field].trim()) {
                    if (tempDesc) tempDesc += ' - ';
                    tempDesc += source[field];
                    break;
                }
            }
            
            if (tempDesc) {
                description = tempDesc;
                break;
            }
        }
        
        // 如果仍然沒有找到合適的描述，嘗試使用原始的 LocationDescription
        if (!description) {
            const descFields = ['LocationDescription', 'locationDescription', 'Description', 'description'];
            for (const field of descFields) {
                if (camera[field] && camera[field] !== '位置資訊不可用' && camera[field].trim()) {
                    description = camera[field];
                    break;
                }
            }
        }
        
        // 如果還是沒有，根據坐標和縣市生成描述
        if (!description && camera.RoadSectionStart) {
            const lat = camera.RoadSectionStart.PositionLat;
            const lon = camera.RoadSectionStart.PositionLon;
            if (lat && lon) {
                const city = this.getCityFromCoordinates(lat, lon);
                if (city && city !== '未知' && city !== '其他縣市') {
                    description = `${city}區域 - ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                } else {
                    description = `坐標: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                }
            }
        }
        
        return description || '位置資訊不可用';
    }

    /**
     * 根據坐標判斷縣市
     */
    getCityFromCoordinates(lat, lon) {
        if (!lat || !lon) return '未知';

        for (const [city, coords] of Object.entries(this.cityCoordinates)) {
            if (lat >= coords.lat[0] && lat <= coords.lat[1] &&
                lon >= coords.lon[0] && lon <= coords.lon[1]) {
                return city;
            }
        }
        return '其他縣市';
    }

    /**
     * 分類道路類型
     */
    classifyRoadType(roadName) {
        if (!roadName) return 'unknown';
        
        const name = roadName.toString().toLowerCase();
        
        if (name.includes('國道') || name.includes('freeway') || name.includes('高速公路')) {
            return 'national';
        } else if (name.includes('快速公路') || name.includes('expressway') || name.includes('快速道路')) {
            return 'expressway';
        } else if (name.includes('省道') || name.includes('台') || name.includes('縣道')) {
            return 'provincial';
        }
        
        return 'provincial'; // 預設為省道
    }

    /**
     * 更新統計資訊
     */
    updateStatistics() {
        const stats = {
            national: 0,
            expressway: 0,
            provincial: 0
        };

        this.allCameras.forEach(camera => {
            // 使用已經設定的 type 屬性，而不是重新分類
            const roadType = camera.type || 'provincial';
            if (stats.hasOwnProperty(roadType)) {
                stats[roadType]++;
            }
        });

        // 更新 UI
        document.getElementById('stat-national').textContent = stats.national;
        document.getElementById('stat-expressway').textContent = stats.expressway;
        document.getElementById('stat-provincial').textContent = stats.provincial;

        console.log('📊 統計資訊已更新:', stats);
        console.log('📋 詳細分類:', {
            國道: stats.national,
            快速公路: stats.expressway,
            省道: stats.provincial,
            總計: this.allCameras.length
        });
    }

    /**
     * 更新縣市選項
     */
    updateCityOptions() {
        const cities = new Set();
        
        this.allCameras.forEach(camera => {
            if (camera.RoadSectionStart && camera.RoadSectionStart.PositionLat && camera.RoadSectionStart.PositionLon) {
                const city = this.getCityFromCoordinates(
                    camera.RoadSectionStart.PositionLat,
                    camera.RoadSectionStart.PositionLon
                );
                if (city !== '未知') {
                    cities.add(city);
                }
            }
        });

        const citySelect = document.getElementById('city-filter');
        if (citySelect) {
            try {
                // 清空現有選項（保留第一個預設選項）
                citySelect.innerHTML = '<option value="">請選擇縣市</option>';
                
                // 按照從北到南的順序添加縣市選項
                const sortedCities = this.cityOrder.filter(city => cities.has(city));
                sortedCities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    option.textContent = city;
                    if (citySelect && citySelect.appendChild) {
                        citySelect.appendChild(option);
                    }
                });
            } catch (error) {
                console.error('❌ 更新縣市選項失敗:', error);
            }
        }

        console.log(`🏙️ 找到 ${cities.size} 個縣市`);
    }

    /**
     * 顯示縣市選擇網格
     */
    showCitySelection() {
        const cities = new Set();
        
        this.allCameras.forEach(camera => {
            if (camera.RoadSectionStart && camera.RoadSectionStart.PositionLat && camera.RoadSectionStart.PositionLon) {
                const city = this.getCityFromCoordinates(
                    camera.RoadSectionStart.PositionLat,
                    camera.RoadSectionStart.PositionLon
                );
                if (city !== '未知') {
                    cities.add(city);
                }
            }
        });

        const citySelection = document.getElementById('city-selection');
        const cityButtons = document.getElementById('city-buttons');
        
        if (citySelection && cityButtons) {
            cityButtons.innerHTML = '';
            
            // 按照從北到南的順序創建縣市按鈕
            const sortedCities = this.cityOrder.filter(city => cities.has(city));
            sortedCities.forEach(city => {
                try {
                    const button = document.createElement('button');
                    button.className = 'city-button';
                    button.textContent = city;
                    button.onclick = () => this.selectCity(city);
                    if (cityButtons && cityButtons.appendChild) {
                        cityButtons.appendChild(button);
                    }
                } catch (error) {
                    console.error('❌ 創建縣市按鈕失敗:', city, error);
                }
            });
            
            citySelection.style.display = 'block';
        }
    }

    /**
     * 選擇縣市
     */
    selectCity(city) {
        console.log(`🏙️ 選擇縣市: ${city}`);
        
        this.currentCity = city;
        this.currentPage = 1;
        
        // 更新下拉選單
        const citySelect = document.getElementById('city-filter');
        if (citySelect) {
            citySelect.value = city;
        }
        
        // 隱藏縣市選擇，顯示監視器列表
        const citySelection = document.getElementById('city-selection');
        const cameraGrid = document.getElementById('camera-grid');
        
        if (citySelection) citySelection.style.display = 'none';
        if (cameraGrid) cameraGrid.style.display = 'grid';
        
        // 篩選並顯示監視器
        this.filterAndDisplayCameras();
        
        // 更新地圖視圖
        this.updateMapView();
    }

    /**
     * 篩選並顯示監視器
     */
    filterAndDisplayCameras() {
        if (!this.currentCity) {
            this.showCitySelection();
            return;
        }

        // 篩選監視器
        this.filteredCameras = this.allCameras.filter(camera => {
            // 縣市篩選
            if (camera.RoadSectionStart && camera.RoadSectionStart.PositionLat && camera.RoadSectionStart.PositionLon) {
                const city = this.getCityFromCoordinates(
                    camera.RoadSectionStart.PositionLat,
                    camera.RoadSectionStart.PositionLon
                );
                if (city !== this.currentCity) {
                    return false;
                }
            } else {
                return false;
            }

            // 道路類型篩選
            if (this.currentRoadType !== 'all') {
                const roadType = camera.type || 'provincial';
                if (roadType !== this.currentRoadType) {
                    return false;
                }
            }

            return true;
        });

        console.log(`🔍 篩選結果: ${this.filteredCameras.length} 個監視器`);

        // 顯示監視器
        this.displayCameras();
        
        // 更新地圖標記
        this.updateMapMarkers();
        
        // 顯示分頁
        this.updatePagination();
    }

    /**
     * 顯示監視器列表
     */
    displayCameras() {
        const cameraGrid = document.getElementById('camera-grid');
        if (!cameraGrid) return;

        // 計算分頁
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentCameras = this.filteredCameras.slice(startIndex, endIndex);

        // 清空現有內容
        cameraGrid.innerHTML = '';

        if (currentCameras.length === 0) {
            cameraGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    <p>在 ${this.currentCity} 找不到符合條件的監視器</p>
                </div>
            `;
            return;
        }

        // 添加縣市標題
        const header = document.createElement('div');
        header.className = 'city-header';
        header.innerHTML = `
            <h3>
                <i class="fas fa-map-marker-alt"></i>
                ${this.currentCity}
                <span class="city-count">${this.filteredCameras.length} 個監視器</span>
            </h3>
        `;
        if (cameraGrid && cameraGrid.appendChild) {
            cameraGrid.appendChild(header);
        }

        // 顯示監視器卡片
        currentCameras.forEach(camera => {
            try {
                const card = this.createCameraCard(camera);
                if (card && cameraGrid && cameraGrid.appendChild) {
                    cameraGrid.appendChild(card);
                }
            } catch (error) {
                console.error('❌ 創建監視器卡片失敗:', camera.VideoName, error);
            }
        });
    }

    /**
     * 建立監視器卡片
     */
    createCameraCard(camera) {
        const card = document.createElement('div');
        card.className = 'camera-card';

        const roadType = camera.type || 'provincial';
        const roadTypeDisplayText = {
            'national': '國道',
            'expressway': '快速公路',
            'provincial': '省道'
        }[roadType] || '其他';

        const badgeClass = `badge-${roadType}`;

        // 產生佔位圖片
        const roadTypePlaceholderText = {
            'national': '國道監視器\n📹',
            'expressway': '快速公路監視器\n📹',
            'provincial': '省道監視器\n📹'
        }[roadType] || '監視器\n📹';
        
        let noVideoPlaceholder, errorPlaceholder;
        try {
            noVideoPlaceholder = this.generatePlaceholderImage(300, 200, roadTypePlaceholderText);
            errorPlaceholder = this.generatePlaceholderImage(300, 200, '影像載入失敗\n⚠️', '#fef2f2', '#dc2626');
        } catch (e) {
            console.warn('⚠️ 佔位圖片生成失敗，使用備用方案:', e);
            noVideoPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzZiNzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuebuOapn+ixhOaWmDwvdGV4dD48L3N2Zz4=';
            errorPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmVmMmYyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iI2RjMjYyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPui8ieWFpeWksei2oTwvdGV4dD48L3N2Zz4=';
        }
        
        // 判斷是否有影片來源
        const videoElement = this.createVideoElement(camera, noVideoPlaceholder, errorPlaceholder);
        
        card.innerHTML = `
            ${videoElement}
            <div class="camera-info">
                <div class="camera-name">${camera.VideoName || '未命名監視器'}</div>
                <div class="camera-details">
                    <div style="margin-bottom: 0.5rem;">
                        <i class="fas fa-road"></i> ${camera.RoadName || camera.RoadID || '未知道路'}
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <i class="fas fa-map-marker-alt"></i> ${this.getCameraLocationDescription(camera)}
                    </div>
                </div>
                <span class="road-badge ${badgeClass}">${roadTypeDisplayText}</span>
            </div>
        `;

        return card;
    }

    /**
     * 在地圖上顯示所有監視器點位
     */
    showAllCamerasOnMap() {
        if (!this.markersLayer) return;
        
        console.log('🗺️ 正在地圖上顯示所有監視器點位...');
        
        // 清除現有標記
        this.markersLayer.clearLayers();
        
        let validCameras = 0;
        
        this.allCameras.forEach(camera => {
            if (camera.RoadSectionStart && camera.RoadSectionStart.PositionLat && camera.RoadSectionStart.PositionLon) {
                const lat = camera.RoadSectionStart.PositionLat;
                const lon = camera.RoadSectionStart.PositionLon;
                
                if (lat && lon) {
                    const roadType = camera.type || 'provincial';
                    const markerColor = {
                        'national': '#dc2626',     // 紅色 - 國道
                        'expressway': '#ea580c',   // 橙色 - 快速公路
                        'provincial': '#16a34a'    // 綠色 - 省道
                    }[roadType] || '#6b7280';

                    const marker = L.circleMarker([lat, lon], {
                        radius: 4,
                        fillColor: markerColor,
                        color: '#fff',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    // 點擊標記時顯示卡片
                    marker.on('click', () => {
                        this.showCameraDetails(camera);
                    });
                    
                    // 滑鼠懸停時顯示簡單資訊
                    marker.bindTooltip(`
                        <div style="text-align: center;">
                            <strong>${camera.VideoName || '未命名監視器'}</strong><br>
                            <small>${camera.RoadName || camera.RoadID || '未知道路'}</small>
                        </div>
                    `, {
                        permanent: false,
                        direction: 'top',
                        offset: [0, -10]
                    });

                    this.markersLayer.addLayer(marker);
                    validCameras++;
                }
            }
        });
        
        console.log(`✅ 在地圖上成功顯示 ${validCameras} 個監視器點位`);
    }

    /**
     * 更新地圖標記（用於縣市篩選後）
     */
    updateMapMarkers() {
        if (!this.markersLayer) return;

        // 清除現有標記
        this.markersLayer.clearLayers();

        // 添加新標記
        this.filteredCameras.forEach(camera => {
            if (camera.RoadSectionStart && camera.RoadSectionStart.PositionLat && camera.RoadSectionStart.PositionLon) {
                const lat = camera.RoadSectionStart.PositionLat;
                const lon = camera.RoadSectionStart.PositionLon;
                
                if (lat && lon) {
                    const roadType = camera.type || 'provincial';
                    const markerColor = {
                        'national': '#dc2626',     // 紅色 - 國道
                        'expressway': '#ea580c',   // 橙色 - 快速公路
                        'provincial': '#16a34a'    // 綠色 - 省道
                    }[roadType] || '#6b7280';

                    const marker = L.circleMarker([lat, lon], {
                        radius: 6,
                        fillColor: markerColor,
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    // 點擊標記時顯示卡片
                    marker.on('click', () => {
                        this.showCameraDetails(camera);
                    });
                    
                    // 滑鼠懸停時顯示簡單資訊
                    marker.bindTooltip(`
                        <div style="text-align: center;">
                            <strong>${camera.VideoName || '未命名監視器'}</strong><br>
                            <small>${camera.RoadName || camera.RoadID || '未知道路'}</small>
                        </div>
                    `, {
                        permanent: false,
                        direction: 'top',
                        offset: [0, -10]
                    });

                    this.markersLayer.addLayer(marker);
                }
            }
        });
    }

    /**
     * 更新地圖視圖
     */
    updateMapView() {
        if (!this.map || !this.currentCity || !this.cityCoordinates[this.currentCity]) return;

        const coords = this.cityCoordinates[this.currentCity];
        const centerLat = (coords.lat[0] + coords.lat[1]) / 2;
        const centerLon = (coords.lon[0] + coords.lon[1]) / 2;

        this.map.setView([centerLat, centerLon], 11);
    }

    /**
     * 更新分頁
     */
    updatePagination() {
        const paginationEl = document.getElementById('pagination');
        if (!paginationEl || this.filteredCameras.length === 0) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(this.filteredCameras.length / this.itemsPerPage);
        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // 上一頁按鈕
        if (this.currentPage > 1) {
            paginationHTML += `<button onclick="app.goToPage(${this.currentPage - 1})">‹ 上一頁</button>`;
        }

        // 頁數按鈕
        for (let i = 1; i <= totalPages; i++) {
            if (i === this.currentPage) {
                paginationHTML += `<button class="active">${i}</button>`;
            } else {
                paginationHTML += `<button onclick="app.goToPage(${i})">${i}</button>`;
            }
        }

        // 下一頁按鈕
        if (this.currentPage < totalPages) {
            paginationHTML += `<button onclick="app.goToPage(${this.currentPage + 1})">下一頁 ›</button>`;
        }

        paginationEl.innerHTML = paginationHTML;
    }

    /**
     * 跳轉到指定頁面
     */
    goToPage(page) {
        this.currentPage = page;
        this.displayCameras();
        this.updatePagination();
        
        // 滾動到頂部
        document.getElementById('camera-grid').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 顯示錯誤訊息
     */
    showError(message) {
        const errorEl = document.getElementById('error');
        if (errorEl) {
            errorEl.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
            errorEl.style.display = 'block';
        }
    }

    /**
     * 顯示監視器詳細資訊模組視窗
     */
    showCameraDetails(camera) {
        const modal = document.getElementById('camera-modal');
        const modalImage = document.getElementById('modal-image');
        const modalCameraName = document.getElementById('modal-camera-name');
        const modalRoadName = document.getElementById('modal-road-name');
        const modalLocation = document.getElementById('modal-location');
        const modalRoadType = document.getElementById('modal-road-type');
        const modalCity = document.getElementById('modal-city');
        const modalCoordinates = document.getElementById('modal-coordinates');

        if (modal) {
            // 填入資料
            this.currentSelectedCamera = camera;
            
            if (modalImage) {
                const noVideoPlaceholder = this.generatePlaceholderImage(300, 200, '無影片\n📹');
                const errorPlaceholder = this.generatePlaceholderImage(300, 200, '影片無法載入\n⚠️', '#fef2f2', '#dc2626');
                
                const videoUrl = this.getVideoStreamUrl(camera);
                
                if (videoUrl) {
                    // 創建影片元素取代圖片
                    const videoElement = document.createElement('video');
                    videoElement.className = 'modal-camera-video';
                    videoElement.autoplay = true;
                    videoElement.muted = true;
                    videoElement.loop = true;
                    videoElement.controls = true;
                    videoElement.playsInline = true;
                    videoElement.poster = camera.VideoImageURL || noVideoPlaceholder;
                    
                    const source = document.createElement('source');
                    source.src = videoUrl;
                    source.type = 'video/mp4';
                    if (videoElement && videoElement.appendChild) {
                        videoElement.appendChild(source);
                    }
                    
                    // 替換圖片元素
                    modalImage.parentNode.replaceChild(videoElement, modalImage);
                } else {
                    const imageUrl = camera.VideoImageURL || noVideoPlaceholder;
                    if (imageUrl !== noVideoPlaceholder) {
                        modalImage.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                        modalImage.onload = () => {
                            // 為模組圖片安排定期重新載入
                            if (camera.type === 'national') {
                                this.scheduleImageRefresh(modalImage, imageUrl, 60000);
                            }
                        };
                    } else {
                        modalImage.src = imageUrl;
                    }
                    modalImage.onerror = () => {
                        modalImage.src = errorPlaceholder;
                    };
                }
            }
            
            if (modalCameraName) modalCameraName.textContent = camera.VideoName || '未命名監視器';
            if (modalRoadName) modalRoadName.textContent = camera.RoadName || camera.RoadID || '未知道路';
            if (modalLocation) modalLocation.textContent = this.getCameraLocationDescription(camera);
            
            if (modalRoadType) {
                const roadType = camera.type || 'provincial';
                const roadTypeText = {
                    'national': '國道',
                    'expressway': '快速公路',
                    'provincial': '省道'
                }[roadType] || '其他';
                
                modalRoadType.textContent = roadTypeText;
                modalRoadType.className = `road-badge badge-${roadType}`;
            }
            
            if (modalCity && camera.RoadSectionStart) {
                const city = this.getCityFromCoordinates(
                    camera.RoadSectionStart.PositionLat,
                    camera.RoadSectionStart.PositionLon
                );
                modalCity.textContent = city;
            }
            
            if (modalCoordinates && camera.RoadSectionStart) {
                const lat = camera.RoadSectionStart.PositionLat || 0;
                const lon = camera.RoadSectionStart.PositionLon || 0;
                modalCoordinates.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            }
            
            // 顯示模組視窗
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // 防止背景滾動
        }
    }

    /**
     * 關閉監視器詳細資訊模組視窗
     */
    closeCameraDetails() {
        const modal = document.getElementById('camera-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.currentSelectedCamera = null;
        }
    }

    /**
     * 開啟監視器影像大圖
     */
    openCameraImage() {
        if (this.currentSelectedCamera && this.currentSelectedCamera.VideoImageURL) {
            window.open(this.currentSelectedCamera.VideoImageURL, '_blank');
        } else {
            alert('無法取得監視器影像');
        }
    }

    /**
     * 切換影片播放/暫停
     */
    toggleVideoPlayback(button) {
        const videoContainer = button.closest('.video-container');
        const video = videoContainer.querySelector('video');
        const icon = button.querySelector('i');
        
        if (video.paused) {
            video.play();
            icon.className = 'fas fa-pause';
        } else {
            video.pause();
            icon.className = 'fas fa-play';
        }
    }

    /**
     * 切換全螢幕模式
     */
    toggleFullscreen(button) {
        const videoContainer = button.closest('.video-container');
        const video = videoContainer.querySelector('video');
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if (video.webkitRequestFullscreen) {
                video.webkitRequestFullscreen();
            } else if (video.msRequestFullscreen) {
                video.msRequestFullscreen();
            }
        }
    }

    /**
     * 在地圖上聚焦到監視器位置
     */
    focusOnMap() {
        if (this.currentSelectedCamera && this.currentSelectedCamera.RoadSectionStart) {
            const lat = this.currentSelectedCamera.RoadSectionStart.PositionLat;
            const lon = this.currentSelectedCamera.RoadSectionStart.PositionLon;
            
            if (lat && lon && this.map) {
                this.map.setView([lat, lon], 15);
                this.closeCameraDetails();
                
                // 閃爍效果提示用戶位置
                setTimeout(() => {
                    this.map.setView([lat, lon], 16);
                }, 500);
            }
        }
    }

    /**
     * 安排圖片定期重新載入
     */
    scheduleImageRefresh(imgElement, baseUrl, interval) {
        if (!imgElement || !baseUrl) return;
        
        if (imgElement.refreshTimer) {
            clearTimeout(imgElement.refreshTimer);
        }
        
        imgElement.refreshTimer = setTimeout(() => {
            if (imgElement && imgElement.parentNode && !imgElement.src.includes('data:image')) {
                const newUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                imgElement.src = newUrl;
            }
        }, interval);
    }

    /**
     * 手動刷新監視器圖片
     */
    refreshCameraImage(button, baseUrl) {
        const container = button.parentNode;
        const img = container.querySelector('.camera-image');
        const refreshBtn = container.querySelector('.image-refresh-btn');
        
        if (img && baseUrl) {
            // 顯示載入動畫
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshBtn.disabled = true;
            
            const newUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
            
            img.onload = () => {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshBtn.disabled = false;
            };
            
            img.onerror = () => {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshBtn.disabled = false;
            };
            
            img.src = newUrl;
        }
    }
}

// 當 DOM 載入完成後初始化應用程式
let app;

function initializeApp() {
    console.log('🌟 開始初始化應用程式...');
    
    // 檢查必要的 DOM 元素
    const requiredElements = [
        'city-filter', 'city-buttons', 'camera-grid', 
        'loading', 'stat-national', 'stat-expressway', 'stat-provincial'
    ];
    
    const missingElements = requiredElements.filter(id => {
        const element = document.getElementById(id);
        return !element;
    });
    
    if (missingElements.length > 0) {
        console.error('❌ 缺少必要的 DOM 元素:', missingElements);
        console.error('頁面可能還在載入中，1秒後重試...');
        setTimeout(initializeApp, 1000);
        return;
    }
    
    console.log('✅ 所有必要元素都存在，啟動應用程式...');
    
    try {
        app = new CombinedRoadsCameraApp();
        console.log('✅ 應用程式啟動成功');
    } catch (error) {
        console.error('❌ 應用程式初始化失敗:', error);
        
        // 顯示用戶友好的錯誤訊息
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ffebee;
            color: #c62828;
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid #f44336;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <strong>應用程式啟動失敗</strong><br>
            錯誤：${error.message}<br>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px;">重新載入頁面</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

// 使用多重事件監聽確保初始化
document.addEventListener('DOMContentLoaded', initializeApp);

// 備用初始化（如果DOMContentLoaded已經觸發）
if (document.readyState === 'loading') {
    // DOM仍在載入中，等待DOMContentLoaded事件
} else {
    // DOM已經載入完成
    setTimeout(initializeApp, 100);
}
