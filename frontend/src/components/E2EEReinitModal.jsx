import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Lock, CheckCircle } from 'lucide-react'

const E2EEReinitModal = () => {
  const { user, e2eeStatus, initializeE2EEManually, needsE2EEReinit } = useAuth()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // Show modal if E2EE needs re-initialization
  useEffect(() => {
    const shouldShow = needsE2EEReinit()
    console.log('🔍 E2EEReinitModal: needsE2EEReinit() returned:', shouldShow)
    console.log('🔍 E2EEReinitModal: user:', !!user, 'e2eeStatus.supported:', e2eeStatus.supported, 'e2eeStatus.initialized:', e2eeStatus.initialized)
    
    if (shouldShow && !showModal) {
      console.log('🔒 E2EEReinitModal: Showing security modal')
      setShowModal(true)
    }
  }, [user, e2eeStatus.supported, e2eeStatus.initialized, showModal])

  // Listen for custom event to show modal
  useEffect(() => {
    const handleShowModal = () => {
      console.log('🔒 E2EEReinitModal: Received showE2EEModal event')
      if (needsE2EEReinit()) {
        console.log('🔒 E2EEReinitModal: Showing modal from custom event')
        setShowModal(true)
      }
    }

    window.addEventListener('showE2EEModal', handleShowModal)
    return () => {
      window.removeEventListener('showE2EEModal', handleShowModal)
    }
  }, [needsE2EEReinit])

  // Don't render if not needed
  if (!needsE2EEReinit() || !showModal) {
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await initializeE2EEManually(password, user.salt)
      
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
        }, 2000)
      } else {
        setError(result.error || 'Failed to initialize E2EE')
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full p-8 border-2 border-red-500">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex-shrink-0">
            <Shield className="h-12 w-12 text-red-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Re-enter your password to continue your session
            </h3>
          </div>
        </div>

        {success ? (
          <div className="bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-3 text-green-700 dark:text-green-300">
              <CheckCircle className="h-8 w-8" />
              <div>
                <p className="text-xl font-bold">✅ Security Initialized Successfully!</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-300 font-medium">
                ❌ {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isLoading || !password}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Initializing...
                  </span>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default E2EEReinitModal 