// Bitcoin PeakDip Service Worker
// Version: 1.4.0

const CACHE_NAME = 'bitcoin-peakdip-v1.8.4';
const DYNAMIC_CACHE = 'bitcoin-peakdip-dynamic-v1.8.4';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/product.html',
  '/signals.html',
  '/manifest.json',
  '/styles/main.css',
  '/styles/about.css',
  '/styles/product.css',
  '/styles/signals.css',
  '/styles/zoom.css',
  '/js/main.js',
  '/js/interactions.js',
  '/js/product.js',
  '/js/signals.js',
  '/learn/article-template.html',
  '/learn/articles.json',
  '/js/article.js',  
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
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
        return self.clients.claim();
      })
  );
});

// Helper: Network first strategy for API/CSV
function networkFirst(request) {
  return fetch(request)
    .then(response => {
      // Cache the response for future
      const responseClone = response.clone();
      caches.open(DYNAMIC_CACHE)
        .then(cache => {
          cache.put(request, responseClone);
        });
      return response;
    })
    .catch(() => {
      // Fallback to cache
      return caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline fallback for HTML
          if (request.headers.get('Accept').includes('text/html')) {
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

// Helper: Cache first strategy for static assets
// Helper: Cache first strategy for static assets
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
                    // Chỉ cache nếu response ok và không phải extension
                    if (response && response.ok && !request.url.startsWith('chrome-extension://')) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, responseClone);
                            });
                    }
                    return response;
                });
        });
}

// Helper: Stale while revalidate for assets
function staleWhileRevalidate(request) {
  // Bỏ qua chrome-extension requests
  if (request.url.startsWith('chrome-extension://')) {
    return fetch(request);
  }
  
  return caches.match(request).then(cachedResponse => {
    const fetchPromise = fetch(request)
      .then(networkResponse => {
        // Kiểm tra response hợp lệ và clone trước khi dùng
        if (networkResponse && networkResponse.ok) {
          // Clone response để cache và trả về
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

// Fetch event - handle requests
self.addEventListener('fetch', event => {
	const url = new URL(event.request.url);
	// Cache markdown articles với stale-while-revalidate
	if (url.pathname.includes('/learn/articles/') && url.pathname.endsWith('.md')) {
		event.respondWith(staleWhileRevalidate(event.request));
		return;
	}

	// Cache articles.json với network-first để luôn có metadata mới nhất
	if (url.pathname.includes('/learn/articles.json')) {
		event.respondWith(networkFirst(event.request));
		return;
	}  
	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// API/CSV requests - network first (to get latest data)
	if (url.pathname.includes('/data/') || url.pathname.includes('.csv')) {
	event.respondWith(networkFirst(event.request));
	return;
	}

	// HTML pages - stale while revalidate (for updates)
	if (url.pathname.endsWith('.html') || url.pathname === '/') {
	event.respondWith(staleWhileRevalidate(event.request));
	return;
	}

	// CSS/JS/Images/Fonts - cache first (for performance)
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

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-csv-data') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(syncCSVData());
  }
});

// Push notification handling
self.addEventListener('push', event => {
  console.log('📨 Push notification received', event);
  
  let data = {
    title: 'Bitcoin PeakDip Alert',
    body: 'New EWS signal detected!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      url: '/signals.html'
    }
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
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })
  );
});

// Notification click handler

// Thêm message handler để nhận message từ client
self.addEventListener('message', event => {
    if (event.data.type === 'SAVE_FOR_LATER') {
        // Xử lý khi nhận được message từ client
        console.log('📨 Received message from client:', event.data);
        
        // Có thể broadcast đến các clients khác nếu cần
        event.waitUntil(
            clients.matchAll().then(allClients => {
                allClients.forEach(client => {
                    if (client.id !== event.source.id) {
                        client.postMessage({
                            type: 'READING_LIST_UPDATED'
                        });
                    }
                });
            })
        );
    }
});

// Sync function for CSV data
async function syncCSVData() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const keys = await cache.keys();
    
    // Find any offline CSV uploads
    for (const request of keys) {
      if (request.url.includes('offline-upload')) {
        // Process offline upload
        const response = await cache.match(request);
        const data = await response.text();
        
        // Send to server (implement based on your API)
        console.log('Syncing offline data:', data);
        
        // Remove after sync
        await cache.delete(request);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Xử lý notification click khi app đang đóng
self.addEventListener('notificationclick', function(event) {
    console.log('🔔 Notification clicked:', event.action, event.notification.data);
    
    event.notification.close();
    
    // Xử lý action buttons
    if (event.action === 'later') {
        // Lưu vào reading list
        const articleData = {
            articleId: event.notification.data.articleId,
            title: event.notification.data.title,
            slug: event.notification.data.slug,
            date: event.notification.data.date,
            url: event.notification.data.url
        };
        
        console.log('💾 Saving for later:', articleData);
        
        event.waitUntil(
            (async () => {
                const clients = await self.clients.matchAll({ type: 'window' });
                
                if (clients.length > 0) {
                    // Gửi message đến client đang mở
                    clients[0].postMessage({
                        type: 'SAVE_FOR_LATER',
                        article: articleData
                    });
                    
                    return clients[0].focus();
                } else {
                    // Không có client nào mở, lưu tạm vào cache
                    const cache = await caches.open('reading-list-queue');
                    await cache.put(
                        'pending-save',
                        new Response(JSON.stringify(articleData))
                    );
                    
                    // Mở trang reading list ĐÚNG ĐƯỜNG DẪN
                    return clients.openWindow('/reading-list.html?pending=true');
                }
            })()
        );
        return;
    }
    
    // Mở URL (mặc định) - xử lý các action khác (read, view, etc.)
    let urlToOpen = event.notification.data?.url || '/';
    
    // Sửa đường dẫn nếu bị sai
    if (urlToOpen.includes('/learn/reading-list.html')) {
        urlToOpen = '/reading-list.html';
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(windowClients) {
                // Kiểm tra xem đã có window nào mở chưa
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Mở tab mới
                return clients.openWindow(urlToOpen);
            })
    );
});
// <--- HẾT FILE