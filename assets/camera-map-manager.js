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
    createPopupContent(camera) {
        const name = camera.RoadName || camera.LocationDescription || camera.name || '監視器';
        const city = camera.City || '未知';
        const mile = camera.LocationMile ? `里程：${camera.LocationMile}` : '';
        const imgUrl = camera.VideoImageURL || camera.VideoImageUrl || '';
        
        // 建立容器
        const container = document.createElement('div');
        container.style.cssText = "font-family: 'Microsoft JhengHei', sans-serif; padding: 5px; max-width: 250px; text-align: left;";
        
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

        if (imgUrl) {
            // 按鈕容器
            const btnContainer = document.createElement('div');
            btnContainer.style.marginBottom = '8px';
            btnContainer.style.textAlign = 'center';

            // 顯示即時影像按鈕
            const btn = document.createElement('button');
            btn.textContent = '🎥 顯示即時影像';
            btn.style.cssText = "background-color: #1e40af; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; transition: background 0.3s;";
            
            btn.onmouseover = () => btn.style.backgroundColor = '#0891b2';
            btn.onmouseout = () => btn.style.backgroundColor = '#1e40af';

            // 影像容器 (預設隱藏)
            const imgContainer = document.createElement('div');
            imgContainer.style.cssText = "width: 100%; height: 140px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 8px; display: none; position: relative;";
            
            // 載入中提示
            const loadingText = document.createElement('div');
            loadingText.textContent = '載入中...';
            loadingText.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #666; font-size: 12px;";
            imgContainer.appendChild(loadingText);

            // 影像元素
            const img = document.createElement('img');
            img.style.cssText = "width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 1;";
            img.alt = "監視器畫面";
            
            // 點擊事件
            btn.onclick = function() {
                // 隱藏按鈕，顯示容器
                btn.style.display = 'none';
                imgContainer.style.display = 'block';
                
                // 開始載入圖片
                // 嘗試使用 Proxy 解決混合內容/CORS 問題
                let finalUrl = imgUrl;
                if (window.location.protocol === 'https:' && imgUrl.startsWith('http://')) {
                     // 使用公共 Proxy 如果可用，或者是直接嘗試
                     finalUrl = imgUrl.replace('http://', 'https://'); 
                }
                
                img.src = finalUrl;
                img.onerror = function() {
                    this.onerror = null;
                    // 如果 HTTPS 失敗，嘗試使用 api proxy (如果專案裡有 API Proxy)
                    // 這裡簡單使用 placeholder
                    this.src = 'https://via.placeholder.com/200x120?text=Image+Load+Error';
                };
                
                imgContainer.appendChild(img);
            };

            btnContainer.appendChild(btn);
            container.appendChild(btnContainer);
            container.appendChild(imgContainer);
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
