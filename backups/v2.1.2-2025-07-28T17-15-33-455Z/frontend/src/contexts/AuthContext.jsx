import { createContext, useContext, useState, useEffect } from 'react'
import axios from '../config/api'
import e2eeService from '../services/E2EEService'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [e2eeStatus, setE2eeStatus] = useState({
    supported: false,
    initialized: false,
    error: null
  })

  // Check if user is already logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Set default auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // Verify token is still valid
      checkAuthStatus()
    } else {
      setLoading(false)
    }
  }, [])

  // Check E2EE support on mount
  useEffect(() => {
    console.log('🔍 Checking E2EE support...')
    const supported = e2eeService.isSupported()
    console.log('✅ E2EE support check result:', supported)
    
    setE2eeStatus(prev => ({
      ...prev,
      supported
    }))
    
    if (!supported) {
      console.warn('⚠️ E2EE not supported in this browser.')
    } else {
      console.log('✅ E2EE is supported in this browser')
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      const userData = response.data.user
      
      setUser(userData)
      
      // Always require password re-entry for E2EE when reopening from URL
      // This provides better security by ensuring users re-authenticate their E2EE session
      if (userData.salt && e2eeStatus.supported) {
        console.log('🔒 E2EE requires re-initialization for security - user must re-enter password')
        // Don't auto-restore session - force user to re-enter password
        setE2eeStatus(prev => ({
          ...prev,
          initialized: false,
          error: null
        }))
        
        // Dispatch custom event to trigger the security modal
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('showE2EEModal'))
        }, 100)
        
        return
      }
      
    } catch (error) {
      console.error('Auth check failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const initializeE2EE = async (password, salt) => {
    try {
      console.log('🔒 Starting E2EE initialization with salt:', salt ? 'Present' : 'Missing')
      
      if (!password || !salt) {
        throw new Error('Password and salt are required for E2EE initialization')
      }
      
      console.log('🔐 Initializing E2EE service...')
      const success = await e2eeService.initialize(password, salt)
      
      if (success) {
        setE2eeStatus(prev => ({
          ...prev,
          initialized: true,
          error: null
        }))
        
        // Store E2EE session in sessionStorage for browser session persistence
        const sessionData = {
          timestamp: Date.now(),
          userId: user?.id,
          salt: salt,
          // Don't store the password - it's only used for key derivation
        }
        sessionStorage.setItem('e2ee_session', JSON.stringify(sessionData))
        console.log('✅ E2EE initialized successfully and session stored')
      } else {
        setE2eeStatus(prev => ({
          ...prev,
          initialized: true,
          error: 'E2EE initialization failed - using TLS fallback'
        }))
        console.log('⚠️ E2EE initialization failed - using TLS fallback')
      }
    } catch (error) {
      console.error('❌ E2EE initialization failed:', error)
      setE2eeStatus(prev => ({
        ...prev,
        error: 'E2EE initialization failed'
      }))
      throw error
    }
  }



  const initializeE2EEManually = async (password, salt) => {
    try {
      console.log('🔒 Manual E2EE initialization started')
      
      if (!password || !salt) {
        throw new Error('Password and salt are required')
      }
      
      await e2eeService.initialize(password, salt)
      
      setE2eeStatus(prev => ({
        ...prev,
        initialized: true,
        error: null
      }))
      
      console.log('✅ Manual E2EE initialization successful')
      return { success: true }
    } catch (error) {
      console.error('❌ Manual E2EE initialization failed:', error)
      setE2eeStatus(prev => ({
        ...prev,
        error: error.message
      }))
      return { success: false, error: error.message }
    }
  }

  const login = async (credentials) => {
    try {
      setError(null) // Clear any previous errors
      console.log('🔐 Attempting login with:', credentials.username)
      
      const response = await axios.post('/api/auth/login', credentials);
      console.log('📡 API Response received:', response.status, response.data)
      
      const { token, user: userData } = response.data;
      console.log('🔑 Token extracted:', token ? 'Present' : 'Missing')
      console.log('👤 User data extracted:', userData)
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      console.log('✅ User state updated:', userData.username)
      
      // Automatically initialize E2EE if supported and user has salt
      if (userData.salt && e2eeService && e2eeService.isSupported()) {
        console.log('🔒 Automatically initializing E2EE service...')
        console.log('🔑 User salt:', userData.salt ? 'Present' : 'Missing')
        console.log('🌐 E2EE supported:', e2eeService.isSupported())
        try {
          await initializeE2EE(credentials.password, userData.salt);
          console.log('✅ E2EE automatically initialized successfully');
        } catch (e2eeError) {
          console.warn('⚠️ E2EE initialization failed, continuing without encryption:', e2eeError);
          // Don't let E2EE failure prevent login
        }
      } else {
        console.log('ℹ️ E2EE not available or not needed');
        if (!userData.salt) {
          console.log('⚠️ User has no salt for E2EE initialization');
        }
        if (!e2eeService.isSupported()) {
          console.log('⚠️ E2EE not supported in this browser');
        }
      }
      
      console.log('🎉 Login function completed successfully, returning success');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      console.error('❌ Login error:', message);
      console.error('🔍 Full error details:', error.response?.data)
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('e2ee_session'); // Clear E2EE session
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
    
    // Clean up E2EE resources
    if (e2eeService) {
      e2eeService.cleanup();
    }
    
    setE2eeStatus(prev => ({
      ...prev,
      initialized: false
    }));
    console.log('🚪 User logged out and E2EE cleaned up');
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      const { token, user: newUser } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(newUser);
      
      // Generate and send E2EE salt for new user
      if (e2eeStatus.supported) {
        const salt = e2eeService.generateSalt();
        // Send salt to backend to store with user
        await axios.post('/api/auth/update-salt', { salt });
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      console.error('Registration error:', message);
      return { success: false, error: message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      const updatedUser = response.data.user;
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Profile update failed';
      console.error('Profile update error:', message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    updateProfile,
    e2eeStatus,
    e2eeService: e2eeStatus.initialized ? e2eeService : null,
    initializeE2EEManually,
    // Add function to check if E2EE needs re-initialization
    needsE2EEReinit: () => {
      return user && e2eeStatus.supported && !e2eeStatus.initialized
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 