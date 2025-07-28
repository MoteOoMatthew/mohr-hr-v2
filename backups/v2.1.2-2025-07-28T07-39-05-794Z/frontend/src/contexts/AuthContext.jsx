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
      
      // Initialize E2EE if user has salt
      if (userData.salt && e2eeStatus.supported) {
        await initializeE2EE(userData.salt)
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
      await e2eeService.initialize(password, salt)
      
      setE2eeStatus(prev => ({
        ...prev,
        initialized: true,
        error: null
      }))
      console.log('✅ E2EE initialized successfully for user')
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
        try {
          await e2eeService.initialize(credentials.password, userData.salt);
          setE2eeStatus(prev => ({
            ...prev,
            initialized: true,
            error: null
          }));
          console.log('✅ E2EE automatically initialized successfully');
        } catch (e2eeError) {
          console.warn('⚠️ E2EE initialization failed, continuing without encryption:', e2eeError);
          setE2eeStatus(prev => ({
            ...prev,
            error: 'E2EE initialization failed - continuing without encryption'
          }));
          // Don't let E2EE failure prevent login
        }
      } else {
        console.log('ℹ️ E2EE not available or not needed');
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
    initializeE2EEManually
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 