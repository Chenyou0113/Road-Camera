const fs = require('fs');
let text = fs.readFileSync('tra-pids.html', 'utf8');

const sText = "        /* 🔥 RWD 修正區塊";
let sIdx = text.indexOf(sText);
if (sIdx === -1) sIdx = text.indexOf("        @media (max-width: 699px)");

const eIdx = text.indexOf("</style>", sIdx);

const newText =         /* 🔥 手機版/直向螢幕 終極優化 (針對 iPhone/Android 螢幕) */
        @media (max-width: 699px) {
            body {
                height: 100vh; /* 強制填滿螢幕高度，不允許捲動 */
                overflow: hidden;
                padding: 4px;
                gap: 4px;
            }

            /* 1. 壓縮 Header */
            .unified-header {
                height: 50px;
                padding: 0 10px;
                border-bottom: 1px solid #333;
            }
            .tra-logo-img { height: 1.8rem; }
            .station-name { font-size: 1.4rem; }
            .station-sub { font-size: 0.8rem; }
            .date-text { display: none; } /* 手機版隱藏日期，節省空間 */
            .time-text { font-size: 1.6rem; }
            .fullscreen-btn { width: 32px; height: 32px; font-size: 1rem; }

            /* 2. 壓縮頂部跑馬燈 */
            .unified-marquee-container {
                height: 32px;
                margin: 0;
                padding: 0 5px;
            }
            .unified-marquee-container .marquee-text {
                line-height: 32px;
                font-size: 1rem;
            }

            /* 3. 表格空間微調 (關鍵：使用 flex-grow 平分剩餘空間) */
            .pids-section {
                flex: 1 1 auto; /* 允許縮放以適應螢幕 */
                flex-direction: column;
                gap: 5px;
                min-height: 0; /* 防止被內容撐開 */
            }
            .pids-column {
                flex: 1; /* 平分剩餘空間 */
                border-width: 1px;
            }
            .direction-header-1, .direction-header-0 {
                font-size: 0.8rem;
                padding: 4px 8px;
            }
            .dest-list { font-size: 0.7rem; }

            /* 4. 縮小表格行高，確保 5 班車都能塞進去 */
            .train-table th { height: 25px; font-size: 0.7rem; }
            .train-table td {
                height: 32px; /* 從 65px 壓縮到 32px */
                font-size: 0.9rem;
            }
            .train-table td:nth-child(1) { font-size: 0.75rem; }
            .train-table td:nth-child(5) { font-size: 0.75rem; }
            .train-type-badge {
                font-size: 0.7rem;
                min-width: 45px;
                padding: 1px 3px;
            }
            .normal-time, .expected-time { font-size: 1rem; }

            /* 5. 壓縮底部跑馬燈 */
            .marquee-footer { height: 28px; }
            .marquee-footer .marquee-text {
                line-height: 28px;
                font-size: 0.85rem;
            }

            /* 6. 強制顯示媒體區 (給予固定比例) */
            .media-section {
                flex: 0 0 100px; /* 給宣導區固定 100px 的高度 */
                height: 100px;
                margin-top: 0;
            }
            #videoBox { display: none !important; } /* 手機版隱藏影片，避免卡頓，只留圖片宣導 */
            #carouselBox { width: 100%; height: 100%; }
        }

        /* 超小螢幕進階壓縮 */
        @media (max-width: 400px) {
            .train-table td:nth-child(3) { /* 隱藏「開往」，只留車次、車種、時間、狀態 */
                display: none;
            }
            .train-table th:nth-child(3) { display: none; }
        }
    

const res = text.substring(0, sIdx) + newText + "</style>" + text.substring(eIdx + 8);
fs.writeFileSync('tra-pids.html', res);
console.log('done');
