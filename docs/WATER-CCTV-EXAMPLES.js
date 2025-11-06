/**
 * 水利署 CCTV 監控站系統 - 完整範例集合
 * 包含 30+ 個實用程式碼範例
 * 
 * 使用方式:
 * 1. 引入必要檔案: water-cctv-transformer.js, water-cctv-data.js
 * 2. 複製所需的範例程式碼
 * 3. 根據實際情況調整
 */

// ============================================================================
// 範例 1: 基本初始化與驗證
// ============================================================================

/**
 * 初始化監控站資料
 * @returns {object} 驗證後的站點資料
 */
function example1_BasicInitialization() {
  // 從全域變數取得資料
  const stations = waterCCTVStationsData;
  
  // 驗證資料正確性
  const { valid, invalid, errors } = WaterCCTVTransformer.validateStations(stations);
  
  console.log(`驗證完成: ${valid.length} 個有效, ${invalid.length} 個無效`);
  
  if (errors.length > 0) {
    console.warn('驗證警告:', errors);
  }
  
  return valid;
}

// ============================================================================
// 範例 2: 統計資訊顯示
// ============================================================================

/**
 * 顯示完整的統計資訊
 */
function example2_DisplayStatistics() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 計算統計資訊
  const stats = WaterCCTVTransformer.calculateStats(valid);
  
  // 顯示在 HTML
  const html = WaterCCTVTransformer.createStatsPanel(valid);
  document.getElementById('statistics').innerHTML = html;
  
  // 控制台輸出
  console.log(`
    總監控站數: ${stats.total}
    線上: ${stats.online} (${((stats.online/stats.total)*100).toFixed(1)}%)
    離線: ${stats.offline} (${((stats.offline/stats.total)*100).toFixed(1)}%)
    異常: ${stats.abnormal} (${((stats.abnormal/stats.total)*100).toFixed(1)}%)
    維護中: ${stats.maintenance} (${((stats.maintenance/stats.total)*100).toFixed(1)}%)
  `);
}

// ============================================================================
// 範例 3: 按流域分組顯示
// ============================================================================

/**
 * 按流域顯示所有監控站
 */
function example3_GroupByBasin() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 按流域分組
  const grouped = WaterCCTVTransformer.groupByBasin(valid);
  
  // 生成流域概覽
  const html = WaterCCTVTransformer.createBasinOverview(grouped);
  document.getElementById('basins').innerHTML = html;
  
  // 詳細資訊輸出
  Object.entries(grouped).forEach(([basin, stationsInBasin]) => {
    const basinInfo = WaterCCTVTransformer.getBasinInfo(basin);
    console.log(`${basin}: ${stationsInBasin.length} 個監控站 (顏色: ${basinInfo.color})`);
  });
}

// ============================================================================
// 範例 4: 按縣市分組顯示
// ============================================================================

/**
 * 按縣市分組並統計
 */
function example4_GroupByCounty() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 按縣市分組
  const grouped = WaterCCTVTransformer.groupByCounty(valid);
  
  // 逐一顯示每個縣市的統計資訊
  Object.entries(grouped).forEach(([county, stationsInCounty]) => {
    const stats = WaterCCTVTransformer.calculateStats(stationsInCounty);
    console.log(`
      ${county}: 
        總數: ${stats.total}
        線上: ${stats.online}
        離線: ${stats.offline}
    `);
  });
}

// ============================================================================
// 範例 5: 按行政區分組顯示
// ============================================================================

/**
 * 按行政區分組
 */
function example5_GroupByDistrict() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 按行政區分組
  const grouped = WaterCCTVTransformer.groupByDistrict(valid);
  
  // 列出所有行政區
  console.log('行政區清單:');
  Object.keys(grouped).forEach(district => {
    console.log(`  - ${district}: ${grouped[district].length} 個站點`);
  });
}

// ============================================================================
// 範例 6: 按狀態分組顯示
// ============================================================================

/**
 * 按狀態分組
 */
function example6_GroupByStatus() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 按狀態分組
  const grouped = WaterCCTVTransformer.groupByStatus(valid);
  
  // 顯示各狀態的監控站
  Object.entries(grouped).forEach(([status, stationsWithStatus]) => {
    const statusInfo = WaterCCTVTransformer.getStatusInfo(status);
    console.log(`${statusInfo.text} (${statusInfo.icon}): ${stationsWithStatus.length} 個`);
  });
}

// ============================================================================
// 範例 7: 篩選線上的監控站
// ============================================================================

/**
 * 顯示所有線上的監控站
 */
function example7_FilterOnline() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 篩選線上的站點
  const onlineStations = WaterCCTVTransformer.filterOnline(valid);
  
  // 顯示列表
  const html = WaterCCTVTransformer.createStationTable(onlineStations);
  document.getElementById('online-list').innerHTML = html;
  
  console.log(`線上監控站: ${onlineStations.length} 個`);
}

// ============================================================================
// 範例 8: 篩選離線的監控站
// ============================================================================

/**
 * 顯示所有離線的監控站
 */
function example8_FilterOffline() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 篩選離線的站點
  const offlineStations = WaterCCTVTransformer.filterOffline(valid);
  
  // 顯示為卡片格式
  const html = WaterCCTVTransformer.createStationCards(offlineStations);
  document.getElementById('offline-cards').innerHTML = html;
  
  console.log(`離線監控站: ${offlineStations.length} 個`);
}

// ============================================================================
// 範例 9: 篩選異常的監控站
// ============================================================================

/**
 * 顯示所有異常的監控站 (需要維護)
 */
function example9_FilterAbnormal() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 篩選異常的站點
  const abnormalStations = WaterCCTVTransformer.filterAbnormal(valid);
  
  // 直接在控制台顯示
  console.log('需要維護的監控站:');
  abnormalStations.forEach(station => {
    console.log(`  - ${station.cameraname} (流域: ${station.basinname})`);
  });
}

// ============================================================================
// 範例 10: 按流域篩選
// ============================================================================

/**
 * 只顯示特定流域的監控站
 * @param {string} basinName 流域名稱
 */
function example10_FilterByBasin(basinName = '高屏溪') {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 篩選特定流域
  const filteredStations = WaterCCTVTransformer.filterByBasin(valid, basinName);
  
  // 顯示結果
  const html = WaterCCTVTransformer.createStationCards(filteredStations);
  document.getElementById('basin-result').innerHTML = html;
  
  console.log(`${basinName}: ${filteredStations.length} 個監控站`);
}

// ============================================================================
// 範例 11: 按縣市篩選
// ============================================================================

/**
 * 只顯示特定縣市的監控站
 * @param {string} countyName 縣市名稱
 */
function example11_FilterByCounty(countyName = '臺南市') {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 篩選特定縣市
  const filteredStations = WaterCCTVTransformer.filterByCounty(valid, countyName);
  
  // 按流域再分組
  const grouped = WaterCCTVTransformer.groupByBasin(filteredStations);
  
  console.log(`${countyName} 的監控站:`);
  Object.entries(grouped).forEach(([basin, stationList]) => {
    console.log(`  ${basin}: ${stationList.length} 個`);
  });
}

// ============================================================================
// 範例 12: 關鍵字搜尋
// ============================================================================

/**
 * 使用關鍵字搜尋監控站
 * @param {string} keyword 搜尋關鍵字
 */
function example12_SearchByKeyword(keyword = '大橋') {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 搜尋
  const results = WaterCCTVTransformer.search(valid, keyword);
  
  // 顯示搜尋結果
  if (results.length === 0) {
    console.log(`找不到包含 "${keyword}" 的監控站`);
  } else {
    const html = WaterCCTVTransformer.createStationTable(results);
    document.getElementById('search-results').innerHTML = html;
    
    console.log(`找到 ${results.length} 個結果:`);
    results.forEach(station => {
      console.log(`  - ${station.cameraname}`);
    });
  }
}

// ============================================================================
// 範例 13: 排序監控站
// ============================================================================

/**
 * 以不同方式排序監控站
 */
function example13_SortStations() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 按名稱排序 (升序)
  const byName = WaterCCTVTransformer.sort(valid, 'name', 'asc');
  console.log('按名稱排序 (升序):');
  byName.slice(0, 5).forEach(s => console.log(`  - ${s.cameraname}`));
  
  // 按流域排序
  const byBasin = WaterCCTVTransformer.sort(valid, 'basin', 'asc');
  console.log('\n按流域排序:');
  byBasin.slice(0, 5).forEach(s => console.log(`  - ${s.basinname}: ${s.cameraname}`));
  
  // 按狀態排序
  const byStatus = WaterCCTVTransformer.sort(valid, 'status', 'asc');
  console.log('\n按狀態排序:');
  byStatus.slice(0, 5).forEach(s => console.log(`  - [${s.status}] ${s.cameraname}`));
}

// ============================================================================
// 範例 14: 生成監控站卡片
// ============================================================================

/**
 * 生成單個卡片 HTML
 */
function example14_CreateStationCard() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 取第一個站點
  const station = valid[0];
  
  // 生成單個卡片
  const html = WaterCCTVTransformer.createStationCard(station);
  document.getElementById('single-card').innerHTML = html;
}

// ============================================================================
// 範例 15: 生成批量卡片
// ============================================================================

/**
 * 生成監控站卡片列表
 */
function example15_CreateStationCards() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 只取前 10 個
  const subset = valid.slice(0, 10);
  
  // 生成卡片
  const html = WaterCCTVTransformer.createStationCards(subset);
  document.getElementById('cards-container').innerHTML = html;
}

// ============================================================================
// 範例 16: 生成表格列表
// ============================================================================

/**
 * 生成監控站表格
 */
function example16_CreateStationTable() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 排序後生成表格
  const sorted = WaterCCTVTransformer.sort(valid, 'name');
  const html = WaterCCTVTransformer.createStationTable(sorted);
  document.getElementById('table-container').innerHTML = html;
}

// ============================================================================
// 範例 17: 生成流域概覽
// ============================================================================

/**
 * 生成流域概覽卡片
 */
function example17_CreateBasinOverview() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 按流域分組
  const grouped = WaterCCTVTransformer.groupByBasin(valid);
  
  // 生成概覽
  const html = WaterCCTVTransformer.createBasinOverview(grouped);
  document.getElementById('basin-overview').innerHTML = html;
}

// ============================================================================
// 範例 18: 計算距離
// ============================================================================

/**
 * 計算兩點之間的距離
 */
function example18_CalculateDistance() {
  // 假設座標 A: (23.0, 120.2), B: (23.1, 120.3)
  const distance = WaterCCTVTransformer.calculateDistance(
    23.0, 120.2,  // 點 A
    23.1, 120.3   // 點 B
  );
  
  console.log(`兩點距離: ${distance.toFixed(2)} 公里`);
}

// ============================================================================
// 範例 19: 查詢附近的監控站
// ============================================================================

/**
 * 查詢指定位置附近的監控站
 * @param {number} lat 緯度
 * @param {number} lon 經度
 * @param {number} radius 半徑 (公里)
 */
function example19_FindNearbyStations(lat = 23.0, lon = 120.2, radius = 5) {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 查詢附近站點
  const nearby = WaterCCTVTransformer.findNearbyStations(valid, lat, lon, radius);
  
  // 顯示結果
  console.log(`${lat}, ${lon} 周邊 ${radius} 公里內的監控站:`);
  nearby.forEach(station => {
    const distance = WaterCCTVTransformer.calculateDistance(
      lat, lon,
      parseFloat(station.latitude_4326),
      parseFloat(station.longitude_4326)
    );
    console.log(`  - ${station.cameraname} (${distance.toFixed(2)} 公里)`);
  });
  
  // 在網頁顯示
  const html = WaterCCTVTransformer.createStationCards(nearby);
  document.getElementById('nearby').innerHTML = html;
}

// ============================================================================
// 範例 20: 導出為 CSV
// ============================================================================

/**
 * 導出監控站資料為 CSV 格式並下載
 */
function example20_ExportToCSV() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 導出
  WaterCCTVTransformer.downloadCSV(valid, 'water-monitoring-stations.csv');
  
  console.log('CSV 檔案已下載');
}

// ============================================================================
// 範例 21: 導出為 JSON
// ============================================================================

/**
 * 導出監控站資料為 JSON 格式並下載
 */
function example21_ExportToJSON() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 導出
  WaterCCTVTransformer.downloadJSON(valid, 'water-monitoring-stations.json');
  
  console.log('JSON 檔案已下載');
}

// ============================================================================
// 範例 22: 完整的監控儀表板
// ============================================================================

/**
 * 完整的監控儀表板初始化
 */
function example22_CompleteDashboard() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 1. 統計面板
  document.getElementById('stats').innerHTML = 
    WaterCCTVTransformer.createStatsPanel(valid);
  
  // 2. 流域概覽
  const grouped = WaterCCTVTransformer.groupByBasin(valid);
  document.getElementById('basins').innerHTML = 
    WaterCCTVTransformer.createBasinOverview(grouped);
  
  // 3. 監控站列表
  const sorted = WaterCCTVTransformer.sort(valid, 'name');
  document.getElementById('stations').innerHTML = 
    WaterCCTVTransformer.createStationTable(sorted);
  
  // 4. 下載按鈕事件
  document.getElementById('btn-csv').onclick = () => 
    WaterCCTVTransformer.downloadCSV(valid, 'stations.csv');
  
  document.getElementById('btn-json').onclick = () => 
    WaterCCTVTransformer.downloadJSON(valid, 'stations.json');
}

// ============================================================================
// 範例 23: 動態搜尋框
// ============================================================================

/**
 * 搜尋框的動態搜尋功能
 */
function example23_DynamicSearch() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  const searchInput = document.getElementById('search-input');
  const resultContainer = document.getElementById('search-results');
  
  searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.trim();
    
    if (keyword.length === 0) {
      resultContainer.innerHTML = '';
      return;
    }
    
    // 搜尋
    const results = WaterCCTVTransformer.search(valid, keyword);
    
    // 顯示結果
    if (results.length === 0) {
      resultContainer.innerHTML = '<p>找不到符合的監控站</p>';
    } else {
      resultContainer.innerHTML = WaterCCTVTransformer.createStationCards(results);
    }
  });
}

// ============================================================================
// 範例 24: 流域過濾器
// ============================================================================

/**
 * 流域過濾器 (下拉選單)
 */
function example24_BasinFilter() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  const filterSelect = document.getElementById('basin-filter');
  const resultContainer = document.getElementById('filter-results');
  
  filterSelect.addEventListener('change', (e) => {
    const selectedBasin = e.target.value;
    
    if (selectedBasin === 'all') {
      // 顯示所有
      resultContainer.innerHTML = WaterCCTVTransformer.createStationTable(valid);
    } else {
      // 篩選特定流域
      const filtered = WaterCCTVTransformer.filterByBasin(valid, selectedBasin);
      resultContainer.innerHTML = WaterCCTVTransformer.createStationTable(filtered);
    }
  });
}

// ============================================================================
// 範例 25: 狀態過濾器
// ============================================================================

/**
 * 狀態過濾器 (複選框)
 */
function example25_StatusFilter() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  const checkboxes = document.querySelectorAll('input[name="status-filter"]');
  const resultContainer = document.getElementById('filter-results');
  
  // 初始顯示所有
  resultContainer.innerHTML = WaterCCTVTransformer.createStationTable(valid);
  
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const selectedStatuses = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
      
      if (selectedStatuses.length === 0) {
        resultContainer.innerHTML = '';
        return;
      }
      
      // 篩選
      const filtered = valid.filter(s => selectedStatuses.includes(s.status));
      resultContainer.innerHTML = WaterCCTVTransformer.createStationTable(filtered);
    });
  });
}

// ============================================================================
// 範例 26: 分頁顯示
// ============================================================================

/**
 * 監控站分頁顯示
 * @param {number} pageSize 每頁數量
 */
function example26_Pagination(pageSize = 10) {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  const sorted = WaterCCTVTransformer.sort(valid, 'name');
  
  const totalPages = Math.ceil(sorted.length / pageSize);
  let currentPage = 1;
  
  function showPage(page) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = sorted.slice(start, end);
    
    document.getElementById('content').innerHTML = 
      WaterCCTVTransformer.createStationTable(pageData);
    
    document.getElementById('page-info').textContent = 
      `第 ${page} / ${totalPages} 頁`;
  }
  
  // 初始顯示
  showPage(currentPage);
  
  // 上一頁按鈕
  document.getElementById('prev-btn').onclick = () => {
    if (currentPage > 1) showPage(--currentPage);
  };
  
  // 下一頁按鈕
  document.getElementById('next-btn').onclick = () => {
    if (currentPage < totalPages) showPage(++currentPage);
  };
}

// ============================================================================
// 範例 27: 實時更新監控
// ============================================================================

/**
 * 定期檢查並更新線上/離線狀態
 */
function example27_RealtimeMonitoring() {
  const stations = waterCCTVStationsData;
  
  setInterval(() => {
    const { valid } = WaterCCTVTransformer.validateStations(stations);
    const stats = WaterCCTVTransformer.calculateStats(valid);
    
    // 更新統計面板
    document.getElementById('stats').innerHTML = 
      WaterCCTVTransformer.createStatsPanel(valid);
    
    // 更新標題中的計數
    document.title = `監控站監視 [線上: ${stats.online}/${stats.total}]`;
  }, 60000); // 每分鐘更新一次
}

// ============================================================================
// 範例 28: 警告系統 (離線監控站)
// ============================================================================

/**
 * 檢測離線監控站並發出警告
 */
function example28_OfflineAlerts() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  const offlineStations = WaterCCTVTransformer.filterOffline(valid);
  
  if (offlineStations.length > 0) {
    console.warn('⚠️ 離線監控站警告:');
    offlineStations.forEach(station => {
      console.warn(`  - ${station.cameraname} (${station.basinname})`);
    });
    
    // 也可以顯示在頁面上
    const alert = document.getElementById('alert');
    if (alert) {
      alert.innerHTML = `
        <div class="alert alert-warning">
          有 ${offlineStations.length} 個監控站離線
          <button onclick="showOfflineList()">查看詳情</button>
        </div>
      `;
    }
  }
}

function showOfflineList() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  const offlineStations = WaterCCTVTransformer.filterOffline(valid);
  
  const modal = document.getElementById('offline-modal');
  modal.innerHTML = WaterCCTVTransformer.createStationTable(offlineStations);
  modal.style.display = 'block';
}

// ============================================================================
// 範例 29: 統計圖表資料準備
// ============================================================================

/**
 * 為圖表庫 (Chart.js 等) 準備統計資料
 */
function example29_PrepareChartData() {
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 按流域統計
  const grouped = WaterCCTVTransformer.groupByBasin(valid);
  
  const labels = [];
  const data = [];
  
  Object.entries(grouped).forEach(([basin, basinStations]) => {
    labels.push(basin);
    data.push(basinStations.length);
  });
  
  // Chart.js 格式
  const chartData = {
    labels: labels,
    datasets: [{
      label: '監控站數量',
      data: data,
      backgroundColor: labels.map(basin => 
        WaterCCTVTransformer.getBasinInfo(basin).color
      )
    }]
  };
  
  console.log('圖表資料:', chartData);
  return chartData;
}

// ============================================================================
// 範例 30: 地圖標記 (Leaflet 整合)
// ============================================================================

/**
 * 將監控站標記在地圖上 (使用 Leaflet)
 * 需先引入 Leaflet: https://leafletjs.com
 */
function example30_MapIntegration() {
  // 需要 HTML 中有 <div id="map"></div>
  if (typeof L === 'undefined') {
    console.error('Leaflet 未加載');
    return;
  }
  
  const stations = waterCCTVStationsData;
  const { valid } = WaterCCTVTransformer.validateStations(stations);
  
  // 初始化地圖 (中心: 台灣中部)
  const map = L.map('map').setView([23.5, 120.5], 8);
  
  // 添加圖層
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  
  // 添加監控站標記
  valid.forEach(station => {
    const lat = parseFloat(station.latitude_4326);
    const lon = parseFloat(station.longitude_4326);
    const basinInfo = WaterCCTVTransformer.getBasinInfo(station.basinname);
    
    // 創建自訂圖標
    const iconColor = basinInfo.color;
    const marker = L.circleMarker([lat, lon], {
      radius: 8,
      fillColor: iconColor,
      color: '#000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    });
    
    // 彈出窗
    marker.bindPopup(`
      <strong>${station.cameraname}</strong><br>
      流域: ${station.basinname}<br>
      縣市: ${station.countiesandcitieswherethemonitoringpointsarelocated}<br>
      <img src="${station.imageurl}" style="width: 200px;" onerror="this.style.display='none'">
    `);
    
    marker.addTo(map);
  });
}

// ============================================================================
// 工具函數
// ============================================================================

/**
 * 快速測試所有範例
 */
function runAllExamples() {
  console.log('=== 執行所有範例 ===\n');
  
  try {
    console.log('範例 1: 基本初始化');
    example1_BasicInitialization();
    
    console.log('\n範例 2: 統計資訊');
    example2_DisplayStatistics();
    
    console.log('\n範例 3: 按流域分組');
    example3_GroupByBasin();
    
    console.log('\n... (更多範例)');
    
  } catch (error) {
    console.error('執行範例時發生錯誤:', error);
  }
}

// ============================================================================
// 導出 (如果在 Node.js 環境)
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    example1_BasicInitialization,
    example2_DisplayStatistics,
    example3_GroupByBasin,
    // ... 其他範例
    runAllExamples
  };
}

console.log('✅ 水利署 CCTV 監控站系統 - 範例集合已加載');
console.log('使用 runAllExamples() 來測試所有功能');
