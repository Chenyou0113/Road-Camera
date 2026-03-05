/**
 * 通用監視器地圖管理器 (Google Maps Version)
 * 用於為不同監視器頁面提供 Google Maps 地圖定位功能
 * 
 * 使用方式：
 * 1. 在 HTML 中引入 Google Maps API Script
 * 2. 創建 <div id="map"></div> 容器
 * 3. 初始化：new CameraMapManager('map', cameraList, options)
 */

class CameraMapManager {
    constructor(mapContainerId, cameras = [], options = {}) {
        this.mapContainerId = mapContainerId;
        this.cameras = cameras; // Keep reference
        
        // Handle center coordinates format (Leaflet [lat, lng] -> Google {lat, lng})
        let center = options.center || { lat: 23.6, lng: 120.9 };
        if (Array.isArray(center)) {
            center = { lat: center[0], lng: center[1] };
        }

        this.options = {
            center: center,
            zoom: options.zoom || 8,
            minZoom: 7,
            mapId: 'DEMO_MAP_ID', // Optional: for advanced markers if needed
            ...options
        };
        
        this.map = null;
        this.markers = [];
        this.infoWindow = null;
        this.mapElement = document.getElementById(this.mapContainerId);

        // Try to init immediately, or wait a bit
        this.init();
    }

    /**
     * 初始化地圖
     */
    init() {
        if (!window.google || !window.google.maps) {
            console.warn('Google Maps API 未載入，等待中...');
            setTimeout(() => this.init(), 500);
            return;
        }

        if (!this.mapElement) {
            this.mapElement = document.getElementById(this.mapContainerId);
            if (!this.mapElement) {
                console.error(`找不到地圖容器 #${this.mapContainerId}`);
                return;
            }
        }

        try {
            // 創建地圖
            this.map = new google.maps.Map(this.mapElement, {
                center: this.options.center,
                zoom: this.options.zoom,
                minZoom: this.options.minZoom,
                mapTypeId: 'roadmap',
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
                zoomControl: true,
                styles: [
                    {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                    }
                ]
            });

            // 初始化訊息視窗 (單例模式，每次只顯示一個)
            this.infoWindow = new google.maps.InfoWindow({
                maxWidth: 320
            });

            // 添加初始標記
            if (this.cameras && this.cameras.length > 0) {
                this.addMarkers(this.cameras);
            }

            // 設置地圖事件
            this.setupMapEvents();

            console.log('✅ Google Map 初始化成功');

        } catch (error) {
            console.error('❌ Google Map 初始化失敗:', error);
        }
    }

    /**
     * 添加標記到地圖
     */
    addMarkers(cameras) {
        if (!this.map) return;
        
        this.clearMarkers();
        this.cameras = cameras; // Update internal reference
        
        let validMarkers = 0;
        const bounds = new google.maps.LatLngBounds();

        cameras.forEach((camera, index) => {
            // 獲取坐標
            const lat = parseFloat(camera.PositionLat || camera.lat || camera.latitude);
            const lng = parseFloat(camera.PositionLon || camera.lng || camera.longitude);

            if (isNaN(lat) || isNaN(lng)) return;
            
            // 驗證坐標是否在台灣範圍內 (簡化檢查)
            if (lat < 21 || lat > 26 || lng < 118 || lng > 123) return;

            const position = { lat, lng };
            
            // 創建圓形標記 icon
            const circleIcon = {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: camera.markerColor || '#1e40af', // Blue default
                fillOpacity: 0.8,
                scale: 6, // Radius
                strokeColor: 'white',
                strokeWeight: 1
            };

            // 創建標記
            const marker = new google.maps.Marker({
                position: position,
                map: this.map,
                icon: circleIcon,
                title: camera.RoadName || camera.name || '監視器',
                optimized: true // Render many markers efficiently
            });

            // 存儲額外數據以便交互
            marker.metadata = { camera, index };

            // 點擊事件
            marker.addListener('click', () => {
                this.onMarkerClick(marker, camera);
                if (this.options.onMarkerClick) {
                    this.options.onMarkerClick(camera);
                }
            });

            this.markers.push(marker);
            bounds.extend(position);
            validMarkers++;
        });

        console.log(`📍 已添加 ${validMarkers} 個 Google Map 標記`);

        // 自動調整視圖 (如果不禁用並且有有效標記)
        if (validMarkers > 0 && !this.options.disableAutoFit) {
           this.map.fitBounds(bounds);
        }
    }

    /**
     * 處理標記點擊，顯示 InfoWindow
     */
    onMarkerClick(marker, camera) {
        const content = this.createPopupContent(camera);
        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }

    /**
     * 創建彈窗內容
     */
    createPopupContent(camera) {
        const name = camera.RoadName || camera.LocationDescription || camera.name || '監視器';
        const city = camera.City || '未知';
        const mile = camera.LocationMile ? `里程：${camera.LocationMile}` : '';
        const imgUrl = camera.VideoImageURL || camera.VideoImageUrl || '';
        
        // 簡單的 HTML 內容
        // 注意：Google Maps InfoWindow 樣式比較難完全客製化，只能改內容
        return `
            <div style="font-family: 'Microsoft JhengHei', sans-serif; padding: 5px; max-width: 250px; text-align: left;">
                <h3 style="margin: 0 0 5px 0; color: #1e40af; font-size: 16px; font-weight: bold;">${this.escapeHtml(name)}</h3>
                <div style="font-size: 13px; color: #555; margin-bottom: 8px;">
                    <span style="display:inline-block; margin-right: 5px;">📍 ${this.escapeHtml(city)}</span>
                    <span>${this.escapeHtml(mile)}</span>
                </div>
                ${imgUrl ? `
                <div style="width: 100%; height: 120px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/200x120?text=No+Image'">
                </div>` : ''}
                <div style="font-size: 12px; color: #888;">
                    Lat: ${parseFloat(camera.PositionLat || 0).toFixed(4)}, Lng: ${parseFloat(camera.PositionLon || 0).toFixed(4)}
                </div>
            </div>
        `;
    }

    /**
     * 設置地圖事件
     */
    setupMapEvents() {
        // Google Maps 載入完成不需要特別監聽，因為 Map 對象創建即載入
    }

    /**
     * 清除所有標記
     */
    clearMarkers() {
        if (this.markers) {
            this.markers.forEach(marker => marker.setMap(null));
        }
        this.markers = [];
    }

    /**
     * 更新標記 (外部調用介面)
     */
    updateMarkers(cameras) {
        this.addMarkers(cameras);
    }

    /**
     * 按索引高亮標記
     */
    highlightMarker(index) {
        // Find marker by camera index assuming order is preserved or use metadata
        // Since indices might mismatch if filtered, try to handle gracefully
        
        if (!this.markers[index]) return;
        
        const marker = this.markers[index];
        const camera = marker.metadata.camera;

        // 改變樣式 (Google Maps Marker 變大或變色)
        marker.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#ff5722', // Orange for highlight
            fillOpacity: 1.0,
            scale: 10,
            strokeColor: 'white',
            strokeWeight: 2
        });
        
        // 顯示 InfoWindow
        this.onMarkerClick(marker, camera);
        
        // 移動地圖
        this.map.panTo(marker.getPosition());
        this.map.setZoom(14);
        
        // 3秒後恢復樣式
        setTimeout(() => {
            if (marker.getMap()) { // Check if still on map
                marker.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: camera.markerColor || '#1e40af',
                    fillOpacity: 0.8,
                    scale: 6,
                    strokeColor: 'white',
                    strokeWeight: 1
                });
            }
        }, 3000);
    }

    /**
     * 銷毀
     */
    destroy() {
        this.clearMarkers();
        this.map = null;
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;")
                   .replace(/</g, "&lt;")
                   .replace(/>/g, "&gt;")
                   .replace(/"/g, "&quot;")
                   .replace(/'/g, "&#039;");
    }
}
