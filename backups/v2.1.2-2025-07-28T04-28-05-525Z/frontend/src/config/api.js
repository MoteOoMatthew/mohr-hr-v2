import axios from 'axios'

// Configure axios defaults based on environment
const isDevelopment = import.meta.env.DEV
const baseURL = isDevelopment 
  ? 'http://localhost:5000' 
  : 'https://mohr-hr-v2.onrender.com'

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