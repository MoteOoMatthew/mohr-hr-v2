import axios from 'axios'

// Configure axios defaults based on environment
const isDevelopment = import.meta.env.DEV
const baseURL = isDevelopment 
  ? 'http://localhost:5000' 
  : 'https://mohr-hr-v2.onrender.com'

axios.defaults.baseURL = baseURL
axios.defaults.headers.common['Content-Type'] = 'application/json'

// Add request interceptor for logging
axios.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for logging
axios.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)

export default axios 