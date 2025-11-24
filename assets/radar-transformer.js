/**
 * 中央氣象署降雨雷達回波圖 - 資料轉換工具 (安全版本)
 * Rainfall Radar Echo Map Data Transformer - Secure Backend Pattern
 * 
 * 🔒 安全更新 (2025年)：
 * - 所有雷達資料請求現透過後端 Cloudflare Function (/api/weather) 進行
 * - API 金鑰從環境變數讀取，不再暴露於前端代碼
 * 
 * 支援的雷達站點：
 * 個站雷達：
 * - 樹林雷達 (O-A0084-001)
 * - 南屯雷達 (O-A0084-002)
 * - 林園雷達 (O-A0084-003)
 * 
 * 整合雷達：
 * - 臺灣(鄰近區域)_無地形 (O-A0058-003)
 * - 臺灣(較大範圍)_無地形 (O-A0058-001)
 */

class RadarTransformer {
    // 後端代理 API 端點
    static API_ENDPOINT = '/api/weather';
    
    // 保留原始值供參考（已不使用，密鑰現從環境變數讀取）
    static FILE_API_BASE = 'https://opendata.cwa.gov.tw/fileapi/v1/opendataapi';
    static API_KEY = ''; // 已不使用 - 透過後端代理

    // 雷達站點配置
    static RADAR_STATIONS = {
        '001': {
            code: '001',
            name: '樹林雷達',
            location: '樹林',
            county: '新北市',
            lat: 24.9703,
            lon: 121.4197,
            dataId: 'O-A0084-001',
            description: '樹林降雨雷達回波圖',
            type: 'individual'
        },
        '002': {
            code: '002',
            name: '南屯雷達',
            location: '南屯',
            county: '臺中市',
            lat: 24.1348,
            lon: 120.6448,
            dataId: 'O-A0084-002',
            description: '南屯降雨雷達回波圖',
            type: 'individual'
        },
        '003': {
            code: '003',
            name: '林園雷達',
            location: '林園',
            county: '高雄市',
            lat: 22.4725,
            lon: 120.2847,
            dataId: 'O-A0084-003',
            description: '林園降雨雷達回波圖',
            type: 'individual'
        },
        '101': {
            code: '101',
            name: '雷達整合回波圖 - 臺灣(鄰近區域)',
            location: '全台灣',
            county: '臺灣',
            lat: 23.8,
            lon: 120.9,
            dataId: 'O-A0058-003',
            description: '臺灣鄰近區域降雨雷達整合回波圖(無地形)',
            type: 'integrated',
            coverage: '鄰近區域'
        },
        '102': {
            code: '102',
            name: '雷達整合回波圖 - 臺灣(較大範圍)',
            location: '全台灣',
            county: '臺灣',
            lat: 23.8,
            lon: 120.9,
            dataId: 'O-A0058-001',
            description: '臺灣較大範圍降雨雷達整合回波圖(無地形)',
            type: 'integrated',
            coverage: '較大範圍'
        }
    };

    /**
     * 解析 XML 格式的雷達資料（支援命名空間）
     * @param {string} xmlText XML 字符串
     * @returns {Object} 解析後的資料
     */
    static parseRadarXML(xmlText) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

            // 檢查是否有 XML 解析錯誤
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                console.error('❌ XML 解析器報告錯誤');
                throw new Error('XML 解析失敗');
            }

            // 提取資訊（支援命名空間和無命名空間）
            const getElementText = (tagName) => {
                // 使用 getElementsByTagName 搜索所有命名空間
                const elements = xmlDoc.getElementsByTagName(tagName);
                if (elements.length > 0) {
                    const text = elements[0].textContent;
                    console.log(`✅ 找到 ${tagName}: ${text.substring(0, 50)}`);
                    return text;
                }
                console.log(`⚠️ 未找到 ${tagName}`);
                return null;
            };

            const productUrl = getElementText('ProductURL');
            const dateTime = getElementText('DateTime');
            const resourceDesc = getElementText('resourceDesc');
            const mimeType = getElementText('mimeType');
            const stationLat = getElementText('StationLatitude');
            const stationLon = getElementText('StationLongitude');
            const imageDim = getElementText('ImageDimension');

            console.log('📡 XML 解析完成:', {
                productUrl: !!productUrl,
                dateTime: !!dateTime,
                stationLat,
                stationLon
            });

            return {
                imageUrl: productUrl,
                timestamp: dateTime || new Date().toISOString(),
                resourceDesc: resourceDesc || '',
                contentType: mimeType || 'image/png',
                stationLat: stationLat ? parseFloat(stationLat) : null,
                stationLon: stationLon ? parseFloat(stationLon) : null,
                imageDimension: imageDim || '',
                success: !!productUrl
            };
        } catch (error) {
            console.error('❌ XML 解析錯誤:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 取得指定雷達的最新回波圖（透過後端代理）
     * @param {string} stationCode 雷達站點代碼 ('001', '002', '003', '101', '102')
     * @returns {Promise<Object>} 回波圖資料 { imageUrl, timestamp, ...}
     */
    static async getRadarEchoMap(stationCode) {
        try {
            const station = this.RADAR_STATIONS[stationCode];
            if (!station) {
                throw new Error(`無效的雷達站點代碼: ${stationCode}`);
            }

            // 透過後端代理請求雷達資料
            const proxyUrl = `${this.API_ENDPOINT}?dataId=${station.dataId}&type=file`;
            
            console.log(`\n📡 [${stationCode}] 透過後端代理開始請求雷達資料...`);
            console.log(`🔗 代理 URL: ${proxyUrl}`);
            
            const response = await fetch(proxyUrl);
            console.log(`📊 HTTP 狀態: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`API 錯誤: ${response.status} ${response.statusText}`);
            }

            // 嘗試解析為文本
            const text = await response.text();
            const textLength = text.length;
            
            console.log(`� 回應長度: ${textLength} 字符`);
            console.log(`📄 首 100 字符: ${text.substring(0, 100)}`);
            
            let parsedData;
            
            // 嘗試作為 XML 解析
            if (text.includes('<?xml') || text.includes('<cwaopendata') || text.includes('<dataset')) {
                console.log(`✅ 偵測到 XML 格式`);
                parsedData = this.parseRadarXML(text);
                console.log(`🧬 XML 解析結果:`, parsedData);
            } 
            // 嘗試作為 JSON 解析
            else if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                console.log(`✅ 偵測到 JSON 格式`);
                try {
                    const jsonData = JSON.parse(text);
                    console.log(`🔍 JSON 結構:`, Object.keys(jsonData));
                    
                    // 處理中央氣象署新 API 格式（cwaopendata）
                    if (jsonData.cwaopendata) {
                        console.log(`📡 偵測到中央氣象署 cwaopendata 格式`);
                        const cwaData = jsonData.cwaopendata;
                        
                        // 檢查是否有 dataset 或 location
                        if (cwaData.dataset) {
                            console.log(`📦 找到 dataset:`, Object.keys(cwaData.dataset));
                            
                            // 嘗試從 dataset 提取資料
                            const dataset = cwaData.dataset;
                            
                            // resource 可能是物件或陣列
                            if (dataset.resource) {
                                console.log(`📦 resource 類型: ${Array.isArray(dataset.resource) ? '陣列' : typeof dataset.resource}`);
                                console.log(`📦 resource 內容:`, dataset.resource);
                                
                                let resource;
                                if (Array.isArray(dataset.resource)) {
                                    resource = dataset.resource[0];
                                } else if (typeof dataset.resource === 'object') {
                                    resource = dataset.resource;
                                }
                                
                                // 嘗試多種可能的 URL 欄位名稱
                                const imageUrl = resource?.ProductURL || resource?.uri || resource?.url;
                                
                                if (imageUrl) {
                                    // 嘗試從多個位置取得時間戳
                                    const timestamp = dataset.DateTime || 
                                                     dataset.datasetInfo?.parameterSet?.parameter?.find(p => p.parameterName === 'DATETIME')?.parameterValue || 
                                                     new Date().toISOString();
                                    
                                    parsedData = {
                                        imageUrl: imageUrl,
                                        timestamp: timestamp,
                                        contentType: resource.mimeType || 'image/png',
                                        success: true
                                    };
                                    console.log(`✅ 從 cwaopendata.dataset.resource 提取資料: ${imageUrl}`);
                                } else {
                                    console.warn(`⚠️ resource 無 ProductURL/uri/url 欄位，resource 結構:`, resource);
                                    parsedData = { success: false, error: '無可用資料 (resource 無圖片URL)' };
                                }
                            } else {
                                console.warn(`⚠️ dataset 中無 resource`);
                                parsedData = { success: false, error: '無可用資料 (dataset 無 resource)' };
                            }
                        } else if (cwaData.location && Array.isArray(cwaData.location)) {
                            console.log(`📍 找到 location 陣列`);
                            const location = cwaData.location[0];
                            if (location && location.weatherElement) {
                                // 處理 weatherElement 資料
                                parsedData = { success: false, error: 'weatherElement 格式尚未實作' };
                            } else {
                                parsedData = { success: false, error: '無可用資料 (location 無 weatherElement)' };
                            }
                        } else {
                            console.warn(`⚠️ cwaopendata 無 dataset 或 location`);
                            console.log(`cwaopendata 結構:`, Object.keys(cwaData));
                            parsedData = { success: false, error: '無可用資料 (cwaopendata 格式不符)' };
                        }
                    }
                    // 處理舊版 JSON 格式
                    else if (jsonData.data && jsonData.data.length > 0) {
                        const latestImage = jsonData.data[0];
                        parsedData = {
                            imageUrl: latestImage.url || latestImage.imageUrl,
                            timestamp: latestImage.importDate || new Date().toISOString(),
                            contentType: latestImage.contentType || 'image/png',
                            fileSize: latestImage.filesize,
                            success: true
                        };
                    } else if (jsonData.records && jsonData.records.length > 0) {
                        const latestImage = jsonData.records[0];
                        parsedData = {
                            imageUrl: latestImage.ProductURL || latestImage.url,
                            timestamp: latestImage.DateTime || new Date().toISOString(),
                            contentType: 'image/png',
                            success: true
                        };
                    } else {
                        console.warn(`⚠️ JSON 無 cwaopendata、data 或 records 欄位`);
                        console.log(`JSON 頂層鍵值:`, Object.keys(jsonData));
                        parsedData = { success: false, error: '無可用資料' };
                    }
                } catch (e) {
                    console.error(`📡 [${stationCode}] JSON 解析失敗:`, e);
                    parsedData = { success: false, error: 'JSON 解析失敗' };
                }
            } 
            else {
                console.warn(`⚠️ 未知的資料格式`);
                console.log(`首 20 字符: ${text.substring(0, 20)}`);
                parsedData = { success: false, error: '未知的資料格式' };
            }

            if (!parsedData.success) {
                console.warn(`❌ 解析失敗:`, parsedData.error);
                return {
                    ...station,
                    imageUrl: null,
                    timestamp: new Date().toISOString(),
                    error: parsedData.error || '無可用的雷達回波圖'
                };
            }

            console.log(`✅ [${stationCode}] 成功取得回波圖`);
            console.log(`🖼️ 圖片 URL: ${parsedData.imageUrl.substring(0, 60)}...`);
            console.log(`🕐 時間: ${parsedData.timestamp}`);
            
            return {
                ...station,
                imageUrl: parsedData.imageUrl,
                timestamp: parsedData.timestamp,
                contentType: parsedData.contentType || 'image/png',
                fileSize: parsedData.fileSize,
                resourceDesc: parsedData.resourceDesc,
                imageDimension: parsedData.imageDimension,
                dataId: station.dataId
            };

        } catch (error) {
            console.error(`❌ [${stationCode}] 取得雷達資料失敗:`, error);
            return {
                ...this.RADAR_STATIONS[stationCode],
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 同時取得所有三個雷達的回波圖
     * @returns {Promise<Array>} 所有雷達的資料陣列
     */
    static async getAllRadarEchoMaps() {
        const codes = Object.keys(this.RADAR_STATIONS);
        const results = await Promise.all(
            codes.map(code => this.getRadarEchoMap(code))
        );
        return results;
    }

    /**
     * 取得所有雷達站點資訊
     * @returns {Array} 雷達站點清單
     */
    static getAllStations() {
        return Object.values(this.RADAR_STATIONS);
    }

    /**
     * 按縣市取得雷達
     * @param {string} county 縣市名稱
     * @returns {Array} 該縣市的雷達清單
     */
    static getStationsByCounty(county) {
        return Object.values(this.RADAR_STATIONS).filter(
            station => station.county === county
        );
    }

    /**
     * 建立雷達卡片 HTML
     * @param {Object} station 雷達站點資訊
     * @param {Object} data 回波圖資料
     * @returns {string} HTML 字符串
     */
    static createRadarCard(station, data) {
        const timestamp = new Date(data.timestamp).toLocaleString('zh-TW');
        const statusIcon = data.error ? '❌' : '✅';
        const imageId = `radar-img-${station.code}`;
        const loadingId = `loading-${station.code}`;
        
        return `
            <div class="radar-card">
                <div class="card-header">
                    <h3>${station.name}</h3>
                    <span class="status-badge ${data.error ? 'error' : 'success'}">
                        ${statusIcon} ${data.error ? '無資料' : '即時'}
                    </span>
                </div>
                <div class="card-body">
                    <p><strong>📍 位置:</strong> ${station.location} (${station.county})</p>
                    <p><strong>🌍 座標:</strong> ${station.lat.toFixed(4)}, ${station.lon.toFixed(4)}</p>
                    <p><strong>⏱️ 更新時間:</strong> ${timestamp}</p>
                    ${data.error ? 
                        `<p class="error-text">⚠️ ${data.error}</p>` :
                        `<p><strong>📊 檔案大小:</strong> ${this.formatFileSize(data.fileSize)}</p>`
                    }
                    ${!data.error && data.imageUrl ? 
                        `<div class="card-image-container">
                            <div class="card-image-loading" id="${loadingId}">
                                <div class="spinner"></div>
                                <span>載入回波圖中...</span>
                            </div>
                            <img 
                                id="${imageId}"
                                class="card-radar-image" 
                                src="${data.imageUrl}"
                                alt="${station.name}回波圖"
                                crossorigin="anonymous"
                                onload="this.classList.add('loaded');document.getElementById('${loadingId}').style.display='none';"
                                onerror="this.remove();document.getElementById('${loadingId}').innerHTML='<div style=&quot;text-align:center;padding:20px;color:#c62828;&quot;>❌ 圖片載入失敗<br><small style=&quot;color:#999;&quot;>請稍後重試或刷新頁面</small></div>';"
                            />
                        </div>
                        <button class="btn btn-view" onclick="openRadarModal('${station.code}')" style="margin-top: 10px;">
                            🔍 查看詳細資訊
                        </button>` : 
                        ''
                    }
                </div>
            </div>
        `;
    }

    /**
     * 格式化檔案大小
     * @param {number} bytes 字節數
     * @returns {string} 格式化後的大小
     */
    static formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * 建立雷達統計面板
     * @param {Array} stations 所有雷達站點
     * @returns {string} HTML 字符串
     */
    static createStatsPanel(stations) {
        const counties = new Set(stations.filter(s => s.type === 'individual').map(s => s.county));
        const individualRadars = stations.filter(s => s.type === 'individual').length;
        const integratedRadars = stations.filter(s => s.type === 'integrated').length;
        
        return `
            <div class="radar-stats-compact">
                <span class="stat-compact">📡 <strong>${stations.length}</strong> 雷達資料源</span>
                <span class="stat-divider">|</span>
                <span class="stat-compact">🎯 <strong>${individualRadars}</strong> 個站雷達</span>
                <span class="stat-divider">|</span>
                <span class="stat-compact">🌐 <strong>${integratedRadars}</strong> 整合雷達</span>
                <span class="stat-divider">|</span>
                <span class="stat-compact">📍 <strong>${individualRadars}</strong> 處觀測站</span>
                <span class="stat-divider">|</span>
                <span class="stat-compact">🔄 自動更新 <strong>每 10 分鐘</strong></span>
            </div>
        `;
    }

    /**
     * 驗證雷達站點代碼是否有效
     * @param {string} code 雷達站點代碼
     * @returns {boolean} 是否有效
     */
    static isValidStationCode(code) {
        return code in this.RADAR_STATIONS;
    }

    /**
     * 取得雷達站點名稱
     * @param {string} code 雷達站點代碼
     * @returns {string} 站點名稱
     */
    static getStationName(code) {
        return this.RADAR_STATIONS[code]?.name || '未知雷達';
    }

    /**
     * 按類型取得雷達
     * @param {string} type 雷達類型 ('individual' 或 'integrated')
     * @returns {Array} 該類型的雷達清單
     */
    static getStationsByType(type) {
        return Object.values(this.RADAR_STATIONS).filter(
            station => station.type === type
        );
    }

    /**
     * 建立回波圖代理 URL（透過後端）
     * @param {string} code 雷達站點代碼
     * @returns {string} 回波圖代理 URL
     */
    static getRadarImageUrl(code) {
        if (!this.isValidStationCode(code)) return null;
        
        const station = this.RADAR_STATIONS[code];
        return `${this.API_ENDPOINT}?dataId=${station.dataId}&type=file`;
    }
}

// 導出（支援 ES6 模組和全域變數）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RadarTransformer;
} else {
    window.RadarTransformer = RadarTransformer;
}

console.log('✅ 降雨雷達轉換工具已加載');
