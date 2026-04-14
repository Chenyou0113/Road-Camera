import sys

with open("tra-pids.html", "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "        /* 🔥 手機版/直向螢幕 終極優化"
end_marker = "    </style>"

s_idx = content.find(start_marker)
e_idx = content.find(end_marker, s_idx)

if s_idx == -1 or e_idx == -1:
    print("Failed")
else:
    new_css = """        /* 🔥 手機版/直向螢幕 終極優化 (針對 iPhone/Android 螢幕) */
        @media (max-width: 699px) {
            body {
                height: 100vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                padding: 4px;
                gap: 4px;
            }

            /* 1. Header 壓縮且不允許縮小 */
            .unified-header {
                height: 55px; /* 稍微增加高度確保標題與副標不重疊 */
                flex-shrink: 0; /* 強制固定高度，不被下方表格擠壓 */
                padding: 0 10px;
                border-bottom: 2px solid #333;
            }
            .station-name { font-size: 1.3rem; }
            .station-sub { font-size: 0.75rem; }
            .date-text { display: none; }
            .time-text { font-size: 1.5rem; }
            .tra-logo-img { height: 1.8rem; }
            .fullscreen-btn { width: 32px; height: 32px; font-size: 1rem; }

            /* 2. 🔥 跑馬燈修復：垂直置中與防遮擋 */
            .unified-marquee-container {
                height: 40px; /* 稍微拉高高度 */
                flex-shrink: 0; /* 防止被下方表格擠壓 */
                background: #e3f2fd;
                margin: 0 -4px; /* 抵銷 body 的 padding 讓它全寬 */
                display: flex;
                align-items: center; /* 確保內容垂直置中 */
                position: relative;
            }
            .unified-marquee-container .marquee-text {
                line-height: 40px; /* 必須等於容器高度 */
                font-size: 1.2rem; /* 字體微調 */
                font-weight: 900;
                top: 0;
            }

            /* 3. 表格區域：自動填滿中間剩餘空間 */
            .pids-section {
                flex: 1; /* 佔據所有剩餘空間 */
                display: flex;
                flex-direction: column;
                gap: 4px;
                min-height: 0; /* 關鍵：允許內部內容縮放 */
            }

            .pids-column {
                flex: 1;
                border: 1px solid var(--pids-border);
                overflow: hidden;
            }
            .direction-header-1, .direction-header-0 {
                font-size: 0.8rem;
                padding: 4px 8px;
            }
            .dest-list { font-size: 0.7rem; }

            /* 縮小行高以適應手機螢幕 */
            .train-table td {
                height: 35px; /* 大幅縮小行高 */
                font-size: 0.95rem;
                padding: 0 4px;
            }
            .train-table td:nth-child(1) { font-size: 0.75rem; }
            .train-table td:nth-child(5) { font-size: 0.75rem; }
            .train-table th {
                height: 25px;
                font-size: 0.75rem;
            }
            .train-type-badge {
                font-size: 0.75rem;
                min-width: 45px;
                padding: 1px 3px;
            }
            .normal-time, .expected-time { font-size: 1rem; }

            /* 4. 底部跑馬燈壓縮 */
            .marquee-footer {
                height: 30px;
                flex-shrink: 0;
            }
            .marquee-footer .marquee-text {
                line-height: 30px;
                font-size: 0.9rem;
            }

            /* 5. 宣導資訊區：固定在最下方 */
            .media-section {
                flex: 0 0 90px; /* 給予固定高度 90px */
                height: 90px;
                margin-top: 0;
            }
            #videoBox { display: none; } /* 手機版隱藏影片，節省資源 */
            #carouselBox { width: 100%; height: 100%; border-width: 1px; }
        }

        /* 超小螢幕進階壓縮 */
        @media (max-width: 400px) {
            .train-table td:nth-child(3) { /* 隱藏「開往」，只留車次、車種、時間、狀態 */
                display: none;
            }
            .train-table th:nth-child(3) { display: none; }
        }
\n"""
    new_content = content[:s_idx] + new_css + content[e_idx:]
    with open("tra-pids.html", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Success")
