import { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Shield, Lock, Unlock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from '../config/api'

const Employees = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)
  const { e2eeService, e2eeStatus } = useAuth()

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await axios.get('/api/employees')
      const encryptedEmployees = response.data
      
      // Decrypt employee data if E2EE is available
      if (e2eeService && e2eeStatus.initialized) {
        const decryptedEmployees = await Promise.all(
          encryptedEmployees.map(async (employee) => {
            try {
              const decrypted = await e2eeService.decryptEmployee(employee)
              return {
                ...employee,
                ...decrypted,
                isEncrypted: true
              }
            } catch (error) {
              console.error('Failed to decrypt employee:', error)
              return {
                ...employee,
                isEncrypted: false,
                decryptionError: true
              }
            }
          })
        )
        setEmployees(decryptedEmployees)
      } else {
        // Use encrypted data as-is if E2EE is not available
        setEmployees(encryptedEmployees.map(emp => ({
          ...emp,
          isEncrypted: false
        })))
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      setError('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (employee.first_name && employee.first_name.toLowerCase().includes(searchLower)) ||
      (employee.last_name && employee.last_name.toLowerCase().includes(searchLower)) ||
      (employee.position && employee.position.toLowerCase().includes(searchLower)) ||
      (employee.department && employee.department.toLowerCase().includes(searchLower)) ||
      (employee.employee_id && employee.employee_id.toLowerCase().includes(searchLower))
    )
  })

  const EncryptionStatus = ({ isEncrypted, hasError }) => {
    if (hasError) {
      return (
        <div className="flex items-center text-red-600">
          <Shield className="h-4 w-4 mr-1" />
          <span className="text-xs">Decryption Error</span>
        </div>
      )
    }
    
    if (isEncrypted) {
      return (
        <div className="flex items-center text-green-600">
          <Lock className="h-4 w-4 mr-1" />
          <span className="text-xs">Encrypted</span>
        </div>
      )
    }
    
    return (
      <div className="flex items-center text-gray-500">
        <Unlock className="h-4 w-4 mr-1" />
        <span className="text-xs">Unencrypted</span>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage your organization's employees</p>
          {e2eeStatus.initialized && (
            <div className="flex items-center mt-2 text-green-600">
              <Shield className="h-4 w-4 mr-1" />
              <span className="text-sm">End-to-End Encryption Active</span>
            </div>
          )}
        </div>
        <button className="btn btn-primary btn-md mt-4 sm:mt-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-800">
            <Shield className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <button className="btn btn-outline btn-md">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hire Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Security
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-800">
                            {employee.first_name ? employee.first_name.charAt(0) : '?'}
                            {employee.last_name ? employee.last_name.charAt(0) : '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.first_name && employee.last_name 
                            ? `${employee.first_name} ${employee.last_name}`
                            : employee.employee_id || 'Unknown'
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.employee_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.position || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.department || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.hire_date || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <EncryptionStatus 
                      isEncrypted={employee.isEncrypted} 
                      hasError={employee.decryptionError}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-primary-600 hover:text-primary-900">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm ? 'No employees found matching your search.' : 'No employees found.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Employees 