import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from '../config/api'
import { 
  UserPlus, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus,
  Search,
  Filter,
  Calendar,
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Square
} from 'lucide-react'

const Onboarding = () => {
  const { user } = useAuth()
  const [processes, setProcesses] = useState([])
  const [templates, setTemplates] = useState([])
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showStartModal, setShowStartModal] = useState(false)
  const [selectedProcess, setSelectedProcess] = useState(null)
  const [startForm, setStartForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    department: '',
    start_date: '',
    template_id: '',
    assigned_manager_id: '',
    notes: '',
    // New fields from staff roster
    date_of_birth: '',
    gender: '',
    nationality: '',
    job_description: '',
    employment_type: 'Full-time',
    education_qualifications: '',
    relevant_experience: ''
  })

  useEffect(() => {
    fetchProcesses()
    fetchTemplates()
    fetchChecklist()
  }, [])

  const fetchProcesses = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/onboarding/processes')
      setProcesses(response.data.processes || [])
    } catch (error) {
      console.error('Error fetching onboarding processes:', error)
      // Show user-friendly error message
      if (error.response?.status === 403) {
        console.log('Access denied - user may not have sufficient privileges')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/onboarding/templates')
      setTemplates(response.data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      // Templates are optional, so don't show error to user
    }
  }

  const fetchChecklist = async () => {
    try {
      const response = await axios.get('/api/onboarding/checklist')
      setChecklist(response.data.checklist || [])
    } catch (error) {
      console.error('Error fetching checklist:', error)
      // Checklist is required, but we have defaults
    }
  }

  const handleStartOnboarding = async () => {
    if (!startForm.first_name || !startForm.last_name || !startForm.email) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await axios.post('/api/onboarding/start', {
        employee_data: {
          first_name: startForm.first_name,
          last_name: startForm.last_name,
          email: startForm.email,
          position: startForm.position,
          department: startForm.department,
          // New fields from staff roster
          date_of_birth: startForm.date_of_birth || null,
          gender: startForm.gender,
          nationality: startForm.nationality,
          job_description: startForm.job_description,
          employment_type: startForm.employment_type,
          education_qualifications: startForm.education_qualifications,
          relevant_experience: startForm.relevant_experience
        },
        template_id: startForm.template_id || null,
        assigned_manager_id: startForm.assigned_manager_id || null,
        start_date: startForm.start_date,
        notes: startForm.notes
      })

      // Reset form and close modal
      setStartForm({
        first_name: '',
        last_name: '',
        email: '',
        position: '',
        department: '',
        start_date: '',
        template_id: '',
        assigned_manager_id: '',
        notes: '',
        // New fields from staff roster
        date_of_birth: '',
        gender: '',
        nationality: '',
        job_description: '',
        employment_type: 'Full-time',
        education_qualifications: '',
        relevant_experience: ''
      })
      setShowStartModal(false)
      
      // Refresh processes list
      fetchProcesses()
    } catch (error) {
      console.error('Error starting onboarding:', error)
      alert('Failed to start onboarding process')
    }
  }

  const handleViewProcess = async (processId) => {
    try {
      const response = await axios.get(`/api/onboarding/processes/${processId}`)
      setSelectedProcess(response.data.process)
    } catch (error) {
      console.error('Error fetching process details:', error)
    }
  }

  const handleUpdateTask = async (taskId, status, notes) => {
    try {
      await axios.put(`/api/onboarding/tasks/${taskId}`, {
        status,
        notes
      })
      
      // Refresh the selected process
      if (selectedProcess) {
        handleViewProcess(selectedProcess.id)
      }
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task')
    }
  }

  const handleCompleteProcess = async (processId) => {
    if (!confirm('Are you sure you want to complete this onboarding process?')) {
      return
    }

    try {
      await axios.post(`/api/onboarding/processes/${processId}/complete`)
      
      // Refresh processes list
      fetchProcesses()
      setSelectedProcess(null)
    } catch (error) {
      console.error('Error completing process:', error)
      alert('Failed to complete onboarding process')
    }
  }

  const filteredProcesses = processes.filter(process => {
    const matchesSearch = 
      process.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.position?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !statusFilter || process.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300'
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300'
      case 'cancelled': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'in_progress': return <Clock className="w-4 h-4 flex-shrink-0" />
      case 'completed': return <CheckCircle className="w-4 h-4 flex-shrink-0" />
      case 'cancelled': return <AlertCircle className="w-4 h-4 flex-shrink-0" />
      default: return <Clock className="w-4 h-4 flex-shrink-0" />
    }
  }

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'in_progress': return 'text-blue-600'
      case 'overdue': return 'text-red-600'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTaskStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 flex-shrink-0" />
      case 'in_progress': return <Play className="w-4 h-4 flex-shrink-0" />
      case 'overdue': return <AlertCircle className="w-4 h-4 flex-shrink-0" />
      default: return <Square className="w-4 h-4 flex-shrink-0" />
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading onboarding processes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Onboarding</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage employee onboarding processes and track progress
          </p>
        </div>
        <button
          onClick={() => setShowStartModal(true)}
          className="mt-4 sm:mt-0 flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
        >
          <UserPlus className="w-4 h-4 flex-shrink-0" />
          <span>Start Onboarding</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Processes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Onboarding Processes ({filteredProcesses.length})
            </h2>
          </div>
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {filteredProcesses.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4 flex-shrink-0" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No onboarding processes</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Get started by creating a new onboarding process.
                </p>
                <button
                  onClick={() => setShowStartModal(true)}
                  className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors mx-auto"
                >
                  <UserPlus className="w-4 h-4 flex-shrink-0" />
                  <span>Start Onboarding</span>
                </button>
              </div>
            ) : (
              filteredProcesses.map(process => (
                <div
                  key={process.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedProcess?.id === process.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleViewProcess(process.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {process.first_name} {process.last_name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(process.status)} flex items-center space-x-1`}>
                      {getStatusIcon(process.status)}
                      <span className="hidden sm:inline">
                        {process.status === 'in_progress' ? 'In Progress' : 
                         process.status === 'completed' ? 'Completed' : 
                         process.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                      </span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                    {process.position} • {process.department}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Started: {formatDate(process.start_date)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Process Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Process Details
            </h2>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {selectedProcess ? (
              <div className="space-y-6">
                {/* Employee Info */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Employee Information
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedProcess.first_name} {selectedProcess.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedProcess.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Position:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedProcess.position}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Department:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedProcess.department || 'Not assigned'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Age/Gender:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedProcess.age && selectedProcess.gender ? `${selectedProcess.age}/${selectedProcess.gender}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Nationality:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedProcess.nationality || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Employment Type:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedProcess.employment_type || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Education:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedProcess.education_qualifications || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Start Date:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(selectedProcess.start_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                    Onboarding Tasks
                  </h3>
                  <div className="space-y-3">
                    {selectedProcess.tasks?.map(task => (
                      <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <span className={getTaskStatusColor(task.status)}>
                              {getTaskStatusIcon(task.status)}
                            </span>
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {task.task_name}
                            </h4>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {task.status !== 'completed' && (
                              <button
                                onClick={() => handleUpdateTask(task.id, 'completed', task.notes)}
                                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                              >
                                Complete
                              </button>
                            )}
                            {task.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateTask(task.id, 'in_progress', task.notes)}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                              >
                                Start
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {task.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                          <span>Due: {formatDate(task.due_date)}</span>
                          <span className="truncate ml-2">Assigned to: {task.assigned_to_name}</span>
                        </div>
                        {task.notes && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-gray-700 dark:text-gray-300">
                            {task.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedProcess.tasks?.filter(t => t.status === 'completed').length} of {selectedProcess.tasks?.length} tasks completed
                  </div>
                  {selectedProcess.status === 'in_progress' && (
                    <button
                      onClick={() => handleCompleteProcess(selectedProcess.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Complete Process
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4 flex-shrink-0" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Process</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose an onboarding process from the list to view details and manage tasks.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Onboarding Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Start New Onboarding
            </h2>

            <div className="space-y-4">
              {/* Employee Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={startForm.first_name}
                    onChange={(e) => setStartForm(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={startForm.last_name}
                    onChange={(e) => setStartForm(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={startForm.email}
                  onChange={(e) => setStartForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="email@company.com"
                />
              </div>

              {/* Date of Birth and Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={startForm.date_of_birth}
                    onChange={(e) => setStartForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender
                  </label>
                  <select
                    value={startForm.gender}
                    onChange={(e) => setStartForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>

              {/* Nationality and Employment Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={startForm.nationality}
                    onChange={(e) => setStartForm(prev => ({ ...prev, nationality: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Bamar, British, American"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Employment Type
                  </label>
                  <select
                    value={startForm.employment_type}
                    onChange={(e) => setStartForm(prev => ({ ...prev, employment_type: e.target.value }))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Consultant">Consultant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  value={startForm.position}
                  onChange={(e) => setStartForm(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Job title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Description
                </label>
                <textarea
                  value={startForm.job_description}
                  onChange={(e) => setStartForm(prev => ({ ...prev, job_description: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="2"
                  placeholder="Brief description of responsibilities..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Education Qualifications
                </label>
                <input
                  type="text"
                  value={startForm.education_qualifications}
                  onChange={(e) => setStartForm(prev => ({ ...prev, education_qualifications: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., BA (English), MA TESOL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Relevant Experience
                </label>
                <textarea
                  value={startForm.relevant_experience}
                  onChange={(e) => setStartForm(prev => ({ ...prev, relevant_experience: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="2"
                  placeholder="Previous work experience..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startForm.start_date}
                  onChange={(e) => setStartForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={startForm.notes}
                  onChange={(e) => setStartForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowStartModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartOnboarding}
                disabled={!startForm.first_name || !startForm.last_name || !startForm.email}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Onboarding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Onboarding 