/**
 * 座標驗證模組
 * 用於檢測和過濾無效的 GPS 座標
 * 
 * 台灣有效座標範圍：
 * - 經度 (Longitude): 120° E ~ 122° E
 * - 緯度 (Latitude): 22° N ~ 25.5° N
 */

class CoordinateValidator {
    // 台灣地理邊界 (WGS84 座標系統)
    static TAIWAN_BOUNDS = {
        lonMin: 119.5,      // 西邊界
        lonMax: 122.0,      // 東邊界
        latMin: 21.8,       // 南邊界
        latMax: 25.5        // 北邊界
    };

    // 常見的無效座標模式
    static INVALID_PATTERNS = {
        ZERO: { lon: 0, lat: 0 },               // 全0座標
        DEFAULT: { lon: 121.5, lat: 25.0 },     // 預設值
        SWAPPED: null,                          // 經緯度互換 (需檢測)
        OUT_OF_BOUNDS: null,                    // 超出台灣範圍
        NAN: null                               // 非數字
    };

    /**
     * 檢查座標是否有效
     * @param {number} lon - 經度
     * @param {number} lat - 緯度
     * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
     */
    static validateCoordinates(lon, lat) {
        const errors = [];
        const warnings = [];

        // 1. 檢查是否為數字
        if (typeof lon !== 'number' || typeof lat !== 'number' || isNaN(lon) || isNaN(lat)) {
            errors.push('座標不是有效的數字');
            return { isValid: false, errors, warnings };
        }

        // 2. 檢查是否為零座標 (全0)
        if (lon === 0 && lat === 0) {
            errors.push('座標為全零 (0, 0)');
        }

        // 3. 檢查是否為預設值
        if (Math.abs(lon - 121.5) < 0.01 && Math.abs(lat - 25.0) < 0.01) {
            warnings.push('座標可能為預設值 (121.5, 25.0)');
        }

        // 4. 檢查經緯度是否互換 (如果經度看起來像緯度、反之亦然)
        if (lon >= 21 && lon <= 26 && lat >= 119 && lat <= 122) {
            warnings.push(`座標可能經緯度互換: (${lon}, ${lat}) 應為 (${lat}, ${lon})`);
        }

        // 5. 檢查是否在台灣有效範圍內
        if (lon < this.TAIWAN_BOUNDS.lonMin || lon > this.TAIWAN_BOUNDS.lonMax) {
            errors.push(`經度 ${lon} 超出台灣範圍 [${this.TAIWAN_BOUNDS.lonMin}, ${this.TAIWAN_BOUNDS.lonMax}]`);
        }

        if (lat < this.TAIWAN_BOUNDS.latMin || lat > this.TAIWAN_BOUNDS.latMax) {
            errors.push(`緯度 ${lat} 超出台灣範圍 [${this.TAIWAN_BOUNDS.latMin}, ${this.TAIWAN_BOUNDS.latMax}]`);
        }

        // 6. 檢查座標精度 (太粗糙的座標可能是錯誤的)
        if (lon % 1 === 0 && lat % 1 === 0) {
            warnings.push('座標精度太低 (只到整數位)，可能不夠準確');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 嘗試修復交換的經緯度
     * @param {number} lon - 經度
     * @param {number} lat - 緯度
     * @returns {Object|null} { lon, lat } 或 null (無法修復)
     */
    static attemptFixSwappedCoordinates(lon, lat) {
        // 如果經度看起來像緯度，緯度看起來像經度
        if (lon >= 21 && lon <= 26 && lat >= 119 && lat <= 122) {
            return { lon: lat, lat: lon };
        }
        return null;
    }

    /**
     * 驗證一組監視器資料，返回有效和無效的監視器
     * @param {Array} cameras - 監視器陣列
     * @returns {Object} { valid: Array, invalid: Array, swapped: Array, report: Object }
     */
    static validateCameraArray(cameras) {
        const valid = [];
        const invalid = [];
        const swapped = [];
        const report = {
            totalCount: cameras.length,
            validCount: 0,
            invalidCount: 0,
            swappedCount: 0,
            warningCount: 0,
            invalidDetails: [],
            swappedDetails: [],
            warningDetails: []
        };

        cameras.forEach((camera, index) => {
            const lon = camera.PositionLon;
            const lat = camera.PositionLat;

            const validation = this.validateCoordinates(lon, lat);

            if (validation.isValid) {
                valid.push(camera);
                report.validCount++;
            } else {
                // 嘗試修復交換的座標
                const fixed = this.attemptFixSwappedCoordinates(lon, lat);
                if (fixed) {
                    const fixedValidation = this.validateCoordinates(fixed.lon, fixed.lat);
                    if (fixedValidation.isValid) {
                        swapped.push({
                            ...camera,
                            PositionLon: fixed.lon,
                            PositionLat: fixed.lat,
                            _originalLon: lon,
                            _originalLat: lat,
                            _fixed: true
                        });
                        report.swappedCount++;
                        report.swappedDetails.push({
                            index,
                            cctvid: camera.CCTVID,
                            original: { lon, lat },
                            fixed: { lon: fixed.lon, lat: fixed.lat }
                        });
                    } else {
                        invalid.push(camera);
                        report.invalidCount++;
                        report.invalidDetails.push({
                            index,
                            cctvid: camera.CCTVID,
                            coords: { lon, lat },
                            errors: validation.errors
                        });
                    }
                } else {
                    invalid.push(camera);
                    report.invalidCount++;
                    report.invalidDetails.push({
                        index,
                        cctvid: camera.CCTVID,
                        coords: { lon, lat },
                        errors: validation.errors
                    });
                }
            }

            // 記錄警告
            if (validation.warnings.length > 0) {
                report.warningCount++;
                report.warningDetails.push({
                    index,
                    cctvid: camera.CCTVID,
                    coords: { lon, lat },
                    warnings: validation.warnings
                });
            }
        });

        return {
            valid,
            invalid,
            swapped,
            report
        };
    }

    /**
     * 生成驗證報告文本
     * @param {Object} validationResult - validateCameraArray 的返回值
     * @returns {string} 格式化的報告文本
     */
    static generateReport(validationResult) {
        const { report, valid, invalid, swapped } = validationResult;

        let output = '========================================\n';
        output += '📍 座標驗證報告\n';
        output += '========================================\n\n';

        output += `📊 統計資訊:\n`;
        output += `  • 總計: ${report.totalCount} 個監視器\n`;
        output += `  • ✅ 有效: ${report.validCount} 個\n`;
        output += `  • ❌ 無效: ${report.invalidCount} 個\n`;
        output += `  • 🔄 可修復 (座標互換): ${report.swappedCount} 個\n`;
        output += `  • ⚠️  警告: ${report.warningCount} 個\n\n`;

        if (report.invalidDetails.length > 0) {
            output += '❌ 無效座標詳情:\n';
            output += '─'.repeat(50) + '\n';
            report.invalidDetails.forEach((detail, i) => {
                output += `${i + 1}. CCTVID: ${detail.cctvid}\n`;
                output += `   座標: (${detail.coords.lon}, ${detail.coords.lat})\n`;
                detail.errors.forEach(err => {
                    output += `   • ${err}\n`;
                });
                output += '\n';
            });
        }

        if (report.swappedDetails.length > 0) {
            output += '🔄 可修復的座標互換:\n';
            output += '─'.repeat(50) + '\n';
            report.swappedDetails.forEach((detail, i) => {
                output += `${i + 1}. CCTVID: ${detail.cctvid}\n`;
                output += `   原始: (${detail.original.lon}, ${detail.original.lat})\n`;
                output += `   修復: (${detail.fixed.lon}, ${detail.fixed.lat})\n\n`;
            });
        }

        if (report.warningDetails.length > 0) {
            output += '⚠️  警告:\n';
            output += '─'.repeat(50) + '\n';
            report.warningDetails.slice(0, 10).forEach((detail, i) => {
                output += `${i + 1}. CCTVID: ${detail.cctvid}\n`;
                output += `   座標: (${detail.coords.lon}, ${detail.coords.lat})\n`;
                detail.warnings.forEach(warn => {
                    output += `   • ${warn}\n`;
                });
                output += '\n';
            });
            if (report.warningDetails.length > 10) {
                output += `... 還有 ${report.warningDetails.length - 10} 個警告 (未全部顯示)\n`;
            }
        }

        output += '\n========================================\n';
        return output;
    }
}

// 導出全域使用
window.CoordinateValidator = CoordinateValidator;
