const fs = require('fs');

let html = fs.readFileSync('bus-liveboard.html', 'utf8');

// 1. Safe focusMap in renderStops
const oldFocusMap = `onclick="focusMap(\${s.StopPosition?.PositionLat}, \${s.StopPosition?.PositionLon})"`;
const newFocusMap = `onclick="focusMap(!isNaN(parseFloat(s.StopPosition?.PositionLat)) ? parseFloat(s.StopPosition?.PositionLat) : null, !isNaN(parseFloat(s.StopPosition?.PositionLon)) ? parseFloat(s.StopPosition?.PositionLon) : null)"`;
html = html.replace(oldFocusMap, newFocusMap);

// 2. Safe route name in route-card-btn (line 1049-1051)
// Replace safeName to escape single quotes properly for JS
html = html.replace("const safeName = rName.replace(/'/g, '&#39;');", "const safeName = rName.replace(/'/g, \"\\\\'\").replace(/\"/g, '&quot;');");

// 3. Vehicle class & type tags in renderStops
const renderStopTarget = `const isElectric = vReg.isElectric || plate.endsWith('FV') || /^E[A-Z]{2}-/.test(plate);`;
const renderStopReplacement = `const isElectric = vReg.isElectric || plate.endsWith('FV') || /^E[A-Z]{2}-/.test(plate); 
                const classMap = {1:'大巴', 2:'中巴', 3:'小巴', 4:'雙層', 5:'雙節'};
                const vClassStr = vReg.vehicleClass ? classMap[vReg.vehicleClass] : '';
                const vTypeStr = vReg.vehicleType === 2 ? '復康' : '';
                const tags = [vClassStr, vTypeStr].filter(Boolean).join(' ');
                const tagHtml = tags ? \`<span style="color:var(--accent); font-weight:bold; margin-left:8px;">\${tags}</span>\` : '';`;

html = html.replace(renderStopTarget, renderStopReplacement);
html = html.replace('<span class="bus-operator">${operator}</span>', '<span class="bus-operator">${operator}${tagHtml}</span>');

// 4. Vehicle class & type tags in Map InfoWindow
const infoWindowTarget = `const isElectric = vReg.isElectric || plate.endsWith('FV') || /^E[A-Z]{2}-/.test(plate); \n\n                    const infoWindow = new google.maps.InfoWindow();`;
const infoWindowTargetCR = `const isElectric = vReg.isElectric || plate.endsWith('FV') || /^E[A-Z]{2}-/.test(plate); \r\n\r\n                    const infoWindow = new google.maps.InfoWindow();`;

const infoWindowReplacement = `const isElectric = vReg.isElectric || plate.endsWith('FV') || /^E[A-Z]{2}-/.test(plate); 
                    const classMap2 = {1:'大巴', 2:'中巴', 3:'小巴', 4:'雙層', 5:'雙節'};
                    const vClassStr2 = vReg.vehicleClass ? classMap2[vReg.vehicleClass] : '';
                    const vTypeStr2 = vReg.vehicleType === 2 ? '復康' : '';
                    const tags2 = [vClassStr2, vTypeStr2].filter(Boolean).join(' ');

                    const infoWindow = new google.maps.InfoWindow();`;

if (html.includes(infoWindowTargetCR)) {
    html = html.replace(infoWindowTargetCR, infoWindowReplacement);
} else {
    html = html.replace(infoWindowTarget, infoWindowReplacement);
}

const infoHtmlTarget = `<div style="margin-top:6px; color:#10b981; font-weight:bold;">\n                                    \${isElectric ? '<i class="fas fa-bolt"></i> 電動公車' : ''}`;
const infoHtmlTargetCR = `<div style="margin-top:6px; color:#10b981; font-weight:bold;">\r\n                                    \${isElectric ? '<i class="fas fa-bolt"></i> 電動公車' : ''}`;

const infoHtmlReplacement = `<div style="margin-top:6px; color:#10b981; font-weight:bold;">
                                    \${tags2 ? \`<span style="color:#f59e0b; margin-right:6px;">\${tags2}</span> \` : ""}
                                    \${isElectric ? '<i class="fas fa-bolt"></i> 電動公車' : ''}`;

if (html.includes(infoHtmlTargetCR)) {
    html = html.replace(infoHtmlTargetCR, infoHtmlReplacement);
} else {
    html = html.replace(infoHtmlTarget, infoHtmlReplacement);
}

// 5. IsLastBus UI badge injection in updateEstimates
const lastBusInjectTarget = `            } else if (est.sec != null) {
                isActive = true; 
                const min = Math.floor(est.sec / 60);
                if (min < 1) {
                    timeEl.innerText = '即將進站';
                    timeEl.classList.add('coming');
                    rowEl.classList.add('coming');
                } else if (min <= 3) {
                    timeEl.innerText = \`\${min}分\`;
                    timeEl.classList.add('soon');
                } else {
                    timeEl.innerText = \`\${min}分\`;
                    timeEl.classList.add('normal');
                }
            }`;

const lastBusInjectTargetCR = lastBusInjectTarget.replace(/\n/g, '\r\n');

const lastBusCode = `

            const parentNode = timeEl.parentNode;
            let lastBusEl = parentNode.querySelector('.last-bus-badge');
            if (est && est.isLastBus) {
                if (!lastBusEl) {
                    lastBusEl = document.createElement('span');
                    lastBusEl.className = 'pill-badge last-bus-badge';
                    lastBusEl.style.backgroundColor = 'var(--danger)';
                    lastBusEl.style.color = '#fff';
                    lastBusEl.style.marginLeft = '4px';
                    lastBusEl.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
                    lastBusEl.innerText = '末班車';
                    parentNode.appendChild(lastBusEl);
                }
            } else {
                if (lastBusEl) {
                    lastBusEl.remove();
                }
            }`;

if (html.includes(lastBusInjectTargetCR)) {
    html = html.replace(lastBusInjectTargetCR, lastBusInjectTargetCR + lastBusCode);
} else {
    html = html.replace(lastBusInjectTarget, lastBusInjectTarget + lastBusCode);
}

fs.writeFileSync('bus-liveboard.html', html, 'utf8');

// Validate syntax
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
    const vm = require('vm');
    try {
        new vm.Script(scriptMatch[1]);
        console.log("SUCCESS: Script syntax is 100% valid!");
    } catch (e) {
        console.error("Syntax Error found:", e);
    }
}
