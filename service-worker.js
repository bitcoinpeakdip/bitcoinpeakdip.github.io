// Bitcoin PeakDip Service Worker
// Version: 1.4.0

const CACHE_NAME = 'bitcoin-peakdip-v1.7.2';
const DYNAMIC_CACHE = 'bitcoin-peakdip-dynamic-v1.7.2';

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
function cacheFirst(request) {
  return caches.match(request)
    .then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseClone);
            });
          return response;
        });
    });
}

// Helper: Stale while revalidate for assets
function staleWhileRevalidate(request) {
  const cachedResponse = caches.match(request);
  
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      caches.open(DYNAMIC_CACHE)
        .then(cache => {
          cache.put(request, networkResponse.clone());
        });
      return networkResponse;
    })
    .catch(() => {
      console.log('Network request failed, using cache only');
    });
  
  return cachedResponse.then(response => response || fetchPromise);
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
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
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