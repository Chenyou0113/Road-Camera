import re, sys

with open('tra-pids.html', 'r', encoding='utf-8') as f:
    text = f.read()

start_sig = 'const PIDS_APP = {'
end_sig = r'\s*// ============ UI 安全工具（防 XSS） ============'
pattern = re.compile(re.escape(start_sig) + r'.*?(' + end_sig + ')', re.DOTALL)

def repl(m):
    original = m.group(0)
    train_match = re.search(r'TRAIN_TYPES:\s*\{[^{}]*\}', original)
    train_types = train_match.group(0) if train_match else 'TRAIN_TYPES: {}'
    
    ui_match = re.search(r'ui:\s*\{([\s\S]*?)\n\s*\},?\n\s+(?:startTimers|renderTopMarquee|loadInitialData)', original)
    ui_inner = ui_match.group(1) if ui_match else ''
    if not ui_inner:
        ui_match = re.search(r'ui:\s*\{([\s\S]*?)\n\s*\},?\n\s+renderTopMarquee', original)
        ui_inner = ui_match.group(1) if ui_match else ''
        if not ui_inner:
            ui_match = re.search(r'ui:\s*\{([\s\S]*?)updateUIStrings\(\) \{[\s\S]*?\}\n\s*\},', original)
            ui_inner = ui_match.group(1) if ui_match else ''
            
    if not ui_inner:
        ui_inner = '/* Failed to extract UI! */'

    kb_match = re.search(r'(\s*//\s*🔥\s*鍵盤導航支援[\s\S]*?initKeyboardNavigation\(\)\s*\{[\s\S]*?\n\s*\})', original)
    kb_inner = kb_match.group(1) if kb_match else ''
    
    return '''const PIDS_APP = {
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
                ''' + train_types + '''
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
''' + kb_inner + '''

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

                // 2. 語言切換 (每 1 分鐘切換)
                const langIdx = Math.floor(t / this.CONFIG.INTERVALS.LANG_CYCLE) % 2;
                const targetLang = (langIdx === 0) ? 'zh' : 'en';
                if (this.STATE.currentLang !== targetLang) {
                    this.STATE.currentLang = targetLang;
                }

                // 3. 營運通阻與行車資訊 (當秒數為 0 時觸發同步)
                if (seconds === 0) {
                    console.log(`⏱️ [${now.toLocaleTimeString()}] 整分鐘同步：PIDS 資料 & 通阻公告`);
                    if(this.STATE.stationID) this.updatePids();
                    this.fetchAlerts();
                }

                // 4. 宣導跑馬燈 (當分可被 5 整除且秒數為 0 時觸發)
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

            ui: {''' + ui_inner + '''

                // 🔥 渲染頂部跑馬燈 (融合通阻與宣導)
                renderTopMarquee() {
                    const el = document.getElementById('unifiedTopMarquee');
                    if (!el) return;
                    const separator = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
                    const newText = this.STATE.alertText 
                        ? `${this.STATE.alertText}${separator}${this.STATE.propagandaText}`
                        : this.STATE.propagandaText;
                    
                    if (el.innerHTML !== newText) {
                        el.innerHTML = newText;
                        if(typeof startMarquee === 'function') startMarquee('unifiedTopMarquee');
                    }
                }
            }
        };
\n''' + m.group(1)

new_text, subs = pattern.subn(repl, text)

if subs == 0:
    print("Match failed")
    sys.exit(1)
    
with open('tra-pids.html', 'w', encoding='utf-8') as f:
    f.write(new_text)
    print("Success")
