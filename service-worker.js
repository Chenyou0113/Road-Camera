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
    
    // 判斷是否為 HTML 頁面 (包含省略 .html 的乾淨 URL)
    const isHtmlPage = url.pathname.endsWith('.html') || 
                       event.request.mode === 'navigate' || 
                       (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) ||
                       (!url.pathname.includes('.') && !url.pathname.startsWith('/api/'));

    // 🔥 靜態資源：Cache First（優先緩存，加速載入）
    if (url.pathname.includes('/assets/') || isHtmlPage || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
        event.respondWith(
            caches.match(event.request, { ignoreSearch: isHtmlPage }).then(cached => {
                if (cached) {
                    // ✅ 🔴 真正的問題修復：快取內儲存了重新導向回應
                    // 禁止將重新導向回應直接回傳給瀏覽器
                    if (cached.type === 'opaqueredirect' || cached.redirected) {
                        // 刪除無效的快取項目，強制重新取得
                        caches.open(CACHE_NAME).then(cache => cache.delete(event.request));
                        return fetch(event.request, { redirect: 'follow' });
                    }
                    
                    // 背景更新策略（Stale-While-Revalidate）
                    fetch(event.request, { redirect: 'follow' }).then(response => {
                        if (response && response.status === 200 && response.type !== 'opaqueredirect' && !response.redirected) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, response);
                            });
                        }
                    }).catch(() => {});
                    return cached;
                }
                
                // 處理 Cloudflare Pages 乾淨 URL (如果找不到 /tra-pids，試著找 /tra-pids.html)
                let altReqMatch = event.request;
                if (isHtmlPage && !url.pathname.endsWith('.html') && url.pathname !== '/') {
                    const altUrl = new URL(url.href);
                    altUrl.pathname += '.html';
                    altReqMatch = altUrl.href;
                }

                return caches.match(altReqMatch, { ignoreSearch: isHtmlPage }).then(altCached => {
                    if (altCached) {
                        return altCached;
                    }
                    
                    // 無緩存：從網路獲取並緩存
                    return fetch(event.request, { redirect: 'follow' }).then(response => {
                        // ✅ 修復 Chrome 重新導向安全錯誤
                        if (!response || response.status < 200 || response.status >= 400) {
                            return response;
                        }
                        
                        // ✅ 過濾不透明重新導向回應
                        if (response.type === 'opaqueredirect') {
                            return fetch(response.url, { redirect: 'follow' });
                        }
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                        return response;
                    }).catch(error => {
                        console.warn('[Service Worker] 無法獲取資源:', event.request.url, error);
                        if (isHtmlPage) {
                            return new Response(
                                '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>離線</title></head><body style="font-family:sans-serif;text-align:center;padding:20px;"><h1>資源無法載入</h1><p>請檢查網路連線或檔案是否存在。</p><a href="/">返回首頁</a></body></html>',
                                { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                            );
                        }
                        return Response.error();
                    });
                });
            })
        );
        return;
    }
    
    // 🔥 其他請求：直接從網路獲取
    event.respondWith(
        fetch(event.request)
            .catch(error => {
                console.warn('[Service Worker] 網路請求失敗:', event.request.url, error);
                // 嘗試從緩存中取得
                return caches.match(event.request)
                    .then(cached => {
                        if (cached) {
                            return cached;
                        }
                        // 如果是導航請求（HTML），返回離線頁面
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html').then(fallback => {
                                return fallback || new Response(
                                    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>離線</title></head><body style="font-family:sans-serif;text-align:center;padding:20px;"><h1>網路連線失敗</h1><p>無法連接到伺服器。</p></body></html>',
                                    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                                );
                            });
                        }
                        return Response.error();
                    });
            })
    );
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
