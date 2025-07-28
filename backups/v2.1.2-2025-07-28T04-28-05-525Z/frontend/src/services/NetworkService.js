/**
 * Network Service for Myanmar Deployment
 * Handles multiple connection methods, offline functionality, and network resilience
 */

class NetworkService {
  constructor() {
    this.connectionMethods = [
      { name: 'primary', url: import.meta.env.VITE_API_URL || 'http://localhost:5000', priority: 1 },
      { name: 'fallback1', url: import.meta.env.VITE_FALLBACK_URL_1, priority: 2 },
      { name: 'fallback2', url: import.meta.env.VITE_FALLBACK_URL_2, priority: 3 }
    ].filter(method => method.url); // Only include configured methods

    this.currentMethod = this.connectionMethods[0];
    this.offlineData = new Map();
    this.pendingSync = [];
    this.isOnline = navigator.onLine;
    
    this.setupEventListeners();
    this.initializeServiceWorker();
  }

  setupEventListeners() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
      this.notifyStatusChange('online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyStatusChange('offline');
    });

    // Monitor connection quality
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.handleConnectionChange();
      });
    }
  }

  async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  async makeRequest(endpoint, options = {}) {
    const requestId = this.generateRequestId();
    const request = {
      id: requestId,
      endpoint,
      options,
      timestamp: Date.now(),
      retries: 0
    };

    // If offline, queue the request
    if (!this.isOnline) {
      this.queueOfflineRequest(request);
      return this.createOfflineResponse(request);
    }

    // Try each connection method
    for (const method of this.connectionMethods) {
      try {
        const response = await this.tryConnection(method, endpoint, options);
        if (response) {
          this.currentMethod = method;
          return response;
        }
      } catch (error) {
        console.warn(`Connection method ${method.name} failed:`, error);
        continue;
      }
    }

    // All methods failed, queue for later
    this.queueOfflineRequest(request);
    return this.createOfflineResponse(request);
  }

  async tryConnection(method, endpoint, options) {
    const url = `${method.url}${endpoint}`;
    const timeout = this.getTimeoutForMethod(method);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Connection-Method': method.name,
          'X-Request-ID': this.generateRequestId(),
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      } else if (response.status >= 500) {
        // Server error, try next method
        throw new Error(`Server error: ${response.status}`);
      } else {
        // Client error, don't retry
        return response;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  getTimeoutForMethod(method) {
    // Shorter timeouts for fallback methods
    switch (method.priority) {
      case 1: return 10000; // 10 seconds for primary
      case 2: return 5000;  // 5 seconds for fallback1
      case 3: return 3000;  // 3 seconds for fallback2
      default: return 5000;
    }
  }

  queueOfflineRequest(request) {
    this.pendingSync.push(request);
    this.saveToLocalStorage('pendingSync', this.pendingSync);
    
    // Notify service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'QUEUE_REQUEST',
        request
      });
    }
  }

  createOfflineResponse(request) {
    // Return a mock response that indicates offline status
    return {
      ok: false,
      status: 503,
      statusText: 'Service Unavailable - Offline',
      json: async () => ({
        error: 'Offline mode',
        message: 'Request queued for sync when connection is restored',
        requestId: request.id,
        timestamp: request.timestamp
      }),
      offline: true,
      requestId: request.id
    };
  }

  async syncPendingData() {
    if (this.pendingSync.length === 0) return;

    console.log(`Syncing ${this.pendingSync.length} pending requests...`);
    
    const successful = [];
    const failed = [];

    for (const request of this.pendingSync) {
      try {
        const response = await this.makeRequest(request.endpoint, request.options);
        if (response.ok && !response.offline) {
          successful.push(request.id);
        } else {
          failed.push(request);
        }
      } catch (error) {
        failed.push(request);
      }
    }

    // Remove successful requests from pending
    this.pendingSync = this.pendingSync.filter(req => !successful.includes(req.id));
    this.saveToLocalStorage('pendingSync', this.pendingSync);

    // Notify about sync results
    this.notifySyncComplete(successful.length, failed.length);
  }

  // Offline data storage
  storeOfflineData(key, data) {
    this.offlineData.set(key, {
      data,
      timestamp: Date.now(),
      version: this.getDataVersion(key)
    });
    this.saveToLocalStorage('offlineData', Object.fromEntries(this.offlineData));
  }

  getOfflineData(key) {
    const item = this.offlineData.get(key);
    if (item && this.isDataFresh(item.timestamp)) {
      return item.data;
    }
    return null;
  }

  isDataFresh(timestamp, maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    return Date.now() - timestamp < maxAge;
  }

  getDataVersion(key) {
    return localStorage.getItem(`dataVersion_${key}`) || '1.0';
  }

  // Connection quality monitoring
  handleConnectionChange() {
    const connection = navigator.connection;
    if (connection) {
      const quality = this.assessConnectionQuality(connection);
      this.notifyConnectionQuality(quality);
    }
  }

  assessConnectionQuality(connection) {
    const { effectiveType, downlink, rtt } = connection;
    
    if (effectiveType === '4g' && downlink > 10 && rtt < 50) {
      return 'excellent';
    } else if (effectiveType === '4g' && downlink > 5 && rtt < 100) {
      return 'good';
    } else if (effectiveType === '3g' || downlink > 1) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  // Utility methods
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  loadFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  }

  // Event notifications
  notifyStatusChange(status) {
    window.dispatchEvent(new CustomEvent('networkStatusChange', {
      detail: { status, timestamp: Date.now() }
    }));
  }

  notifyConnectionQuality(quality) {
    window.dispatchEvent(new CustomEvent('connectionQualityChange', {
      detail: { quality, timestamp: Date.now() }
    }));
  }

  notifySyncComplete(successful, failed) {
    window.dispatchEvent(new CustomEvent('syncComplete', {
      detail: { successful, failed, timestamp: Date.now() }
    }));
  }

  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'SYNC_REQUEST':
        this.syncPendingData();
        break;
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data.cache);
        break;
      default:
        console.log('Unknown service worker message:', data);
    }
  }

  // Public API
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      currentMethod: this.currentMethod,
      pendingSync: this.pendingSync.length,
      connectionMethods: this.connectionMethods
    };
  }

  async forceSync() {
    await this.syncPendingData();
  }

  clearOfflineData() {
    this.offlineData.clear();
    this.pendingSync = [];
    localStorage.removeItem('offlineData');
    localStorage.removeItem('pendingSync');
  }
}

// Create singleton instance
const networkService = new NetworkService();

export default networkService; 