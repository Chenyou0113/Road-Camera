// 🚀 Service Worker - PWA 離線支援 (修復導向崩潰版)
// 作者：Taiwan Transportation Dashboard Team

const CACHE_NAME = 'tra-pids-v1.0.1'; // 更新版號
const RUNTIME_CACHE = 'tra-pids-runtime';

const PRECACHE_URLS = [
    '/tra-pids.html',
    '/assets/config.js',
    '/assets/tdx-api.js',
    '/assets/station-code-mapping.js'
];

self.addEventListener('install', (event) => {
    console.log('[Service Worker] 正在安裝...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] 預緩存資源');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] 正在激活...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('tra-pids-') && name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // ⚠️ 不攔截外部請求
    if (url.origin !== location.origin) return;
    
    // 🔥 救命邏輯：如果是 HTML 頁面的「導航請求(navigate)」且「帶有 ? 參數」，
    // 絕對不要攔截！直接讓瀏覽器自己處理，完全避免 Redirect Mode Error！
    if (event.request.mode === 'navigate' && url.search.length > 0) {
        return; 
    }
    
    // 🔥 API 請求：Network First
    if (url.pathname.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, responseClone));
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then(cached => {
                        if (cached) return cached;
                        return new Response(
                            JSON.stringify({ error: '網路連線不穩定', offline: true, data: [] }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        );
                    });
                })
        );
        return;
    }
    
    // 🔥 靜態資源：Stale-While-Revalidate (去除了有毒的 redirect: 'follow' 邏輯)
    const isHtmlPage = url.pathname.endsWith('.html') || (!url.pathname.includes('.') && !url.pathname.startsWith('/api/'));

    if (url.pathname.includes('/assets/') || isHtmlPage || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
        event.respondWith(
            caches.match(event.request, { ignoreSearch: isHtmlPage }).then(cached => {
                // 發起背景更新
                const fetchPromise = fetch(event.request).then(response => {
                    // 只儲存完全成功且不是重新導向的 Response
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                    }
                    return response;
                }).catch(() => {
                    // 網路失敗時如果連緩存都沒有，返回備用離線頁面
                    if (!cached && isHtmlPage) {
                        return new Response(
                            '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>離線</title></head><body style="text-align:center;padding:20px;color:white;background:black;"><h1>網路連線中斷</h1><p>無法載入頁面，請檢查網路連線。</p></body></html>',
                            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                        );
                    }
                });

                // 優先返回緩存，若無則等待網路請求
                return cached || fetchPromise;
            })
        );
        return;
    }
});

// 💬 消息處理：支持緩存清除指令
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(name => caches.delete(name))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }
});

// 🔔 推送通知（未來擴展）
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const options = {
        body: data.body || '台鐵即時資訊更新',
        icon: '/assets/icon-192.png',
        badge: '/assets/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/tra-pids.html'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || '台鐵PIDS', options)
    );
});

// 🖱️ 通知點擊處理
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

console.log('[Service Worker] 已載入 - 台鐵PIDS v1.0.0');
