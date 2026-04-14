import re, sys

with open('tra-pids.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Extract TRAIN_TYPES
tt_match = re.search(r'(TRAIN_TYPES:\s*\{[^{}]*\})', text)
train_types = tt_match.group(1) if tt_match else 'TRAIN_TYPES: {}'

# 2. Extract ui block robustly
def find_block(pattern):
    m = re.search(pattern, text)
    if not m: return ""
    start = m.start()
    idx = text.find('{', start)
    if idx == -1: return ""
    depth = 0
    for i in range(idx, len(text)):
        if text[i] == '{': depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                return text[start:i+1]
    return ""

ui_str = find_block(r'ui:\s*\{')
if ui_str:
    ui_inner = ui_str[ui_str.find('{')+1:-1]
else:
    print("Could not find ui block")
    sys.exit(1)

# 3. Extract keyboard navigation
kb_str = find_block(r'initKeyboardNavigation\(\)\s*\{')
if kb_str:
    kb_inner = kb_str
else:
    kb_inner = ""

with open('template.js', 'w', encoding='utf-8') as f:
    f.write('/* TT */\n' + train_types + '\n/* UI */\n' + ui_inner + '\n/* KB */\n' + kb_inner)
    print("Extracted successfully!")
