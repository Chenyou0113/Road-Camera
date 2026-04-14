with open("apply.py", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("if (currentMode === 'station' ; currentStationID)", "if (currentMode === 'station' and currentStationID)")
text = text.replace("and currentStationID)", "&& currentStationID)")

text = text.replace("if (seconds === 0 ; minutes % 5 === 0)", "if (seconds === 0 and minutes % 5 === 0)")
text = text.replace("and minutes % 5", "&& minutes % 5")

with open("apply.py", "w", encoding="utf-8") as f:
    f.write(text)
