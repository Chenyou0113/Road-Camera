// 🚀 Service Worker - 穩定版 (修復 503 崩潰)
const CACHE_NAME = 'tra-pids-v1.0.2';
const PRECACHE = ['/tra-pids.html', '/assets/config.js', '/assets/tdx-api.js'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// 🔥 核心修復：徹底放行導航請求
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // 只要是 tra-pids 頁面且帶有參數，直接走網路，絕對不攔截！
    if (event.request.mode === 'navigate' && url.search.length > 0) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(networkRes => {
                if (networkRes.status === 200 && event.request.method === 'GET') {
                    const clone = networkRes.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return networkRes;
            });
        }).catch(() => Response.error())
    );
});
