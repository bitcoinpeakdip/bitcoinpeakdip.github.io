// Bitcoin PeakDip Service Worker
// Version: 2.0.0 - Có thông báo cập nhật phiên bản mới

const CACHE_NAME = 'bitcoin-peakdip-v1.11.14';
const DYNAMIC_CACHE = 'bitcoin-peakdip-dynamic-v1.11.14';

// Local assets - có thể cache
const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/product.html',
  '/signals.html',
  '/learn.html',
  '/reading-list.html',
  '/offline.html',
  '/manifest.json',
  '/version.json',
  '/styles/main.css',
  '/styles/about.css',
  '/styles/product.css',
  '/styles/signals.css',
  '/styles/learn.css',
  '/styles/zoom.css',
  '/js/main.js',
  '/js/interactions.js',
  '/js/product.js',
  '/js/signals.js',
  '/js/learn.js',
  '/js/reading-list.js',
  '/js/notifications.js',
  '/js/article.js',
  '/js/update-notifier.js',
  '/learn/article.html',
  '/learn/articles.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// CDN assets - không cache, chỉ fetch khi cần
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns'
];

// ========== INSTALL EVENT ==========
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...');
  
  // Skip waiting để active ngay lập tức
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Caching local assets...');
        // Cache từng file riêng lẻ để biết file nào lỗi
        return Promise.allSettled(
          LOCAL_ASSETS.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`⚠️ Failed to cache ${url}:`, err.message);
              return Promise.resolve();
            });
          })
        );
      })
      .then(results => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.warn(`⚠️ ${failed.length} local assets failed to cache`);
        } else {
          console.log('✅ All local assets cached successfully');
        }
        return self.skipWaiting();
      })
  );
});

// ========== ACTIVATE EVENT ==========
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // Xóa cache cũ
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
            .map(name => {
              console.log('🗑️ Removing old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated, taking control');
        
        // THÊM: Thông báo cho tất cả clients về version mới
        return clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'NEW_VERSION_AVAILABLE',
              version: getVersionFromCacheName(CACHE_NAME)
            });
          });
        });
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Helper: Lấy version từ cache name
function getVersionFromCacheName(cacheName) {
  const match = cacheName.match(/v([\d\.]+)/);
  return match ? match[1] : '1.8.7';
}

// ========== MESSAGE HANDLER ==========
self.addEventListener('message', event => {
  console.log('📨 Service Worker received message:', event.data);
  
  // Xử lý message từ client
  if (event.data) {
    switch (event.data.type) {
      
      // Kiểm tra version hiện tại
      case 'CHECK_VERSION':
        event.waitUntil(
          clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'VERSION_RESPONSE',
                version: getVersionFromCacheName(CACHE_NAME)
              });
            });
          })
        );
        break;
      
      // Force update
      case 'FORCE_UPDATE':
        console.log('🔄 Force update requested');
        event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(name => caches.delete(name))
            );
          }).then(() => {
            return clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'UPDATE_COMPLETED',
                  message: 'Cache cleared, ready to reload'
                });
              });
            });
          })
        );
        break;
      
      // SHOW_NOTIFICATION từ app
      case 'SHOW_NOTIFICATION':
        const article = event.data.article;
        event.waitUntil(
          self.registration.showNotification('📚 Bài viết mới từ Bitcoin PeakDip', {
            body: article.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            data: {
              url: article.url,
              articleId: article.id,
              slug: article.slug,
              title: article.title,
              date: article.date
            },
            actions: [
              {
                action: 'read',
                title: '📖 Đọc ngay'
              },
              {
                action: 'later',
                title: '⏰ Đọc sau'
              }
            ],
            tag: `article-${article.id}`,
            renotify: true,
            requireInteraction: true
          })
        );
        break;
      
      // Kiểm tra bài viết mới
      case 'CHECK_NEW_ARTICLES':
        console.log('🔍 Checking for new articles...');
        // Có thể fetch articles.json ở đây nếu cần
        break;
      
      default:
        console.log('Unknown message type:', event.data.type);
    }
  }
});

// ========== NOTIFICATION CLICK HANDLER ==========
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event.action);
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'later') {
    // Lưu vào reading list
    event.waitUntil(handleSaveForLater(data));
    return;
  }
  
  if (action === 'read' || action === 'view' || !action) {
    // Mặc định: đọc ngay
    const url = data?.url || '/learn/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          return clients.openWindow(url);
        })
    );
  }
});

// ========== HANDLE SAVE FOR LATER ==========
async function handleSaveForLater(data) {
  console.log('💾 Saving for later:', data);
  
  // Lưu vào cache
  const cache = await caches.open('reading-list-queue');
  await cache.put(
    'pending-save',
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
  
  // Thông báo cho tất cả clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SAVE_FOR_LATER',
      article: {
        id: data.articleId || data.id,
        title: data.title,
        slug: data.slug,
        date: data.date,
        url: data.url
      }
    });
  });
}

// ========== FETCH HANDLER ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') return;
  
  // Skip chrome:// and about://
  if (url.protocol === 'chrome:' || url.protocol === 'about:') return;
  
  // CDN assets - network only, không cache
  if (CDN_ASSETS.includes(event.request.url)) {
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.warn(`⚠️ CDN fetch failed: ${url.pathname}`, error.message);
          // Trả về response rỗng hoặc fallback
          if (url.pathname.includes('font-awesome')) {
            return new Response('', { 
              status: 200,
              headers: { 'Content-Type': 'text/css' }
            });
          }
          if (url.pathname.includes('chart.js')) {
            return new Response('', { 
              status: 200,
              headers: { 'Content-Type': 'application/javascript' }
            });
          }
          return new Response('', { status: 408 });
        })
    );
    return;
  }
  
  // version.json - network first (luôn lấy mới)
  if (url.pathname.includes('version.json')) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Cache markdown articles với stale-while-revalidate
  if (url.pathname.includes('/learn/articles/') && url.pathname.endsWith('.md')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Cache articles.json với network-first
  if (url.pathname.includes('/learn/articles.json')) {
    event.respondWith(networkFirst(event.request));
    return;
  }  
  
  // API/CSV requests - network first
  if (url.pathname.includes('/data/') || url.pathname.includes('.csv')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // HTML pages - stale while revalidate
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // CSS/JS/Images/Fonts - cache first
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|ico|woff2?|ttf)$/)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Default - network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// ========== CACHING STRATEGIES ==========

// Helper: Network first strategy
function networkFirst(request) {
  return fetch(request)
    .then(response => {
      if (response && response.ok) {
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE)
          .then(cache => {
            cache.put(request, responseClone);
          });
      }
      return response;
    })
    .catch(() => {
      return caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline fallback for HTML
          if (request.headers.get('Accept')?.includes('text/html')) {
            return caches.match('/offline.html');
          }
          // Return offline fallback for CSV
          if (request.url.includes('.csv')) {
            return new Response(
              'timestamp,signal_type,price,confidence,distance,validation,strategy\n' +
              new Date().toISOString() + ',OFFLINE,50000,0,0,PENDING,OFFLINE_MODE',
              {
                headers: { 'Content-Type': 'text/csv' }
              }
            );
          }
          return new Response('Offline', { status: 408 });
        });
    });
}

// Helper: Cache first strategy
function cacheFirst(request) {
  // Bỏ qua chrome-extension:// requests
  if (request.url.startsWith('chrome-extension://')) {
    return fetch(request);
  }
  
  return caches.match(request)
    .then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then(response => {
          if (response && response.ok && !request.url.startsWith('chrome-extension://')) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseClone);
              });
          }
          return response;
        });
    });
}

// Helper: Stale while revalidate
function staleWhileRevalidate(request) {
  if (request.url.startsWith('chrome-extension://')) {
    return fetch(request);
  }
  
  return caches.match(request).then(cachedResponse => {
    const fetchPromise = fetch(request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => {
              cache.put(request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(error => {
        console.log('Network request failed:', error);
        return cachedResponse || new Response('Offline', { status: 408 });
      });
    
    return cachedResponse || fetchPromise;
  });
}

// ========== BACKGROUND SYNC ==========
self.addEventListener('sync', event => {
  if (event.tag === 'sync-csv-data') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(syncCSVData());
  }
});

// Sync function for CSV data
async function syncCSVData() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const keys = await cache.keys();
    
    for (const request of keys) {
      if (request.url.includes('offline-upload')) {
        const response = await cache.match(request);
        const data = await response.text();
        console.log('Syncing offline data:', data);
        await cache.delete(request);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// ========== PUSH NOTIFICATION HANDLER ==========
self.addEventListener('push', event => {
  console.log('📨 Push notification received', event);
  
  let data = {
    title: 'Bitcoin PeakDip Alert',
    body: 'New EWS signal detected!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png'
  };
  
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [200, 100, 200],
      data: data.data,
      actions: [
        {
          action: 'view',
          title: 'View Signals'
        }
      ]
    })
  );
});

// ========== PERIODIC SYNC (nếu browser hỗ trợ) ==========
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-check') {
    event.waitUntil(checkForUpdates());
  }
});

async function checkForUpdates() {
  try {
    const response = await fetch('/version.json?t=' + Date.now());
    const data = await response.json();
    const currentVersion = getVersionFromCacheName(CACHE_NAME);
    
    if (data.version !== currentVersion) {
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'NEW_VERSION_AVAILABLE',
          version: data.version
        });
      });
    }
  } catch (error) {
    console.log('Periodic sync check failed:', error);
  }
}

console.log('✅ Service Worker v2.0.0 loaded successfully');