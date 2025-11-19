/**
 * 中央氣象署氣象觀測站資料轉換工具
 * Weather Station Data Transformer
 */

class WeatherTransformer {
    static API_BASE = 'https://opendata.cwa.gov.tw/fileapi/v1/opendataapi';
    static API_KEY = 'CWA-675CED45-09DF-4249-9599-B9B5A5AB761A';
    static OBSERVATION_DATA_ID = 'O-A0003-001'; // 10分鐘綜觀氣象資料

    /**
     * 取得所有氣象觀測站資料
     * @returns {Promise<Array>} 觀測站資料陣列
     */
    static async getAllStations() {
        try {
            const url = `${this.API_BASE}/${this.OBSERVATION_DATA_ID}?Authorization=${this.API_KEY}&downloadType=WEB&format=JSON`;
            console.log('📡 取得氣象觀測站資料...');

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const text = await response.text();
            
            // 檢查是否為 XML 格式
            if (text.includes('<?xml') || text.includes('<cwaopendata')) {
                return this.parseXML(text);
            } else if (text.trim().startsWith('{')) {
                const json = JSON.parse(text);
                return this.parseJSON(json);
            }

            throw new Error('未知的資料格式');
        } catch (error) {
            console.error('❌ 取得觀測站資料失敗:', error);
            throw error;
        }
    }

    /**
     * 解析 XML 格式資料
     * @param {string} xmlText XML 字符串
     * @returns {Array} 觀測站資料陣列
     */
    static parseXML(xmlText) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('XML 解析失敗');
            }

            const stations = xmlDoc.getElementsByTagName('Station');
            const result = [];

            for (let station of stations) {
                const data = this.extractStationData(station);
                if (data) result.push(data);
            }

            console.log(`✅ 成功解析 ${result.length} 個觀測站`);
            return result;
        } catch (error) {
            console.error('❌ XML 解析錯誤:', error);
            throw error;
        }
    }

    /**
     * 從 XML Station 節點提取資料
     * @param {Element} station Station XML 元素
     * @returns {Object|null} 觀測站資料物件
     */
    static extractStationData(station) {
        try {
            const getText = (tagName) => {
                const elements = station.getElementsByTagName(tagName);
                return elements.length > 0 ? elements[0].textContent : null;
            };

            const getFloat = (tagName) => {
                const text = getText(tagName);
                return text && text !== '-99' ? parseFloat(text) : null;
            };

            // WGS84 座標
            const coords = station.getElementsByTagName('Coordinates');
            let lat = null, lon = null;
            for (let coord of coords) {
                const coordName = coord.getElementsByTagName('CoordinateName')[0]?.textContent;
                if (coordName === 'WGS84') {
                    lat = parseFloat(coord.getElementsByTagName('StationLatitude')[0]?.textContent);
                    lon = parseFloat(coord.getElementsByTagName('StationLongitude')[0]?.textContent);
                    break;
                }
            }

            // 提取最大瞬間風資料
            const gustInfo = station.getElementsByTagName('GustInfo')[0];
            let gustSpeed = null, gustDir = null, gustTime = null;
            if (gustInfo) {
                gustSpeed = getFloat('PeakGustSpeed');
                const occurredAt = gustInfo.getElementsByTagName('Occurred_at')[0];
                if (occurredAt) {
                    gustDir = parseFloat(occurredAt.getElementsByTagName('WindDirection')[0]?.textContent);
                    gustTime = occurredAt.getElementsByTagName('DateTime')[0]?.textContent;
                }
            }

            return {
                stationName: getText('StationName'),
                stationId: getText('StationId'),
                obsTime: getText('DateTime'),
                lat: lat,
                lon: lon,
                altitude: getFloat('StationAltitude'),
                county: getText('CountyName'),
                town: getText('TownName'),
                weather: getText('Weather'),
                precipitation: getFloat('Precipitation'),
                windDirection: getFloat('WindDirection'),
                windSpeed: getFloat('WindSpeed'),
                temperature: getFloat('AirTemperature'),
                humidity: getFloat('RelativeHumidity'),
                pressure: getFloat('AirPressure'),
                peakGustSpeed: gustSpeed,
                peakGustDirection: gustDir,
                peakGustTime: gustTime,
                sunshineDuration: getFloat('SunshineDuration'),
                uvi: getFloat('UVI'),
                dailyHighTemp: this.extractDailyExtreme(station, 'DailyHigh'),
                dailyLowTemp: this.extractDailyExtreme(station, 'DailyLow')
            };
        } catch (error) {
            console.warn('⚠️ 提取觀測站資料失敗:', error);
            return null;
        }
    }

    /**
     * 提取每日極值資料
     * @param {Element} station Station XML 元素
     * @param {string} type 'DailyHigh' 或 'DailyLow'
     * @returns {Object|null} 極值資料
     */
    static extractDailyExtreme(station, type) {
        try {
            const extreme = station.getElementsByTagName(type)[0];
            if (!extreme) return null;

            const tempInfo = extreme.getElementsByTagName('TemperatureInfo')[0];
            if (!tempInfo) return null;

            const temp = tempInfo.getElementsByTagName('AirTemperature')[0]?.textContent;
            const occurred = tempInfo.getElementsByTagName('DateTime')[0]?.textContent;

            return {
                temperature: temp ? parseFloat(temp) : null,
                occurredAt: occurred
            };
        } catch (error) {
            return null;
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
            
            // 檢查 cwaopendata 格式
            if (json.cwaopendata && json.cwaopendata.dataset) {
                const dataset = json.cwaopendata.dataset;
                
                // Station 可能是陣列或單一物件
                let stations = Array.isArray(dataset.Station) ? dataset.Station : [dataset.Station];
                
                const result = [];
                
                for (let station of stations) {
                    try {
                        // 提取基本資訊
                        const stationName = station.StationName;
                        const stationId = station.StationId;
                        const obsTime = station.ObsTime?.DateTime;
                        
                        // 提取地理資訊
                        const geoInfo = station.GeoInfo || {};
                        let lat = null, lon = null;
                        
                        // 解析座標 (可能是空白或包含多組座標)
                        if (geoInfo.Coordinates) {
                            // 如果是陣列,查找 WGS84
                            if (Array.isArray(geoInfo.Coordinates)) {
                                const wgs84 = geoInfo.Coordinates.find(c => c.CoordinateName === 'WGS84');
                                if (wgs84) {
                                    lat = parseFloat(wgs84.StationLatitude);
                                    lon = parseFloat(wgs84.StationLongitude);
                                }
                            } else if (typeof geoInfo.Coordinates === 'object' && geoInfo.Coordinates.CoordinateName === 'WGS84') {
                                lat = parseFloat(geoInfo.Coordinates.StationLatitude);
                                lon = parseFloat(geoInfo.Coordinates.StationLongitude);
                            }
                        }
                        
                        const altitude = parseFloat(geoInfo.StationAltitude) || null;
                        const county = geoInfo.CountyName;
                        const town = geoInfo.TownName;
                        
                        // 提取氣象資訊
                        const weather = station.WeatherElement || {};
                        
                        const getFloat = (value) => {
                            if (value === undefined || value === null || value === '' || value === '-99') return null;
                            const num = parseFloat(value);
                            return isNaN(num) || num === -99 ? null : num;
                        };
                        
                        // 降雨量 (從 Now.Precipitation)
                        let precipitation = null;
                        if (weather.Now && weather.Now.Precipitation) {
                            precipitation = getFloat(weather.Now.Precipitation);
                        }
                        
                        // 瞬間最大風速資訊
                        let gustSpeed = null, gustDir = null, gustTime = null;
                        if (weather.GustInfo) {
                            gustSpeed = getFloat(weather.GustInfo.PeakGustSpeed);
                            if (weather.GustInfo.Occurred_at) {
                                gustDir = getFloat(weather.GustInfo.Occurred_at.WindDirection);
                                gustTime = weather.GustInfo.Occurred_at.DateTime;
                            }
                        }
                        
                        // 日極值
                        let dailyHigh = null, dailyLow = null;
                        if (weather.DailyExtreme) {
                            if (weather.DailyExtreme.DailyHigh && weather.DailyExtreme.DailyHigh.TemperatureInfo) {
                                const temp = getFloat(weather.DailyExtreme.DailyHigh.TemperatureInfo.AirTemperature);
                                const time = weather.DailyExtreme.DailyHigh.TemperatureInfo.Occurred_at?.DateTime;
                                if (temp !== null) {
                                    dailyHigh = { temperature: temp, occurredAt: time };
                                }
                            }
                            if (weather.DailyExtreme.DailyLow && weather.DailyExtreme.DailyLow.TemperatureInfo) {
                                const temp = getFloat(weather.DailyExtreme.DailyLow.TemperatureInfo.AirTemperature);
                                const time = weather.DailyExtreme.DailyLow.TemperatureInfo.Occurred_at?.DateTime;
                                if (temp !== null) {
                                    dailyLow = { temperature: temp, occurredAt: time };
                                }
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
                            windDirection: getFloat(weather.WindDirection),
                            windSpeed: getFloat(weather.WindSpeed),
                            temperature: getFloat(weather.AirTemperature),
                            humidity: getFloat(weather.RelativeHumidity),
                            pressure: getFloat(weather.AirPressure),
                            peakGustSpeed: gustSpeed,
                            peakGustDirection: gustDir,
                            peakGustTime: gustTime,
                            sunshineDuration: getFloat(weather.SunshineDuration),
                            uvi: getFloat(weather.UVIndex),
                            dailyHighTemp: dailyHigh,
                            dailyLowTemp: dailyLow
                        });
                    } catch (err) {
                        console.warn('⚠️ 解析單一觀測站失敗:', station.StationName, err);
                    }
                }
                
                console.log(`✅ 成功解析 ${result.length} 個觀測站 (JSON格式)`);
                return result;
            }
            
            console.warn('⚠️ 未知的 JSON 格式');
            return [];
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
     * 風向轉換為文字描述
     * @param {number} degree 風向角度
     * @returns {string} 風向文字
     */
    static getWindDirection(degree) {
        if (degree === null || degree < 0) return 'N/A';
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

        return `
            <div class="station-card" onclick="showStationDetail('${station.stationId}')">
                <div class="station-header">
                    <h3>${station.stationName}</h3>
                    <span class="weather-icon">${weatherIcon}</span>
                </div>
                <div class="station-body">
                    <div class="temp-main">${station.temperature !== null ? station.temperature.toFixed(1) : 'N/A'}°C</div>
                    <div class="station-info">
                        <span>🌡️ ${station.weather || 'N/A'}</span>
                        <span>💧 濕度 ${station.humidity !== null ? station.humidity : 'N/A'}%</span>
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
        const validTemps = stations.filter(s => s.temperature !== null).map(s => s.temperature);
        const avgTemp = validTemps.length > 0 ? 
            (validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1) : 'N/A';
        const maxTemp = validTemps.length > 0 ? Math.max(...validTemps).toFixed(1) : 'N/A';
        const minTemp = validTemps.length > 0 ? Math.min(...validTemps).toFixed(1) : 'N/A';

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
                <div class="stat-number">${maxTemp}°C</div>
                <div class="stat-label">最高氣溫</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${minTemp}°C</div>
                <div class="stat-label">最低氣溫</div>
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
