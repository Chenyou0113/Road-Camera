// 🚀 Service Worker - 終極相容修復版 (v1.0.4)
const CACHE_NAME = 'tra-pids-v1.0.4';

// 預快取靜態資源
const PRECACHE = [
    '/assets/config.js',
    '/assets/tdx-api.js',
    '/assets/station-code-mapping.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 🚀 API 豁免條款：跨網域後端 API 與站內 API 一律放行，不交給 Service Worker 攔截
    if (url.hostname === 'tra-schedule-worker.weacamm.org' || url.pathname.startsWith('/api/')) {
        return;
    }

    // 🔥 修正 1: 忽略所有非 http/https 請求 (解決 chrome-extension 報錯)
    if (!url.protocol.startsWith('http')) {
        return; 
    }

    // 🔥 修正 2: 帶參數的動態頁面或導航請求，完全放行不處理 (解決 503/ERR_FAILED)
    if (event.request.mode === 'navigate' || url.search.length > 0) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) return response;

            return fetch(event.request).then(networkRes => {
                // 只快取成功的 GET 請求
                if (networkRes && networkRes.status === 200 && event.request.method === 'GET') {
                    const clone = networkRes.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        // 雙重檢查協議，防止寫入快取時報錯
                        if (new URL(event.request.url).protocol.startsWith('http')) {
                            cache.put(event.request, clone);
                        }
                    });
                }
                return networkRes;
            }).catch(() => {
                // 如果連網路都斷了且沒快取，就讓瀏覽器顯示預設離線畫面
                return null;
            });
        })
    );
});
