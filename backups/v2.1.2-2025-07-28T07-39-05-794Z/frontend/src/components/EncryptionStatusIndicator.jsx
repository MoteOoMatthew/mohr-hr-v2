import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Wifi, WifiOff, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import e2eeService from '../services/E2EEService';

const EncryptionStatusIndicator = () => {
  const { e2eeStatus } = useAuth();
  const [encryptionStatus, setEncryptionStatus] = useState({
    mode: 'unknown',
    networkSpeed: 'unknown',
    autoMode: true,
    initialized: false
  });
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Get initial status
    updateStatus();

    // Listen for encryption mode changes
    const handleEncryptionModeChange = (event) => {
      const { fromMode, toMode, reason } = event.detail;
      
      // Show notification
      setNotification({
        type: 'info',
        title: 'Encryption Mode Changed',
        message: reason,
        fromMode,
        toMode
      });
      setShowNotification(true);
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      // Update status
      updateStatus();
    };

    // Listen for status changes
    const handleStatusChange = () => {
      updateStatus();
    };

    window.addEventListener('encryptionModeChange', handleEncryptionModeChange);
    e2eeService.onStatusChange(handleStatusChange);

    return () => {
      window.removeEventListener('encryptionModeChange', handleEncryptionModeChange);
    };
  }, []);

  const updateStatus = () => {
    const status = e2eeService.getStatus();
    setEncryptionStatus({
      mode: status.encryptionMode || 'unknown',
      networkSpeed: status.networkSpeed || 'unknown',
      autoMode: status.autoMode !== false,
      initialized: status.initialized || false
    });
  };

  const getStatusIcon = () => {
    if (!encryptionStatus.initialized) {
      return <ShieldAlert className="w-5 h-5 text-gray-400" />;
    }

    switch (encryptionStatus.mode) {
      case 'e2ee':
        return <ShieldCheck className="w-5 h-5 text-green-500" />;
      case 'tls':
        return <Shield className="w-5 h-5 text-blue-500" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (!encryptionStatus.initialized) {
      return 'Not Initialized';
    }

    switch (encryptionStatus.mode) {
      case 'e2ee':
        return 'E2EE Active';
      case 'tls':
        return 'TLS Active';
      default:
        return 'Unknown';
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
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'good':
        return <Wifi className="w-4 h-4 text-blue-500" />;
      case 'fair':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTooltipText = () => {
    if (!encryptionStatus.initialized) {
      return 'Encryption not initialized';
    }

    const modeText = encryptionStatus.mode === 'e2ee' 
      ? 'End-to-End Encryption' 
      : 'Transport Layer Security';
    
    const networkText = `Network: ${encryptionStatus.networkSpeed}`;
    const autoText = encryptionStatus.autoMode ? 'Auto-switching enabled' : 'Manual mode';
    
    return `${modeText}\n${networkText}\n${autoText}`;
  };

  return (
    <>
      {/* Status Indicator */}
      <div className="relative">
        <div
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${getStatusColor()}`}
          title={getTooltipText()}
        >
          {getStatusIcon()}
          <span>{getStatusText()}</span>
          {encryptionStatus.autoMode && (
            <div className="flex items-center space-x-1">
              {getNetworkIcon()}
              <span className="text-xs opacity-75">
                {encryptionStatus.networkSpeed}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notification */}
      {showNotification && notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {notification.type === 'info' ? (
                  <Info className="w-5 h-5 text-blue-500" />
                ) : notification.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {notification.message}
                </p>
                <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                  <span className={`px-2 py-1 rounded ${
                    notification.fromMode === 'e2ee' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {notification.fromMode.toUpperCase()}
                  </span>
                  <span>→</span>
                  <span className={`px-2 py-1 rounded ${
                    notification.toMode === 'e2ee' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {notification.toMode.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EncryptionStatusIndicator; 