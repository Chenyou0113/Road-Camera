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
            ...options,
            center: center,
            zoom: options.zoom || 8,
            minZoom: options.minZoom || 7,
            mapId: options.mapId || 'DEMO_MAP_ID',
        };
        
        this.map = null;
        this.markers = [];
        this.markerCluster = null; // Add clusterer reference
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
     * 添加標記到地圖 (支援 MarkerClusterer)
     */
    addMarkers(cameras) {
        if (!this.map) return;
        
        this.clearMarkers();
        this.cameras = cameras; // Update internal reference
        
        let validMarkers = 0;
        const bounds = new google.maps.LatLngBounds();
        const newMarkers = [];

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

            // 創建標記 - 注意：不直接設置 map 屬性，交給 Clusterer 管理
            const marker = new google.maps.Marker({
                position: position,
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

            newMarkers.push(marker);
            bounds.extend(position);
            validMarkers++;
        });

        this.markers = newMarkers;

        // 使用 MarkerClusterer 提升效能
        if (typeof MarkerClusterer !== 'undefined') {
            if (this.markerCluster) {
                this.markerCluster.clearMarkers();
            }
            this.markerCluster = new MarkerClusterer(this.map, newMarkers, {
                imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
                gridSize: 50,
                maxZoom: 15
            });
        } else {
            // Fallback: 直接加到地圖相容舊行為
            console.warn('MarkerClusterer 未加載，使用一般標記模式');
            newMarkers.forEach(m => m.setMap(this.map));
        }

        console.log(`📍 已添加 ${validMarkers} 個 Google Map 標記 (Cluster Mode: ${!!this.markerCluster})`);

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
     * 創建彈窗內容 (使用 DOM 元素以綁定事件)
     */

    /**
     * 創建彈窗內容 (使用 DOM 元素以綁定事件)
     */
    createPopupContent(camera) {
        const name = camera.RoadName || camera.LocationDescription || camera.name || '監視器';
        const city = camera.City || '未知';
        const mile = camera.LocationMile ? `里程：${camera.LocationMile}` : '';
        // 優先嘗試使用即時串流 URL
        let streamUrl = camera.RealtimeStreamURL || camera.StreamURL || '';
        // 如果沒有串流 URL，嘗試使用 Image URL
        let imgUrl = camera.VideoImageURL || camera.VideoImageUrl || '';
        
        // 建立容器
        const container = document.createElement('div');
        container.style.cssText = "font-family: 'Microsoft JhengHei', sans-serif; padding: 5px; max-width: 320px; text-align: left;";
        
        // 標題
        const title = document.createElement('h3');
        title.style.cssText = "margin: 0 0 5px 0; color: #1e40af; font-size: 16px; font-weight: bold;";
        title.textContent = name;
        container.appendChild(title);
        
        // 資訊列
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = "font-size: 13px; color: #555; margin-bottom: 8px;";
        infoDiv.innerHTML = `<span style="display:inline-block; margin-right: 5px;">📍 ${this.escapeHtml(city)}</span><span>${this.escapeHtml(mile)}</span>`;
        container.appendChild(infoDiv);

        // 影像容器 (直接顯示，不使用按鈕)
        const displayUrl = streamUrl || imgUrl;
        
        if (displayUrl) {
            const imgContainer = document.createElement('div');
            // 改為 3:2 比例 (或符合使用者需求的比例)
            imgContainer.style.cssText = "width: 100%; height: 180px; background: #000; border-radius: 4px; overflow: hidden; margin-bottom: 8px; position: relative;";
            
            // 載入中提示
            const loadingText = document.createElement('div');
            loadingText.textContent = '載入中...';
            loadingText.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; font-size: 12px;";
            imgContainer.appendChild(loadingText);

            // 影像元素
            const img = document.createElement('img');
            img.style.cssText = "width: 100%; height: 100%; object-fit: contain; position: relative; z-index: 1;";
            img.alt = "即時影像";
            
            // 處理 URL (Proxy)
            let finalUrl = displayUrl;
            
            // 如果是 Stream URL，優先使用 Proxy 確保播放
            if (streamUrl) {
                // 強制 HTTPS
                if (streamUrl.startsWith('http://')) {
                    streamUrl = streamUrl.replace('http://', 'https://');
                }
                // 使用 Proxy
                finalUrl = `https://taiwan-traffic-cctv.weacamm.org/api/proxy?url=${encodeURIComponent(streamUrl)}&t=${Date.now()}`;
            } else if (imgUrl && window.location.protocol === 'https:' && imgUrl.startsWith('http://')) {
                // 圖片混和內容處理
                finalUrl = imgUrl.replace('http://', 'https://');
            }

            img.src = finalUrl;
            
            // 錯誤處理
            img.onerror = function() {
                this.onerror = null;
                // 嘗試不帶 Proxy 或使用 Placeholder
                if (finalUrl.includes('api/proxy')) {
                   // 如果 Proxy 失敗，嘗試直接讀取 (可能會有 CORS/Mixed Content 問題，但值得一試)
                   console.warn('Proxy load failed, trying direct URL for:', displayUrl);
                   this.src = displayUrl;
                } else {
                   this.src = 'https://via.placeholder.com/320x180?text=無訊號';
                }
            };
            
            imgContainer.appendChild(img);
            container.appendChild(imgContainer);
        } else {
            // 無影像提示
            const noImg = document.createElement('div');
            noImg.style.cssText = "padding: 10px; background: #f5f5f5; color: #666; font-size: 13px; text-align: center; border-radius: 4px; margin-bottom: 8px;";
            noImg.textContent = '暫無影像訊號';
            container.appendChild(noImg);
        }

        // 座標資訊
        const coords = document.createElement('div');
        coords.style.cssText = "font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 5px; margin-top: 5px;";
        coords.textContent = `Lat: ${parseFloat(camera.PositionLat || 0).toFixed(4)}, Lng: ${parseFloat(camera.PositionLon || 0).toFixed(4)}`;
        container.appendChild(coords);

        return container;
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
        // 清除 MarkerClusterer
        if (this.markerCluster) {
            this.markerCluster.clearMarkers();
            // 注意：我們保留實例以便重用，但在 addMarkers 中我們目前是重新創建
            // 這裡為了徹底清除，確保舊標記都移除了
        }

        // 清除個別標記 (如果未被 clusterer 管理或 fallback 模式)
        if (this.markers) {
            this.markers.forEach(marker => marker.setMap(null));
        }
        this.markers = [];
        this.cameras = [];
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
