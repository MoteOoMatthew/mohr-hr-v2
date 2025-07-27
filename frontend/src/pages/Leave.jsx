import { useState, useEffect } from 'react'
import { Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const Leave = () => {
  const [leaveRequests, setLeaveRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setLeaveRequests([
        {
          id: 1,
          employeeName: 'John Doe',
          leaveType: 'Annual Leave',
          startDate: '2024-01-15',
          endDate: '2024-01-17',
          daysRequested: 3,
          reason: 'Family vacation',
          status: 'pending',
          submittedAt: '2024-01-10'
        },
        {
          id: 2,
          employeeName: 'Jane Smith',
          leaveType: 'Sick Leave',
          startDate: '2024-01-12',
          endDate: '2024-01-12',
          daysRequested: 1,
          reason: 'Not feeling well',
          status: 'approved',
          submittedAt: '2024-01-11'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Manage employee leave requests</p>
        </div>
        <button className="btn btn-primary btn-md mt-4 sm:mt-0">
          <Plus className="h-4 w-4 mr-2" />
          New Leave Request
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Leave Requests</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {leaveRequests.map((request) => (
                <div key={request.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          {request.employeeName}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{request.status}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{request.leaveType}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                        </span>
                        <span>{request.daysRequested} days</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{request.reason}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="btn btn-sm btn-primary">Approve</button>
                      <button className="btn btn-sm btn-outline">Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending Requests</span>
                <span className="text-sm font-medium text-gray-900">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Approved This Month</span>
                <span className="text-sm font-medium text-gray-900">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rejected This Month</span>
                <span className="text-sm font-medium text-gray-900">2</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Types</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Annual Leave</span>
                <span className="text-sm font-medium text-gray-900">20 days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sick Leave</span>
                <span className="text-sm font-medium text-gray-900">10 days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Personal Leave</span>
                <span className="text-sm font-medium text-gray-900">5 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Leave 