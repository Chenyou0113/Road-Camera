import re
with open('tra-pids.html', 'r', encoding='utf-8') as f:
    text = f.read()
m = bool(re.search('const PIDS_APP = \{.*?UI 安全工具', text, re.DOTALL))
print('Regex match:', m)
