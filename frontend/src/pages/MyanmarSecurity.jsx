import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import networkService from '../services/NetworkService';
import emergencyLogoutService from '../services/EmergencyLogoutService';
import MyanmarSecuritySettings from '../components/MyanmarSecuritySettings';
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
  Eye,
  EyeOff,
  Download,
  Upload,
  Server,
  Network,
  Signal,
  Battery,
  Clock,
  AlertCircle,
  Info,
  Play,
  Pause,
  RotateCcw,
  LogOut
} from 'lucide-react';

const MyanmarSecurity = () => {
  const { user } = useAuth();
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    quality: 'unknown',
    pendingSync: 0,
    currentMethod: null,
    connectionMethods: []
  });
  const [offlineData, setOfflineData] = useState({
    cachedItems: 0,
    storageUsed: '0 MB',
    lastSync: null,
    syncStatus: 'idle'
  });
  const [securityStatus, setSecurityStatus] = useState({
    e2eeEnabled: true,
    encryptionLevel: 'AES-256-GCM',
    keyRotation: 'Automatic',
    auditLogging: true,
    dataResidency: 'Local'
  });
  const [settings, setSettings] = useState({
    autoSync: true,
    syncInterval: 5,
    cacheExpiry: 24,
    connectionTimeout: 10,
    retryAttempts: 3
  });
  const [logs, setLogs] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    updateNetworkStatus();
    updateOfflineData();
    loadSecurityLogs();

    const interval = setInterval(() => {
      updateNetworkStatus();
      updateOfflineData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateNetworkStatus = () => {
    const status = networkService.getConnectionStatus();
    setNetworkStatus(status);
  };

  const updateOfflineData = () => {
    // Simulate offline data status
    const cachedData = networkService.loadFromLocalStorage('offlineData');
    const pendingSync = networkService.loadFromLocalStorage('pendingSync') || [];
    
    setOfflineData({
      cachedItems: Object.keys(cachedData || {}).length,
      storageUsed: `${Math.round(JSON.stringify(cachedData || {}).length / 1024)} KB`,
      lastSync: localStorage.getItem('lastSync') || 'Never',
      syncStatus: pendingSync.length > 0 ? 'pending' : 'idle'
    });
  };

  const loadSecurityLogs = () => {
    // Simulate security logs
    const mockLogs = [
      { timestamp: new Date(), level: 'info', message: 'E2EE session initialized', user: user?.name },
      { timestamp: new Date(Date.now() - 300000), level: 'warning', message: 'Connection quality degraded', user: 'System' },
      { timestamp: new Date(Date.now() - 600000), level: 'success', message: 'Offline data synced successfully', user: 'System' },
      { timestamp: new Date(Date.now() - 900000), level: 'info', message: 'Network failover to backup server', user: 'System' }
    ];
    setLogs(mockLogs);
  };

  const handleManualSync = async () => {
    try {
      await networkService.forceSync();
      updateNetworkStatus();
      updateOfflineData();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleClearCache = () => {
    networkService.clearOfflineData();
    updateOfflineData();
  };

  const handleToggleAutoSync = () => {
    setSettings(prev => ({ ...prev, autoSync: !prev.autoSync }));
  };

  const getConnectionQualityColor = (quality) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConnectionQualityIcon = (quality) => {
    switch (quality) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'good': return <Wifi className="w-5 h-5 text-green-400" />;
      case 'fair': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'poor': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default: return <Wifi className="w-5 h-5 text-gray-400" />;
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🇲🇲 Myanmar Security Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage security features optimized for Myanmar deployment
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
          
          <button
            onClick={() => emergencyLogoutService.manualEmergencyLogout()}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            title="Emergency Logout - Purge all data (Ctrl+Shift+E)"
          >
            <LogOut className="w-4 h-4" />
            <span>Emergency Logout</span>
          </button>
        </div>
      </div>

      {/* Network Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Network Status
            </h3>
            {getConnectionQualityIcon(networkStatus.quality)}
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium ${networkStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {networkStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Quality:</span>
              <span className={`font-medium capitalize ${getConnectionQualityColor(networkStatus.quality)}`}>
                {networkStatus.quality}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Connection:</span>
              <span className="font-medium">
                {networkStatus.currentMethod?.name || 'Primary'}
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
            className="mt-4 w-full flex items-center justify-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Now</span>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Offline Data
            </h3>
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          
          <div className="space-y-3">
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
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sync Status:</span>
              <span className={`font-medium ${offlineData.syncStatus === 'idle' ? 'text-green-600' : 'text-yellow-600'}`}>
                {offlineData.syncStatus}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleClearCache}
            className="mt-4 w-full flex items-center justify-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear Cache</span>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Security Status
            </h3>
            <Lock className="w-5 h-5 text-green-500" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">E2EE:</span>
              <span className="font-medium text-green-600">Active</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Encryption:</span>
              <span className="font-medium">{securityStatus.encryptionLevel}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Key Rotation:</span>
              <span className="font-medium">{securityStatus.keyRotation}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Audit Logging:</span>
              <span className="font-medium text-green-600">Enabled</span>
            </div>
          </div>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-4 w-full flex items-center justify-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Security Settings</span>
          </button>
        </div>
      </div>

      {/* Connection Methods */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Network className="w-5 h-5 mr-2 text-blue-500" />
          Connection Methods
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {networkStatus.connectionMethods.map((method, index) => (
            <div
              key={method.name}
              className={`p-4 rounded-lg border-2 ${
                method.name === networkStatus.currentMethod?.name
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {method.name.charAt(0).toUpperCase() + method.name.slice(1)}
                </span>
                {method.name === networkStatus.currentMethod?.name && (
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                )}
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Priority: {method.priority}
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                URL: {method.url ? method.url.substring(0, 20) + '...' : 'Not configured'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-gray-500" />
            Advanced Security Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Sync Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Auto Sync:</span>
                  <button
                    onClick={handleToggleAutoSync}
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
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Sync Interval (min):</span>
                  <input
                    type="number"
                    value={settings.syncInterval}
                    onChange={(e) => setSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="1"
                    max="60"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Connection Timeout (s):</span>
                  <input
                    type="number"
                    value={settings.connectionTimeout}
                    onChange={(e) => setSettings(prev => ({ ...prev, connectionTimeout: parseInt(e.target.value) }))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="1"
                    max="30"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Cache Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Cache Expiry (hours):</span>
                  <input
                    type="number"
                    value={settings.cacheExpiry}
                    onChange={(e) => setSettings(prev => ({ ...prev, cacheExpiry: parseInt(e.target.value) }))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="1"
                    max="168"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Retry Attempts:</span>
                  <input
                    type="number"
                    value={settings.retryAttempts}
                    onChange={(e) => setSettings(prev => ({ ...prev, retryAttempts: parseInt(e.target.value) }))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-purple-500" />
          Security Activity Logs
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className={`w-2 h-2 rounded-full ${
                log.level === 'success' ? 'bg-green-500' :
                log.level === 'warning' ? 'bg-yellow-500' :
                log.level === 'error' ? 'bg-red-500' : 'bg-blue-500'
              }`} />
              
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {log.message}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {log.timestamp.toLocaleString()} • {log.user}
                </div>
              </div>
              
              <div className={`text-xs px-2 py-1 rounded ${
                log.level === 'success' ? 'bg-green-100 text-green-800' :
                log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                log.level === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {log.level.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Myanmar-Specific Features Info */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
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
              <h4 className="font-medium text-gray-900 dark:text-white">Government Surveillance Protection</h4>
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
              <h4 className="font-medium text-gray-900 dark:text-white">Local Data Storage</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Critical data cached locally for offline access
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Zap className="w-5 h-5 text-green-500 mt-1" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Automatic Recovery</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                System recovers when connection is restored
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <MyanmarSecuritySettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default MyanmarSecurity; 