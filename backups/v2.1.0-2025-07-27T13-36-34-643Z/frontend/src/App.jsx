import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Leave from './pages/Leave'
import Profile from './pages/Profile'
import E2EEDemo from './pages/E2EEDemo'
import AdvancedSecurity from './pages/AdvancedSecurity'
import ProtectedRoute from './components/ProtectedRoute'
import { APP_VERSION } from './config/version'

console.log('📱 App component loading...')

function App() {
  console.log('🎯 App component rendering...')
  
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/e2ee-demo" element={<E2EEDemo />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="leave" element={<Leave />} />
              <Route path="profile" element={<Profile />} />
              <Route path="advanced-security" element={<AdvancedSecurity />} />
            </Route>
          </Routes>
          {/* Version Display */}
          <div className="fixed bottom-2 right-2 text-xs text-gray-400 dark:text-gray-600 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">
            v{APP_VERSION}
          </div>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

console.log('✅ App component loaded')

export default App 