import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/api';
import { 
  Shield, 
  Download, 
  Upload, 
  Settings, 
  Clock, 
  HardDrive, 
  Cloud, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  Trash2, 
  RefreshCw,
  FileText,
  Database,
  FolderOpen,
  Zap,
  Lock,
  Unlock,
  UserX,
  Info
} from 'lucide-react';

const BackupManagement = () => {
  const { user } = useAuth();
  const [backupStatus, setBackupStatus] = useState(null);
  const [backups, setBackups] = useState({ local: [], cloud: [] });
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch backup status and data
  const fetchBackupData = async () => {
    try {
      setLoading(true);
      setError(null);
      setAccessDenied(false);
      
      const [statusRes, listRes, configRes] = await Promise.all([
        axios.get('/api/backup/status'),
        axios.get('/api/backup/list'),
        axios.get('/api/backup/config')
      ]);

      setBackupStatus(statusRes.data.data);
      setBackups(listRes.data.data);
      setConfig(configRes.data.data);
    } catch (err) {
      console.error('Backup data fetch error:', err);
      
      if (err.response?.status === 403 || err.response?.status === 401) {
        setAccessDenied(true);
        setError('Access denied. Admin privileges required for backup management.');
      } else {
        setError('Failed to fetch backup data. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupData();
  }, []);

  // Create manual backup
  const handleCreateBackup = async () => {
    try {
      setActionLoading(true);
      const response = await axios.post('/api/backup/create', {
        password: createPassword || undefined
      });

      if (response.data.success) {
        alert('✅ Backup created successfully!');
        setShowCreateModal(false);
        setCreatePassword('');
        fetchBackupData();
      }
    } catch (err) {
      alert('❌ Failed to create backup: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Restore from backup
  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    try {
      setActionLoading(true);
      const response = await axios.post('/api/backup/restore', {
        backupPath: selectedBackup.path || selectedBackup.id,
        password: restorePassword || undefined,
        source: selectedBackup.source || 'local'
      });

      if (response.data.success) {
        alert('✅ Backup restored successfully! Please restart the application.');
        setShowRestoreModal(false);
        setRestorePassword('');
        setSelectedBackup(null);
        fetchBackupData();
      }
    } catch (err) {
      alert('❌ Failed to restore backup: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Delete backup
  const handleDeleteBackup = async (backup, source) => {
    if (!confirm(`Are you sure you want to delete "${backup.name}"?`)) return;

    try {
      setActionLoading(true);
      const response = await axios.delete('/api/backup/delete', {
        data: {
          backupPath: backup.path || backup.id,
          source: source
        }
      });

      if (response.data.success) {
        alert('✅ Backup deleted successfully!');
        fetchBackupData();
      }
    } catch (err) {
      alert('❌ Failed to delete backup: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Test backup system
  const handleTestBackup = async () => {
    try {
      setActionLoading(true);
      const response = await axios.post('/api/backup/test');
      
      if (response.data.success) {
        alert('✅ Backup system test completed successfully!');
      }
    } catch (err) {
      alert('❌ Backup system test failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Cleanup old backups
  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to cleanup old backups? This cannot be undone.')) return;

    try {
      setActionLoading(true);
      const response = await axios.post('/api/backup/cleanup');
      
      if (response.data.success) {
        alert('✅ Cleanup completed successfully!');
        fetchBackupData();
      }
    } catch (err) {
      alert('❌ Cleanup failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Update configuration
  const handleUpdateConfig = async (newConfig) => {
    try {
      setActionLoading(true);
      const response = await axios.put('/api/backup/config', newConfig);
      
      if (response.data.success) {
        alert('✅ Configuration updated successfully!');
        setShowConfigModal(false);
        fetchBackupData();
      }
    } catch (err) {
      alert('❌ Failed to update configuration: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Access Denied UI
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <UserX className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Backup management requires administrator privileges. Please contact your system administrator.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Default Admin Credentials
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Username: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">admin</code><br/>
                    Password: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">admin123</code>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p className="font-medium mb-2">What you can do:</p>
                <ul className="space-y-1 text-left max-w-md mx-auto">
                  <li>• Contact your system administrator</li>
                  <li>• Use the default admin account for testing</li>
                  <li>• Request elevated privileges</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchBackupData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Shield className="h-8 w-8 mr-3 text-primary-600" />
              Backup Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage system backups, cloud storage, and recovery operations
            </p>
            {user && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Logged in as: {user.name} (Level {user.privilege_level || 1})
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchBackupData}
              disabled={actionLoading}
              className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={actionLoading}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Create Backup
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Scheduler Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduler</h3>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${backupStatus?.scheduler?.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {backupStatus?.scheduler?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Schedule: {backupStatus?.scheduler?.schedule || 'Not set'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Next: {backupStatus?.scheduler?.nextBackup ? new Date(backupStatus.scheduler.nextBackup).toLocaleString() : 'Unknown'}
              </div>
            </div>
          </div>

          {/* Local Storage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Local Storage</h3>
              <HardDrive className="h-5 w-5 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Backups: {backupStatus?.local?.backups || 0}
              </div>
              {backupStatus?.local?.latest && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Latest: {new Date(backupStatus.local.latest.created).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Cloud Storage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cloud Storage</h3>
              <Cloud className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${backupStatus?.cloud?.initialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {backupStatus?.cloud?.initialized ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Backups: {backupStatus?.cloud?.backups || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Storage: {backupStatus?.cloud?.storageUsed || 0} MB
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={handleTestBackup}
              disabled={actionLoading}
              className="flex items-center justify-center px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
            >
              <Zap className="h-4 w-4 mr-2" />
              Test System
            </button>
            <button
              onClick={handleCleanup}
              disabled={actionLoading}
              className="flex items-center justify-center px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/40 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              disabled={actionLoading}
              className="flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>
            <button
              onClick={() => setShowRestoreModal(true)}
              disabled={actionLoading}
              className="flex items-center justify-center px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Restore
            </button>
          </div>
        </div>

        {/* Backup Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Local Backups */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <HardDrive className="h-5 w-5 mr-2 text-green-500" />
                Local Backups ({backups.local.length})
              </h3>
            </div>
            <div className="p-6">
              {backups.local.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No local backups found</p>
              ) : (
                <div className="space-y-3">
                  {backups.local.map((backup, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{backup.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(backup.created).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBackup({ ...backup, source: 'local' });
                            setShowRestoreModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                          title="Restore"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup, 'local')}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cloud Backups */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Cloud className="h-5 w-5 mr-2 text-blue-500" />
                Cloud Backups ({backups.cloud.length})
              </h3>
            </div>
            <div className="p-6">
              {backups.cloud.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No cloud backups found</p>
              ) : (
                <div className="space-y-3">
                  {backups.cloud.map((backup, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{backup.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(backup.createdTime).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBackup({ ...backup, source: 'cloud' });
                            setShowRestoreModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                          title="Restore"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup, 'cloud')}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create Backup Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Manual Backup</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password (optional)
                  </label>
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Leave empty for default password"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateBackup}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {actionLoading ? 'Creating...' : 'Create Backup'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restore Backup Modal */}
        {showRestoreModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Restore from Backup</h3>
              <div className="space-y-4">
                {selectedBackup && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">{selectedBackup.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Source: {selectedBackup.source}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password (if required)
                  </label>
                  <input
                    type="password"
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter backup password"
                  />
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-sm text-yellow-800 dark:text-yellow-200">
                      Warning: This will overwrite current data. Make sure you have a backup!
                    </span>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowRestoreModal(false);
                      setSelectedBackup(null);
                      setRestorePassword('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRestoreBackup}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {actionLoading ? 'Restoring...' : 'Restore Backup'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Modal */}
        {showConfigModal && config && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Backup Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enabled
                  </label>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Schedule (Cron)
                  </label>
                  <input
                    type="text"
                    value={config.schedule}
                    onChange={(e) => setConfig({ ...config, schedule: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0 2 * * *"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Keep Local Backups
                  </label>
                  <input
                    type="number"
                    value={config.keepLocalBackups}
                    onChange={(e) => setConfig({ ...config, keepLocalBackups: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Keep Cloud Backups
                  </label>
                  <input
                    type="number"
                    value={config.keepCloudBackups}
                    onChange={(e) => setConfig({ ...config, keepCloudBackups: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="365"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload to Cloud
                  </label>
                  <input
                    type="checkbox"
                    checked={config.uploadToCloud}
                    onChange={(e) => setConfig({ ...config, uploadToCloud: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowConfigModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateConfig(config)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {actionLoading ? 'Updating...' : 'Update Configuration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManagement; 