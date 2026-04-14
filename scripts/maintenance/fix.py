import re
with open("tra_liveboard.html", "r", encoding="utf-8") as f:
    text = f.read()

text = re.sub(
    r'(let allStationsFlat = \[\];[ \t\r\n]+let currentMode = "station";[ \t\r\n]+let isAutoRefreshEnabled = false;[ \t\r\n]+)let currentMode = "station";[ \t\r\n]+let isAutoRefreshEnabled = false;[ \t\r\n]+',
    r'\1',
    text
)

text = re.sub(
    r'''(\s*\}
\s*\})
        
        // 💓 核心心跳機制 \(對齊整分鐘更新\)
        function startHeartbeat\(\) \{[\s\S]*?\}
        
        startHeartbeat\(\); // 🔥 啟動指揮官\s*\}
\s*\})''',
    r'\1',
    text
)

with open("tra_liveboard.html", "w", encoding="utf-8") as f:
    f.write(text)
