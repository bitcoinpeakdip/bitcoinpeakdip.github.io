// sw.js - Đặt tại bitcoinpeakdip.github.io/sw.js
const CACHE_NAME = 'peakdip-ews-v1.5';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/signals.html',
  '/about.html',
  '/product.html',
  '/styles/main.css',
  '/styles/signals.css',
  '/js/main.js',
  '/js/signals.js',
  '/data/signals.csv',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch với cache strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Special handling cho CSV file để check updates
  if (url.pathname.endsWith('/data/signals.csv') || url.pathname.endsWith('/signals.csv')) {
      // Chuyển hướng /signals.csv sang /data/signals.csv
      if (url.pathname.endsWith('/signals.csv')) {
          const newRequest = new Request('/data/signals.csv', event.request);
          event.respondWith(
              networkFirstWithUpdateCheck(newRequest)
          );
      } else {
          event.respondWith(
              networkFirstWithUpdateCheck(event.request)
          );
      }
  }
  // API calls và external resources - network first
  else if (url.hostname.includes('cdn.jsdelivr.net') || 
           url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      networkFirst(event.request)
    );
  }
  // Local resources - cache first
  else {
    event.respondWith(
      cacheFirst(event.request)
    );
  }
});

// Network First với update check cho CSV
async function networkFirstWithUpdateCheck(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request, { cache: 'no-store' });
    
    if (networkResponse.ok) {
      // Clone response để cache và sử dụng
      const responseToCache = networkResponse.clone();
      
      // Get cached version để so sánh
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        const networkText = await networkResponse.text();
        const cachedText = await cachedResponse.text();
        
        // So sánh nội dung
        if (networkText !== cachedText) {
          console.log('[Service Worker] CSV content changed!');
          
          // Cập nhật cache
          await cache.put(request, responseToCache);
          
          // Gửi notification tới clients
          notifyClientsAboutUpdate();
        }
      } else {
        // Chưa có trong cache, thêm mới
        await cache.put(request, responseToCache);
      }
      
      return networkResponse;
    }
    
    throw new Error('Network response was not ok');
  } catch (error) {
    console.log('[Service Worker] Network failed, using cache:', error);
    
    // Fallback to cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Network First strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache First strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache response cho lần sau
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    // Nếu là page request và không có cache, show offline page
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Gửi notification tới tất cả clients
function notifyClientsAboutUpdate() {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'CSV_UPDATED',
        message: 'CSV data has been updated!',
        timestamp: new Date().toISOString(),
        action: 'refresh'
      });
    });
  });
}

// Nhận message từ client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    checkForCSVUpdate();
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodically check for updates
async function checkForCSVUpdate() {
  const cache = await caches.open(CACHE_NAME);
  const request = new Request('/data/signals.csv');
  const cachedResponse = await cache.match(request);
  
  if (!cachedResponse) return;
  
  try {
    const networkResponse = await fetch(request, { cache: 'no-store' });
    if (!networkResponse.ok) return;
    
    const networkText = await networkResponse.text();
    const cachedText = await cachedResponse.text();
    
    if (networkText !== cachedText) {
      console.log('[Service Worker] CSV update detected via periodic check');
      notifyClientsAboutUpdate();
      
      // Update cache
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    console.log('[Service Worker] Periodic check failed:', error);
  }
}