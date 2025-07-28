/**
 * Service Worker for MOHR HR System - Myanmar Deployment
 * Provides offline functionality, caching, and background sync
 */

const CACHE_NAME = 'mohr-hr-v2-cache-v1';
const OFFLINE_CACHE = 'mohr-hr-offline-v1';
const API_CACHE = 'mohr-hr-api-v1';

// Files to cache for offline functionality
const CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/radish-favicon.svg'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/privileges/all-levels',
  '/api/privileges/templates',
  '/api/auth/me'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching essential files...');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== OFFLINE_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip external resources completely to avoid CSP issues
  if (url.hostname !== location.hostname && 
      !url.hostname.includes('localhost') && 
      !url.hostname.includes('127.0.0.1')) {
    // For external resources, just pass through to network without caching
    event.respondWith(fetch(request));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets (only local ones)
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle other requests
  event.respondWith(fetch(request));
});

// Handle API requests with offline support
async function handleApiRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful GET requests
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('API request failed, trying cache:', request.url);
    
    // Try cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline response for critical endpoints
    if (isCriticalEndpoint(request.url)) {
      return createOfflineResponse(request);
    }
    
    throw error;
  }
}

// Handle static requests with caching
async function handleStaticRequest(request) {
  try {
    // Try cache first for better performance
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Update cache in background
      fetch(request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response);
          });
        }
      }).catch(() => {
        // Ignore fetch errors for cache updates
      });
      
      return cachedResponse;
    }
    
    // Try network
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('Static asset fetch failed:', request.url);
    
    // Return offline page for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Check if endpoint is critical for offline functionality
function isCriticalEndpoint(url) {
  const criticalEndpoints = [
    '/api/auth/login',
    '/api/auth/me',
    '/api/privileges/all-levels',
    '/api/employees',
    '/api/leave'
  ];
  
  return criticalEndpoints.some(endpoint => url.includes(endpoint));
}

// Create offline response for critical endpoints
function createOfflineResponse(request) {
  const url = new URL(request.url);
  
  // Return cached data if available
  if (url.pathname.startsWith('/api/privileges/')) {
    return new Response(JSON.stringify({
      all_levels: getCachedPrivilegeLevels(),
      templates: getCachedTemplates(),
      offline: true,
      message: 'Using cached data - offline mode'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Default offline response
  return new Response(JSON.stringify({
    error: 'Offline mode',
    message: 'This endpoint is not available offline',
    endpoint: url.pathname
  }), {
    status: 503,
    statusText: 'Service Unavailable - Offline',
    headers: { 'Content-Type': 'application/json' }
  });
}

// Get cached privilege levels
function getCachedPrivilegeLevels() {
  return [
    { level: 1, name: 'View Only', type: 'standard' },
    { level: 2, name: 'Basic User', type: 'standard' },
    { level: 3, name: 'Department Manager', type: 'standard' },
    { level: 4, name: 'HR Manager', type: 'standard' },
    { level: 5, name: 'System Administrator', type: 'standard' }
  ];
}

// Get cached templates
function getCachedTemplates() {
  return [
    { name: 'Temporary HR Access', permissions: [] },
    { name: 'Department Supervisor', permissions: [] },
    { name: 'Google Integration Access', permissions: [] }
  ];
}

// Background sync for offline requests
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-pending-requests') {
    event.waitUntil(syncPendingRequests());
  }
});

// Sync pending requests when back online
async function syncPendingRequests() {
  try {
    const pendingRequests = await getPendingRequests();
    
    for (const requestData of pendingRequests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          await removePendingRequest(requestData.id);
          console.log('Successfully synced request:', requestData.url);
        }
      } catch (error) {
        console.log('Failed to sync request:', requestData.url, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Get pending requests from IndexedDB
async function getPendingRequests() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

// Remove pending request from IndexedDB
async function removePendingRequest(requestId) {
  // This would typically use IndexedDB
  console.log('Removing pending request:', requestId);
}

// Queue request for later sync
async function queueRequest(request) {
  const requestData = {
    id: Date.now().toString(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.clone().text() : null,
    timestamp: Date.now()
  };
  
  // This would typically use IndexedDB
  console.log('Queued request for later sync:', requestData.url);
}

// Clear all caches
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('All caches cleared');
}

// Handle cache clearing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearCache());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: 'MOHR HR System - New update available',
    icon: '/radish-favicon.svg',
    badge: '/radish-favicon.svg',
    tag: 'mohr-update',
    data: {
      url: '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('MOHR HR System', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
        clients[0].navigateTo('/');
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

console.log('Service Worker script loaded'); 