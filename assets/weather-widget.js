/**
 * 可重用天氣組件模組
 * Reusable Weather Widget Components
 */

class WeatherWidget {
    /**
     * 創建天氣卡片
     */
    static createWeatherCard(weatherData) {
        if (!weatherData) return '';

        const temp = weatherData.temperature;
        const tempColor = WeatherAPI.getTemperatureColor(temp);
        const weatherIcon = WeatherAPI.getWeatherIcon(weatherData.weather);

        return `
            <div class="weather-card">
                <div class="weather-header">
                    <i class="fas ${weatherIcon} weather-icon"></i>
                    <div class="weather-location">${weatherData.stationName || '未知地點'}</div>
                </div>
                <div class="weather-body">
                    <div class="weather-temp" style="color: ${tempColor}">
                        ${temp !== null ? temp.toFixed(1) : '--'}°C
                    </div>
                    <div class="weather-desc">${weatherData.weather || '未知'}</div>
                    <div class="weather-details">
                        <div class="weather-detail-item">
                            <i class="fas fa-tint"></i>
                            <span>濕度: ${weatherData.humidity !== null ? weatherData.humidity.toFixed(0) : '--'}%</span>
                        </div>
                        <div class="weather-detail-item">
                            <i class="fas fa-wind"></i>
                            <span>風速: ${weatherData.windSpeed !== null ? weatherData.windSpeed.toFixed(1) : '--'} m/s</span>
                        </div>
                    </div>
                </div>
                <div class="weather-footer">
                    <i class="fas fa-clock"></i>
                    <span class="weather-time">${weatherData.observationTime ? new Date(weatherData.observationTime).toLocaleString('zh-TW') : '--'}</span>
                </div>
            </div>
        `;
    }

    /**
     * 創建預報卡片
     */
    static createForecastCard(forecastData, index = 0) {
        if (!forecastData) return '';

        const weatherElement = forecastData.weatherElements?.Wx?.[index];
        const tempMax = forecastData.weatherElements?.MaxT?.[index];
        const tempMin = forecastData.weatherElements?.MinT?.[index];
        const pop = forecastData.weatherElements?.PoP?.[index]; // 降雨機率

        const weatherDesc = weatherElement?.value || '未知';
        const weatherIcon = WeatherAPI.getWeatherIcon(weatherDesc);

        const startTime = weatherElement?.startTime ? new Date(weatherElement.startTime) : null;
        const timeStr = startTime ? `${startTime.getMonth() + 1}/${startTime.getDate()} ${startTime.getHours()}:00` : '--';

        return `
            <div class="forecast-card">
                <div class="forecast-time">${timeStr}</div>
                <i class="fas ${weatherIcon} forecast-icon"></i>
                <div class="forecast-desc">${weatherDesc}</div>
                <div class="forecast-temp">
                    <span class="temp-max">${tempMax?.value || '--'}°</span>
                    <span class="temp-divider">/</span>
                    <span class="temp-min">${tempMin?.value || '--'}°</span>
                </div>
                <div class="forecast-pop">
                    <i class="fas fa-umbrella"></i>
                    <span>${pop?.value || '0'}%</span>
                </div>
            </div>
        `;
    }

    /**
     * 創建警報卡片
     */
    static createWarningCard(warningData) {
        if (!warningData) return '';

        const severityClass = warningData.significance === '警報' ? 'warning-severe' : 'warning-advisory';
        const severityIcon = warningData.significance === '警報' ? 'fa-exclamation-triangle' : 'fa-info-circle';

        return `
            <div class="warning-card ${severityClass}">
                <div class="warning-header">
                    <i class="fas ${severityIcon}"></i>
                    <span class="warning-type">${warningData.hazardType || '天氣警特報'}</span>
                </div>
                <div class="warning-content">
                    <p>${warningData.content || '請注意天氣變化'}</p>
                </div>
                <div class="warning-footer">
                    <div class="warning-areas">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${warningData.affectedAreas || '全台'}</span>
                    </div>
                    <div class="warning-time">
                        <i class="fas fa-clock"></i>
                        <span>${warningData.issueTime ? new Date(warningData.issueTime).toLocaleString('zh-TW') : '--'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 創建颱風卡片
     */
    static createTyphoonCard(typhoonData) {
        if (!typhoonData) return '';

        return `
            <div class="typhoon-card">
                <div class="typhoon-header">
                    <i class="fas fa-hurricane typhoon-icon"></i>
                    <div class="typhoon-name">
                        <div class="typhoon-name-zh">${typhoonData.typhoonName || '未命名颱風'}</div>
                        <div class="typhoon-name-en">${typhoonData.typhoonNameEN || ''}</div>
                    </div>
                </div>
                <div class="typhoon-body">
                    <div class="typhoon-info">
                        <div class="typhoon-info-item">
                            <span class="label">強度:</span>
                            <span class="value">${typhoonData.intensity || '--'}</span>
                        </div>
                        <div class="typhoon-info-item">
                            <span class="label">最大風速:</span>
                            <span class="value">${typhoonData.maxWindSpeed || '--'} m/s</span>
                        </div>
                        <div class="typhoon-info-item">
                            <span class="label">位置:</span>
                            <span class="value">${typhoonData.centerLat?.toFixed(2) || '--'}°N, ${typhoonData.centerLon?.toFixed(2) || '--'}°E</span>
                        </div>
                    </div>
                </div>
                <div class="typhoon-footer">
                    <i class="fas fa-clock"></i>
                    <span>${typhoonData.issueTime ? new Date(typhoonData.issueTime).toLocaleString('zh-TW') : '--'}</span>
                </div>
            </div>
        `;
    }

    /**
     * 創建紫外線指數卡片
     */
    static createUVCard(uvData) {
        if (!uvData) return '';

        const uvIndex = uvData.uvIndex || 0;
        let uvLevel = '低量級';
        let uvColor = '#7cb342';
        let uvIcon = 'fa-sun';

        if (uvIndex >= 11) {
            uvLevel = '危險級';
            uvColor = '#d32f2f';
            uvIcon = 'fa-radiation';
        } else if (uvIndex >= 8) {
            uvLevel = '過量級';
            uvColor = '#f57c00';
            uvIcon = 'fa-exclamation-triangle';
        } else if (uvIndex >= 6) {
            uvLevel = '高量級';
            uvColor = '#fbc02d';
            uvIcon = 'fa-sun';
        } else if (uvIndex >= 3) {
            uvLevel = '中量級';
            uvColor = '#7cb342';
            uvIcon = 'fa-cloud-sun';
        }

        return `
            <div class="uv-card">
                <div class="uv-header">
                    <i class="fas ${uvIcon}" style="color: ${uvColor}"></i>
                    <span class="uv-location">${uvData.stationName || uvData.county || '未知地點'}</span>
                </div>
                <div class="uv-body">
                    <div class="uv-index" style="color: ${uvColor}">
                        ${uvIndex.toFixed(0)}
                    </div>
                    <div class="uv-level" style="color: ${uvColor}">
                        ${uvLevel}
                    </div>
                </div>
                <div class="uv-footer">
                    <i class="fas fa-clock"></i>
                    <span>${uvData.publishTime ? new Date(uvData.publishTime).toLocaleString('zh-TW') : '--'}</span>
                </div>
            </div>
        `;
    }

    /**
     * 創建迷你天氣組件（用於 Dashboard）
     */
    static createMiniWeather(weatherData) {
        if (!weatherData) {
            return `
                <div class="mini-weather">
                    <div class="mini-weather-icon">
                        <i class="fas fa-cloud"></i>
                    </div>
                    <div class="mini-weather-info">
                        <div class="mini-weather-temp">--°C</div>
                        <div class="mini-weather-desc">載入中...</div>
                    </div>
                </div>
            `;
        }

        const temp = weatherData.temperature;
        const tempColor = WeatherAPI.getTemperatureColor(temp);
        const weatherIcon = WeatherAPI.getWeatherIcon(weatherData.weather);

        return `
            <div class="mini-weather">
                <div class="mini-weather-icon">
                    <i class="fas ${weatherIcon}" style="color: ${tempColor}"></i>
                </div>
                <div class="mini-weather-info">
                    <div class="mini-weather-temp" style="color: ${tempColor}">
                        ${temp !== null ? temp.toFixed(1) : '--'}°C
                    </div>
                    <div class="mini-weather-desc">${weatherData.weather || '未知'}</div>
                    <div class="mini-weather-location">${weatherData.stationName || ''}</div>
                </div>
            </div>
        `;
    }

    /**
     * 創建天氣趨勢圖表
     */
    static createWeatherChart(canvasId, forecastData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !forecastData) return null;

        const ctx = canvas.getContext('2d');
        
        // 提取溫度和時間數據
        const maxTemps = forecastData.weatherElements?.MaxT || [];
        const minTemps = forecastData.weatherElements?.MinT || [];
        
        const labels = maxTemps.map((item, index) => {
            if (item.startTime) {
                const date = new Date(item.startTime);
                return `${date.getMonth() + 1}/${date.getDate()}`;
            }
            return `第${index + 1}天`;
        });

        const maxTempData = maxTemps.map(item => parseFloat(item.value) || null);
        const minTempData = minTemps.map(item => parseFloat(item.value) || null);

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '最高溫',
                        data: maxTempData,
                        borderColor: '#f57c00',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: '最低溫',
                        data: minTempData,
                        borderColor: '#0288d1',
                        backgroundColor: 'rgba(2, 136, 209, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '溫度趨勢預報',
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: '溫度 (°C)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '°C';
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * 格式化時間
     */
    static formatTime(dateString) {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 取得降雨機率顏色
     */
    static getRainColor(pop) {
        if (pop >= 70) return '#2196f3'; // 高
        if (pop >= 30) return '#64b5f6'; // 中
        return '#bbdefb'; // 低
    }
}

// 天氣組件樣式（可選：如果需要內嵌樣式）
const weatherWidgetStyles = `
    .weather-card {
        background: white;
        border-radius: 15px;
        padding: 20px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        transition: all 0.3s;
    }
    
    .weather-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .weather-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
    }
    
    .weather-icon {
        font-size: 2.5rem;
        color: #1e40af;
    }
    
    .weather-location {
        font-size: 1.2rem;
        font-weight: 600;
        color: #333;
    }
    
    .weather-temp {
        font-size: 3rem;
        font-weight: 900;
        text-align: center;
        margin: 10px 0;
    }
    
    .weather-desc {
        text-align: center;
        color: #666;
        font-size: 1.1rem;
        margin-bottom: 15px;
    }
    
    .weather-details {
        display: flex;
        justify-content: space-around;
        padding-top: 15px;
        border-top: 1px solid #eee;
    }
    
    .weather-detail-item {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #666;
        font-size: 0.9rem;
    }
    
    .weather-footer {
        margin-top: 15px;
        padding-top: 10px;
        border-top: 1px solid #eee;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #999;
        font-size: 0.85rem;
    }
    
    .forecast-card {
        background: white;
        border-radius: 12px;
        padding: 15px;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        transition: all 0.3s;
    }
    
    .forecast-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    }
    
    .forecast-time {
        font-size: 0.9rem;
        color: #666;
        margin-bottom: 10px;
    }
    
    .forecast-icon {
        font-size: 2rem;
        color: #1e40af;
        margin: 10px 0;
    }
    
    .forecast-desc {
        color: #333;
        margin-bottom: 10px;
    }
    
    .forecast-temp {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 10px 0;
    }
    
    .temp-max {
        color: #f57c00;
    }
    
    .temp-min {
        color: #0288d1;
    }
    
    .forecast-pop {
        color: #2196f3;
        font-size: 0.9rem;
    }
    
    .warning-card {
        border-radius: 12px;
        padding: 20px;
        margin: 10px 0;
        border-left: 5px solid;
    }
    
    .warning-severe {
        background: #fff3e0;
        border-color: #f57c00;
    }
    
    .warning-advisory {
        background: #e3f2fd;
        border-color: #2196f3;
    }
    
    .mini-weather {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        background: rgba(255,255,255,0.95);
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .mini-weather-icon i {
        font-size: 2.5rem;
    }
    
    .mini-weather-temp {
        font-size: 1.8rem;
        font-weight: 700;
    }
    
    .mini-weather-desc {
        color: #666;
        font-size: 0.9rem;
    }
    
    .mini-weather-location {
        color: #999;
        font-size: 0.8rem;
    }
`;

// 匯出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WeatherWidget, weatherWidgetStyles };
}
