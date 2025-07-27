import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

// Simple E2EE service for demo (inlined to avoid import issues)
class SimpleE2EEService {
  constructor() {
    this.isInitialized = false;
    this.keys = null;
  }

  async initialize(password, salt) {
    try {
      // Check if Web Crypto API is available
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Web Crypto API not supported');
      }

      // Create a simple key derivation
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password + salt);
      
      // Generate a simple key (in real implementation, use PBKDF2)
      const key = await window.crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );

      this.keys = { encryptionKey: key, signingKey: key };
      this.isInitialized = true;
      console.log('🔒 Simple E2EE Service initialized');
    } catch (error) {
      console.error('❌ E2EE initialization failed:', error);
      throw error;
    }
  }

  async encryptField(value) {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ value, timestamp: Date.now() }));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.keys.encryptionKey,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  async decryptField(encryptedData) {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.keys.encryptionKey,
        encrypted
      );

      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(decrypted));
      return data.value;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  generateSalt() {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...salt));
  }

  static isSupported() {
    return typeof window !== 'undefined' && 
           window.crypto && 
           window.crypto.subtle && 
           window.crypto.getRandomValues;
  }
}

const E2EEDemo = () => {
  const [password, setPassword] = useState('admin123');
  const [salt, setSalt] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [demoData, setDemoData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    salary: 75000,
    ssn: '123-45-6789',
    address: '123 Main St, Anytown, USA',
    phone: '+1 (555) 123-4567'
  });
  const [encryptedData, setEncryptedData] = useState({});
  const [decryptedData, setDecryptedData] = useState({});
  const [showEncrypted, setShowEncrypted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [e2eeService] = useState(() => new SimpleE2EEService());

  useEffect(() => {
    // Check if E2EE is supported
    if (!SimpleE2EEService.isSupported()) {
      setError('Web Crypto API is not supported in this browser. Please use a modern browser.');
      return;
    }

    // Generate a new salt for demo
    try {
      const newSalt = e2eeService.generateSalt();
      setSalt(newSalt);
      setStatus('Ready to initialize E2EE service');
    } catch (error) {
      setError('Failed to generate salt: ' + error.message);
    }
  }, [e2eeService]);

  const initializeE2EE = async () => {
    setProcessing(true);
    setError('');
    setStatus('Initializing E2EE service...');
    
    try {
      await e2eeService.initialize(password, salt);
      setIsInitialized(true);
      setStatus('✅ E2EE service initialized successfully');
    } catch (error) {
      setError('Failed to initialize E2EE service: ' + error.message);
      setStatus('❌ E2EE initialization failed');
    } finally {
      setProcessing(false);
    }
  };

  const encryptData = async () => {
    if (!isInitialized) {
      setError('Please initialize E2EE service first');
      return;
    }

    setProcessing(true);
    setError('');
    setStatus('Encrypting sensitive data...');

    try {
      const encrypted = {};
      
      // Encrypt each field
      for (const [key, value] of Object.entries(demoData)) {
        encrypted[`${key}_encrypted`] = await e2eeService.encryptField(value);
      }

      setEncryptedData(encrypted);
      setStatus('✅ Data encrypted successfully');
    } catch (error) {
      setError('Encryption failed: ' + error.message);
      setStatus('❌ Encryption failed');
    } finally {
      setProcessing(false);
    }
  };

  const decryptData = async () => {
    if (!isInitialized || Object.keys(encryptedData).length === 0) {
      setError('Please encrypt data first');
      return;
    }

    setProcessing(true);
    setError('');
    setStatus('Decrypting data...');

    try {
      const decrypted = {};
      
      // Decrypt each field
      for (const [key, value] of Object.entries(encryptedData)) {
        const originalKey = key.replace('_encrypted', '');
        decrypted[originalKey] = await e2eeService.decryptField(value);
      }

      setDecryptedData(decrypted);
      setStatus('✅ Data decrypted successfully');
    } catch (error) {
      setError('Decryption failed: ' + error.message);
      setStatus('❌ Decryption failed');
    } finally {
      setProcessing(false);
    }
  };

  const verifyIntegrity = () => {
    const isMatch = JSON.stringify(demoData) === JSON.stringify(decryptedData);
    setStatus(isMatch ? '✅ Data integrity verified - no tampering detected' : '❌ Data integrity check failed - possible tampering');
  };

  const DataField = ({ label, value, isEncrypted = false, isPublic = false }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-700">{label}</span>
        <div className="flex items-center space-x-2">
          {isEncrypted && <Lock className="w-4 h-4 text-red-500" />}
          {isPublic && <Eye className="w-4 h-4 text-green-500" />}
        </div>
      </div>
      <div className="text-sm text-gray-600 break-all">
        {typeof value === 'string' && value.length > 50 ? `${value.substring(0, 50)}...` : value}
      </div>
    </div>
  );

  const EncryptionStep = ({ step, title, description, children, isActive, isCompleted }) => (
    <div className={`p-6 rounded-lg border-2 ${isActive ? 'border-blue-500 bg-blue-50' : isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
          isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-400'
        }`}>
          {isCompleted ? <CheckCircle className="w-5 h-5" /> : step}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );

  // Show error if E2EE is not supported
  if (error && error.includes('not supported')) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">E2EE Not Supported</h2>
            <p className="text-red-700">{error}</p>
            <p className="text-sm text-red-600 mt-4">
              Please use a modern browser like Chrome, Firefox, Safari, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">E2EE Visual Demonstration</h1>
          </div>
          <p className="text-lg text-gray-600">
            See how your sensitive HR data is protected with End-to-End Encryption
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isInitialized ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <span className="font-medium">
                E2EE Status: {isInitialized ? 'Initialized' : 'Not Initialized'}
              </span>
            </div>
            <div className="text-sm text-gray-600">{status}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Steps */}
          <div className="space-y-6">
            <EncryptionStep
              step="1"
              title="Initialize E2EE Service"
              description="Set up encryption keys using your password and salt"
              isActive={!isInitialized}
              isCompleted={isInitialized}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salt (Auto-generated)
                  </label>
                  <input
                    type="text"
                    value={salt}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                <button
                  onClick={initializeE2EE}
                  disabled={processing || isInitialized}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processing ? 'Initializing...' : 'Initialize E2EE'}
                </button>
              </div>
            </EncryptionStep>

            <EncryptionStep
              step="2"
              title="Encrypt Sensitive Data"
              description="Transform sensitive information into encrypted format"
              isActive={isInitialized && Object.keys(encryptedData).length === 0}
              isCompleted={Object.keys(encryptedData).length > 0}
            >
              <div className="space-y-4">
                <button
                  onClick={encryptData}
                  disabled={processing || !isInitialized}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processing ? 'Encrypting...' : 'Encrypt Data'}
                </button>
                {Object.keys(encryptedData).length > 0 && (
                  <div className="text-sm text-gray-600">
                    ✅ {Object.keys(encryptedData).length} fields encrypted
                  </div>
                )}
              </div>
            </EncryptionStep>

            <EncryptionStep
              step="3"
              title="Decrypt Data"
              description="Retrieve original data using your encryption keys"
              isActive={Object.keys(encryptedData).length > 0 && Object.keys(decryptedData).length === 0}
              isCompleted={Object.keys(decryptedData).length > 0}
            >
              <div className="space-y-4">
                <button
                  onClick={decryptData}
                  disabled={processing || Object.keys(encryptedData).length === 0}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processing ? 'Decrypting...' : 'Decrypt Data'}
                </button>
                {Object.keys(decryptedData).length > 0 && (
                  <div className="text-sm text-gray-600">
                    ✅ {Object.keys(decryptedData).length} fields decrypted
                  </div>
                )}
              </div>
            </EncryptionStep>

            <EncryptionStep
              step="4"
              title="Verify Integrity"
              description="Ensure data hasn't been tampered with"
              isActive={Object.keys(decryptedData).length > 0}
              isCompleted={false}
            >
              <div className="space-y-4">
                <button
                  onClick={verifyIntegrity}
                  disabled={Object.keys(decryptedData).length === 0}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Verify Data Integrity
                </button>
              </div>
            </EncryptionStep>
          </div>

          {/* Right Column - Data Display */}
          <div className="space-y-6">
            {/* Original Data */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-green-500" />
                Original Data (Before Encryption)
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <DataField label="First Name" value={demoData.firstName} isEncrypted={true} />
                <DataField label="Last Name" value={demoData.lastName} isEncrypted={true} />
                <DataField label="Email" value={demoData.email} isEncrypted={true} />
                <DataField label="Salary" value={`$${demoData.salary.toLocaleString()}`} isEncrypted={true} />
                <DataField label="SSN" value={demoData.ssn} isEncrypted={true} />
                <DataField label="Address" value={demoData.address} isEncrypted={true} />
                <DataField label="Phone" value={demoData.phone} isEncrypted={true} />
              </div>
            </div>

            {/* Encrypted Data */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-red-500" />
                  Encrypted Data (In Database)
                </h3>
                <button
                  onClick={() => setShowEncrypted(!showEncrypted)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showEncrypted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showEncrypted ? 'Hide' : 'Show'} Encrypted
                </button>
              </div>
              {Object.keys(encryptedData).length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(encryptedData).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-3 rounded border">
                      <div className="text-sm font-medium text-gray-700 mb-1">{key}</div>
                      <div className="text-xs text-gray-600 break-all">
                        {showEncrypted ? value : <span className="text-red-500">🔒 Encrypted Data</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  No encrypted data yet. Run the encryption step first.
                </div>
              )}
            </div>

            {/* Decrypted Data */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Unlock className="w-5 h-5 mr-2 text-green-500" />
                Decrypted Data (After Decryption)
              </h3>
              {Object.keys(decryptedData).length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  <DataField label="First Name" value={decryptedData.firstName} />
                  <DataField label="Last Name" value={decryptedData.lastName} />
                  <DataField label="Email" value={decryptedData.email} />
                  <DataField label="Salary" value={decryptedData.salary ? `$${decryptedData.salary.toLocaleString()}` : ''} />
                  <DataField label="SSN" value={decryptedData.ssn} />
                  <DataField label="Address" value={decryptedData.address} />
                  <DataField label="Phone" value={decryptedData.phone} />
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  No decrypted data yet. Run the decryption step first.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Features */}
        <div className="mt-12 bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🔒 Security Features Demonstrated</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Shield className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">AES-GCM Encryption</h4>
              <p className="text-sm text-gray-600">Authenticated encryption with integrity protection</p>
            </div>
            <div className="text-center">
              <Lock className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Zero-Knowledge Architecture</h4>
              <p className="text-sm text-gray-600">Server cannot decrypt your data - only you have the keys</p>
            </div>
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Tamper Detection</h4>
              <p className="text-sm text-gray-600">Any modification to encrypted data is detected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default E2EEDemo; 