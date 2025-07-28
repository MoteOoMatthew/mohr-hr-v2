import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import networkService from '../services/NetworkService';

const NetworkStatus = () => {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    quality: 'unknown',
    pendingSync: 0,
    currentMethod: null
  });
  const [showDetails, setShowDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Get initial status
    updateStatus();

    // Listen for network status changes
    const handleStatusChange = (event) => {
      updateStatus();
    };

    const handleQualityChange = (event) => {
      setStatus(prev => ({
        ...prev,
        quality: event.detail.quality
      }));
    };

    const handleSyncComplete = (event) => {
      setIsSyncing(false);
      updateStatus();
    };

    window.addEventListener('networkStatusChange', handleStatusChange);
    window.addEventListener('connectionQualityChange', handleQualityChange);
    window.addEventListener('syncComplete', handleSyncComplete);

    // Update status periodically
    const interval = setInterval(updateStatus, 10000);

    return () => {
      window.removeEventListener('networkStatusChange', handleStatusChange);
      window.removeEventListener('connectionQualityChange', handleQualityChange);
      window.removeEventListener('syncComplete', handleSyncComplete);
      clearInterval(interval);
    };
  }, []);

  const updateStatus = () => {
    const connectionStatus = networkService.getConnectionStatus();
    setStatus(connectionStatus);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await networkService.forceSync();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (!status.isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    switch (status.quality) {
      case 'excellent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'good':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'fair':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (!status.isOnline) {
      return 'Offline';
    }
    
    switch (status.quality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    if (!status.isOnline) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    
    switch (status.quality) {
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

  if (!status.isOnline && status.pendingSync === 0) {
    return null; // Don't show when offline and no pending sync
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 max-w-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {status.pendingSync > 0 && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {status.pendingSync} pending
              </span>
            )}
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Connection:</span>
                <span className="font-medium">
                  {status.currentMethod?.name || 'Primary'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Quality:</span>
                <span className="font-medium capitalize">{status.quality}</span>
              </div>
              
              {status.pendingSync > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending Sync:</span>
                  <span className="font-medium text-blue-600">
                    {status.pendingSync} items
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`font-medium ${status.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {status.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            
            {status.pendingSync > 0 && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="mt-3 w-full flex items-center justify-center space-x-2 bg-blue-500 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkStatus; 