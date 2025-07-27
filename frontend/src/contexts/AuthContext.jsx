import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

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

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      setUser(response.data.user)
    } catch (error) {
      console.error('Auth check failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      setError(null)
      setLoading(true)
      
      const response = await axios.post('/api/auth/login', credentials)
      const { token, user } = response.data
      
      // Store token
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      setUser(user)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setError(null)
  }

  const register = async (userData) => {
    try {
      setError(null)
      setLoading(true)
      
      const response = await axios.post('/api/auth/register', userData)
      const { token, user } = response.data
      
      // Store token
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      setUser(user)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (profileData) => {
    try {
      setError(null)
      const response = await axios.put('/api/auth/profile', profileData)
      setUser(response.data.user)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    updateProfile,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 