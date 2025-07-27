import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, RotateCcw, Eye, EyeOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdvancedSecurity = () => {
  const { e2eeService, e2eeStatus, user, initializeE2EEManually } = useAuth();
  const [pfsStatus, setPfsStatus] = useState(null);
  const [deniableCompartments, setDeniableCompartments] = useState([]);
  const [newCompartment, setNewCompartment] = useState({ name: '', data: '' });
  const [selectedCompartment, setSelectedCompartment] = useState(null);
  const [decryptedData, setDecryptedData] = useState(null);

  useEffect(() => {
    if (e2eeService && e2eeStatus.initialized) {
      updatePFSStatus();
      loadDeniableCompartments();
    }
  }, [e2eeService, e2eeStatus.initialized]);

  const updatePFSStatus = () => {
    if (e2eeService) {
      const status = e2eeService.getPFSStatus();
      setPfsStatus(status);
    }
  };

  const loadDeniableCompartments = () => {
    // In a real implementation, this would load from secure storage
    const compartments = JSON.parse(localStorage.getItem('deniable_compartments') || '[]');
    setDeniableCompartments(compartments);
  };

  const saveDeniableCompartments = (compartments) => {
    localStorage.setItem('deniable_compartments', JSON.stringify(compartments));
    setDeniableCompartments(compartments);
  };

  const handleCreateCompartment = async () => {
    if (!e2eeService || !newCompartment.name || !newCompartment.data) {
      return;
    }

    try {
      const encryptedCompartment = await e2eeService.createDeniableCompartment(
        newCompartment.name,
        newCompartment.data
      );

      const updatedCompartments = [
        ...deniableCompartments,
        {
          id: Date.now(),
          name: newCompartment.name,
          encrypted: encryptedCompartment,
          createdAt: new Date().toISOString()
        }
      ];

      saveDeniableCompartments(updatedCompartments);
      setNewCompartment({ name: '', data: '' });
      
      console.log('✅ Deniable compartment created successfully');
    } catch (error) {
      console.error('❌ Failed to create deniable compartment:', error);
    }
  };

  const handleAccessCompartment = async (compartment) => {
    if (!e2eeService) return;

    try {
      const decrypted = await e2eeService.accessDeniableCompartment(
        compartment.encrypted,
        compartment.name
      );
      
      setDecryptedData(decrypted);
      setSelectedCompartment(compartment);
    } catch (error) {
      console.error('❌ Failed to access deniable compartment:', error);
    }
  };

  const handleManualKeyRotation = async () => {
    if (!e2eeService) return;

    try {
      await e2eeService.rotateSessionKeys();
      updatePFSStatus();
      console.log('✅ Manual key rotation completed');
    } catch (error) {
      console.error('❌ Manual key rotation failed:', error);
    }
  };

  const PFSStatusCard = () => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Perfect Forward Secrecy</h3>
        <div className="flex items-center space-x-2">
          {pfsStatus?.enabled ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
        </div>
      </div>

      {pfsStatus && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Status:</span>
            <span className={`text-sm font-medium ${pfsStatus.enabled ? 'text-green-600' : 'text-yellow-600'}`}>
              {pfsStatus.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Session ID:</span>
            <span className="text-sm font-mono text-gray-800">
              {pfsStatus.sessionId?.substring(0, 8)}...
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Last Rotation:</span>
            <span className="text-sm text-gray-800">
              {pfsStatus.lastRotation ? new Date(pfsStatus.lastRotation).toLocaleTimeString() : 'Never'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Next Rotation:</span>
            <span className="text-sm text-gray-800">
              {pfsStatus.nextRotation ? new Date(pfsStatus.nextRotation).toLocaleTimeString() : 'N/A'}
            </span>
          </div>

          <button
            onClick={handleManualKeyRotation}
            className="btn btn-outline btn-sm w-full mt-3"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Manual Key Rotation
          </button>
        </div>
      )}
    </div>
  );

  const DeniableEncryptionCard = () => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Deniable Encryption</h3>
      
      <div className="space-y-4">
        {/* Create New Compartment */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Create Hidden Compartment</h4>
          <input
            type="text"
            placeholder="Compartment name"
            value={newCompartment.name}
            onChange={(e) => setNewCompartment(prev => ({ ...prev, name: e.target.value }))}
            className="input w-full"
          />
          <textarea
            placeholder="Hidden data"
            value={newCompartment.data}
            onChange={(e) => setNewCompartment(prev => ({ ...prev, data: e.target.value }))}
            className="textarea w-full h-20"
          />
          <button
            onClick={handleCreateCompartment}
            disabled={!newCompartment.name || !newCompartment.data}
            className="btn btn-primary btn-sm w-full"
          >
            <Lock className="h-4 w-4 mr-2" />
            Create Hidden Compartment
          </button>
        </div>

        {/* Existing Compartments */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Hidden Compartments</h4>
          {deniableCompartments.length === 0 ? (
            <p className="text-sm text-gray-500">No hidden compartments created yet.</p>
          ) : (
            <div className="space-y-2">
              {deniableCompartments.map((compartment) => (
                <div key={compartment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{compartment.name}</span>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(compartment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAccessCompartment(compartment)}
                    className="btn btn-outline btn-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Access
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Decrypted Data Display */}
        {decryptedData && selectedCompartment && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-2">
              Hidden Data from: {selectedCompartment.name}
            </h4>
            <div className="text-sm text-green-700 bg-white p-3 rounded border">
              {typeof decryptedData === 'object' ? JSON.stringify(decryptedData, null, 2) : decryptedData}
            </div>
            <button
              onClick={() => {
                setDecryptedData(null);
                setSelectedCompartment(null);
              }}
              className="btn btn-outline btn-xs mt-2"
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Hide
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const SecurityMetricsCard = () => (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Metrics</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {deniableCompartments.length}
            </div>
            <div className="text-sm text-blue-700">Hidden Compartments</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {pfsStatus?.enabled ? 'Active' : 'Inactive'}
            </div>
            <div className="text-sm text-green-700">PFS Status</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Encryption Algorithm:</span>
            <span className="font-medium">AES-GCM 256-bit</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Key Derivation:</span>
            <span className="font-medium">PBKDF2 (100k iterations)</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Integrity Protection:</span>
            <span className="font-medium">HMAC-SHA256</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Forward Secrecy:</span>
            <span className="font-medium">ECDH P-256</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!e2eeStatus.initialized) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Shield className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">E2EE not initialized</h3>
            <p className="mt-1 text-sm text-gray-500 mb-6">
              E2EE encryption is not currently active. Initialize it to access advanced security features.
            </p>
            
            {/* Manual E2EE Initialization */}
            <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Initialize E2EE Encryption</h4>
              <p className="text-sm text-gray-600 mb-4">
                Enter your password to initialize end-to-end encryption and access advanced security features.
              </p>
              
              <button
                onClick={async () => {
                  const password = prompt('Enter your password to initialize E2EE:');
                  if (password && user?.salt) {
                    const result = await initializeE2EEManually(password, user.salt);
                    if (result.success) {
                      alert('E2EE initialized successfully!');
                    } else {
                      alert(`E2EE initialization failed: ${result.error}`);
                    }
                  } else if (!password) {
                    alert('Password is required');
                  } else {
                    alert('User salt not found. Please contact administrator.');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Initialize E2EE
              </button>
              
              {e2eeStatus.error && (
                <p className="mt-2 text-sm text-red-600">
                  Error: {e2eeStatus.error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Advanced Security</h1>
        <p className="text-gray-600 mt-1">Perfect Forward Secrecy and Deniable Encryption</p>
      </div>

      {/* Security Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PFSStatusCard />
        <SecurityMetricsCard />
      </div>

      <DeniableEncryptionCard />

      {/* Security Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Advanced Security Features</h4>
            <div className="mt-2 text-sm text-blue-700 space-y-1">
              <p><strong>Perfect Forward Secrecy:</strong> Session keys rotate automatically every 30 minutes, ensuring that even if current keys are compromised, past communications remain secure.</p>
              <p><strong>Deniable Encryption:</strong> Create hidden compartments that can be plausibly denied if compelled to reveal encryption keys.</p>
              <p><strong>Zero-Knowledge Architecture:</strong> The server cannot decrypt any sensitive data, providing maximum protection against server compromise.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSecurity; 