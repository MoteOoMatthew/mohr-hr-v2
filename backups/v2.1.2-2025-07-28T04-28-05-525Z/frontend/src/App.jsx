import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Leave from './pages/Leave'
import Privileges from './pages/Privileges'
import MyanmarSecurity from './pages/MyanmarSecurity'
import Profile from './pages/Profile'
import E2EEDemo from './pages/E2EEDemo'
import AdvancedSecurity from './pages/AdvancedSecurity'
import EmergencyLogoutPage from './pages/EmergencyLogoutPage'
import Documents from './pages/Documents'
import Onboarding from './pages/Onboarding'
import BackupManagement from './pages/BackupManagement'
import ProtectedRoute from './components/ProtectedRoute'
import NetworkStatus from './components/NetworkStatus'
import { APP_VERSION } from './config/version'

// Initialize Emergency Logout Service
import './services/EmergencyLogoutService'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <NetworkStatus />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/emergency-logout" element={<EmergencyLogoutPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="leave" element={<Leave />} />
              <Route path="privileges" element={<Privileges />} />
              <Route path="myanmar-security" element={<MyanmarSecurity />} />
              <Route path="profile" element={<Profile />} />
              <Route path="e2ee-demo" element={<E2EEDemo />} />
              <Route path="advanced-security" element={<AdvancedSecurity />} />
              <Route path="documents" element={<Documents />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="backup" element={<BackupManagement />} />
            </Route>
          </Routes>
          <div className="fixed bottom-4 right-4 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm">
            v{APP_VERSION}
          </div>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App 