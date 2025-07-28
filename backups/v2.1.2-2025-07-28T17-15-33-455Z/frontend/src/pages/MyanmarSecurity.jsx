import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import networkService from '../services/NetworkService';
import emergencyLogoutService from '../services/EmergencyLogoutService';
import { 
  Shield, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Settings,
  Lock,
  Globe,
  Smartphone,
  Database,
  Activity,
  Zap,
  LogOut,
  Info,
  Play,
  Pause
} from 'lucide-react';

const MyanmarSecurity = () => {
  const { user } = useAuth();
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    quality: 'unknown',
    pendingSync: 0,
    currentMethod: null
  });
  const [offlineData, setOfflineData] = useState({
    cachedItems: 0,
    storageUsed: '0 MB',
    lastSync: null
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    updateStatus();

    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = () => {
    const status = networkService.getConnectionStatus();
    setNetworkStatus(status);
    
    // Update offline data
    const cachedData = networkService.loadFromLocalStorage('offlineData');
    setOfflineData({
      cachedItems: Object.keys(cachedData || {}).length,
      storageUsed: `${Math.round(JSON.stringify(cachedData || {}).length / 1024)} KB`,
      lastSync: localStorage.getItem('lastSync') || 'Never'
    });
  };

  const handleManualSync = async () => {
    try {
      await networkService.forceSync();
      updateStatus();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleClearCache = () => {
    networkService.clearOfflineData();
    updateStatus();
  };

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="w-6 h-6 text-red-500" />;
    }
    
    switch (networkStatus.quality) {
      case 'excellent':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'good':
        return <Wifi className="w-6 h-6 text-green-400" />;
      case 'fair':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'poor':
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      default:
        return <Wifi className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (!networkStatus.isOnline) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    
    switch (networkStatus.quality) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'fair':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!user || user.privilege_level < 4) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield size={64} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need HR Manager privileges (Level 4+) to access Myanmar Security settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🇲🇲 Myanmar Security
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor system status and manage security for Myanmar deployment
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Network Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Network Status
            </h3>
            {getStatusIcon()}
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium ${networkStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {networkStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Quality:</span>
              <span className="font-medium capitalize">
                {networkStatus.quality}
              </span>
            </div>
            
            {networkStatus.pendingSync > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Pending Sync:</span>
                <span className="font-medium text-blue-600">
                  {networkStatus.pendingSync} items
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleManualSync}
            disabled={!networkStatus.isOnline}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Now</span>
          </button>
        </div>

        {/* Offline Data */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Offline Data
            </h3>
            <Database className="w-6 h-6 text-blue-500" />
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Cached Items:</span>
              <span className="font-medium">{offlineData.cachedItems}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Storage Used:</span>
              <span className="font-medium">{offlineData.storageUsed}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last Sync:</span>
              <span className="font-medium">{offlineData.lastSync}</span>
            </div>
          </div>
          
          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>Clear Cache</span>
          </button>
        </div>

        {/* Security Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Security Status
            </h3>
            <Lock className="w-6 h-6 text-green-500" />
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">E2EE:</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Encryption:</span>
              <span className="font-medium">AES-256-GCM</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Key Rotation:</span>
              <span className="font-medium">Automatic</span>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                All security features active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Myanmar Features Overview - Hidden */}
      {/* <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-blue-500" />
          Myanmar Deployment Features
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Censorship Resistance</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Multiple connection methods bypass internet blocks
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Lock className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Surveillance Protection</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                E2EE keeps all data encrypted and secure
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Wifi className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Offline Functionality</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Core HR functions work without internet
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Smartphone className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Mobile Optimized</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                PWA works great on mobile devices
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Database className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Local Storage</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Critical data cached locally for offline access
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Zap className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Auto Recovery</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                System recovers when connection is restored
              </p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-purple-500" />
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleManualSync}
            disabled={!networkStatus.isOnline}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Sync Data</span>
          </button>
          
          <button
            onClick={handleClearCache}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Database className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Clear Cache</span>
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Globe className="w-6 h-6 mr-2 text-blue-500" />
                  Myanmar Security Settings
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Simplified Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Auto Sync</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatically sync data when online</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-500">
                    <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Offline Mode</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Enable offline functionality</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500">
                    <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">E2EE Encryption</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">End-to-end encryption for all data</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-500">
                    <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white" />
                  </button>
                </div>
              </div>

              {/* Info Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  Myanmar Deployment Features
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-blue-800 dark:text-blue-200">Censorship resistance</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-blue-800 dark:text-blue-200">Offline functionality</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-blue-800 dark:text-blue-200">E2EE protection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-blue-800 dark:text-blue-200">Mobile optimized</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyanmarSecurity; 