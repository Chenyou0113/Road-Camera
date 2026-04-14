const fs = require('fs');
let html = fs.readFileSync('tra-pids.html', 'utf8');

// Find the start and end of PIDS_APP.
const startIdx = html.indexOf('const PIDS_APP = {');
// Find the end of PIDS_APP. It ends around line 1497 with "    };"
let matchEnd = html.match(/\n\s*};\n\s*\/\/\s*============ UI 安全工具/);
if (!matchEnd) {
    console.error('Cannot find end of PIDS_APP');
    process.exit(1);
}
const endIdx = matchEnd.index + matchEnd[0].indexOf('};') + 2;

const pidsAppBody = html.substring(startIdx, endIdx);

// Extract the ui object
const uiMatch = pidsAppBody.match(/ui: \{([\s\S]*?)\n\s*\},?\n\s+(?:startTimers|loadInitialData)/);
let uiContent = '';
if (uiMatch) {
    uiContent = uiMatch[1];
} else {
    // If not matching, just extract up to startTimers
    const uiMatch2 = pidsAppBody.match(/ui: \{([\s\S]*?)\n\s*\},?\n\s+startTimers/);
    if(uiMatch2) uiContent = uiMatch2[1];
}

// Extract subscribe and initKeyboardNavigation
const subscribeMatch = pidsAppBody.match(/(\/\/\s*訂閱狀態變化[\s\S]*?)(?=\/\/\s*初始化|\n\s+init\(\))/);
const subscribeCode = subscribeMatch ? subscribeMatch[1] : '';

const initKBMatch = pidsAppBody.match(/(\/\/\s*🔥 鍵盤導航支援[\s\S]*?)(?=\n\s+(?:\/\/|updateClock|startAutoLangSwitch))/);
const initKBCode = initKBMatch ? initKBMatch[1] : '';

const newPidsApp = const PIDS_APP = {
            CONFIG: {
                API_BASE: "https://tra-schedule-worker.weacamm.org",
                INTERVALS: {
                    CLOCK: 1000,            
                    LANG_CYCLE: 60,         // 語言每 60 秒 (1分鐘) 切換一次
                    PROPAGANDA_CYCLE: 300,  // 宣導文字每 300 秒 (5分鐘) 更新一次
                    ALERTS_CYCLE: 60,       // 營運通阻每 60 秒 (1分鐘) 更新一次
                    PIDS_SYNC: 60           // 行車資訊整分鐘更新一次
                },
                ROWS: { DESKTOP: 5, MOBILE: 5 },
                TRAIN_TYPES: {
                    "1100": "\\u81ea\\u5f37", "1101": "\\u592a\\u9b6f\\u95a3", "1102": "\\u81ea\\u5f37", "1103": "\\u81ea\\u5f37", "1107": "\\u666e\\u60a0\\u746a",
                    "1108": "\\u81ea\\u5f37", "110B": "\\u65b0\\u81ea\\u5f37", "110G": "\\u65b0\\u81ea\\u5f37", "110H": "\\u65b0\\u81ea\\u5f37", "110K": "\\u65b0\\u81ea\\u5f37", "110M": "\\u65b0\\u81ea\\u5f37",
                    "1110": "\\u8392\\u5149", "1111": "\\u8392\\u5149", "1112": "\\u8392\\u5149", "1113": "\\u8392\\u5149", "1114": "\\u8392\\u5149", "1115": "\\u8392\\u5149", "1120": "\\u5fa9\\u8208",
                    "1131": "\\u5340\\u9593", "1132": "\\u5340\\u9593\\u5feb", "1140": "\\u666e\\u5feb", "1150": "\\u67f4\\u5feb", "1270": "\\u666e\\u901a", "1280": "\\u5340\\u9593", "1281": "\\u5340\\u9593", "1282": "\\u5340\\u9593"
                }
            },

            STATE: new Proxy({
                currentLang: localStorage.getItem('pids_lang') || 'zh',
                rowLangs: [],
                stationID: '',
                stationName: '',
                lastTrainData: [],
                propagandaText: '歡迎搭乘臺鐵。',
                alertText: '',
                _renderTimer: null,
                _observers: new Set()
            }, {
                set(target, prop, value) {
                    target[prop] = value;
                    target._observers.forEach(cb => cb(prop, value));
                    
                    // 當語言、資料、公告或通阻改變時，觸發 UI 更新
                    if (['currentLang', 'lastTrainData', 'propagandaText', 'alertText'].includes(prop)) {
                        clearTimeout(target._renderTimer);
                        target._renderTimer = setTimeout(() => {
                            refreshDisplay(); 
                            PIDS_APP.ui.renderTopMarquee();
                        }, 50);
                    }
                    return true;
                }
            }),

            init() {
                const params = new URLSearchParams(location.search);
                this.STATE.stationID = params.get('station');
                this.STATE.stationName = params.get('name') || '臺鐵';
                this.ui.updateStationName();
                this.ui.updateEnglishStationName();
                this.ui.updateUIStrings();
                
                // 啟動首屏數據
                this.syncAllData();
                // 啟動每秒心跳
                setInterval(() => this.heartbeat(), this.CONFIG.INTERVALS.CLOCK);
            },

            // 💓 核心心跳機制：每秒檢查一次，確保「整點」觸發
            heartbeat() {
                const now = new Date();
                const t = Math.floor(now.getTime() / 1000);
                const seconds = now.getSeconds();
                const minutes = now.getMinutes();

                // 1. 更新時鐘顯示
                UI_Helper.setText('unifiedTime', now.toLocaleTimeString('en-GB'));
                UI_Helper.setText('unifiedDate', now.toISOString().split('T')[0].replace(/-/g, '/'));

                // 2. 語言切換 (每 1 分鐘且秒數為 0 時切換)
                const langIdx = Math.floor(t / this.CONFIG.INTERVALS.LANG_CYCLE) % 2;
                const targetLang = (langIdx === 0) ? 'zh' : 'en';
                if (this.STATE.currentLang !== targetLang) {
                    this.STATE.currentLang = targetLang;
                    this.ui.updateUIStrings();
                }

                // 3. 營運通阻與行車資訊 (每分鐘的第 0 秒觸發同步)
                if (seconds === 0) {
                    console.log(\⏱️ [\] 整分鐘同步：PIDS 資料 & 通阻公告\);
                    if (this.STATE.stationID) this.updatePids();
                    this.fetchAlerts();
                }

                // 4. 宣導跑馬燈 (每 5 分鐘觸發一次，例如 05, 10, 15... 分)
                if (seconds === 0 && minutes % 5 === 0) {
                    console.log(\⏱️ [\] 5分鐘同步：後台宣導文字\);
                    this.fetchPropaganda();
                }
            },

            // 初始與手動同步
            syncAllData() {
                if (this.STATE.stationID) this.updatePids();
                this.fetchAlerts();
                this.fetchPropaganda();
                // Call updateMediaAssets from outside to retain asset logic
                if (typeof updateMediaAssets === 'function') updateMediaAssets();
            },

            async updatePids() {
                try {
                    const res = await fetch(\\/api/liveboard/station?station=\\);
                    const data = await res.json();
                    
                    // The original code was updating lastTrainData which triggers the Proxy.
                    // But in original updatePids, there's logic to abort fetch and format data. 
                    // We'll trust the user's snippet for the proxy update here.
                    this.STATE.lastTrainData = data;
                } catch (e) { console.error("PIDS Sync Error", e); }
            },

            async fetchAlerts() {
                try {
                    const res = await fetch(\\/api/alerts\);
                    const data = await res.json();
                    // 根據目前語言過濾通阻
                    const isZh = this.STATE.currentLang === 'zh';
                    const alertMsg = data.map(a => \⚠️ 【\】 \\).join("   ❖   ");
                    this.STATE.alertText = alertMsg;
                } catch (e) { console.error("Alerts Sync Error", e); }
            },

            async fetchPropaganda() {
                try {
                    const res = await fetch(\\/api/pids/marquee?raw=true\);
                    const data = await res.json();
                    this.STATE.propagandaText = data.text || "歡迎搭乘臺鐵。";
                } catch (e) { console.error("Propaganda Sync Error", e); }
            },

            subscribe(callback) {
                this.STATE._observers.add(callback);
                return () => this.STATE._observers.delete(callback);
            },

            ui: {
                updateStationName() {
                    const el = document.getElementById('unifiedStationName');
                    if (el) {
                        const cleanName = PIDS_APP.STATE.stationName.replace(/車站$|站$/, '');
                        el.textContent = cleanName + '車站';
                    }
                },

                updateEnglishStationName() {
                    const enElement = document.getElementById('station-en');
                    const stationID = PIDS_APP.STATE.stationID;
                    if (enElement && typeof stationDataMap !== 'undefined' && stationDataMap[stationID]) {
                        const rawName = stationDataMap[stationID].ename;
                        const formattedName = rawName.split('_')[0].toUpperCase();
                        enElement.textContent = \\ STATION\;
                    } else if (enElement) {
                        enElement.textContent = "TRA STATION";
                    }
                },

                updateUIStrings() {
                    const lang = i18n[PIDS_APP.STATE.currentLang];

                    const dir1Title = document.getElementById('dirTitle1');
                    const dir0Title = document.getElementById('dirTitle0');
                    if (dir1Title) dir1Title.textContent = lang.inbound;
                    if (dir0Title) dir0Title.textContent = lang.outbound;

                    const headHtml = \
                        <tr>
                            <th scope="col" style="width:15%">\</th>
                            <th scope="col" style="width:20%">\</th>
                            <th scope="col" style="width:28%">\</th>
                            <th scope="col" style="width:20%">\</th>
                            <th scope="col" style="width:17%">\</th>
                        </tr>\;

                    const table1Head = document.querySelector('.table-1 thead');
                    const table0Head = document.querySelector('.table-0 thead');
                    if (table1Head) table1Head.innerHTML = headHtml;
                    if (table0Head) table0Head.innerHTML = headHtml;
                },

                // 🔥 渲染頂部跑馬燈 (融合通阻與宣導)
                renderTopMarquee() {
                    const el = document.getElementById('unifiedTopMarquee');
                    if (!el) return;
                    const separator = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
                    const newText = this.STATE.alertText 
                        ? \\\\\
                        : this.STATE.propagandaText;
                    
                    // 只有內容真的有變時才重新啟動跑馬燈
                    if (el.innerHTML !== newText) {
                        el.innerHTML = newText;
                        if (typeof startMarquee === 'function') startMarquee('unifiedTopMarquee');
                    }
                }
            }
        };;

const newHtml = html.substring(0, startIdx) + newPidsApp + html.substring(endIdx);
fs.writeFileSync('tra-pids.html', newHtml, 'utf8');
console.log('Update successful');
