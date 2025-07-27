import { createContext, useContext, useState, useEffect } from 'react'
import axios from '../config/api'
// import e2eeService from '../services/E2EEService'

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
    // Temporarily disable E2EE to fix rendering issues
    const supported = false // e2eeService.isSupported()
    setE2eeStatus(prev => ({
      ...prev,
      supported
    }))
    
    if (!supported) {
      console.warn('⚠️ E2EE temporarily disabled to fix rendering issues.')
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      const userData = response.data.user
      
      setUser(userData)
      
      // Initialize E2EE if user has salt (temporarily disabled)
      // if (userData.salt && e2eeStatus.supported) {
      //   await initializeE2EE(userData.salt)
      // }
      
    } catch (error) {
      console.error('Auth check failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const initializeE2EE = async (salt) => {
    try {
      // Get password from secure storage or prompt user
      const password = await getStoredPassword()
      
      if (password) {
        // await e2eeService.initialize(password, salt)
        setE2eeStatus(prev => ({
          ...prev,
          initialized: true,
          error: null
        }))
        console.log('🔒 E2EE initialized for user')
      }
    } catch (error) {
      console.error('E2EE initialization failed:', error)
      setE2eeStatus(prev => ({
        ...prev,
        error: 'E2EE initialization failed'
      }))
    }
  }

  const getStoredPassword = async () => {
    // In a real implementation, this would get the password from secure storage
    // For now, we'll prompt the user for their password
    return new Promise((resolve) => {
      const password = prompt('Enter your password to enable E2EE encryption:')
      resolve(password)
    })
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
      
      console.log('💾 Token stored in localStorage and axios headers set')
      
      setUser(userData);
      console.log('✅ User state updated:', userData.username)
      
      // Initialize E2EE if supported and user has salt (temporarily disabled)
      // if (userData.salt && e2eeStatus.supported) {
      //   await initializeE2EE(userData.salt);
      // }
      
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
    setE2eeStatus(prev => ({
      ...prev,
      initialized: false
    }));
    console.log('🚪 User logged out');
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      const { token, user: newUser } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(newUser);
      
      // Generate and send E2EE salt for new user (temporarily disabled)
      // if (e2eeStatus.supported) {
      //   const salt = e2eeService.generateSalt();
      //   // Send salt to backend to store with user
      //   await axios.post('/api/auth/update-salt', { salt });
      // }
      
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
    // e2eeService: e2eeStatus.initialized ? e2eeService : null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 