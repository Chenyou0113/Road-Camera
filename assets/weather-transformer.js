/**
 * 中央氣象署氣象觀測站資料轉換工具 (安全版本)
 * Weather Station Data Transformer - Secure Backend Pattern
 * 
 * 🔒 安全更新 (2025年)：
 * - 所有 CWA API 請求現透過後端 Cloudflare Function (/api/cwa) 進行
 * - API 金鑰從環境變數讀取，不再暴露於前端代碼
 * - 完整支援 CWA 標準 V1.05 的特殊代碼
 */

class WeatherTransformer {
    // 後端代理 API 端點（讀取 Cloudflare 環境變數的 CWA_API_KEY）
    static API_ENDPOINT = '/api/cwa';
    
    // 保留原始值供參考（已不使用，密鑰現從環境變數讀取）
    static OBSERVATION_DATA_ID = 'O-A0003-001'; // 10分鐘綜觀氣象資料
    static AUTOMATED_DATA_ID = 'O-A0001-001';   // 自動站資料

    /**
     * 取得所有氣象觀測站資料（現透過後端代理）
     * @returns {Promise<Array>} 觀測站資料陣列
     */
    static async getAllStations() {
        try {
            console.log('📡 透過後端代理取得氣象觀測站資料...');

            // 並行呼叫兩個觀測站資料集
            const [manned, automated] = await Promise.all([
                this.fetchDataViaProxy('O-A0003-001'),
                this.fetchDataViaProxy('O-A0001-001')
            ]);

            // 合併結果
            const combined = [...manned, ...automated];
            console.log(`✅ 成功取得 ${combined.length} 個觀測站 (${manned.length} 人工+${automated.length} 自動)`);
            return combined;
        } catch (error) {
            console.error('❌ 取得觀測站資料失敗:', error);
            return [];
        }
    }

    /**
     * 透過後端代理 Cloudflare Function 取得資料
     * @param {string} dataId 資料集 ID (O-A0003-001 或 O-A0001-001)
     * @returns {Promise<Array>} 觀測站資料陣列
     */
    static async fetchDataViaProxy(dataId) {
        try {
            const proxyUrl = `${this.API_ENDPOINT}?id=${dataId}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseJSON(data);
        } catch (error) {
            console.warn(`⚠️ 取得資料集 ${dataId} 失敗:`, error);
            return [];
        }
    }



    /**
     * 解析 JSON 格式資料
     * @param {Object} json JSON 物件
     * @returns {Array} 觀測站資料陣列
     */
    static parseJSON(json) {
        try {
            console.log('📊 開始解析 JSON 格式資料...');
            
            if (!json.cwaopendata || !json.cwaopendata.dataset) {
                console.warn('⚠️ 未知的 JSON 格式');
                return [];
            }
            
            const dataset = json.cwaopendata.dataset;
            let stations = Array.isArray(dataset.Station) ? dataset.Station : [dataset.Station];
            const result = [];
            
            // 定義 CWA 標準 V1.05 的特殊代碼處理函式
            const parseVal = (val) => {
                // 字串型別的特殊代碼
                if (typeof val === 'string') {
                    const v = val.trim();
                    if (v === 'X' || v === 'x') return null; // 儀器故障
                    if (v === 'T' || v === 't') return 0.0;  // 雨跡 (視為 0 mm)
                }

                const num = parseFloat(val);
                if (isNaN(num)) return null;
                if (num === -99 || num === -99.0) return null; // 缺值/異常
                if (num === -98 || num === -98.0) return 0.0;  // 連續6小時無降水 (視為 0)
                return num;
            };
            
            const parseWindDir = (val) => {
                if (val === undefined || val === null || val === '') return null;
                if (typeof val === 'string') {
                    const v = val.trim();
                    if (v === 'X' || v === 'x') return null;
                }
                const num = parseFloat(val);
                if (isNaN(num)) return null;
                if (num === -99) return null;
                if (num === 990) return 990; // 風向不定
                return num;
            };
            
            for (let station of stations) {
                try {
                    const stationName = station.StationName;
                    const stationId = station.StationId;
                    const obsTime = station.ObsTime?.DateTime;
                    const geoInfo = station.GeoInfo || {};
                    
                    // 解析 WGS84 座標
                    let lat = null, lon = null;
                    if (geoInfo.Coordinates) {
                        const coords = Array.isArray(geoInfo.Coordinates) ? geoInfo.Coordinates : [geoInfo.Coordinates];
                        const wgs84 = coords.find(c => c.CoordinateName === 'WGS84');
                        if (wgs84) {
                            lat = parseFloat(wgs84.StationLatitude);
                            lon = parseFloat(wgs84.StationLongitude);
                        }
                    }
                    
                    const altitude = parseVal(geoInfo.StationAltitude);
                    const county = geoInfo.CountyName;
                    const town = geoInfo.TownName;
                    const weather = station.WeatherElement || {};
                    
                    // 降雨量
                    let precipitation = null;
                    if (weather.Now && weather.Now.Precipitation) {
                        precipitation = parseVal(weather.Now.Precipitation);
                    }
                    
                    // 瞬間最大風速
                    let gustSpeed = null, gustDir = null, gustTime = null;
                    if (weather.GustInfo) {
                        gustSpeed = parseVal(weather.GustInfo.PeakGustSpeed);
                        if (weather.GustInfo.Occurred_at) {
                            gustDir = parseWindDir(weather.GustInfo.Occurred_at.WindDirection);
                            gustTime = weather.GustInfo.Occurred_at.DateTime;
                        }
                    }
                    
                    // 日極值
                    let dailyHigh = null, dailyLow = null;
                    if (weather.DailyExtreme) {
                        if (weather.DailyExtreme.DailyHigh?.TemperatureInfo) {
                            const temp = parseVal(weather.DailyExtreme.DailyHigh.TemperatureInfo.AirTemperature);
                            const time = weather.DailyExtreme.DailyHigh.TemperatureInfo.Occurred_at?.DateTime;
                            if (temp !== null) dailyHigh = { temperature: temp, occurredAt: time };
                        }
                        if (weather.DailyExtreme.DailyLow?.TemperatureInfo) {
                            const temp = parseVal(weather.DailyExtreme.DailyLow.TemperatureInfo.AirTemperature);
                            const time = weather.DailyExtreme.DailyLow.TemperatureInfo.Occurred_at?.DateTime;
                            if (temp !== null) dailyLow = { temperature: temp, occurredAt: time };
                        }
                    }
                    
                    result.push({
                        stationName: stationName,
                        stationId: stationId,
                        obsTime: obsTime,
                        lat: lat,
                        lon: lon,
                        altitude: altitude,
                        county: county,
                        town: town,
                        weather: weather.Weather,
                        precipitation: precipitation,
                        windDirection: parseWindDir(weather.WindDirection),
                        windSpeed: parseVal(weather.WindSpeed),
                        temperature: parseVal(weather.AirTemperature),
                        humidity: parseVal(weather.RelativeHumidity),
                        pressure: parseVal(weather.AirPressure),
                        peakGustSpeed: gustSpeed,
                        peakGustDirection: gustDir,
                        peakGustTime: gustTime,
                        sunshineDuration: parseVal(weather.SunshineDuration),
                        uvi: parseVal(weather.UVIndex),
                        dailyHighTemp: dailyHigh,
                        dailyLowTemp: dailyLow
                    });
                } catch (err) {
                    console.warn('⚠️ 解析單一觀測站失敗:', station.StationName, err);
                }
            }
            
            console.log(`✅ 成功解析 ${result.length} 個觀測站 (JSON格式)`);
            return result;
        } catch (error) {
            console.error('❌ JSON 解析錯誤:', error);
            return [];
        }
    }

    /**
     * 依縣市分組觀測站
     * @param {Array} stations 觀測站陣列
     * @returns {Object} 縣市分組物件 { 縣市名: [站點...] }
     */
    static groupByCounty(stations) {
        const groups = {};
        stations.forEach(station => {
            const county = station.county || '其他';
            if (!groups[county]) groups[county] = [];
            groups[county].push(station);
        });
        return groups;
    }

    /**
     * 風向值安全轉換 (處理特殊代碼 990 = 風向不定)
     * @param {number|string} value 原始風向值
     * @returns {number|null} 轉換後的風向值
     */
    static parseWindDirection(value) {
        if (value === undefined || value === null || value === '') return null;
        
        if (typeof value === 'string') {
            const v = value.trim();
            if (v === 'X' || v === 'x') return null; // 儀器故障
        }

        const num = parseFloat(value);
        if (isNaN(num)) return null;
        if (num === -99) return null;
        if (num === 990) return 990; // 風向不定
        return num;
    }

    /**
     * 風向轉換為文字描述
     * @param {number} degree 風向角度
     * @returns {string} 風向文字
     */
    static getWindDirection(degree) {
        if (degree === null || degree < 0) return 'N/A';
        
        // 特殊代碼：990 = 風向不定
        if (degree === 990) return '不定';
        
        const directions = ['北', '北北東', '東北', '東北東', '東', '東南東', '東南', '南南東',
                          '南', '南南西', '西南', '西南西', '西', '西北西', '西北', '北北西'];
        const index = Math.round(degree / 22.5) % 16;
        return directions[index];
    }

    /**
     * 天氣描述轉換為圖標
     * @param {string} weather 天氣描述
     * @returns {string} emoji 圖標
     */
    static getWeatherIcon(weather) {
        if (!weather) return '❓';
        if (weather.includes('晴')) return '☀️';
        if (weather.includes('多雲')) return '⛅';
        if (weather.includes('陰')) return '☁️';
        if (weather.includes('雨')) return '🌧️';
        if (weather.includes('雷')) return '⛈️';
        if (weather.includes('霧')) return '🌫️';
        return '🌤️';
    }

    /**
     * 紫外線指數等級
     * @param {number} uvi 紫外線指數
     * @returns {string} 等級文字與顏色
     */
    static getUVILevel(uvi) {
        if (uvi === null || uvi < 0) return { level: 'N/A', color: '#999' };
        if (uvi <= 2) return { level: '低量', color: '#4CAF50' };
        if (uvi <= 5) return { level: '中量', color: '#FFC107' };
        if (uvi <= 7) return { level: '高量', color: '#FF9800' };
        if (uvi <= 10) return { level: '過量', color: '#F44336' };
        return { level: '危險', color: '#9C27B0' };
    }

    /**
     * 建立觀測站卡片 HTML
     * @param {Object} station 觀測站資料
     * @returns {string} HTML 字符串
     */
    static createStationCard(station) {
        const time = station.obsTime ? new Date(station.obsTime).toLocaleString('zh-TW', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'N/A';

        const windDir = this.getWindDirection(station.windDirection);
        const weatherIcon = this.getWeatherIcon(station.weather);
        const uviInfo = this.getUVILevel(station.uvi);

        // 溫度基於梯度的背景色
        let tempColor = '#ccc';
        if (station.temperature !== null) {
            const temp = station.temperature;
            if (temp < 0) tempColor = '#1e90ff';        // 藍色 - 很冷
            else if (temp < 10) tempColor = '#4169e1';  // 藍色 - 冷
            else if (temp < 15) tempColor = '#20b2aa';  // 青色 - 涼爽
            else if (temp < 20) tempColor = '#32cd32';  // 綠色 - 舒適
            else if (temp < 25) tempColor = '#ffa500';  // 橙色 - 溫暖
            else if (temp < 30) tempColor = '#ff6347';  // 紅色 - 熱
            else tempColor = '#dc143c';                 // 深紅色 - 很熱
        }

        return `
            <div class="station-card" onclick="showStationDetail('${station.stationId}')">
                <div class="station-header">
                    <h3>${station.stationName}</h3>
                    <span class="weather-icon">${weatherIcon}</span>
                </div>
                <div class="station-body" style="background: linear-gradient(135deg, ${tempColor}22 0%, ${tempColor}11 100%);">
                    <div class="temp-main" style="color: ${tempColor}; font-weight: bold;">
                        ${station.temperature !== null ? station.temperature.toFixed(1) : 'N/A'}°C
                    </div>
                    <div class="station-info">
                        <span>🌡️ ${station.weather || 'N/A'}</span>
                        <span>💧 濕度 ${station.humidity !== null ? station.humidity.toFixed(0) : 'N/A'}%</span>
                        <span>💨 ${windDir} ${station.windSpeed !== null ? station.windSpeed.toFixed(1) : 'N/A'} m/s</span>
                        ${station.precipitation !== null && station.precipitation > 0 ? 
                            `<span>🌧️ 降雨 ${station.precipitation.toFixed(1)} mm</span>` : ''}
                        ${station.uvi !== null && station.uvi >= 0 ? 
                            `<span>☀️ UV <strong style="color: ${uviInfo.color}">${station.uvi.toFixed(1)} (${uviInfo.level})</strong></span>` : ''}
                        ${station.sunshineDuration !== null && station.sunshineDuration > 0 ? 
                            `<span>🌞 日照 ${station.sunshineDuration.toFixed(1)} hr</span>` : ''}
                    </div>
                    <div class="station-location">
                        📍 ${station.county} ${station.town || ''}
                    </div>
                    <div class="station-time">⏰ ${time}</div>
                </div>
            </div>
        `;
    }

    /**
     * 建立統計面板 HTML
     * @param {Array} stations 觀測站陣列
     * @returns {string} HTML 字符串
     */
    static createStatsPanel(stations) {
        const validStations = stations.filter(s => s.temperature !== null);
        const validTemps = validStations.map(s => s.temperature);
        
        const avgTemp = validTemps.length > 0 ? 
            (validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1) : 'N/A';
        
        let maxTemp = 'N/A', maxTempStation = '';
        if (validTemps.length > 0) {
            const max = Math.max(...validTemps);
            maxTemp = max.toFixed(1);
            const maxStation = validStations.find(s => s.temperature === max);
            maxTempStation = maxStation ? maxStation.stationName : '';
        }
        
        let minTemp = 'N/A', minTempStation = '';
        if (validTemps.length > 0) {
            const min = Math.min(...validTemps);
            minTemp = min.toFixed(1);
            const minStation = validStations.find(s => s.temperature === min);
            minTempStation = minStation ? minStation.stationName : '';
        }

        const rainingStations = stations.filter(s => s.precipitation !== null && s.precipitation > 0);

        return `
            <div class="stat-card">
                <div class="stat-number">${stations.length}</div>
                <div class="stat-label">觀測站數</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${avgTemp}°C</div>
                <div class="stat-label">平均氣溫</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: #ff6347;">${maxTemp}°C</div>
                <div class="stat-label">${maxTempStation || '最高氣溫'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" style="color: #1e90ff;">${minTemp}°C</div>
                <div class="stat-label">${minTempStation || '最低氣溫'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${rainingStations.length}</div>
                <div class="stat-label">降雨站數</div>
            </div>
        `;
    }
}

// 匯出供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherTransformer;
}
