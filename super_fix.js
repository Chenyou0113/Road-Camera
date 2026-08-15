const fs = require('fs');

// We will just do a fresh start from backup.
const originalJS = fs.readFileSync('bus-liveboard-js-backup.txt', 'utf8');
let currentHtml = fs.readFileSync('bus-liveboard.html', 'utf8');

const scriptStartIdx = currentHtml.indexOf('<script>');
// Only grab up to BEFORE the <script> tag, because originalJS already has it!
let newHtml = currentHtml.substring(0, scriptStartIdx);

newHtml += '\n' + originalJS + '\n';
newHtml += '<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBvpcEA4hfvIg9ddt0UadRLibxwsORPVe4&libraries=geometry,marker&language=zh-TW&callback=initMap" async defer></script>\n';
newHtml += `<div id="modal-overlay" class="modal-overlay" onclick="closeModal()">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <div class="modal-title" id="modal-title"></div>
            <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" id="modal-body"></div>
    </div>
</div>
</body></html>`;

// 1. Fix map dark style
const mapInitRegex = /window\.initMap = function\(\) \{[\s\S]*?mapId: "DEMO_MAP_ID",\s*disableDefaultUI: true\s*\}/;
const mapDarkStyle = `window.initMap = function() {
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 25.0478, lng: 121.5170 },
            zoom: 13,
            mapId: "DEMO_MAP_ID",
            disableDefaultUI: true,
            styles: [
                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
                { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
                { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
                { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
                { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
                { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
                { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
                { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
                { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
                { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
            ]
        }`;
newHtml = newHtml.replace(mapInitRegex, mapDarkStyle);

// 2. Fix tags in renderStops
// Be super specific so it doesn't match InfoWindow logic!
const oldRenderContext = `const isElectric = vReg.isElectric || plate.endsWith('FV') || /^E[A-Z]{2}-/.test(plate); 
                const isLowFloor = vReg.isLowFloor || false;
                const hasWifi = vReg.hasWifi || false;
                const hasLift = vReg.hasLift || false;
                const lastSeen =`;

const newRenderContext = `const isElectric = vReg.isElectric || plate.endsWith('FV') || /^E[A-Z]{2}-/.test(plate); 
                const isLowFloor = vReg.isLowFloor || false;
                const hasWifi = vReg.hasWifi || false;
                const hasLift = vReg.hasLift || false;
                
                const classMap = {1:'大巴', 2:'中巴', 3:'小巴', 4:'雙層', 5:'雙節'};
                const vClassStr = vReg.vehicleClass ? classMap[vReg.vehicleClass] : '';
                const vTypeStr = vReg.vehicleType === 2 ? '復康' : '';
                const tags = [vClassStr, vTypeStr].filter(Boolean).join(' ');
                const tagHtml = tags ? \`<span style="color:var(--accent); font-weight:bold; margin-left:8px;">\${tags}</span>\` : '';
                
                const lastSeen =`;

newHtml = newHtml.replace(oldRenderContext, newRenderContext);
newHtml = newHtml.replace(/<span class="bus-operator">\$\{operator\}<\/span>/, '<span class="bus-operator">${operator}${tagHtml}</span>');


// 3. Fix tags in InfoWindow
const oldInfoContext = `const isElectric = vReg.isElectric || plate.endsWith('FV') || /^E[A-Z]{2}-/.test(plate); 

                    const infoWindow = new google.maps.InfoWindow();`;

const newInfoContext = `const isElectric = vReg.isElectric || plate.endsWith('FV') || /^E[A-Z]{2}-/.test(plate); 
                    
                    const classMap2 = {1:'大巴', 2:'中巴', 3:'小巴', 4:'雙層', 5:'雙節'};
                    const vClassStr2 = vReg.vehicleClass ? classMap2[vReg.vehicleClass] : '';
                    const vTypeStr2 = vReg.vehicleType === 2 ? '復康' : '';
                    const tags2 = [vClassStr2, vTypeStr2].filter(Boolean).join(' ');

                    const infoWindow = new google.maps.InfoWindow();`;

newHtml = newHtml.replace(oldInfoContext, newInfoContext);
// Info window output formatting
const oldInfoHtml = `<div style="margin-top:6px; color:#10b981; font-weight:bold;">
                                    \${isElectric ? '<i class="fas fa-bolt"></i> 電動公車' : ''}`;
const newInfoHtml = `<div style="margin-top:6px; color:#10b981; font-weight:bold;">
                                    \${tags2 ? \`<span style="color:#f59e0b; margin-right:6px;">\${tags2}</span> \` : ""}
                                    \${isElectric ? '<i class="fas fa-bolt"></i> 電動公車' : ''}`;
newHtml = newHtml.replace(oldInfoHtml, newInfoHtml);

// 4. Missing modal fix
newHtml = newHtml.replace('// --- Variables ---', '// --- Variables ---\n    window.openCityNewsModal = function() { alert("公告功能開發中"); };');

// 5. pill-badge
newHtml = newHtml.replace(/<span class="badge-time /g, '<span class="pill-badge ');

fs.writeFileSync('bus-liveboard.html', newHtml);

// Strip the HTML script tags from originalJS for VM validation
let pureJs = originalJS.replace(/<script>|<\/script>/g, '');
const vm = require('vm');
try {
    new vm.Script(pureJs);
    console.log("Syntax is perfectly valid! Rebuild success.");
} catch (e) {
    console.error("Syntax Error found during validation:", e);
}
