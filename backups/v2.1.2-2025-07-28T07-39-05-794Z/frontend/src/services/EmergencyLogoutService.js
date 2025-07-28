/**
 * Emergency Logout Service for Myanmar Deployment
 * Provides immediate data purging and secure logout functionality
 * for situations where users feel they may be in danger
 */

class EmergencyLogoutService {
  constructor() {
    this.isEmergencyMode = false;
    this.setupEmergencyTriggers();
  }

  /**
   * Setup emergency triggers (keyboard shortcuts, etc.)
   */
  setupEmergencyTriggers() {
    // Emergency logout on Ctrl+Shift+E
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.triggerEmergencyLogout();
      }
    });

    // Emergency logout on triple-click of logo
    this.setupTripleClickTrigger();
  }

  /**
   * Setup triple-click trigger on app logo
   */
  setupTripleClickTrigger() {
    let clickCount = 0;
    let clickTimer = null;

    document.addEventListener('click', (e) => {
      // Check if clicking on logo or app title
      const isLogoClick = e.target.closest('[data-emergency-trigger="true"]') ||
                         e.target.closest('.app-logo') ||
                         e.target.closest('.app-title');

      if (isLogoClick) {
        clickCount++;
        
        if (clickTimer) {
          clearTimeout(clickTimer);
        }

        clickTimer = setTimeout(() => {
          if (clickCount >= 3) {
            this.triggerEmergencyLogout();
          }
          clickCount = 0;
        }, 1000);
      }
    });
  }

  /**
   * Trigger emergency logout with immediate data purging
   */
  async triggerEmergencyLogout() {
    if (this.isEmergencyMode) return; // Prevent multiple triggers
    
    this.isEmergencyMode = true;
    
    try {
      console.log('🚨 EMERGENCY LOGOUT TRIGGERED - Purging all data...');
      
      // Show emergency notification
      this.showEmergencyNotification();
      
      // Immediate data purging
      await this.purgeAllData();
      
      // Clear all caches
      await this.clearAllCaches();
      
      // Clear service worker
      await this.clearServiceWorker();
      
      // Clear all storage
      this.clearAllStorage();
      
      // Clear all cookies
      this.clearAllCookies();
      
      // Redirect to safe logout page
      this.redirectToSafeLogout();
      
    } catch (error) {
      console.error('Emergency logout error:', error);
      // Even if there's an error, still redirect to safe logout
      this.redirectToSafeLogout();
    }
  }

  /**
   * Show emergency notification
   */
  showEmergencyNotification() {
    // Create emergency notification
    const notification = document.createElement('div');
    notification.id = 'emergency-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(220, 38, 38, 0.95);
        color: white;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">🚨</div>
        <h1 style="font-size: 24px; margin-bottom: 10px;">EMERGENCY LOGOUT</h1>
        <p style="font-size: 16px; margin-bottom: 20px;">
          All data is being purged from your device...
        </p>
        <div style="
          width: 50px;
          height: 50px;
          border: 4px solid white;
          border-top: 4px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
    
    document.body.appendChild(notification);
  }

  /**
   * Purge all application data
   */
  async purgeAllData() {
    const purgeTasks = [
      // Clear localStorage
      () => {
        localStorage.clear();
        console.log('✅ localStorage cleared');
      },
      
      // Clear sessionStorage
      () => {
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');
      },
      
      // Clear IndexedDB
      async () => {
        try {
          const databases = await window.indexedDB.databases();
          for (const db of databases) {
            window.indexedDB.deleteDatabase(db.name);
          }
          console.log('✅ IndexedDB cleared');
        } catch (error) {
          console.warn('IndexedDB clear failed:', error);
        }
      },
      
      // Clear Cache Storage
      async () => {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('✅ Cache Storage cleared');
        } catch (error) {
          console.warn('Cache Storage clear failed:', error);
        }
      },
      
      // Clear Network Service data
      () => {
        try {
          if (window.networkService) {
            window.networkService.clearOfflineData();
          }
          console.log('✅ Network Service data cleared');
        } catch (error) {
          console.warn('Network Service clear failed:', error);
        }
      },
      
      // Clear E2EE data
      () => {
        try {
          // Clear any stored encryption keys
          const keysToRemove = [
            'e2ee_salt',
            'e2ee_key',
            'user_encryption_data',
            'auth_token',
            'user_data'
          ];
          
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
          console.log('✅ E2EE data cleared');
        } catch (error) {
          console.warn('E2EE clear failed:', error);
        }
      }
    ];

    // Execute all purge tasks
    for (const task of purgeTasks) {
      try {
        await task();
      } catch (error) {
        console.warn('Purge task failed:', error);
      }
    }
  }

  /**
   * Clear all browser caches
   */
  async clearAllCaches() {
    try {
      // Clear application cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear browser cache (if possible)
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      
      console.log('✅ All caches cleared');
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }

  /**
   * Clear service worker
   */
  async clearServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        console.log('✅ Service Worker cleared');
      }
    } catch (error) {
      console.warn('Service Worker clear failed:', error);
    }
  }

  /**
   * Clear all storage types
   */
  clearAllStorage() {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear any other storage mechanisms
      if (window.webkitStorageInfo) {
        window.webkitStorageInfo.queryUsageAndQuota(
          window.webkitStorageInfo.TEMPORARY,
          (used, granted) => {
            // Clear temporary storage
          }
        );
      }
      
      console.log('✅ All storage cleared');
    } catch (error) {
      console.warn('Storage clear failed:', error);
    }
  }

  /**
   * Clear all cookies
   */
  clearAllCookies() {
    try {
      const cookies = document.cookie.split(';');
      
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      }
      
      console.log('✅ All cookies cleared');
    } catch (error) {
      console.warn('Cookie clear failed:', error);
    }
  }

  /**
   * Redirect to safe logout page
   */
  redirectToSafeLogout() {
    // Remove emergency notification
    const notification = document.getElementById('emergency-notification');
    if (notification) {
      notification.remove();
    }
    
    // Clear any remaining data
    setTimeout(() => {
      // Redirect to a safe external page or show logout message
      window.location.href = '/emergency-logout';
    }, 1000);
  }

  /**
   * Manual emergency logout (for UI button)
   */
  async manualEmergencyLogout() {
    if (confirm('🚨 EMERGENCY LOGOUT\n\nThis will immediately purge ALL data from your device and log you out.\n\nAre you sure you want to continue?')) {
      await this.triggerEmergencyLogout();
    }
  }

  /**
   * Get emergency logout status
   */
  getStatus() {
    return {
      isEmergencyMode: this.isEmergencyMode,
      triggers: {
        keyboard: 'Ctrl+Shift+E',
        tripleClick: 'Triple-click app logo'
      }
    };
  }
}

// Create singleton instance
const emergencyLogoutService = new EmergencyLogoutService();

export default emergencyLogoutService; 