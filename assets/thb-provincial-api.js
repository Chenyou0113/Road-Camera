/**
 * 公路總局省道監視器 API 處理模組
 * 資料來源：https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml
 * 
 * 使用規範：
 * 1. 資料來源為公路總局省道交通控制系統
 * 2. 重複擷取資料週期不得小於60秒
 * 3. 對外提供時應說明原始資料來源為公路總局
 */

class THBProvincialAPI {
    constructor() {
        this.apiUrl = 'https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml';
        this.lastFetchTime = 0;
        this.minFetchInterval = 60000; // 60秒，遵守使用規範
        this.cache = null;
        this.cacheExpiry = 60000; // 快取60秒
    }

    /**
     * 檢查是否可以進行 API 請求（遵守60秒間隔限制）
     */
    canFetch() {
        const now = Date.now();
        return (now - this.lastFetchTime) >= this.minFetchInterval;
    }

    /**
     * 取得下次可請求的時間
     */
    getNextFetchTime() {
        const now = Date.now();
        const nextTime = this.lastFetchTime + this.minFetchInterval;
        return Math.max(0, nextTime - now);
    }

    /**
     * 使用 CORS 代理或直接請求 XML 資料
     */
    async fetchXML() {
        // 檢查快取
        if (this.cache && Date.now() - this.cache.timestamp < this.cacheExpiry) {
            console.log('📦 使用快取的公路總局資料');
            return this.cache.data;
        }

        // 檢查請求間隔
        if (!this.canFetch()) {
            const waitTime = Math.ceil(this.getNextFetchTime() / 1000);
            console.warn(`⏱️ 請等待 ${waitTime} 秒後再請求公路總局 API（遵守60秒間隔規範）`);
            if (this.cache) {
                return this.cache.data; // 返回舊快取
            }
            throw new Error(`請等待 ${waitTime} 秒後再試`);
        }

        try {
            console.log('🔄 正在載入公路總局省道監視器資料...');
            
            // 嘗試直接請求
            let response;
            try {
                response = await fetch(this.apiUrl);
            } catch (corsError) {
                console.warn('⚠️ 直接請求失敗，嘗試使用 CORS 代理...');
                // 使用公開的 CORS 代理
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(this.apiUrl)}`;
                response = await fetch(proxyUrl);
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const xmlText = await response.text();
            this.lastFetchTime = Date.now();

            // 解析 XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

            // 檢查解析錯誤
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('XML 解析失敗');
            }

            // 轉換為 JSON 格式
            const cameras = this.parseXMLToJSON(xmlDoc);
            
            // 更新快取
            this.cache = {
                data: cameras,
                timestamp: Date.now()
            };

            console.log(`✅ 成功載入 ${cameras.length} 筆公路總局省道監視器資料`);
            return cameras;

        } catch (error) {
            console.error('❌ 載入公路總局資料失敗:', error);
            throw error;
        }
    }

    /**
     * 將 XML 轉換為 JSON 格式
     */
    parseXMLToJSON(xmlDoc) {
        const cameras = [];
        const cctvNodes = xmlDoc.querySelectorAll('CCTV');

        cctvNodes.forEach(node => {
            try {
                const camera = {
                    // 基本資訊
                    CCTVID: this.getNodeText(node, 'CCTVID'),
                    RoadName: this.getNodeText(node, 'RoadName'),
                    RoadSection: this.getNodeText(node, 'RoadSection'),
                    LocationMile: this.getNodeText(node, 'LocationMile'),
                    LocationDescription: this.getNodeText(node, 'LocationDescription'),
                    RoadDirection: this.getNodeText(node, 'RoadDirection'),
                    
                    // 座標資訊
                    PositionLon: parseFloat(this.getNodeText(node, 'PositionLon')) || null,
                    PositionLat: parseFloat(this.getNodeText(node, 'PositionLat')) || null,
                    
                    // 影像連結
                    VideoImageUrl: this.getNodeText(node, 'VideoImageUrl'),
                    VideoStreamURL: this.getNodeText(node, 'VideoStreamURL') || this.getNodeText(node, 'VideoStreamUrl'),
                    
                    // 狀態資訊
                    Status: this.getNodeText(node, 'Status'),
                    UpdateTime: this.getNodeText(node, 'UpdateTime'),
                    
                    // 標記資料來源
                    source: 'thb',
                    dataSource: '公路總局'
                };

                // 只加入有效的監視器（有影像連結）
                if (camera.VideoImageUrl || camera.VideoStreamURL) {
                    cameras.push(camera);
                }
            } catch (error) {
                console.warn('解析單個監視器失敗:', error);
            }
        });

        return cameras;
    }

    /**
     * 取得 XML 節點的文字內容
     */
    getNodeText(parentNode, tagName) {
        const node = parentNode.querySelector(tagName);
        return node ? node.textContent.trim() : '';
    }

    /**
     * 格式化監視器資料以符合現有頁面格式
     */
    formatForDisplay(camera) {
        return {
            ...camera,
            // 提取路線編號
            RoadNumber: this.extractRoadNumber(camera),
            // 判斷縣市
            City: this.getCityFromCoordinates(camera.PositionLon, camera.PositionLat),
            // 格式化方向
            Direction: this.formatDirection(camera.RoadDirection)
        };
    }

    /**
     * 從路段資訊中提取省道路線編號
     */
    extractRoadNumber(camera) {
        const roadName = camera.RoadName || '';
        const locationDesc = camera.LocationDescription || '';
        const roadSection = camera.RoadSection || '';
        const allText = `${roadName} ${locationDesc} ${roadSection}`;
        
        // 匹配台1線、台9甲線等格式
        const match = allText.match(/[台臺](\d+)([甲乙丙丁]?)線?/);
        if (match) {
            return `台${match[1]}${match[2] || ''}線`;
        }
        
        return roadName || '省道';
    }

    /**
     * 根據經緯度判斷縣市
     */
    getCityFromCoordinates(lon, lat) {
        if (!lon || !lat) return '未知';
        
        const cityRanges = [
            { name: '台北市', lonMin: 121.45, lonMax: 121.65, latMin: 24.95, latMax: 25.20 },
            { name: '基隆市', lonMin: 121.65, lonMax: 121.85, latMin: 25.10, latMax: 25.25 },
            { name: '新北市', lonMin: 121.20, lonMax: 121.95, latMin: 24.70, latMax: 25.30 },
            { name: '桃園市', lonMin: 121.05, lonMax: 121.50, latMin: 24.75, latMax: 25.05 },
            { name: '新竹縣', lonMin: 120.80, lonMax: 121.30, latMin: 24.55, latMax: 24.85 },
            { name: '新竹市', lonMin: 120.90, lonMax: 121.05, latMin: 24.75, latMax: 24.85 },
            { name: '苗栗縣', lonMin: 120.55, lonMax: 121.15, latMin: 24.25, latMax: 24.75 },
            { name: '台中市', lonMin: 120.45, lonMax: 121.25, latMin: 24.05, latMax: 24.55 },
            { name: '彰化縣', lonMin: 120.35, lonMax: 120.75, latMin: 23.85, latMax: 24.25 },
            { name: '南投縣', lonMin: 120.65, lonMax: 121.25, latMin: 23.45, latMax: 24.15 },
            { name: '雲林縣', lonMin: 120.15, lonMax: 120.65, latMin: 23.45, latMax: 23.85 },
            { name: '嘉義縣', lonMin: 120.15, lonMax: 120.75, latMin: 23.15, latMax: 23.65 },
            { name: '嘉義市', lonMin: 120.40, lonMax: 120.50, latMin: 23.45, latMax: 23.52 },
            { name: '台南市', lonMin: 120.05, lonMax: 120.65, latMin: 22.85, latMax: 23.45 },
            { name: '高雄市', lonMin: 120.15, lonMax: 120.95, latMin: 22.45, latMax: 23.15 },
            { name: '屏東縣', lonMin: 120.25, lonMax: 120.95, latMin: 21.85, latMax: 22.85 },
            { name: '宜蘭縣', lonMin: 121.55, lonMax: 122.05, latMin: 24.25, latMax: 24.95 },
            { name: '花蓮縣', lonMin: 121.15, lonMax: 121.75, latMin: 23.00, latMax: 24.45 },
            { name: '台東縣', lonMin: 120.95, lonMax: 121.65, latMin: 22.35, latMax: 23.55 }
        ];
        
        for (const city of cityRanges) {
            if (lon >= city.lonMin && lon <= city.lonMax && 
                lat >= city.latMin && lat <= city.latMax) {
                return city.name;
            }
        }
        
        return '未知';
    }

    /**
     * 格式化方向資訊
     */
    formatDirection(direction) {
        if (!direction) return '';
        
        const directionMap = {
            'S': '南', 'N': '北', 'E': '東', 'W': '西',
            'South': '南', 'North': '北', 'East': '東', 'West': '西',
            'southbound': '南下', 'northbound': '北上',
            'eastbound': '東向', 'westbound': '西向'
        };
        
        for (const [eng, chi] of Object.entries(directionMap)) {
            if (direction.toLowerCase().includes(eng.toLowerCase())) {
                return chi + '向';
            }
        }
        
        return direction;
    }

    /**
     * 取得格式化後的監視器資料
     */
    async getCameras() {
        const cameras = await this.fetchXML();
        return cameras.map(camera => this.formatForDisplay(camera));
    }

    /**
     * 合併 TDX 和公路總局的資料（去重）
     */
    mergeCameras(tdxCameras, thbCameras) {
        const merged = [...tdxCameras];
        const existingIds = new Set(tdxCameras.map(c => c.CCTVID));

        thbCameras.forEach(camera => {
            // 如果 TDX 沒有這個監視器，就加入
            if (!existingIds.has(camera.CCTVID)) {
                merged.push(camera);
            }
        });

        console.log(`📊 資料合併: TDX ${tdxCameras.length} 筆 + 公路總局 ${thbCameras.length} 筆 = 總計 ${merged.length} 筆`);
        return merged;
    }
}

// 匯出為全域物件
window.THBProvincialAPI = THBProvincialAPI;
window.thbApi = new THBProvincialAPI();
