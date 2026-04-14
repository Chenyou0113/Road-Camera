with open("tra-pids.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
new_text = re.sub(r'function updateClock\(\) \{[\s\S]*?\}\s*setInterval\(updateClock, 1000\);', '', text)
new_text = re.sub(r'async function checkTopMarquee\(\) \{[\s\S]*?\} \(e\) \{ console\.warn\("Top Marquee Error:", e\); \}\s*\}', '', new_text)

with open("tra-pids.html", "w", encoding="utf-8") as f:
    f.write(new_text)
