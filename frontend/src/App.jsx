import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Leave from './pages/Leave'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
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

export default App 