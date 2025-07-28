import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, Shield, Lock, Unlock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from '../config/api'
import { calculateAge } from '../utils/dateUtils'

const Employees = () => {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
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

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee)
    setShowViewModal(true)
  }

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee)
    setShowEditModal(true)
  }

  const handleDeleteEmployee = (employee) => {
    setSelectedEmployee(employee)
    setShowDeleteModal(true)
  }

  const confirmDeleteEmployee = async () => {
    if (!selectedEmployee) return

    try {
      await axios.delete(`/api/employees/${selectedEmployee.id}`)
      setEmployees(employees.filter(emp => emp.id !== selectedEmployee.id))
      setShowDeleteModal(false)
      setSelectedEmployee(null)
    } catch (error) {
      console.error('Failed to delete employee:', error)
      setError('Failed to delete employee')
    }
  }

  const handleEditSave = async (updatedData) => {
    if (!selectedEmployee) return

    try {
      await axios.put(`/api/employees/${selectedEmployee.id}`, updatedData)
      // Refresh the employees list
      await fetchEmployees()
      setShowEditModal(false)
      setSelectedEmployee(null)
    } catch (error) {
      console.error('Failed to update employee:', error)
      setError('Failed to update employee')
    }
  }

  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (employee.first_name && employee.first_name.toLowerCase().includes(searchLower)) ||
      (employee.last_name && employee.last_name.toLowerCase().includes(searchLower)) ||
      (employee.position && employee.position.toLowerCase().includes(searchLower)) ||
      (employee.department && employee.department.toLowerCase().includes(searchLower)) ||
      (employee.employee_id && employee.employee_id.toLowerCase().includes(searchLower)) ||
      (employee.nationality && employee.nationality.toLowerCase().includes(searchLower)) ||
      (employee.employment_type && employee.employment_type.toLowerCase().includes(searchLower)) ||
      (employee.education_qualifications && employee.education_qualifications.toLowerCase().includes(searchLower)) ||
      (employee.job_description && employee.job_description.toLowerCase().includes(searchLower)) ||
      (employee.relevant_experience && employee.relevant_experience.toLowerCase().includes(searchLower))
    )
  })

  const EncryptionStatus = ({ isEncrypted, hasError }) => {
    if (hasError) {
      return (
        <div className="flex items-center text-red-600 dark:text-red-400">
          <Shield className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="text-xs">Decryption Error</span>
        </div>
      )
    }
    
    if (isEncrypted) {
      return (
        <div className="flex items-center text-green-600 dark:text-green-400">
          <Lock className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="text-xs">Encrypted</span>
        </div>
      )
    }
    
    return (
      <div className="flex items-center text-gray-500 dark:text-gray-400">
        <Unlock className="h-4 w-4 mr-1 flex-shrink-0" />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your organization's employees</p>
          {e2eeStatus.initialized && (
            <div className="flex items-center mt-2 text-green-600 dark:text-green-400">
              <Shield className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="text-sm">End-to-End Encryption Active</span>
            </div>
          )}
        </div>
        <button 
          className="btn btn-primary btn-md mt-4 sm:mt-0 hover:bg-primary-700 active:bg-primary-800 transition-colors"
          onClick={() => navigate('/onboarding')}
        >
          <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
          Add Employee
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center text-red-800 dark:text-red-200">
            <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <button className="btn btn-outline btn-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
            Filter
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Age/Gender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Job Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Nationality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Employment Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Education
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Experience
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Security
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
                            {employee.first_name ? employee.first_name.charAt(0) : '?'}
                            {employee.last_name ? employee.last_name.charAt(0) : '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {employee.first_name && employee.last_name 
                            ? `${employee.first_name} ${employee.last_name}`
                            : employee.employee_id || 'Unknown'
                          }
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {employee.employee_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {(() => {
                      const age = employee.age || calculateAge(employee.date_of_birth);
                      return age && employee.gender ? `${age}/${employee.gender}` : 'N/A';
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="max-w-xs truncate" title={employee.position || 'N/A'}>
                      {employee.position || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="max-w-xs truncate" title={employee.job_description || 'N/A'}>
                      {employee.job_description || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {employee.nationality || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.employment_type === 'Full-time' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : employee.employment_type === 'Part-time'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {employee.employment_type || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="max-w-xs truncate" title={employee.education_qualifications || 'N/A'}>
                      {employee.education_qualifications || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="max-w-xs truncate" title={employee.relevant_experience || 'N/A'}>
                      {employee.relevant_experience || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.is_active 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
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
                      <button 
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        title="View Employee"
                        onClick={() => handleViewEmployee(employee)}
                      >
                        <Eye className="h-4 w-4 flex-shrink-0" strokeWidth={2} fill="none" />
                        <span className="sr-only">View</span>
                      </button>
                      <button 
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        title="Edit Employee"
                        onClick={() => handleEditEmployee(employee)}
                      >
                        <Edit className="h-4 w-4 flex-shrink-0" strokeWidth={2} fill="none" />
                        <span className="sr-only">Edit</span>
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        title="Delete Employee"
                        onClick={() => handleDeleteEmployee(employee)}
                      >
                        <Trash2 className="h-4 w-4 flex-shrink-0" strokeWidth={2} fill="none" />
                        <span className="sr-only">Delete</span>
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
            <div className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No employees found matching your search.' : 'No employees found.'}
            </div>
          </div>
        )}
      </div>

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Employee Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.employee_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.position || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.department || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age/Gender</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.age && selectedEmployee.gender ? `${selectedEmployee.age}/${selectedEmployee.gender}` : 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nationality</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.nationality || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employment Type</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.employment_type || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedEmployee.is_active 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}>
                    {selectedEmployee.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Description</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.job_description || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Education Qualifications</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.education_qualifications || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Relevant Experience</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.relevant_experience || 'N/A'}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="btn btn-outline btn-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Employee</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center">
                  <Edit className="h-5 w-5 text-blue-600 mr-2" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Edit functionality is coming soon! This will include a full form for updating employee details.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.employee_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.position || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedEmployee.department || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="btn btn-outline btn-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Placeholder for edit functionality
                  alert('Edit functionality coming soon!')
                  setShowEditModal(false)
                }}
                className="btn btn-primary btn-md"
                disabled
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Delete Employee</h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Are you sure you want to delete <strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-outline btn-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEmployee}
                className="btn bg-red-600 hover:bg-red-700 text-white btn-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees 