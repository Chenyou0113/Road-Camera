/**
 * 中央氣象署開放資料平台 API 整合模組
 * Central Weather Administration Open Data Platform API Integration
 */

const CWA_API_CONFIG = {
    BASE_URL: 'https://opendata.cwa.gov.tw/api',
    FILE_API_BASE_URL: 'https://opendata.cwa.gov.tw/fileapi',
    API_KEY: 'CWA-675CED45-09DF-4249-9599-B9B5A5AB761A',
    ENDPOINTS: {
        // 即時天氣觀測
        OBSERVATION: '/v1/rest/datastore/O-A0003-001',
        // 全測站逐時氣象資料（更詳細）
        OBSERVATION_ALL: '/v1/rest/datastore/O-A0001-001',
        // 36小時天氣預報
        FORECAST_36H: '/v1/rest/datastore/F-C0032-001',
        // 一週天氣預報
        FORECAST_WEEK: '/v1/rest/datastore/F-D0047-089',
        // 鄉鎮天氣預報
        FORECAST_TOWNSHIP: '/v1/rest/datastore/F-D0047-{0}',
        // 颱風動態
        TYPHOON: '/v1/rest/datastore/W-C0034-001',
        // 熱帶氣旋路徑（颱風路徑預測）
        TYPHOON_PATH: '/v1/rest/datastore/W-C0034-005',
        // 天氣警特報
        WARNING: '/v1/rest/datastore/W-C0033-001',
        // 紫外線指數
        UV_INDEX: '/v1/rest/datastore/O-A0005-001',
        // 有感地震報告
        EARTHQUAKE_FELT: '/v1/rest/datastore/E-A0015-001',
        // 小區域地震報告（所有地震）
        EARTHQUAKE_ALL: '/v1/rest/datastore/E-A0016-001'
    },
    // 檔案 API 端點（雷達圖等）
    FILE_ENDPOINTS: {
        // 雷達整合回波圖-較大範圍_無地形
        RADAR_LARGE: '/v1/opendataapi/O-A0058-001',
        // 雷達整合回波圖-鄰近區域_無地形
        RADAR_TAIWAN: '/v1/opendataapi/O-A0058-003'
    },
    // 縣市代碼對應
    CITY_CODES: {
        '臺北市': '063',
        '新北市': '065',
        '桃園市': '007',
        '臺中市': '013',
        '臺南市': '021',
        '高雄市': '017',
        '基隆市': '009',
        '新竹市': '011',
        '新竹縣': '015',
        '苗栗縣': '005',
        '彰化縣': '019',
        '南投縣': '008',
        '雲林縣': '010',
        '嘉義市': '020',
        '嘉義縣': '002',
        '屏東縣': '004',
        '宜蘭縣': '003',
        '花蓮縣': '015',
        '臺東縣': '014',
        '澎湖縣': '016',
        '金門縣': '071',
        '連江縣': '072'
    }
};

class WeatherAPI {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10分鐘快取
    }

    /**
     * 通用 API 請求方法
     */
    async fetch(endpoint, params = {}) {
        try {
            // 建構 URL
            const url = new URL(CWA_API_CONFIG.BASE_URL + endpoint);
            url.searchParams.append('Authorization', CWA_API_CONFIG.API_KEY);
            
            // 添加其他參數
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });

            // 檢查快取
            const cacheKey = url.toString();
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                console.log('✅ 使用快取數據:', endpoint);
                return cached.data;
            }

            // 發送請求
            console.log('🌐 請求氣象資料:', endpoint);
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // 檢查回應狀態
            if (data.success === 'false' || data.success === false) {
                throw new Error(data.message || 'API 回應錯誤');
            }

            // 儲存快取
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;

        } catch (error) {
            console.error('❌ 氣象 API 錯誤:', error);
            throw error;
        }
    }

    /**
     * 獲取即時天氣觀測資料
     */
    async getCurrentWeather(locationName = null) {
        try {
            const params = locationName ? { locationName: locationName } : {};
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.OBSERVATION, params);
            
            if (data.records && data.records.Station) {
                return this.transformObservationData(data.records.Station);
            }
            
            return null;
        } catch (error) {
            console.error('獲取即時天氣失敗:', error);
            return null;
        }
    }

    /**
     * 獲取 36 小時天氣預報
     */
    async get36HourForecast(locationName = null) {
        try {
            const params = locationName ? { locationName: locationName } : {};
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.FORECAST_36H, params);
            
            if (data.records && data.records.location) {
                return this.transform36HForecastData(data.records.location);
            }
            
            return null;
        } catch (error) {
            console.error('獲取 36 小時預報失敗:', error);
            return null;
        }
    }

    /**
     * 獲取一週天氣預報
     */
    async getWeekForecast(locationName = null) {
        try {
            const params = locationName ? { locationName: locationName } : {};
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.FORECAST_WEEK, params);
            
            if (data.records && data.records.locations) {
                return this.transformWeekForecastData(data.records.locations);
            }
            
            return null;
        } catch (error) {
            console.error('獲取一週預報失敗:', error);
            return null;
        }
    }

    /**
     * 獲取鄉鎮天氣預報
     */
    async getTownshipForecast(cityName) {
        try {
            const cityCode = CWA_API_CONFIG.CITY_CODES[cityName];
            if (!cityCode) {
                throw new Error(`找不到城市代碼: ${cityName}`);
            }

            const endpoint = CWA_API_CONFIG.ENDPOINTS.FORECAST_TOWNSHIP.replace('{0}', cityCode);
            const data = await this.fetch(endpoint);
            
            if (data.records && data.records.locations) {
                return this.transformTownshipForecastData(data.records.locations);
            }
            
            return null;
        } catch (error) {
            console.error('獲取鄉鎮預報失敗:', error);
            return null;
        }
    }

    /**
     * 獲取颱風動態
     */
    async getTyphoonInfo() {
        try {
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.TYPHOON);
            
            if (data.records && data.records.Typhoon) {
                return this.transformTyphoonData(data.records.Typhoon);
            }
            
            return [];
        } catch (error) {
            console.error('獲取颱風資訊失敗:', error);
            return [];
        }
    }

    /**
     * 獲取天氣警特報
     */
    async getWeatherWarnings() {
        try {
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.WARNING);
            
            if (data.records && data.records.record) {
                return this.transformWarningData(data.records.record);
            }
            
            return [];
        } catch (error) {
            console.error('獲取警特報失敗:', error);
            return [];
        }
    }

    /**
     * 獲取紫外線指數
     */
    async getUVIndex(locationName = null) {
        try {
            const params = locationName ? { locationName: locationName } : {};
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.UV_INDEX, params);
            
            if (data.records && data.records.Station) {
                return this.transformUVData(data.records.Station);
            }
            
            return null;
        } catch (error) {
            console.error('獲取紫外線指數失敗:', error);
            return null;
        }
    }

    /**
     * 獲取全測站逐時氣象資料（更詳細的觀測資料）
     */
    async getAllStationsWeather(locationName = null) {
        try {
            const params = locationName ? { locationName: locationName } : {};
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.OBSERVATION_ALL, params);
            
            if (data.records && data.records.Station) {
                return this.transformObservationData(data.records.Station);
            }
            
            return null;
        } catch (error) {
            console.error('獲取全測站資料失敗:', error);
            return null;
        }
    }

    /**
     * 獲取熱帶氣旋路徑（颱風路徑預測）
     */
    async getTyphoonPath() {
        try {
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.TYPHOON_PATH);
            
            if (data.records && data.records.TropicalCyclone) {
                return this.transformTyphoonPathData(data.records.TropicalCyclone);
            }
            
            return [];
        } catch (error) {
            console.error('獲取颱風路徑失敗:', error);
            return [];
        }
    }

    /**
     * 獲取有感地震報告
     */
    async getFeltEarthquakes(limit = 10) {
        try {
            const params = { limit: limit };
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.EARTHQUAKE_FELT, params);
            
            if (data.records && data.records.Earthquake) {
                return this.transformEarthquakeData(data.records.Earthquake);
            }
            
            return [];
        } catch (error) {
            console.error('獲取有感地震報告失敗:', error);
            return [];
        }
    }

    /**
     * 獲取所有地震報告（包含小區域）
     */
    async getAllEarthquakes(limit = 10) {
        try {
            const params = { limit: limit };
            const data = await this.fetch(CWA_API_CONFIG.ENDPOINTS.EARTHQUAKE_ALL, params);
            
            if (data.records && data.records.Earthquake) {
                return this.transformEarthquakeData(data.records.Earthquake);
            }
            
            return [];
        } catch (error) {
            console.error('獲取地震報告失敗:', error);
            return [];
        }
    }

    /**
     * 獲取雷達回波圖（較大範圍）
     */
    async getRadarImageLarge() {
        try {
            const url = new URL(CWA_API_CONFIG.FILE_API_BASE_URL + CWA_API_CONFIG.FILE_ENDPOINTS.RADAR_LARGE);
            url.searchParams.append('Authorization', CWA_API_CONFIG.API_KEY);
            url.searchParams.append('downloadType', 'WEB');
            url.searchParams.append('format', 'JSON');

            console.log('🌐 請求雷達回波圖（大範圍）');
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`API 請求失敗: ${response.status}`);
            }

            const data = await response.json();
            return this.transformRadarData(data);
        } catch (error) {
            console.error('獲取雷達回波圖失敗:', error);
            return null;
        }
    }

    /**
     * 獲取雷達回波圖（台灣鄰近區域）
     */
    async getRadarImageTaiwan() {
        try {
            const url = new URL(CWA_API_CONFIG.FILE_API_BASE_URL + CWA_API_CONFIG.FILE_ENDPOINTS.RADAR_TAIWAN);
            url.searchParams.append('Authorization', CWA_API_CONFIG.API_KEY);
            url.searchParams.append('downloadType', 'WEB');
            url.searchParams.append('format', 'JSON');

            console.log('🌐 請求雷達回波圖（台灣區域）');
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`API 請求失敗: ${response.status}`);
            }

            const data = await response.json();
            return this.transformRadarData(data);
        } catch (error) {
            console.error('獲取雷達回波圖失敗:', error);
            return null;
        }
    }

    /**
     * 轉換觀測資料格式
     */
    transformObservationData(stations) {
        return stations.map(station => ({
            stationName: station.StationName || station.ObsTime?.StationName,
            stationId: station.StationId || station.ObsTime?.StationId,
            observationTime: station.ObsTime?.DateTime,
            temperature: parseFloat(station.WeatherElement?.AirTemperature) || null,
            humidity: parseFloat(station.WeatherElement?.RelativeHumidity) || null,
            pressure: parseFloat(station.WeatherElement?.AirPressure) || null,
            windSpeed: parseFloat(station.WeatherElement?.WindSpeed) || null,
            windDirection: parseFloat(station.WeatherElement?.WindDirection) || null,
            precipitation: parseFloat(station.WeatherElement?.Now?.Precipitation) || 0,
            weather: station.WeatherElement?.Weather || '未知',
            lat: parseFloat(station.GeoInfo?.Coordinates?.[0]?.StationLatitude),
            lon: parseFloat(station.GeoInfo?.Coordinates?.[0]?.StationLongitude)
        }));
    }

    /**
     * 轉換 36 小時預報資料格式
     */
    transform36HForecastData(locations) {
        return locations.map(location => {
            const weatherElements = {};
            
            location.weatherElement?.forEach(element => {
                weatherElements[element.elementName] = element.time.map(t => ({
                    startTime: t.startTime,
                    endTime: t.endTime,
                    value: t.parameter?.parameterName,
                    unit: t.parameter?.parameterUnit
                }));
            });

            return {
                locationName: location.locationName,
                weatherElements: weatherElements
            };
        });
    }

    /**
     * 轉換一週預報資料格式
     */
    transformWeekForecastData(locationsArray) {
        const locations = locationsArray[0]?.location || [];
        
        return locations.map(location => {
            const weatherElements = {};
            
            location.weatherElement?.forEach(element => {
                weatherElements[element.elementName] = element.time.map(t => ({
                    startTime: t.startTime,
                    endTime: t.endTime,
                    value: t.parameter?.parameterName,
                    unit: t.parameter?.parameterUnit
                }));
            });

            return {
                locationName: location.locationName,
                lat: parseFloat(location.lat),
                lon: parseFloat(location.lon),
                weatherElements: weatherElements
            };
        });
    }

    /**
     * 轉換鄉鎮預報資料格式
     */
    transformTownshipForecastData(locationsArray) {
        return this.transformWeekForecastData(locationsArray);
    }

    /**
     * 轉換颱風資料格式
     */
    transformTyphoonData(typhoons) {
        if (!Array.isArray(typhoons)) {
            typhoons = [typhoons];
        }

        return typhoons.map(typhoon => ({
            typhoonName: typhoon.TyphoonName,
            typhoonNameEN: typhoon.TyphoonNameEN,
            typhoonNumber: typhoon.TyphoonNumber,
            issueTime: typhoon.IssueTime,
            centerLat: parseFloat(typhoon.CenterLatitude),
            centerLon: parseFloat(typhoon.CenterLongitude),
            intensity: typhoon.Intensity,
            maxWindSpeed: parseFloat(typhoon.MaxWindSpeed),
            radius: parseFloat(typhoon.Radius),
            forecast: typhoon.Forecast
        }));
    }

    /**
     * 轉換警特報資料格式
     */
    transformWarningData(records) {
        if (!Array.isArray(records)) {
            records = [records];
        }

        return records.map(record => ({
            datasetDescription: record.datasetDescription,
            hazardType: record.hazardConditions?.hazards?.info?.phenomena,
            significance: record.hazardConditions?.hazards?.info?.significance,
            affectedAreas: record.hazardConditions?.hazards?.info?.affectedAreas,
            issueTime: record.issueTime,
            expireTime: record.expireTime,
            status: record.status,
            content: record.contents?.content?.contentText
        }));
    }

    /**
     * 轉換紫外線資料格式
     */
    transformUVData(stations) {
        return stations.map(station => ({
            stationName: station.StationName,
            stationId: station.StationId,
            county: station.County,
            uvIndex: parseFloat(station.WeatherElement?.UVIndex),
            publishTime: station.PublishTime
        }));
    }

    /**
     * 轉換颱風路徑資料格式
     */
    transformTyphoonPathData(cyclones) {
        if (!Array.isArray(cyclones)) {
            cyclones = [cyclones];
        }

        return cyclones.map(cyclone => ({
            cycloneName: cyclone.CycloneName,
            cycloneNameEN: cyclone.CycloneNameEN,
            cycloneNumber: cyclone.CycloneNumber,
            issueTime: cyclone.IssueTime,
            currentPosition: {
                lat: parseFloat(cyclone.CenterLatitude),
                lon: parseFloat(cyclone.CenterLongitude),
                time: cyclone.ObservationTime
            },
            intensity: cyclone.Intensity,
            maxWindSpeed: parseFloat(cyclone.MaxWindSpeed),
            radius: parseFloat(cyclone.Radius),
            forecastPath: cyclone.ForecastPath || []
        }));
    }

    /**
     * 轉換地震資料格式
     */
    transformEarthquakeData(earthquakes) {
        if (!Array.isArray(earthquakes)) {
            earthquakes = [earthquakes];
        }

        return earthquakes.map(eq => ({
            earthquakeNo: eq.EarthquakeNo,
            reportType: eq.ReportType,
            reportColor: eq.ReportColor,
            reportContent: eq.ReportContent,
            web: eq.Web,
            originTime: eq.EarthquakeInfo?.OriginTime,
            source: eq.EarthquakeInfo?.Source,
            focalDepth: parseFloat(eq.EarthquakeInfo?.FocalDepth),
            magnitude: parseFloat(eq.EarthquakeInfo?.EarthquakeMagnitude?.MagnitudeValue),
            epicenter: {
                lat: parseFloat(eq.EarthquakeInfo?.Epicenter?.EpicenterLatitude),
                lon: parseFloat(eq.EarthquakeInfo?.Epicenter?.EpicenterLongitude),
                location: eq.EarthquakeInfo?.Epicenter?.Location
            },
            intensity: eq.Intensity,
            shakingAreas: eq.Intensity?.ShakingArea || []
        }));
    }

    /**
     * 轉換雷達回波圖資料格式
     */
    transformRadarData(data) {
        if (!data || !data.cwaopendata) return null;

        const dataset = data.cwaopendata.dataset;
        return {
            datasetDescription: dataset.datasetDescription,
            datasetInfo: dataset.datasetInfo,
            contents: dataset.contents?.content?.map(item => ({
                url: item.contentUrl,
                type: item.contentType,
                size: item.contentSize,
                time: item.contentTime
            })) || []
        };
    }

    /**
     * 清除快取
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ 氣象資料快取已清除');
    }

    /**
     * 獲取天氣圖示
     */
    static getWeatherIcon(weatherCode) {
        const iconMap = {
            '晴': 'fa-sun',
            '多雲': 'fa-cloud-sun',
            '陰': 'fa-cloud',
            '雨': 'fa-cloud-rain',
            '雷雨': 'fa-cloud-bolt',
            '大雨': 'fa-cloud-showers-heavy',
            '雪': 'fa-snowflake',
            '霧': 'fa-smog',
            '颱風': 'fa-hurricane'
        };

        for (const [key, icon] of Object.entries(iconMap)) {
            if (weatherCode.includes(key)) {
                return icon;
            }
        }

        return 'fa-cloud';
    }

    /**
     * 獲取溫度顏色
     */
    static getTemperatureColor(temp) {
        if (temp >= 35) return '#d32f2f'; // 極熱 紅色
        if (temp >= 30) return '#f57c00'; // 熱 橙色
        if (temp >= 25) return '#fbc02d'; // 溫暖 黃色
        if (temp >= 20) return '#7cb342'; // 舒適 綠色
        if (temp >= 15) return '#0288d1'; // 涼爽 藍色
        if (temp >= 10) return '#0097a7'; // 冷 深藍
        return '#5e35b1'; // 極冷 紫色
    }
}

// 建立全域實例
const weatherAPI = new WeatherAPI();

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WeatherAPI, weatherAPI, CWA_API_CONFIG };
}
