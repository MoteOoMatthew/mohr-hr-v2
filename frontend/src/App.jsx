import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Leave from './pages/Leave'
import Profile from './pages/Profile'
import E2EEDemo from './pages/E2EEDemo'
import ProtectedRoute from './components/ProtectedRoute'

console.log('📱 App component loading...')

function App() {
  console.log('🎯 App component rendering...')
  
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
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
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  )
}

console.log('✅ App component loaded')

export default App 