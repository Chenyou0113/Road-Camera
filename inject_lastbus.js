const fs = require('fs');
let html = fs.readFileSync('bus-liveboard.html', 'utf8');

const injectionLogic = `
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
            }
`;

// Insert the logic after setting timeEl content
html = html.replace(/(} else if \(est\.sec != null\) {[\s\S]*?timeEl\.classList\.add\('normal'\);\s*}\s*})/, '$1\n' + injectionLogic);

fs.writeFileSync('bus-liveboard.html', html);
console.log('Injected IsLastBus logic!');
