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
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
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

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
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
    console.log('Network failed, trying cache:', request.url);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical endpoints
    if (isCriticalEndpoint(request.url)) {
      return createOfflineResponse(request);
    }
    
    // For non-critical endpoints, return error
    return new Response(JSON.stringify({
      error: 'Offline mode',
      message: 'This request requires an internet connection',
      endpoint: request.url
    }), {
      status: 503,
      statusText: 'Service Unavailable - Offline',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static asset requests
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
  // This would typically come from IndexedDB or localStorage
  // For now, return a basic structure
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

// Sync pending requests when connection is restored
async function syncPendingRequests() {
  try {
    // Get pending requests from IndexedDB or localStorage
    const pendingRequests = await getPendingRequests();
    
    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.url, request.options);
        if (response.ok) {
          await removePendingRequest(request.id);
          console.log('Synced request successfully:', request.id);
        }
      } catch (error) {
        console.error('Failed to sync request:', request.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Get pending requests from storage
async function getPendingRequests() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

// Remove pending request from storage
async function removePendingRequest(requestId) {
  // This would typically use IndexedDB
  console.log('Removing pending request:', requestId);
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'QUEUE_REQUEST':
      queueRequest(data.request);
      break;
    case 'SYNC_REQUEST':
      syncPendingRequests();
      break;
    case 'CLEAR_CACHE':
      clearCache();
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Queue request for later sync
async function queueRequest(request) {
  try {
    // Store request in IndexedDB for later sync
    console.log('Queuing request for later sync:', request.id);
    
    // Notify main thread
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'REQUEST_QUEUED',
          requestId: request.id
        });
      });
    });
  } catch (error) {
    console.error('Failed to queue request:', error);
  }
}

// Clear all caches
async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: 'MOHR HR System - New update available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
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