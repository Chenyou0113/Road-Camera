with open("tra_liveboard.html", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Variables
text = text.replace(
    'let allStationsFlat = [];',
    'let allStationsFlat = [];\n        let currentMode = "station";\n        let isAutoRefreshEnabled = false;'
)

# 2. Mode Switch
sw_start = text.find('const originalSwitchSearchMode = function(mode) {')
sw_end = text.find('        // ============ 公告載入 (完整原版還原 + 串接 Worker) ============', sw_start)

sw_repl = '''function switchSearchMode(mode) {
            currentMode = mode; // 🔥 紀錄目前模式
            
            clearInterval(trainRefreshTimer);
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('searchStationMode').style.display = 'none';
            document.getElementById('searchRouteMode').style.display = 'none';
            document.getElementById('searchTrainMode').style.display = 'none';

            if (mode === 'station') {
                document.getElementById('tabStation').classList.add('active');
                document.getElementById('searchStationMode').style.display = 'block';
            } else if (mode === 'route') {
                document.getElementById('tabRoute').classList.add('active');
                document.getElementById('searchRouteMode').style.display = 'block';
            } else if (mode === 'train') {
                document.getElementById('tabTrain').classList.add('active');
                document.getElementById('searchTrainMode').style.display = 'block';
                loadAllTodayTrains();
                // 車次追蹤維持它原本的 30 秒更新邏輯
            }
        }

'''
text = text[:sw_start] + sw_repl + text[sw_end:]

# 3. Time Update - completely remote it
import re
text = re.sub(r'// 時鐘更新\s*function updateTime\(\) \{[\s\S]*?\}\s*setInterval\(updateTime, 1000\);\s*', '', text)

# 4. DOMContentLoaded & Heartbeat
dc_start = text.find('document.addEventListener(\'DOMContentLoaded\', () => {')
dc_end = text.find('});', dc_start) + 3

dc_block = text[dc_start:dc_end]

# remove interval
dc_block = re.sub(r'// 通阻一分鐘更新一次\s*setInterval\(\(\) => loadTraAlerts\(\), 60000\);', '', dc_block)

# add heartbeat definition and call before ending
new_dc_block = dc_block[:-3] + '''
            startHeartbeat(); // 🔥 啟動指揮官
        });

        // 💓 核心心跳機制 (對齊整分鐘更新)
        function startHeartbeat() {
            setInterval(() => {
                const now = new Date();
                const seconds = now.getSeconds();
                const minutes = now.getMinutes();

                // 1. 每秒更新畫面的時鐘 (原本的 updateTime)
                const timeEl = document.getElementById('updateTime');
                if(timeEl) timeEl.textContent = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                // 2. 整分鐘更新邏輯 (:00 秒時觸發)
                if (seconds === 0) {
                    // 如果目前在「車站看板」模式且已經選了車站，就自動刷新
                    if (currentMode === 'station' && currentStationID) {
                        console.log(`⏱️ [${now.toLocaleTimeString()}] 整分鐘自動刷新車站看板...`);
                        fetchTrainLiveBoard(); 
                    }
                    
                    // 每分鐘檢查一次公告 (原版的 loadTraAlerts)
                    loadTraAlerts();
                }

                // 3. 5分鐘更新邏輯 (每5分鐘整，例如 05, 10, 15 分)
                if (seconds === 0 && minutes % 5 === 0) {
                    console.log(`⏱️ [${now.toLocaleTimeString()}] 5分鐘定時清理快照與更新基礎資料...`);
                    // 這裡可以放入需要低頻率更新的任務
                }

            }, 1000);
        }'''

text = text[:dc_start] + new_dc_block + text[dc_end:]

with open("tra_liveboard.html", "w", encoding="utf-8") as f:
    f.write(text)
    print("Done")
