// 🚀 Service Worker - PWA 離線支援
// 作者：Taiwan Transportation Dashboard Team
// 用途：緩存關鍵資源，在網路不穩定時提供離線體驗

const CACHE_NAME = 'tra-pids-v1.0.0';
const RUNTIME_CACHE = 'tra-pids-runtime';

// 需要緩存的關鍵資源
const PRECACHE_URLS = [
    '/tra-pids.html',
    '/assets/config.js',
    '/assets/tdx-api.js',
    '/assets/station-code-mapping.js',
    '/assets/combined-roads.css',
    '/assets/dark-mode.css'
];

// 📦 安裝階段：預緩存關鍵資源
self.addEventListener('install', (event) => {
    console.log('[Service Worker] 正在安裝...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] 預緩存資源');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting()) // 立即激活
    );
});

// 🔄 激活階段：清除舊版本緩存
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] 正在激活...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('tra-pids-') && name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map(name => {
                        console.log('[Service Worker] 刪除舊緩存:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // 立即接管所有頁面
    );
});

// 🌐 請求攔截：實現離線策略
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // ⚠️ 跳過外部 API 請求（Cloudflare Workers, 第三方服務）
    if (url.origin !== location.origin) {
        return; // 讓瀏覽器直接處理，不攔截
    }
    
    // 🔥 API 請求：Network First（優先網路，失敗則使用緩存）
    if (url.pathname.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // 成功：更新緩存並返回
                    const responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // 失敗：返回緩存（如果有）
                    return caches.match(event.request).then(cached => {
                        if (cached) {
                            console.log('[Service Worker] 使用離線緩存:', event.request.url);
                            return cached;
                        }
                        // 無緩存：返回友好錯誤
                        return new Response(
                            JSON.stringify({
                                error: '網路連線不穩定',
                                message: '正在使用離線模式，資訊可能不是最新',
                                offline: true,
                                data: []
                            }),
                            {
                                status: 503,
                                headers: { 'Content-Type': 'application/json; charset=utf-8' }
                            }
                        );
                    });
                })
        );
        return;
    }
    
    // 🔥 靜態資源：Cache First（優先緩存，加速載入）
    if (url.pathname.includes('/assets/') || url.pathname.endsWith('.html') || url.pathname.endsWith('.css')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) {
                    // 背景更新策略（Stale-While-Revalidate）
                    fetch(event.request).then(response => {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, response);
                        });
                    }).catch(() => {});
                    return cached;
                }
                
                // 無緩存：從網路獲取並緩存
                return fetch(event.request).then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                });
            })
        );
        return;
    }
    
    // 🔥 其他請求：直接從網路獲取
    event.respondWith(fetch(event.request));
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
