const fs = require('fs');

let html = fs.readFileSync('bus-liveboard.html', 'utf8');

// 1. Remove all local declarations of const classMap / classMap2
html = html.replace(/const classMap = \{[\s\S]*?\};\s*/g, '');
html = html.replace(/const classMap2 = \{[\s\S]*?\};\s*/g, '');

// 2. Insert global VEHICLE_CLASS_MAP near top of script
const globalConstant = `\n    const VEHICLE_CLASS_MAP = {1:'大巴', 2:'中巴', 3:'小巴', 4:'雙層', 5:'雙節'};\n`;
html = html.replace('// --- Variables ---', '// --- Variables ---' + globalConstant);

// 3. Replace usages of classMap and classMap2 with VEHICLE_CLASS_MAP
html = html.replace(/classMap\[/g, 'VEHICLE_CLASS_MAP[');
html = html.replace(/classMap2\[/g, 'VEHICLE_CLASS_MAP[');

fs.writeFileSync('bus-liveboard.html', html, 'utf8');

// Validate syntax
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
    const vm = require('vm');
    try {
        new vm.Script(scriptMatch[1]);
        console.log("REFAC SUCCESS: Script syntax is 100% valid!");
    } catch (e) {
        console.error("Syntax Error during validation:", e);
    }
}
