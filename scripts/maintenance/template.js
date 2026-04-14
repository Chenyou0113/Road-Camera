/* TT */
TRAIN_TYPES: {
                    "1100": "\u81ea\u5f37", "1101": "\u592a\u9b6f\u95a3", "1102": "\u81ea\u5f37", "1103": "\u81ea\u5f37", "1107": "\u666e\u60a0\u746a",
                    "1108": "\u81ea\u5f37", "110B": "\u65b0\u81ea\u5f37", "110G": "\u65b0\u81ea\u5f37", "110H": "\u65b0\u81ea\u5f37", "110K": "\u65b0\u81ea\u5f37", "110M": "\u65b0\u81ea\u5f37",
                    "1110": "\u8392\u5149", "1111": "\u8392\u5149", "1112": "\u8392\u5149", "1113": "\u8392\u5149", "1114": "\u8392\u5149", "1115": "\u8392\u5149", "1120": "\u5fa9\u8208",
                    "1131": "\u5340\u9593", "1132": "\u5340\u9593\u5feb", "1140": "\u666e\u5feb", "1150": "\u67f4\u5feb", "1270": "\u666e\u901a", "1280": "\u5340\u9593", "1281": "\u5340\u9593", "1282": "\u5340\u9593"
                }
/* UI */

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
                        enElement.textContent = `${formattedName} STATION`;
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

                    const headHtml = `
                        <tr>
                            <th scope="col" style="width:15%">${lang.trainNo}</th>
                            <th scope="col" style="width:20%">${lang.type}</th>
                            <th scope="col" style="width:28%">${lang.dest}</th>
                            <th scope="col" style="width:20%">${lang.time}</th>
                            <th scope="col" style="width:17%">${lang.status}</th>
                        </tr>`;

                    const table1Head = document.querySelector('.table-1 thead');
                    const table0Head = document.querySelector('.table-0 thead');
                    if (table1Head) table1Head.innerHTML = headHtml;
                    if (table0Head) table0Head.innerHTML = headHtml;
                }
            
/* KB */
initKeyboardNavigation() {
                // 為所有互動元素添加鍵盤支援
                const interactiveElements = [
                    '#station-select',
                    '#languageSwitchBtn',
                    '#fullscreenBtn'
                ];

                interactiveElements.forEach(selector => {
                    const el = document.querySelector(selector);
                    if (el && !el.hasAttribute('tabindex')) {
                        el.setAttribute('tabindex', '0');
                        el.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                el.click();
                            }
                        });
                    }
                });

                // 為表格添加鍵盤導航
                this.subscribe((prop) => {
                    if (prop === 'lastTrainData') {
                        setTimeout(() => {
                            document.querySelectorAll('.train-table tbody').forEach((tbody, tableIndex) => {
                                tbody.setAttribute('tabindex', '0');
                                tbody.setAttribute('aria-label', `使用方向鍵瀏覽列車資訊 - ${tableIndex === 0 ? '北上' : '南下'}方向`);

                                // 移除舊監聽器避免重複
                                const newTbody = tbody.cloneNode(true);
                                tbody.parentNode.replaceChild(newTbody, tbody);

                                newTbody.addEventListener('keydown', (e) => {
                                    const rows = Array.from(newTbody.querySelectorAll('tr'));
                                    const currentRow = document.activeElement.closest('tr');
                                    const currentIndex = currentRow ? rows.indexOf(currentRow) : -1;

                                    switch (e.key) {
                                        case 'ArrowDown':
                                            e.preventDefault();
                                            if (currentIndex < rows.length - 1) {
                                                rows[currentIndex + 1].focus();
                                            }
                                            break;
                                        case 'ArrowUp':
                                            e.preventDefault();
                                            if (currentIndex > 0) {
                                                rows[currentIndex - 1].focus();
                                            }
                                            break;
                                        case 'Home':
                                            e.preventDefault();
                                            rows[0]?.focus();
                                            break;
                                        case 'End':
                                            e.preventDefault();
                                            rows[rows.length - 1]?.focus();
                                            break;
                                        case 'Tab':
                                            // 允許 Tab 離開表格
                                            break;
                                        default:
                                            return;
                                    }
                                });

                                // 為每一行添加 tabindex
                                newTbody.querySelectorAll('tr').forEach((row, index) => {
                                    row.setAttribute('tabindex', '0');
                                    row.setAttribute('aria-rowindex', String(index + 2)); // +2 因為 header 是 row 1
                                });
                            });
                        }, 200); // 增加延遲確保 DOM 更新完成
                    }
                });

                console.log('⌨️ 鍵盤導航已啟用：使用 Tab/方向鍵瀏覽');
            }