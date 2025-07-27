import { useState, useEffect } from 'react'
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Clock as ClockIcon
} from 'lucide-react'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeave: 0,
    approvedLeave: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setStats({
        totalEmployees: 24,
        activeEmployees: 22,
        pendingLeave: 3,
        approvedLeave: 8
      })
      setRecentActivity([
        {
          id: 1,
          type: 'leave_request',
          message: 'John Doe requested 3 days leave',
          time: '2 hours ago',
          status: 'pending'
        },
        {
          id: 2,
          type: 'leave_approved',
          message: 'Jane Smith\'s leave request approved',
          time: '4 hours ago',
          status: 'approved'
        },
        {
          id: 3,
          type: 'employee_added',
          message: 'New employee Sarah Johnson added',
          time: '1 day ago',
          status: 'completed'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const StatCard = ({ title, value, icon: Icon, change, changeType }) => (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              {changeType === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${changeType === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className="h-12 w-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
    </div>
  )

  const ActivityItem = ({ activity }) => {
    const getIcon = () => {
      switch (activity.type) {
        case 'leave_request':
          return <ClockIcon className="h-4 w-4 text-yellow-500" />
        case 'leave_approved':
          return <CheckCircle className="h-4 w-4 text-green-500" />
        case 'employee_added':
          return <Users className="h-4 w-4 text-blue-500" />
        default:
          return <AlertCircle className="h-4 w-4 text-gray-500" />
      }
    }

    return (
      <div className="flex items-start space-x-3 py-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
          change="+2"
          changeType="up"
        />
        <StatCard
          title="Active Employees"
          value={stats.activeEmployees}
          icon={Users}
          change="+1"
          changeType="up"
        />
        <StatCard
          title="Pending Leave"
          value={stats.pendingLeave}
          icon={Clock}
          change="-1"
          changeType="down"
        />
        <StatCard
          title="Approved Leave"
          value={stats.approvedLeave}
          icon={Calendar}
          change="+3"
          changeType="up"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Activity</h2>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-1">
            {recentActivity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full btn btn-primary btn-md">
              Add New Employee
            </button>
            <button className="w-full btn btn-outline btn-md">
              View Leave Requests
            </button>
            <button className="w-full btn btn-outline btn-md">
              Generate Report
            </button>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Today's Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Employees Present</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">22/24</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Leave Requests</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">3 pending</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Birthdays</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">1 today</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Database</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">API</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Backup</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                Complete
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 