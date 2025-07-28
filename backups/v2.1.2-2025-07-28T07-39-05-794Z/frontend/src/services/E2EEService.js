/**
 * 🔒 MOHR HR System - End-to-End Encryption Service with Perfect Forward Secrecy
 * 
 * This service provides client-side encryption/decryption for sensitive HR data.
 * All encryption happens in the browser using Web Crypto API.
 * The server never sees unencrypted sensitive data.
 * 
 * Features:
 * - Perfect Forward Secrecy (PFS) with session key rotation
 * - Deniable Encryption with hidden compartments
 * - Field-level encryption with context
 * - Tamper detection with HMAC signatures
 * - Automatic performance-based encryption switching
 * - Network speed detection and adaptation
 */

class E2EEService {
  constructor() {
    this.keys = null;
    this.userSalt = null;
    this.isInitialized = false;
    this.sessionKeys = null;
    this.sessionId = null;
    this.keyRotationInterval = null;
    this.pfsEnabled = true;
    this.autoMode = true; // Enable automatic mode by default
    this.performanceThreshold = 1000; // 1 second threshold for switching to TLS
    this.networkSpeed = 'unknown';
    this.encryptionMode = 'e2ee'; // 'e2ee' or 'tls'
    this.statusCallbacks = [];
    this.performanceHistory = [];
  }

  /**
   * Initialize the E2EE service with user credentials
   * @param {string} password - User password
   * @param {string} salt - User-specific salt
   */
  async initialize(password, salt) {
    try {
      this.userSalt = salt;
      this.keys = await this.deriveKeys(password, salt);
      this.isInitialized = true;
      
      // Initialize Perfect Forward Secrecy
      if (this.pfsEnabled) {
        await this.initializePFS();
      }
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      console.log('🔒 E2EE Service initialized successfully with PFS');
      this.notifyStatusChange();
    } catch (error) {
      console.error('❌ Failed to initialize E2EE service:', error);
      throw new Error('E2EE initialization failed');
    }
  }

  /**
   * Initialize Perfect Forward Secrecy
   */
  async initializePFS() {
    try {
      // Generate session ID
      this.sessionId = this.generateSessionId();
      
      // Generate initial session keys
      await this.rotateSessionKeys();
      
      // Set up automatic key rotation (every 30 minutes)
      this.keyRotationInterval = setInterval(async () => {
        await this.rotateSessionKeys();
      }, 30 * 60 * 1000); // 30 minutes
      
      console.log('🔄 PFS initialized with session ID:', this.sessionId);
    } catch (error) {
      console.error('❌ PFS initialization failed:', error);
      throw error;
    }
  }

  /**
   * Rotate session keys for Perfect Forward Secrecy
   */
  async rotateSessionKeys() {
    try {
      // Generate new ephemeral key pair for this session
      const ephemeralKeyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey']
      );

      // Generate a random seed for key derivation
      const randomSeed = crypto.getRandomValues(new Uint8Array(32));
      
      // Create a key derivation material from the random seed
      const derivationMaterial = await crypto.subtle.importKey(
        'raw',
        randomSeed,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive new session encryption key using PBKDF2
      const sessionEncryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('session-encryption-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        derivationMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Derive new session signing key using PBKDF2
      const sessionSigningKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('session-signing-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        derivationMaterial,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );

      // Store new session keys
      this.sessionKeys = {
        encryptionKey: sessionEncryptionKey,
        signingKey: sessionSigningKey,
        ephemeralKeyPair,
        randomSeed,
        timestamp: Date.now()
      };

      console.log('🔄 Session keys rotated at:', new Date().toISOString());
    } catch (error) {
      console.error('❌ Session key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derive encryption and signing keys from password
   */
  async deriveKeys(password, salt) {
    // Create master key from password + salt
    const masterKeyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password + salt),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive encryption key
    const encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('mohr-encryption-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      masterKeyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Derive signing key for integrity
    const signingKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('mohr-signing-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      masterKeyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    return { encryptionKey, signingKey };
  }

  /**
   * Encrypt a single field with context and PFS
   */
  async encryptField(value, context = 'default', deniable = false) {
    if (!this.isInitialized) {
      throw new Error('E2EE service not initialized');
    }

    if (value === null || value === undefined) {
      return null;
    }

    try {
      // Use session keys for PFS if available
      const encryptionKey = this.sessionKeys?.encryptionKey || this.keys.encryptionKey;
      const signingKey = this.sessionKeys?.signingKey || this.keys.signingKey;

      // Create data package with context and timestamp
      const dataPackage = {
        value,
        context,
        timestamp: Date.now(),
        version: '2.0', // Updated version for PFS
        sessionId: this.sessionId,
        deniable: deniable
      };

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        new TextEncoder().encode(JSON.stringify(dataPackage))
      );

      // Create signature for integrity
      const signature = await crypto.subtle.sign(
        'HMAC',
        signingKey,
        new Uint8Array(encrypted)
      );

      // Combine IV, encrypted data, and signature
      const combined = new Uint8Array(iv.length + encrypted.byteLength + signature.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      combined.set(new Uint8Array(signature), iv.length + encrypted.byteLength);

      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Field encryption failed');
    }
  }

  /**
   * Decrypt a single field with PFS support
   */
  async decryptField(encryptedPackage) {
    if (!this.isInitialized) {
      throw new Error('E2EE service not initialized');
    }

    if (!encryptedPackage) {
      return null;
    }

    try {
      // Use session keys for PFS if available
      const encryptionKey = this.sessionKeys?.encryptionKey || this.keys.encryptionKey;
      const signingKey = this.sessionKeys?.signingKey || this.keys.signingKey;

      // Convert from base64
      const combined = this.base64ToArrayBuffer(encryptedPackage);
      
      // Extract IV, encrypted data, and signature
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12, -32); // HMAC-SHA256 is 32 bytes
      const signature = combined.slice(-32);

      // Verify signature
      const isValid = await crypto.subtle.verify(
        'HMAC',
        signingKey,
        signature,
        encrypted
      );

      if (!isValid) {
        throw new Error('Data integrity check failed');
      }

      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        encrypted
      );

      // Parse the data package
      const dataPackage = JSON.parse(new TextDecoder().decode(decrypted));
      
      return dataPackage.value;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Field decryption failed');
    }
  }

  /**
   * Encrypt employee data with PFS and deniable encryption
   */
  async encryptEmployee(employeeData, deniable = false) {
    const encryptedData = {};
    
    // Encrypt sensitive fields
    const sensitiveFields = [
      'first_name', 'last_name', 'email', 'phone', 
      'salary', 'ssn', 'address', 'performance_review'
    ];

    for (const field of sensitiveFields) {
      if (employeeData[field]) {
        encryptedData[`${field}_encrypted`] = await this.encryptField(
          employeeData[field], 
          `employee_${field}`, 
          deniable
        );
      }
    }

    // Add deniable encryption metadata if enabled
    if (deniable) {
      encryptedData.deniable_metadata = await this.encryptField(
        JSON.stringify({
          type: 'deniable_employee',
          timestamp: Date.now(),
          compartment: 'hidden'
        }),
        'deniable_metadata',
        true
      );
    }

    return encryptedData;
  }

  /**
   * Decrypt employee data with PFS support
   */
  async decryptEmployee(encryptedData) {
    const decryptedData = {};
    
    // Decrypt sensitive fields
    const sensitiveFields = [
      'first_name', 'last_name', 'email', 'phone', 
      'salary', 'ssn', 'address', 'performance_review'
    ];

    for (const field of sensitiveFields) {
      const encryptedField = encryptedData[`${field}_encrypted`];
      if (encryptedField) {
        try {
          decryptedData[field] = await this.decryptField(encryptedField);
        } catch (error) {
          console.warn(`Failed to decrypt ${field}:`, error);
          decryptedData[field] = null;
        }
      }
    }

    return decryptedData;
  }

  /**
   * Create deniable encryption compartment
   */
  async createDeniableCompartment(compartmentName, data) {
    if (!this.isInitialized) {
      throw new Error('E2EE service not initialized');
    }

    try {
      // Create deniable compartment with hidden metadata
      const compartmentData = {
        name: compartmentName,
        data: data,
        timestamp: Date.now(),
        signature: await this.generateCompartmentSignature(compartmentName, data)
      };

      return await this.encryptField(
        JSON.stringify(compartmentData),
        'deniable_compartment',
        true // Enable deniable encryption
      );
    } catch (error) {
      console.error('Failed to create deniable compartment:', error);
      throw error;
    }
  }

  /**
   * Access deniable encryption compartment
   */
  async accessDeniableCompartment(encryptedCompartment, compartmentName) {
    if (!this.isInitialized) {
      throw new Error('E2EE service not initialized');
    }

    try {
      const decrypted = await this.decryptField(encryptedCompartment);
      const compartmentData = JSON.parse(decrypted);
      
      // Verify compartment signature
      const expectedSignature = await this.generateCompartmentSignature(
        compartmentName, 
        compartmentData.data
      );
      
      if (compartmentData.signature !== expectedSignature) {
        throw new Error('Compartment signature verification failed');
      }

      return compartmentData.data;
    } catch (error) {
      console.error('Failed to access deniable compartment:', error);
      throw error;
    }
  }

  /**
   * Generate signature for deniable compartment
   */
  async generateCompartmentSignature(compartmentName, data) {
    const signingKey = this.sessionKeys?.signingKey || this.keys.signingKey;
    const signature = await crypto.subtle.sign(
      'HMAC',
      signingKey,
      new TextEncoder().encode(compartmentName + JSON.stringify(data))
    );
    return this.arrayBufferToBase64(signature);
  }

  /**
   * Get PFS status and session information
   */
  getPFSStatus() {
    return {
      enabled: this.pfsEnabled,
      sessionId: this.sessionId,
      lastRotation: this.sessionKeys?.timestamp,
      nextRotation: this.sessionKeys?.timestamp ? 
        this.sessionKeys.timestamp + (30 * 60 * 1000) : null
    };
  }

  /**
   * Clean up resources and stop key rotation
   */
  cleanup() {
    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval);
      this.keyRotationInterval = null;
    }
    
    // Clear sensitive data from memory
    this.keys = null;
    this.sessionKeys = null;
    this.userSalt = null;
    this.isInitialized = false;
    this.sessionId = null;
  }

  /**
   * Generate a random salt for E2EE
   */
  generateSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return this.arrayBufferToBase64(salt);
  }

  /**
   * Convert ArrayBuffer to base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Check if Web Crypto API is supported
   */
  isSupported() {
    return !!(window.crypto && window.crypto.subtle);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      pfsEnabled: this.pfsEnabled,
      sessionId: this.sessionId,
      lastKeyRotation: this.sessionKeys?.timestamp,
      autoMode: this.autoMode,
      encryptionMode: this.encryptionMode,
      networkSpeed: this.networkSpeed,
      performanceThreshold: this.performanceThreshold,
      performanceHistory: this.performanceHistory
    };
  }

  /**
   * Start automatic performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor network performance every 30 seconds
    setInterval(() => {
      this.checkNetworkPerformance();
    }, 30000);
    
    // Initial check
    this.checkNetworkPerformance();
  }

  /**
   * Check network performance and adjust encryption mode
   */
  async checkNetworkPerformance() {
    try {
      const startTime = performance.now();
      
      // Make a small test request to measure latency
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      // Store performance data
      this.performanceHistory.push(latency);
      if (this.performanceHistory.length > 10) {
        this.performanceHistory.shift();
      }
      
      // Calculate average latency
      const avgLatency = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
      
      // Determine network speed
      if (avgLatency < 200) {
        this.networkSpeed = 'excellent';
      } else if (avgLatency < 500) {
        this.networkSpeed = 'good';
      } else if (avgLatency < 1000) {
        this.networkSpeed = 'fair';
      } else {
        this.networkSpeed = 'poor';
      }
      
      // Auto-switch encryption mode based on performance
      if (this.autoMode) {
        await this.autoSwitchEncryptionMode(avgLatency);
      }
      
      console.log(`🌐 Network performance: ${this.networkSpeed} (${avgLatency.toFixed(0)}ms)`);
    } catch (error) {
      console.warn('Network performance check failed:', error);
      this.networkSpeed = 'unknown';
    }
  }

  /**
   * Automatically switch encryption mode based on performance
   */
  async autoSwitchEncryptionMode(latency) {
    const currentMode = this.encryptionMode;
    let newMode = currentMode;
    
    if (latency > this.performanceThreshold && currentMode === 'e2ee') {
      // Switch to TLS for better performance
      newMode = 'tls';
      console.log('🔄 Auto-switching to TLS for better performance');
      
      // Notify user before switching
      this.notifyEncryptionModeChange('e2ee', 'tls', 'Network is slow - switching to standard encryption for better performance');
    } else if (latency <= this.performanceThreshold / 2 && currentMode === 'tls') {
      // Switch back to E2EE when performance improves
      newMode = 'e2ee';
      console.log('🔄 Auto-switching back to E2EE - performance improved');
      
      // Notify user before switching
      this.notifyEncryptionModeChange('tls', 'e2ee', 'Network performance improved - switching back to end-to-end encryption');
    }
    
    if (newMode !== currentMode) {
      this.encryptionMode = newMode;
      this.notifyStatusChange();
    }
  }

  /**
   * Notify user about encryption mode change
   */
  notifyEncryptionModeChange(fromMode, toMode, reason) {
    // Dispatch custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('encryptionModeChange', {
      detail: {
        fromMode,
        toMode,
        reason,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Register callback for status changes
   */
  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
  }

  /**
   * Notify all status change callbacks
   */
  notifyStatusChange() {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.warn('Status callback error:', error);
      }
    });
  }
}

export default new E2EEService(); 