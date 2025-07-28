import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from '../config/api'
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  UserCheck,
  Key,
  Lock,
  Unlock,
  Calendar,
  FileText,
  Table,
  Folder
} from 'lucide-react'

const Privileges = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [allLevels, setAllLevels] = useState([])
  const [customLevels, setCustomLevels] = useState([])
  const [templates, setTemplates] = useState([])
  const [activeTab, setActiveTab] = useState('levels')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [formData, setFormData] = useState({
    level_number: '',
    name: '',
    description: '',
    permissions: []
  })

  // Available resources and actions for creating custom levels
  const availableResources = [
    { value: 'employees', label: 'Employees', icon: Users },
    { value: 'leave_requests', label: 'Leave Requests', icon: Calendar },
    { value: 'users', label: 'Users', icon: UserCheck },
    { value: 'departments', label: 'Departments', icon: Settings },
    { value: 'privileges', label: 'Privileges', icon: Key },
    { value: 'google_docs', label: 'Google Docs', icon: FileText },
    { value: 'google_sheets', label: 'Google Sheets', icon: Table },
    { value: 'google_calendar', label: 'Google Calendar', icon: Calendar },
    { value: 'google_drive', label: 'Google Drive', icon: Folder },
    { value: 'audit_log', label: 'Audit Log', icon: Shield },
    { value: 'system', label: 'System', icon: Settings }
  ]

  const availableActions = [
    { value: 'read', label: 'Read', icon: Eye },
    { value: 'write', label: 'Write', icon: Edit },
    { value: 'create', label: 'Create', icon: Plus },
    { value: 'update', label: 'Update', icon: Edit },
    { value: 'delete', label: 'Delete', icon: Trash2 },
    { value: 'approve', label: 'Approve', icon: CheckCircle },
    { value: 'admin', label: 'Admin', icon: Settings }
  ]

  const availableScopes = [
    { value: 'own', label: 'Own', description: 'User\'s own data only' },
    { value: 'department', label: 'Department', description: 'Department-level access' },
    { value: 'all', label: 'All', description: 'Organization-wide access' }
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all levels
      const levelsResponse = await axios.get('/api/privileges/all-levels')
      setAllLevels(levelsResponse.data.all_levels)
      setCustomLevels(levelsResponse.data.all_levels.filter(level => level.type === 'custom'))

      // Fetch templates
      const templatesResponse = await axios.get('/api/privileges/templates')
      setTemplates(templatesResponse.data.templates)
    } catch (error) {
      console.error('Error fetching privilege data:', error)
      if (error.response?.status === 401) {
        alert('Authentication required. Please log in again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLevel = async (e) => {
    e.preventDefault()
    
    try {
      const response = await axios.post('/api/privileges/custom-levels', formData)
      setShowCreateModal(false)
      setFormData({ level_number: '', name: '', description: '', permissions: [] })
      fetchData()
      alert('Custom privilege level created successfully!')
    } catch (error) {
      console.error('Error creating custom level:', error)
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`)
      } else {
        alert('Error creating custom level')
      }
    }
  }

  const handleDeleteLevel = async (levelNumber) => {
    if (!confirm(`Are you sure you want to delete Level ${levelNumber}?`)) return

    try {
      await axios.delete(`/api/privileges/custom-levels/${levelNumber}`)
      fetchData()
      alert('Custom privilege level deleted successfully!')
    } catch (error) {
      console.error('Error deleting custom level:', error)
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`)
      } else {
        alert('Error deleting custom level')
      }
    }
  }

  const addPermission = () => {
    setFormData(prev => ({
      ...prev,
      permissions: [...prev.permissions, { resource_type: '', action: '', scope: '' }]
    }))
  }

  const removePermission = (index) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index)
    }))
  }

  const updatePermission = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.map((perm, i) => 
        i === index ? { ...perm, [field]: value } : perm
      )
    }))
  }

  const getLevelIcon = (level) => {
    if (level.type === 'custom') return Shield
    return level.level <= 3 ? Users : level.level <= 4 ? Settings : Key
  }

  const getLevelColor = (level) => {
    if (level.type === 'custom') return 'text-purple-600 dark:text-purple-400'
    if (level.level <= 2) return 'text-blue-600 dark:text-blue-400'
    if (level.level <= 4) return 'text-green-600 dark:text-green-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Check if user has proper privilege level
  if (!user || user.privilege_level < 5) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield size={64} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need System Administrator privileges (Level 5+) to access this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Current level: {user?.privilege_level || 'Not logged in'}
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Privilege Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage privilege levels, custom permissions, and user access rights
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'levels', name: 'All Levels', icon: Shield },
            { id: 'custom', name: 'Custom Levels', icon: Settings },
            { id: 'templates', name: 'Permission Templates', icon: Key }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon size={16} className="mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'levels' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              All Privilege Levels
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Create Custom Level
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allLevels.map((level) => {
              const Icon = getLevelIcon(level)
              return (
                <div
                  key={level.level}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Icon size={24} className={`mr-3 ${getLevelColor(level)}`} />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Level {level.level}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {level.type === 'custom' ? 'Custom' : 'Standard'}
                        </p>
                      </div>
                    </div>
                    {level.type === 'custom' && (
                      <button
                        onClick={() => handleDeleteLevel(level.level)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {level.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {level.description}
                  </p>
                  
                  {level.permissions && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Permissions ({level.permissions.length})
                      </p>
                      <div className="space-y-1">
                        {level.permissions.slice(0, 3).map((perm, index) => (
                          <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                            {perm.resource_type} • {perm.action} • {perm.scope}
                          </div>
                        ))}
                        {level.permissions.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            +{level.permissions.length - 3} more...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Custom Privilege Levels
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Create New Level
            </button>
          </div>

          {customLevels.length === 0 ? (
            <div className="text-center py-12">
              <Shield size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Custom Levels
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first custom privilege level to get started.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Create Custom Level
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {customLevels.map((level) => (
                <div
                  key={level.level}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Shield size={24} className="text-purple-600 dark:text-purple-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Level {level.level}: {level.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Custom Privilege Level
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLevel(level)
                          setShowEditModal(true)
                        }}
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteLevel(level.level)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {level.description}
                  </p>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Permissions ({level.permissions.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {level.permissions.map((perm, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {perm.resource_type}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {perm.action} • {perm.scope}
                            </div>
                          </div>
                          <div className="ml-2">
                            {perm.scope === 'all' && (
                              <Lock size={12} className="text-green-500" />
                            )}
                            {perm.scope === 'department' && (
                              <Unlock size={12} className="text-yellow-500" />
                            )}
                            {perm.scope === 'own' && (
                              <Eye size={12} className="text-blue-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Permission Templates
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center mb-4">
                  <Key size={24} className="text-blue-600 dark:text-blue-400 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Permission Template
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {template.description}
                </p>
                
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Permissions ({template.permissions.length})
                  </p>
                  <div className="space-y-1">
                    {template.permissions.slice(0, 3).map((perm, index) => (
                      <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                        {perm.resource_type} • {perm.action} • {perm.scope}
                      </div>
                    ))}
                    {template.permissions.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{template.permissions.length - 3} more...
                      </div>
                    )}
                  </div>
                </div>
                
                <button className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                  Apply Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Custom Level Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Custom Privilege Level
              </h3>
            </div>
            
            <form onSubmit={handleCreateLevel} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Level Number
                  </label>
                  <input
                    type="number"
                    min="6"
                    value={formData.level_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, level_number: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Permissions
                  </label>
                  <button
                    type="button"
                    onClick={addPermission}
                    className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Permission
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.permissions.map((perm, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <select
                        value={perm.resource_type}
                        onChange={(e) => updatePermission(index, 'resource_type', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Select Resource</option>
                        {availableResources.map(resource => (
                          <option key={resource.value} value={resource.value}>
                            {resource.label}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={perm.action}
                        onChange={(e) => updatePermission(index, 'action', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Select Action</option>
                        {availableActions.map(action => (
                          <option key={action.value} value={action.value}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={perm.scope}
                        onChange={(e) => updatePermission(index, 'scope', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-600 dark:text-white"
                        required
                      >
                        <option value="">Select Scope</option>
                        {availableScopes.map(scope => (
                          <option key={scope.value} value={scope.value}>
                            {scope.label}
                          </option>
                        ))}
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => removePermission(index)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Create Level
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Privileges 