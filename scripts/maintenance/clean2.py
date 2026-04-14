with open("tra_liveboard.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
text = re.sub(r'let allStationsFlat = \[\];\n        let currentMode = "station";\n        let isAutoRefreshEnabled = false;\n        let currentMode = "station";\n        let isAutoRefreshEnabled = false; ', 
r'let allStationsFlat = [];\n        let currentMode = "station";\n        let isAutoRefreshEnabled = false;', text)

with open("tra_liveboard.html", "w", encoding="utf-8") as f:
    f.write(text)
