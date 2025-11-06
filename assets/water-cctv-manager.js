/**
 * 水利署 CCTV 監控站管理模組
 * Water Resources Agency CCTV Station Manager
 */

class WaterCCTVManager {
    constructor() {
        this.stations = [];
        this.filteredStations = [];
        this.currentFilters = {
            city: '',
            basin: '',
            district: '',
            tributary: '',
            status: '1'
        };
    }

    /**
     * 載入監控站資料
     */
    async loadStations(stationsData) {
        if (Array.isArray(stationsData)) {
            this.stations = stationsData;
            this.filteredStations = [...this.stations];
            return true;
        }
        return false;
    }

    /**
     * 取得所有縣市清單
     */
    getCities() {
        const cities = [...new Set(this.stations.map(s => 
            s.CountiesAndCitiesWhereTheMonitoringPointsAreLocated || s.countiesandcitieswherethemonitoringpointsarelocated
        ))];
        return cities.filter(c => c).sort();
    }

    /**
     * 取得所有流域清單
     */
    getBasins() {
        const basins = [...new Set(this.stations.map(s => 
            s.BasinName || s.basinname
        ))];
        return basins.filter(b => b).sort();
    }

    /**
     * 取得所有行政區清單（依縣市）
     */
    getDistricts(city = '') {
        let stations = this.stations;
        if (city) {
            stations = stations.filter(s => 
                (s.CountiesAndCitiesWhereTheMonitoringPointsAreLocated || s.countiesandcitieswherethemonitoringpointsarelocated) === city
            );
        }
        const districts = [...new Set(stations.map(s => 
            s.AdministrativeDistrictWhereTheMonitoringPointIsLocated || s.administrativedistrictwherethemonitoringpointislocated
        ))];
        return districts.filter(d => d).sort();
    }

    /**
     * 取得所有支流清單（依流域）
     */
    getTributaries(basin = '') {
        let stations = this.stations;
        if (basin) {
            stations = stations.filter(s => 
                (s.BasinName || s.basinname) === basin
            );
        }
        const tributaries = [...new Set(stations.map(s => 
            s.TRIBUTARY || s.tributary
        ))];
        return tributaries.filter(t => t).sort();
    }

    /**
     * 應用篩選條件
     */
    applyFilters(filters = {}) {
        this.currentFilters = { ...this.currentFilters, ...filters };
        
        this.filteredStations = this.stations.filter(station => {
            // 縣市篩選
            if (this.currentFilters.city && 
                station.countiesandcitieswherethemonitoringpointsarelocated !== this.currentFilters.city) {
                return false;
            }
            
            // 流域篩選
            if (this.currentFilters.basin && 
                station.basinname !== this.currentFilters.basin) {
                return false;
            }
            
            // 行政區篩選
            if (this.currentFilters.district && 
                station.administrativedistrictwherethemonitoringpointislocated !== this.currentFilters.district) {
                return false;
            }
            
            // 支流篩選
            if (this.currentFilters.tributary && 
                station.tributary !== this.currentFilters.tributary) {
                return false;
            }
            
            // 狀態篩選
            if (this.currentFilters.status && 
                station.status !== this.currentFilters.status) {
                return false;
            }
            
            return true;
        });
        
        return this.filteredStations;
    }

    /**
     * 搜尋監控站
     */
    search(keyword) {
        if (!keyword) {
            this.filteredStations = [...this.stations];
            return this.filteredStations;
        }
        
        const lowerKeyword = keyword.toLowerCase();
        this.filteredStations = this.stations.filter(station => {
            return (
                station.cameraname?.toLowerCase().includes(lowerKeyword) ||
                station.videosurveillancestationname?.toLowerCase().includes(lowerKeyword) ||
                station.countiesandcitieswherethemonitoringpointsarelocated?.toLowerCase().includes(lowerKeyword) ||
                station.administrativedistrictwherethemonitoringpointislocated?.toLowerCase().includes(lowerKeyword) ||
                station.basinname?.toLowerCase().includes(lowerKeyword) ||
                station.tributary?.toLowerCase().includes(lowerKeyword)
            );
        });
        
        return this.filteredStations;
    }

    /**
     * 依 ID 取得監控站
     */
    getStationById(cameraid) {
        return this.stations.find(s => s.cameraid === cameraid);
    }

    /**
     * 取得統計資訊
     */
    getStatistics() {
        const stats = {
            total: this.stations.length,
            active: this.stations.filter(s => s.status === '1').length,
            inactive: this.stations.filter(s => s.status !== '1').length,
            byCity: {},
            byBasin: {},
            filtered: this.filteredStations.length
        };
        
        // 依縣市統計
        this.stations.forEach(station => {
            const city = station.countiesandcitieswherethemonitoringpointsarelocated || '未分類';
            stats.byCity[city] = (stats.byCity[city] || 0) + 1;
        });
        
        // 依流域統計
        this.stations.forEach(station => {
            const basin = station.basinname || '未分類';
            stats.byBasin[basin] = (stats.byBasin[basin] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * 取得目前篩選結果
     */
    getFilteredStations() {
        return this.filteredStations;
    }

    /**
     * 重置篩選
     */
    resetFilters() {
        this.currentFilters = {
            city: '',
            basin: '',
            district: '',
            tributary: '',
            status: '1'
        };
        this.filteredStations = [...this.stations];
        return this.filteredStations;
    }

    /**
     * 驗證影像 URL
     */
    validateImageUrl(url) {
        return url && url.startsWith('https://fmg.wra.gov.tw');
    }

    /**
     * 取得地圖標記資料
     */
    getMapMarkers() {
        return this.filteredStations.map(station => ({
            id: station.cameraid,
            name: station.cameraname,
            lat: parseFloat(station.latitude_4326),
            lng: parseFloat(station.longitude_4326),
            city: station.countiesandcitieswherethemonitoringpointsarelocated,
            district: station.administrativedistrictwherethemonitoringpointislocated,
            basin: station.basinname,
            tributary: station.tributary,
            status: station.status,
            imageUrl: station.imageurl
        })).filter(marker => !isNaN(marker.lat) && !isNaN(marker.lng));
    }
}

// 全域實例
window.waterCCTVManager = new WaterCCTVManager();
