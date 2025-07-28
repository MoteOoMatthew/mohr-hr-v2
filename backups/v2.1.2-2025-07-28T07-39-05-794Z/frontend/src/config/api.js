import axios from 'axios'

// Configure axios defaults based on environment
const isDevelopment = import.meta.env.DEV
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

// Smart base URL detection
const baseURL = isDevelopment || isLocalhost
  ? 'http://localhost:5000' 
  : 'https://mohr-hr-v2.onrender.com'

console.log('🔧 API Configuration:', {
  isDevelopment,
  isLocalhost,
  baseURL,
  env: import.meta.env.MODE,
  hostname: window.location.hostname
})

axios.defaults.baseURL = baseURL
axios.defaults.headers.common['Content-Type'] = 'application/json'

// Add request interceptor for authentication
axios.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)

export default axios 