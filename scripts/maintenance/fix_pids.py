import re

with open("tra-pids.html", "r", encoding="utf-8") as f:
    html = f.read()

# Find the start of PIDS_APP
app_start = html.find("const PIDS_APP = {")

# Find the end of PIDS_APP (it's right before // ============ UI 安全工具)
app_end_match = re.search(r"\n\s*};\n\s*// ============ UI", html)
if not app_end_match:
    app_end_match = re.search(r"\n\s*};\n\s*// ============", html)
app_end = app_end_match.start() + len("\n        };")

old_app = html[app_start:app_end]

# Extract TRAIN_TYPES
train_types_match = re.search(r"TRAIN_TYPES:\s*\{(?:[^{}]|\n)*\}", old_app)
train_types = train_types_match.group(0) if train_types_match else "TRAIN_TYPES: {}"

# Extract ui inner methods except the trailing brace
ui_match = re.search(r"ui:\s*\{([\s\S]*?)\n\s*\},?\n\s+startTimers", old_app)
ui_inner = ui_match.group(1) if ui_match else ""
# also capture initKeyboardNavigation
kb_match = re.search(r"(\s*// 🔥 鍵盤導航支援[\s\S]*?initKeyboardNavigation\(\)\s*\{[\s\S]*?\n\s*\})", old_app)
kb_inner = kb_match.group(1) if kb_match else ""

# Also extract loadInitialData just in case we need its original media line
update_media_match = re.search(r"updateMediaAssets\(\);", old_app)

new_app = """const PIDS_APP = {
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
                """ + train_types + """
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
                    target._observers.forEach(cb => { try { cb(prop, value); }catch(e){} });
                    
                    // 當語言、資料、公告或通阻改變時，觸發 UI 更新
                    if (['currentLang', 'lastTrainData', 'propagandaText', 'alertText'].includes(prop)) {
                        clearTimeout(target._renderTimer);
                        target._renderTimer = setTimeout(() => {
                            if(typeof refreshDisplay === 'function') refreshDisplay(); 
                            if(PIDS_APP.ui && PIDS_APP.ui.renderTopMarquee) PIDS_APP.ui.renderTopMarquee();
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
                if(typeof this.initKeyboardNavigation === "function") this.initKeyboardNavigation();
                
                // 啟動首屏數據
                this.syncAllData();
                // 啟動每秒心跳
                setInterval(() => this.heartbeat(), this.CONFIG.INTERVALS.CLOCK);
            },
""" + kb_inner + """

            // 💓 核心心跳機制：每秒檢查一次，確保「整點」觸發
            heartbeat() {
                const now = new Date();
                const t = Math.floor(now.getTime() / 1000);
                const seconds = now.getSeconds();
                const minutes = now.getMinutes();

                // 1. 更新時鐘顯示
                if(typeof UI_Helper !== "undefined") {
                    UI_Helper.setText('unifiedTime', now.toLocaleTimeString('en-GB'));
                    UI_Helper.setText('unifiedDate', now.toISOString().split('T')[0].replace(/-/g, '/'));
                }

                // 2. 語言切換 (每 1 分鐘且秒數為 0 時切換)
                const langIdx = Math.floor(t / this.CONFIG.INTERVALS.LANG_CYCLE) % 2;
                const targetLang = (langIdx === 0) ? 'zh' : 'en';
                if (this.STATE.currentLang !== targetLang) {
                    this.STATE.currentLang = targetLang;
                    if(this.ui && this.ui.updateUIStrings) this.ui.updateUIStrings();
                }

                // 3. 營運通阻與行車資訊 (每分鐘的第 0 秒觸發同步)
                if (seconds === 0) {
                    console.log(`⏱️ [${now.toLocaleTimeString()}] 整分鐘同步：PIDS 資料 & 通阻公告`);
                    if(this.STATE.stationID) this.updatePids();
                    this.fetchAlerts();
                }

                // 4. 宣導跑馬燈 (每 5 分鐘觸發一次，例如 05, 10, 15... 分)
                if (seconds === 0 && minutes % 5 === 0) {
                    console.log(`⏱️ [${now.toLocaleTimeString()}] 5分鐘同步：後台宣導文字`);
                    this.fetchPropaganda();
                }
            },

            // 初始與手動同步
            syncAllData() {
                if(this.STATE.stationID) this.updatePids();
                this.fetchAlerts();
                this.fetchPropaganda();
                if(typeof updateMediaAssets === 'function') updateMediaAssets();
            },

            async updatePids() {
                try {
                    const res = await fetch(`${this.CONFIG.API_BASE}/api/liveboard/station?station=${this.STATE.stationID}`);
                    if(!res.ok) throw new Error('Liveboard Fetch Error');
                    const data = await res.json();
                    this.STATE.lastTrainData = data;
                } catch (e) { console.error("PIDS Sync Error", e); }
            },

            async fetchAlerts() {
                try {
                    const res = await fetch(`${this.CONFIG.API_BASE}/api/alerts`);
                    if(!res.ok) throw new Error('Alerts Fetch Error');
                    const data = await res.json();
                    
                    const isZh = this.STATE.currentLang === 'zh';
                    if (data && Array.isArray(data) && data.length > 0) {
                        const alertMsg = data.map(a => `⚠️ 【${a.Title}】 ${a.Description}`).join("   ❖   ");
                        this.STATE.alertText = alertMsg;
                    } else {
                        this.STATE.alertText = '';
                    }
                } catch (e) { console.error("Alerts Sync Error", e); }
            },

            async fetchPropaganda() {
                try {
                    const res = await fetch(`${this.CONFIG.API_BASE}/api/pids/marquee?raw=true`);
                    if(!res.ok) throw new Error('Propaganda Fetch Error');
                    const data = await res.json();
                    this.STATE.propagandaText = data.text || "歡迎搭乘臺鐵。";
                } catch (e) { console.error("Propaganda Sync Error", e); }
            },

            // 訂閱狀態變化
            subscribe(callback) {
                this.STATE._observers.add(callback);
                return () => this.STATE._observers.delete(callback);
            },

            ui: {""" + ui_inner + """,

                // 🔥 渲染頂部跑馬燈 (融合通阻與宣導)
                renderTopMarquee() {
                    const el = document.getElementById('unifiedTopMarquee');
                    if (!el) return;
                    const separator = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
                    const newText = this.STATE.alertText 
                        ? `${this.STATE.alertText}${separator}${this.STATE.propagandaText}`
                        : this.STATE.propagandaText;
                    
                    // 只有內容真的有變時才重新啟動跑馬燈
                    if (el.innerHTML !== newText) {
                        el.innerHTML = newText;
                        if(typeof startMarquee === 'function') startMarquee('unifiedTopMarquee');
                    }
                }
            }
        };"""

new_html = html[:app_start] + new_app + html[app_end:]
with open("tra-pids.html", "w", encoding="utf-8") as f:
    f.write(new_html)

print("Patch applied to tra-pids.html.")
