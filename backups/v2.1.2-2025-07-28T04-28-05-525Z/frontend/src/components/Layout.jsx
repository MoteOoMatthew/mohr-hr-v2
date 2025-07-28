import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import emergencyLogoutService from '../services/EmergencyLogoutService'
import RadishIcon from './RadishIcon'
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Calendar, 
  User, 
  LogOut,
  Bell,
  Search,
  Shield,
  Sun,
  Moon,
  Globe,
  FileText,
  UserPlus
} from 'lucide-react'

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Onboarding', href: '/onboarding', icon: UserPlus },
    { name: 'Backup', href: '/backup', icon: Shield },
    { name: 'Leave Management', href: '/leave', icon: Calendar },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Privileges', href: '/privileges', icon: Shield },
    { name: 'Myanmar Security', href: '/myanmar-security', icon: Globe },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'E2EE Demo', href: '/e2ee-demo', icon: Shield },
    { name: 'Advanced Security', href: '/advanced-security', icon: Shield },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleEmergencyLogout = () => {
    emergencyLogoutService.manualEmergencyLogout()
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 
              className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer app-title flex items-center" 
              data-emergency-trigger="true"
              title="Triple-click for emergency logout"
            >
              <RadishIcon size={32} className="mr-3" />
              Hot Radish
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={20} className="mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-2 mb-8">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
            >
              <LogOut size={20} className="mr-3" />
              Logout
            </button>
            <button
              onClick={handleEmergencyLogout}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              <LogOut size={20} className="mr-3" />
              Emergency Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-700">
            <h1 
              className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer app-title flex items-center" 
              data-emergency-trigger="true"
              title="Triple-click for emergency logout"
            >
              <RadishIcon size={32} className="mr-3" />
              Hot Radish
            </h1>
          </div>
          <nav className="flex-1 px-6 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={20} className="mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 space-y-2 mb-8">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
            >
              <LogOut size={20} className="mr-3" />
              Logout
            </button>
            <button
              onClick={handleEmergencyLogout}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              <LogOut size={20} className="mr-3" />
              Emergency Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          {/* Search */}
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400 dark:text-gray-500 ml-3" />
              <input
                type="text"
                placeholder="Search..."
                className="block h-full w-full border-0 py-0 pl-10 pr-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent focus:ring-0 sm:text-sm"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {/* Theme Toggle */}
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
              onClick={toggleTheme}
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <Bell size={24} />
            </button>

            {/* Profile dropdown */}
            <div className="flex items-center gap-x-4">
              <div className="hidden sm:flex sm:flex-col sm:items-end">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role || 'Employee'}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout 