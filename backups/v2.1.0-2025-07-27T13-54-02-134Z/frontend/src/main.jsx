import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

console.log('🚀 MOHR HR System - Frontend starting...')

try {
  const rootElement = document.getElementById('root')
  console.log('📄 Root element found:', rootElement)
  
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  
  const root = ReactDOM.createRoot(rootElement)
  console.log('✅ React root created')
  
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
  
  console.log('✅ React app rendered successfully')
} catch (error) {
  console.error('❌ Failed to render React app:', error)
  
  // Fallback: show error message
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>🚨 MOHR HR System - Error</h1>
        <p>Failed to load the application. Please check the console for details.</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `
  }
} 