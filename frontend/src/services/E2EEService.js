/**
 * 🔒 MOHR HR System - End-to-End Encryption Service
 * 
 * This service provides client-side encryption/decryption for sensitive HR data.
 * All encryption happens in the browser using Web Crypto API.
 * The server never sees unencrypted sensitive data.
 */

class E2EEService {
  constructor() {
    this.keys = null;
    this.userSalt = null;
    this.isInitialized = false;
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
      console.log('🔒 E2EE Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize E2EE service:', error);
      throw new Error('E2EE initialization failed');
    }
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
   * Encrypt a single field with context
   */
  async encryptField(value, context = 'default') {
    if (!this.isInitialized) {
      throw new Error('E2EE service not initialized');
    }

    if (value === null || value === undefined) {
      return null;
    }

    try {
      // Create data package with context and timestamp
      const dataPackage = {
        value,
        context,
        timestamp: Date.now(),
        version: '1.0'
      };

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encode data
      const encoded = new TextEncoder().encode(JSON.stringify(dataPackage));

      // Encrypt data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.keys.encryptionKey,
        encoded
      );

      // Create signature
      const signature = await crypto.subtle.sign(
        'HMAC',
        this.keys.signingKey,
        encrypted
      );

      // Combine IV, encrypted data, and signature
      const combined = new Uint8Array(iv.length + encrypted.byteLength + signature.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      combined.set(new Uint8Array(signature), iv.length + encrypted.byteLength);

      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a single field
   */
  async decryptField(encryptedPackage) {
    if (!this.isInitialized) {
      throw new Error('E2EE service not initialized');
    }

    if (!encryptedPackage) {
      return null;
    }

    try {
      // Decode from base64
      const combined = new Uint8Array(this.base64ToArrayBuffer(encryptedPackage));

      // Extract IV, encrypted data, and signature
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12, combined.length - 32);
      const signature = combined.slice(combined.length - 32);

      // Verify signature
      const isValid = await crypto.subtle.verify(
        'HMAC',
        this.keys.signingKey,
        signature,
        encrypted
      );

      if (!isValid) {
        throw new Error('Data integrity check failed - possible tampering detected');
      }

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.keys.encryptionKey,
        encrypted
      );

      // Parse data package
      const dataPackage = JSON.parse(new TextDecoder().decode(decrypted));
      return dataPackage.value;
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt employee data based on sensitivity levels
   */
  async encryptEmployee(employeeData) {
    const encrypted = { ...employeeData };

    // Level 1 - Critical (highest security)
    const criticalFields = ['salary', 'ssn', 'address', 'phone', 'performance_review'];
    for (const field of criticalFields) {
      if (employeeData[field]) {
        encrypted[`${field}_encrypted`] = await this.encryptField(employeeData[field], `employee_${field}`);
        delete encrypted[field];
      }
    }

    // Level 2 - Sensitive
    const sensitiveFields = ['first_name', 'last_name', 'email'];
    for (const field of sensitiveFields) {
      if (employeeData[field]) {
        encrypted[`${field}_encrypted`] = await this.encryptField(employeeData[field], `employee_${field}`);
        delete encrypted[field];
      }
    }

    // Level 3 - Public (not encrypted)
    // position, department, hire_date, etc. remain unencrypted

    return encrypted;
  }

  /**
   * Decrypt employee data
   */
  async decryptEmployee(encryptedData) {
    const decrypted = { ...encryptedData };

    // Decrypt all encrypted fields
    const encryptedFields = Object.keys(encryptedData).filter(key => key.includes('_encrypted'));
    
    for (const encryptedField of encryptedFields) {
      const originalField = encryptedField.replace('_encrypted', '');
      try {
        decrypted[originalField] = await this.decryptField(encryptedData[encryptedField]);
        delete decrypted[encryptedField];
      } catch (error) {
        console.error(`Failed to decrypt ${originalField}:`, error);
        decrypted[originalField] = null;
      }
    }

    return decrypted;
  }

  /**
   * Encrypt leave request data
   */
  async encryptLeaveRequest(leaveData) {
    const encrypted = { ...leaveData };

    // Critical fields
    const criticalFields = ['reason', 'medical_notes'];
    for (const field of criticalFields) {
      if (leaveData[field]) {
        encrypted[`${field}_encrypted`] = await this.encryptField(leaveData[field], `leave_${field}`);
        delete encrypted[field];
      }
    }

    return encrypted;
  }

  /**
   * Decrypt leave request data
   */
  async decryptLeaveRequest(encryptedData) {
    const decrypted = { ...encryptedData };

    // Decrypt all encrypted fields
    const encryptedFields = Object.keys(encryptedData).filter(key => key.includes('_encrypted'));
    
    for (const encryptedField of encryptedFields) {
      const originalField = encryptedField.replace('_encrypted', '');
      try {
        decrypted[originalField] = await this.decryptField(encryptedData[encryptedField]);
        delete decrypted[encryptedField];
      } catch (error) {
        console.error(`Failed to decrypt ${originalField}:`, error);
        decrypted[originalField] = null;
      }
    }

    return decrypted;
  }

  /**
   * Generate a random salt for new users
   */
  generateSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(32));
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
    return bytes.buffer;
  }

  /**
   * Check if Web Crypto API is supported
   */
  static isSupported() {
    return typeof crypto !== 'undefined' && 
           crypto.subtle && 
           typeof crypto.getRandomValues === 'function';
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasKeys: !!this.keys,
      userSalt: this.userSalt,
      supported: E2EEService.isSupported()
    };
  }
}

// Create and export a singleton instance
const e2eeService = new E2EEService();
export default e2eeService; 