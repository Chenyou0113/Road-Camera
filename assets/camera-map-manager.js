/**
 * 通用監視器地圖管理器
 * 用於為不同監視器頁面提供 Leaflet 地圖定位功能
 * 
 * 使用方式：
 * 1. 在 HTML 中引入 Leaflet CSS 和 JS
 * 2. 創建 <div id="map"></div> 容器
 * 3. 初始化：new CameraMapManager('map', cameraList, options)
 */

class CameraMapManager {
    constructor(mapContainerId, cameras = [], options = {}) {
        this.mapContainerId = mapContainerId;
        this.cameras = cameras;
        this.options = {
            center: [23.5, 121],  // 台灣中心
            zoom: 7,
            tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            markerCluster: false,  // 是否使用群集標記
            ...options
        };
        
        this.map = null;
        this.markers = [];
        this.markerLayer = null;
        
        this.init();
    }

    /**
     * 初始化地圖
     */
    init() {
        if (!window.L) {
            console.error('Leaflet 未載入，請先引入 Leaflet 庫');
            return;
        }

        // 創建地圖
        this.map = L.map(this.mapContainerId).setView(this.options.center, this.options.zoom);

        // 添加地圖圖層
        L.tileLayer(this.options.tileLayer, {
            attribution: this.options.attribution,
            maxZoom: 19
        }).addTo(this.map);

        // 添加標記圖層組
        this.markerLayer = L.layerGroup().addTo(this.map);

        // 添加初始標記
        this.addMarkers(this.cameras);

        // 監聽地圖事件
        this.setupMapEvents();
    }

    /**
     * 添加標記到地圖
     */
    addMarkers(cameras) {
        this.clearMarkers();
        
        let validMarkers = 0;
        let invalidMarkers = [];

        cameras.forEach(camera => {
            // 獲取坐標
            const lat = camera.PositionLat || camera.lat || camera.latitude;
            const lng = camera.PositionLon || camera.lng || camera.longitude;

            if (!lat || !lng) return;
            
            // 驗證坐標是否在台灣範圍內 (簡化檢查)
            // 台灣大約範圍: 緯度 21-25, 經度 120-122
            const isValidCoords = (lat >= 20 && lat <= 26 && lng >= 119 && lng <= 123);
            
            if (!isValidCoords) {
                invalidMarkers.push({
                    name: camera.RoadName || camera.name || '未知',
                    lat: lat,
                    lng: lng
                });
            }

            // 創建標記
            const marker = L.circleMarker([lat, lng], {
                radius: 8,
                fillColor: camera.markerColor || '#1e40af',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });

            // 創建彈窗內容
            const popupContent = this.createPopupContent(camera);
            marker.bindPopup(popupContent);

            // 添加 Tooltip（懸停顯示）
            const tooltipText = camera.RoadName || camera.name || camera.CCTVID || '監視器';
            marker.bindTooltip(tooltipText, { 
                permanent: false,
                direction: 'top'
            });

            // 點擊事件
            marker.on('click', () => {
                this.onMarkerClick(camera);
            });

            marker.addTo(this.markerLayer);
            this.markers.push(marker);
            validMarkers++;
        });

        // 輸出診斷信息
        console.log(`📍 地圖標記統計: ${validMarkers} 個有效標記`);
        if (invalidMarkers.length > 0) {
            console.warn(`⚠️ 發現 ${invalidMarkers.length} 個坐標可能不正確:`);
            invalidMarkers.slice(0, 5).forEach(m => {
                console.warn(`  - ${m.name}: [${m.lat}, ${m.lng}]`);
            });
        }

        // 自動調整視圖以適應所有標記
        if (this.markers.length > 0) {
            this.fitMarkersInView();
        }
    }

    /**
     * 創建彈窗內容
     */
    createPopupContent(camera) {
        const name = camera.RoadName || camera.LocationDescription || camera.CCTVID || '監視器';
        const city = camera.City || '未知';
        const district = camera.District || camera.LocationAdministrativeAreaName || '未知';
        
        // 生成一個唯一的相機ID用於後續查找
        const cameraId = camera.CCTVID || name;
        
        return `
            <div style="min-width: 250px; font-family: 'Microsoft JhengHei', Arial, sans-serif;">
                <h4 style="margin: 0 0 10px 0; color: #1e40af; word-wrap: break-word;">
                    ${this.escapeHtml(name)}
                </h4>
                <div style="font-size: 0.9rem; line-height: 1.6;">
                    <p style="margin: 5px 0;"><strong>📍 縣市：</strong> ${this.escapeHtml(city)}</p>
                    <p style="margin: 5px 0;"><strong>🏘️ 行政區：</strong> ${this.escapeHtml(district)}</p>
                    <p style="margin: 5px 0;"><strong>🧭 坐標：</strong></p>
                    <div style="margin-left: 15px; background: #f5f5f5; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.85rem;">
                        <p style="margin: 3px 0;">N: ${(camera.PositionLat || camera.lat || 0).toFixed(6)}</p>
                        <p style="margin: 3px 0;">E: ${(camera.PositionLon || camera.lng || 0).toFixed(6)}</p>
                    </div>
                    ${camera.LocationMile ? `<p style="margin: 5px 0;"><strong>🛣️ 里程：</strong> ${this.escapeHtml(camera.LocationMile)}</p>` : ''}
                    ${camera.RoadNumber ? `<p style="margin: 5px 0;"><strong>🚗 路線編號：</strong> ${this.escapeHtml(camera.RoadNumber)}</p>` : ''}
                </div>
                <button onclick="openCameraDetails('${this.escapeHtml(cameraId)}')" 
                        style="width: 100%; padding: 10px; margin-top: 12px; 
                               background: #1e40af; color: white; border: none; 
                               border-radius: 5px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                    📸 顯示詳細資訊
                </button>
            </div>
        `;
    }

    /**
     * 標記點擊事件
     */
    onMarkerClick(camera) {
        console.log('標記已點擊:', camera);
        // 可以在這裡觸發自定義事件或回調
        if (this.options.onMarkerClick) {
            this.options.onMarkerClick(camera);
        }
    }

    /**
     * 設置地圖事件
     */
    setupMapEvents() {
        // 地圖加載完成
        this.map.on('load', () => {
            console.log('地圖加載完成');
        });

        // 地圖移動結束
        this.map.on('moveend', () => {
            console.log('地圖中心:', this.map.getCenter());
        });
    }

    /**
     * 清除所有標記
     */
    clearMarkers() {
        this.markers.forEach(marker => {
            this.markerLayer.removeLayer(marker);
        });
        this.markers = [];
    }

    /**
     * 更新標記
     */
    updateMarkers(cameras) {
        this.cameras = cameras;
        this.addMarkers(cameras);
    }

    /**
     * 自動調整視圖以適應所有標記
     */
    fitMarkersInView() {
        if (this.markers.length === 0) return;

        const group = new L.featureGroup(this.markers);
        this.map.fitBounds(group.getBounds().pad(0.1));
    }

    /**
     * 按城市篩選標記
     */
    filterByCity(city) {
        const filtered = this.cameras.filter(c => (c.City || c.city) === city);
        this.addMarkers(filtered);
    }

    /**
     * 按道路篩選標記
     */
    filterByRoad(road) {
        const filtered = this.cameras.filter(c => 
            (c.RoadName || c.RoadNumber || c.road || '').includes(road)
        );
        this.addMarkers(filtered);
    }

    /**
     * 高亮特定標記
     */
    highlightMarker(index) {
        if (!this.markers[index]) return;

        const marker = this.markers[index];
        marker.setStyle({
            fillColor: '#ff9800',
            radius: 12,
            weight: 3
        });

        // 居中於此標記
        this.map.setView(marker.getLatLng(), 15);

        // 打開彈窗
        marker.openPopup();
    }

    /**
     * 重置所有標記樣式
     */
    resetMarkerStyles() {
        this.markers.forEach(marker => {
            marker.setStyle({
                fillColor: '#1e40af',
                radius: 8,
                weight: 2
            });
        });
    }

    /**
     * HTML 轉義
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 獲取地圖物件
     */
    getMap() {
        return this.map;
    }

    /**
     * 獲取所有標記
     */
    getMarkers() {
        return this.markers;
    }

    /**
     * 銷毀地圖
     */
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markers = [];
    }
}
