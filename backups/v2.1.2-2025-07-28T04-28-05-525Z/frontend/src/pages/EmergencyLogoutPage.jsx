import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react'

const EmergencyLogoutPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-redirect to login after 10 seconds
    const timer = setTimeout(() => {
      navigate('/login')
    }, 10000)

    return () => clearTimeout(timer)
  }, [navigate])

  const handleReturnToLogin = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Emergency Logout Complete
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Hot Radish - Emergency Security Protocol
          </p>
        </div>

        {/* Status Cards */}
        <div className="space-y-4 mb-8">
          {/* Data Cleared */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Local Data Cleared
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  All cached data and encryption keys have been removed from your device.
                </p>
              </div>
            </div>
          </div>

          {/* Browser Cache */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Browser Cache Cleared
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Local storage, session storage, and IndexedDB have been purged.
                </p>
              </div>
            </div>
          </div>

          {/* Security Status */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Security Protocol Activated
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your session has been securely terminated. No data remains on this device.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-8">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            What happened?
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• All local data has been permanently deleted</li>
            <li>• Encryption keys have been cleared</li>
            <li>• Browser cache and storage have been purged</li>
            <li>• Your session has been terminated</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleReturnToLogin}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Return to Login
          </button>
          
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You will be automatically redirected in 10 seconds
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            If you believe your security has been compromised, please contact your system administrator immediately.
          </p>
        </div>
      </div>
    </div>
  )
}

export default EmergencyLogoutPage 