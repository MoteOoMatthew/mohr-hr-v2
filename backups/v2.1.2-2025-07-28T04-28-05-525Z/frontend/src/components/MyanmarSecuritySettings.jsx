import { useState } from 'react';
import { 
  Settings, 
  Wifi, 
  Database, 
  Shield, 
  Globe, 
  Smartphone,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const MyanmarSecuritySettings = ({ onClose }) => {
  const [settings, setSettings] = useState({
    // Connection Settings
    primaryUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    fallbackUrl1: import.meta.env.VITE_FALLBACK_URL_1 || '',
    fallbackUrl2: import.meta.env.VITE_FALLBACK_URL_2 || '',
    
    // Sync Settings
    autoSync: true,
    syncInterval: 5,
    connectionTimeout: 10,
    retryAttempts: 3,
    
    // Cache Settings
    cacheExpiry: 24,
    maxCacheSize: 50,
    enableOfflineMode: true,
    
    // Security Settings
    enableE2EE: true,
    enableAuditLogging: true,
    enableConnectionMonitoring: true,
    enableAutoFailover: true,
    
    // Display Settings
    showNetworkStatus: true,
    showSyncProgress: true,
    showSecurityAlerts: true
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save settings to localStorage
      localStorage.setItem('myanmarSecuritySettings', JSON.stringify(settings));
      
      // Update environment variables (in a real app, this would be done server-side)
      if (settings.primaryUrl) {
        // Note: In Vite, we can't modify import.meta.env at runtime
        // This would need to be handled differently in production
        console.log('Primary URL updated:', settings.primaryUrl);
      }
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSettings = {
        primaryUrl: 'http://localhost:5000',
        fallbackUrl1: '',
        fallbackUrl2: '',
        autoSync: true,
        syncInterval: 5,
        connectionTimeout: 10,
        retryAttempts: 3,
        cacheExpiry: 24,
        maxCacheSize: 50,
        enableOfflineMode: true,
        enableE2EE: true,
        enableAuditLogging: true,
        enableConnectionMonitoring: true,
        enableAutoFailover: true,
        showNetworkStatus: true,
        showSyncProgress: true,
        showSecurityAlerts: true
      };
      setSettings(defaultSettings);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Globe className="w-6 h-6 mr-2 text-blue-500" />
              Myanmar Security Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Settings */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Wifi className="w-5 h-5 mr-2 text-blue-500" />
              Connection Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Server URL
                </label>
                <input
                  type="url"
                  value={settings.primaryUrl}
                  onChange={(e) => updateSetting('primaryUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="https://api.mohr.org"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fallback Server 1 (Optional)
                </label>
                <input
                  type="url"
                  value={settings.fallbackUrl1}
                  onChange={(e) => updateSetting('fallbackUrl1', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="https://backup1.mohr.org"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fallback Server 2 (Optional)
                </label>
                <input
                  type="url"
                  value={settings.fallbackUrl2}
                  onChange={(e) => updateSetting('fallbackUrl2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  placeholder="https://backup2.mohr.org"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Connection Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={settings.connectionTimeout}
                  onChange={(e) => updateSetting('connectionTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  min="1"
                  max="30"
                />
              </div>
            </div>
          </div>

          {/* Sync Settings */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2 text-green-500" />
              Sync Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto Sync
                </span>
                <button
                  onClick={() => updateSetting('autoSync', !settings.autoSync)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoSync ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoSync ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sync Interval (minutes)
                </label>
                <input
                  type="number"
                  value={settings.syncInterval}
                  onChange={(e) => updateSetting('syncInterval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  min="1"
                  max="60"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retry Attempts
                </label>
                <input
                  type="number"
                  value={settings.retryAttempts}
                  onChange={(e) => updateSetting('retryAttempts', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  min="1"
                  max="10"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cache Expiry (hours)
                </label>
                <input
                  type="number"
                  value={settings.cacheExpiry}
                  onChange={(e) => updateSetting('cacheExpiry', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  min="1"
                  max="168"
                />
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-500" />
              Security Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable E2EE
                </span>
                <button
                  onClick={() => updateSetting('enableE2EE', !settings.enableE2EE)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enableE2EE ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enableE2EE ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Audit Logging
                </span>
                <button
                  onClick={() => updateSetting('enableAuditLogging', !settings.enableAuditLogging)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enableAuditLogging ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enableAuditLogging ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Connection Monitoring
                </span>
                <button
                  onClick={() => updateSetting('enableConnectionMonitoring', !settings.enableConnectionMonitoring)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enableConnectionMonitoring ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enableConnectionMonitoring ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto Failover
                </span>
                <button
                  onClick={() => updateSetting('enableAutoFailover', !settings.enableAutoFailover)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enableAutoFailover ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enableAutoFailover ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Settings className="w-5 h-5 mr-2 text-purple-500" />
                Advanced Settings
              </h3>
              <span className="text-gray-400">{showAdvanced ? '−' : '+'}</span>
            </button>
            
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Cache Size (MB)
                  </label>
                  <input
                    type="number"
                    value={settings.maxCacheSize}
                    onChange={(e) => updateSetting('maxCacheSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    min="10"
                    max="500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Offline Mode
                  </span>
                  <button
                    onClick={() => updateSetting('enableOfflineMode', !settings.enableOfflineMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.enableOfflineMode ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.enableOfflineMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Myanmar-Specific Features Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Myanmar Deployment Features
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-blue-800 dark:text-blue-200">Censorship resistance with multiple servers</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-blue-800 dark:text-blue-200">Offline functionality for HR operations</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-blue-800 dark:text-blue-200">E2EE protection against surveillance</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-blue-800 dark:text-blue-200">Mobile-optimized PWA experience</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Default</span>
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyanmarSecuritySettings; 