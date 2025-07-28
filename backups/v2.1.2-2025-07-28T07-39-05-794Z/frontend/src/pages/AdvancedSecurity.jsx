import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Wifi, WifiOff, Settings, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import e2eeService from '../services/E2EEService';

const AdvancedSecurity = () => {
  const { e2eeStatus } = useAuth();
  const [securitySettings, setSecuritySettings] = useState({
    autoMode: true,
    performanceThreshold: 1000,
    pfsEnabled: true,
    deniableEncryption: false
  });
  const [encryptionStatus, setEncryptionStatus] = useState({
    mode: 'unknown',
    networkSpeed: 'unknown',
    initialized: false,
    performanceHistory: []
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // Get initial status
    updateStatus();

    // Listen for status changes
    const handleStatusChange = () => {
      updateStatus();
    };

    e2eeService.onStatusChange(handleStatusChange);

    // Load saved settings
    loadSettings();
  }, []);

  const updateStatus = () => {
    const status = e2eeService.getStatus();
    setEncryptionStatus({
      mode: status.encryptionMode || 'unknown',
      networkSpeed: status.networkSpeed || 'unknown',
      initialized: status.initialized || false,
      performanceHistory: status.performanceHistory || []
    });
  };

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('securitySettings');
      if (saved) {
        const settings = JSON.parse(saved);
        setSecuritySettings(settings);
        
        // Apply settings to E2EE service
        e2eeService.autoMode = settings.autoMode;
        e2eeService.performanceThreshold = settings.performanceThreshold;
        e2eeService.pfsEnabled = settings.pfsEnabled;
      }
    } catch (error) {
      console.warn('Failed to load security settings:', error);
    }
  };

  const saveSettings = (newSettings) => {
    try {
      localStorage.setItem('securitySettings', JSON.stringify(newSettings));
      setSecuritySettings(newSettings);
      
      // Apply settings to E2EE service
      e2eeService.autoMode = newSettings.autoMode;
      e2eeService.performanceThreshold = newSettings.performanceThreshold;
      e2eeService.pfsEnabled = newSettings.pfsEnabled;
    } catch (error) {
      console.error('Failed to save security settings:', error);
    }
  };

  const handleAutoModeToggle = () => {
    const newSettings = {
      ...securitySettings,
      autoMode: !securitySettings.autoMode
    };
    saveSettings(newSettings);
  };

  const handleThresholdChange = (value) => {
    const newSettings = {
      ...securitySettings,
      performanceThreshold: parseInt(value)
    };
    saveSettings(newSettings);
  };

  const handlePFSToggle = () => {
    const newSettings = {
      ...securitySettings,
      pfsEnabled: !securitySettings.pfsEnabled
    };
    saveSettings(newSettings);
  };

  const getStatusIcon = () => {
    if (!encryptionStatus.initialized) {
      return <ShieldAlert className="w-8 h-8 text-gray-400" />;
    }

    switch (encryptionStatus.mode) {
      case 'e2ee':
        return <ShieldCheck className="w-8 h-8 text-green-500" />;
      case 'tls':
        return <Shield className="w-8 h-8 text-blue-500" />;
      default:
        return <ShieldAlert className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (!encryptionStatus.initialized) {
      return 'text-gray-500 bg-gray-100 border-gray-200';
    }

    switch (encryptionStatus.mode) {
      case 'e2ee':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'tls':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  const getNetworkIcon = () => {
    switch (encryptionStatus.networkSpeed) {
      case 'excellent':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'good':
        return <Wifi className="w-5 h-5 text-blue-500" />;
      case 'fair':
        return <Wifi className="w-5 h-5 text-yellow-500" />;
      case 'poor':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      default:
        return <Wifi className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAverageLatency = () => {
    if (encryptionStatus.performanceHistory.length === 0) return 0;
    const sum = encryptionStatus.performanceHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / encryptionStatus.performanceHistory.length);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Advanced Security Settings</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Configure encryption and security preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Status */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Current Encryption Status
              </h2>
              
              <div className={`p-4 rounded-lg border ${getStatusColor()} mb-4`}>
                <div className="flex items-center space-x-3">
                  {getStatusIcon()}
                  <div>
                    <h3 className="font-medium">
                      {encryptionStatus.initialized 
                        ? (encryptionStatus.mode === 'e2ee' ? 'End-to-End Encryption' : 'Transport Layer Security')
                        : 'Not Initialized'
                      }
                    </h3>
                    <p className="text-sm opacity-75">
                      {encryptionStatus.initialized 
                        ? (encryptionStatus.mode === 'e2ee' ? 'Maximum security - data encrypted in browser' : 'Standard security - data encrypted in transit')
                        : 'Encryption service not available'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    {getNetworkIcon()}
                    <span className="text-sm font-medium">Network</span>
                  </div>
                  <p className="text-lg font-semibold capitalize">{encryptionStatus.networkSpeed}</p>
                </div>
                
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm font-medium mb-2">Latency</div>
                  <p className="text-lg font-semibold">{getAverageLatency()}ms</p>
                </div>
              </div>
            </div>

            {/* Performance Graph */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Network Performance</h3>
              <div className="h-32 flex items-end space-x-1">
                {encryptionStatus.performanceHistory.slice(-10).map((latency, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-blue-500 rounded-t"
                    style={{
                      height: `${Math.min((latency / 1000) * 100, 100)}%`,
                      backgroundColor: latency > securitySettings.performanceThreshold ? '#ef4444' : '#3b82f6'
                    }}
                    title={`${Math.round(latency)}ms`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0ms</span>
                <span>{securitySettings.performanceThreshold}ms threshold</span>
                <span>1000ms</span>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Security Settings
              </h2>

              <div className="space-y-6">
                {/* Auto Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Automatic Mode</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Automatically switch between E2EE and TLS based on network performance
                    </p>
                  </div>
                  <button
                    onClick={handleAutoModeToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securitySettings.autoMode ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        securitySettings.autoMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Performance Threshold */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">Performance Threshold</h3>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {securitySettings.performanceThreshold}ms
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Switch to TLS when network latency exceeds this threshold
                  </p>
                  <input
                    type="range"
                    min="500"
                    max="2000"
                    step="100"
                    value={securitySettings.performanceThreshold}
                    onChange={(e) => handleThresholdChange(e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>500ms</span>
                    <span>2000ms</span>
                  </div>
                </div>

                {/* Perfect Forward Secrecy */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Perfect Forward Secrecy</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Rotate encryption keys every 30 minutes for enhanced security
                    </p>
                  </div>
                  <button
                    onClick={handlePFSToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securitySettings.pfsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        securitySettings.pfsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Security Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">How It Works</h3>
                  <ul className="mt-2 text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• E2EE encrypts data in your browser before sending to server</li>
                    <li>• TLS provides standard encryption when network is slow</li>
                    <li>• Automatic switching ensures optimal performance and security</li>
                    <li>• Perfect Forward Secrecy rotates keys regularly</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSecurity; 