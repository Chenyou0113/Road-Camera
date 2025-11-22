/**
 * 📡 監視器聚合模組 (CCTV Aggregator)
 * 
 * 功能：
 * 1. 整合多個監視器來源 (TDX、省道、國道)
 * 2. 智慧快取管理
 * 3. 地圖聚合 (Clustering) 防止過多 Marker
 * 4. 故障轉移 (Fallback)
 */

class CCTVAggregator {
  constructor(options = {}) {
    this.sourceConfigs = [
      {
        name: '國道',
        url: '/api/cctv-freeway',
        priority: 2,
        timeout: 8000
      },
      {
        name: '省道',
        url: '/api/cctv-provincial',
        priority: 1,
        timeout: 8000
      }
    ];

    this.allCameras = [];
    this.cacheExpire = options.cacheExpire || 60000; // 快取 60 秒
    this.lastFetch = null;
    this.logLevel = options.logLevel || 'info'; // 'debug' | 'info' | 'warn'
  }

  /**
   * 日誌輸出
   */
  log(level, message, data = null) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] >= levels[this.logLevel]) {
      const prefix = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
      }[level];

      if (data) {
        console.log(`${prefix} [CCTV] ${message}`, data);
      } else {
        console.log(`${prefix} [CCTV] ${message}`);
      }
    }
  }

  /**
   * 從 API 抓取監視器資料
   */
  async fetchFromSource(source) {
    try {
      this.log('debug', `🔄 抓取 ${source.name}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), source.timeout);

      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        this.log('info', `✅ ${source.name} 取得 ${data.data.length} 個監視器`);
        return data.data;
      } else {
        throw new Error('格式錯誤');
      }

    } catch (error) {
      this.log('warn', `❌ ${source.name} 抓取失敗: ${error.message}`);
      return [];
    }
  }

  /**
   * 載入所有監視器
   */
  async loadAll() {
    const now = Date.now();
    
    // 快取檢查
    if (this.lastFetch && now - this.lastFetch < this.cacheExpire) {
      this.log('info', `⚡ 使用快取資料 (${this.allCameras.length} 個監視器)`);
      return this.allCameras;
    }

    this.log('info', '📥 開始載入所有監視器資料...');
    this.allCameras = [];

    // 並行抓取所有來源
    const results = await Promise.allSettled(
      this.sourceConfigs.map(source => this.fetchFromSource(source))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        this.allCameras = this.allCameras.concat(result.value);
      }
    });

    this.lastFetch = now;
    
    this.log('info', `📊 總共載入 ${this.allCameras.length} 個監視器`, {
      provincial: this.allCameras.filter(c => c.type === '省道').length,
      freeway: this.allCameras.filter(c => c.type === '國道').length
    });

    return this.allCameras;
  }

  /**
   * 按類型過濾監視器
   */
  filterByType(type) {
    return this.allCameras.filter(camera => camera.type === type);
  }

  /**
   * 按範圍過濾監視器 (矩形區域)
   */
  filterByBounds(minLat, maxLat, minLon, maxLon) {
    return this.allCameras.filter(camera => 
      camera.lat >= minLat && 
      camera.lat <= maxLat && 
      camera.lon >= minLon && 
      camera.lon <= maxLon
    );
  }

  /**
   * 搜尋監視器 (名稱、ID、路名)
   */
  search(keyword) {
    const kw = keyword.toLowerCase();
    return this.allCameras.filter(camera => {
      const fields = [
        camera.name,
        camera.id,
        camera.road,
        camera.description
      ].filter(f => f);

      return fields.some(field => 
        field.toLowerCase().includes(kw)
      );
    });
  }

  /**
   * 取得統計資訊
   */
  getStats() {
    return {
      total: this.allCameras.length,
      byType: {
        provincial: this.allCameras.filter(c => c.type === '省道').length,
        freeway: this.allCameras.filter(c => c.type === '國道').length
      },
      lastUpdate: this.lastFetch ? new Date(this.lastFetch).toLocaleString('zh-TW') : '未載入'
    };
  }

  /**
   * 清除快取，強制重新載入
   */
  clearCache() {
    this.lastFetch = null;
    this.log('info', '🗑️ 快取已清除');
  }
}

/**
 * 地圖聚合輔助 (用於 Mapbox / Leaflet)
 * 防止太多 Marker 導致地圖卡頓
 */
class CCTVMapHelper {
  constructor(map, aggregator) {
    this.map = map;
    this.aggregator = aggregator;
    this.markers = [];
    this.clusterGroup = null;
  }

  /**
   * 在地圖上繪製所有監視器 (使用聚合)
   */
  async renderCameras() {
    const cameras = await this.aggregator.loadAll();
    
    console.log(`🗺️ 在地圖上繪製 ${cameras.length} 個監視器...`);

    // 如果是 Mapbox，使用 GeoJSON source
    if (this.map.getLayer) {
      this._renderMapbox(cameras);
    }
    // 如果是 Leaflet，使用 MarkerClusterGroup
    else if (window.L && window.L.markerClusterGroup) {
      this._renderLeaflet(cameras);
    }
  }

  /**
   * Mapbox 渲染
   */
  _renderMapbox(cameras) {
    const geojson = {
      type: 'FeatureCollection',
      features: cameras.map(camera => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [camera.lon, camera.lat]
        },
        properties: {
          id: camera.id,
          name: camera.name,
          type: camera.type,
          url: camera.url
        }
      }))
    };

    // 移除舊圖層
    if (this.map.getSource('cctv-source')) {
      this.map.removeLayer('cctv-layer');
      this.map.removeSource('cctv-source');
    }

    // 新增來源和圖層
    this.map.addSource('cctv-source', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    // 未聚合的圓點
    this.map.addLayer({
      id: 'cctv-layer',
      type: 'circle',
      source: 'cctv-source',
      filter: ['!', ['feature-state', 'cluster']],
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'match',
          ['get', 'type'],
          '國道', '#FF6B6B',
          '省道', '#4ECDC4',
          '#999'
        ],
        'circle-opacity': 0.8
      }
    });

    // 聚合的圓點
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'cctv-source',
      filter: ['feature-state', 'cluster'],
      paint: {
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          15,
          100, 20,
          750, 30
        ],
        'circle-color': '#2C3E50',
        'circle-opacity': 0.7
      }
    });

    // 聚合數字標籤
    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'cctv-source',
      filter: ['feature-state', 'cluster'],
      layout: {
        'text-field': ['get', 'point_count'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12
      },
      paint: {
        'text-color': '#fff'
      }
    });

    // 點擊聚合時放大
    this.map.on('click', 'clusters', (e) => {
      const clusterId = e.features[0].properties.cluster_id;
      this.map.getSource('cctv-source').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        this.map.easeTo({
          center: e.geometry.coordinates,
          zoom: zoom
        });
      });
    });

    console.log('✅ Mapbox 監視器圖層已渲染');
  }

  /**
   * Leaflet 渲染
   */
  _renderLeaflet(cameras) {
    const { L } = window;

    // 清除舊的 markers
    if (this.clusterGroup) {
      this.map.removeLayer(this.clusterGroup);
    }

    this.clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      disableClusteringAtZoom: 14
    });

    cameras.forEach(camera => {
      const color = camera.type === '國道' ? '#FF6B6B' : '#4ECDC4';
      const marker = L.circleMarker([camera.lat, camera.lon], {
        radius: 6,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.8
      }).bindPopup(`
        <strong>${camera.name}</strong><br>
        類型: ${camera.type}<br>
        <a href="${camera.url}" target="_blank">📹 觀看影像</a>
      `);

      this.clusterGroup.addLayer(marker);
    });

    this.map.addLayer(this.clusterGroup);
    console.log('✅ Leaflet 監視器圖層已渲染');
  }
}

// 匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CCTVAggregator, CCTVMapHelper };
}
