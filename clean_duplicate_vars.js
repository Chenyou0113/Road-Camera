const fs = require('fs');

let html = fs.readFileSync('bus-liveboard.html', 'utf8');

// Replace duplicate lines 1428-1431
const badDuplicate = `const vClassStr = vReg.vehicleClass ? VEHICLE_CLASS_MAP[vReg.vehicleClass] : '';
                const vTypeStr = vReg.vehicleType === 2 ? '復康' : '';
                const tags = [vClassStr, vTypeStr].filter(Boolean).join(' ');
                const tagHtml = tags ? \`<span style="color:var(--accent); font-weight:bold; margin-left:8px;">\${tags}</span>\` : '';`;

// We replace the SECOND occurrence of badDuplicate (or remove all and keep one)
const parts = html.split(badDuplicate);
if (parts.length > 2) {
    html = parts[0] + badDuplicate + parts.slice(1).join('');
}

fs.writeFileSync('bus-liveboard.html', html, 'utf8');

// Validate syntax using Node vm
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
    const vm = require('vm');
    try {
        new vm.Script(scriptMatch[1]);
        console.log("FINAL VALIDATION SUCCESS: Script syntax is 100% valid with NO errors!");
    } catch (e) {
        console.error("Syntax Error during validation:", e);
    }
}
