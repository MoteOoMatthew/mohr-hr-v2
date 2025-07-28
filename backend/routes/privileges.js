const express = require('express');
const { body, validationResult } = require('express-validator');
const { runQuery, getRow, getRows } = require('../database/init');
const { 
  requirePrivilegeLevel, 
  requirePermission, 
  getUserContext,
  getFilteredData,
  grantPermission,
  revokePermission,
  getUserPermissions,
  hasGranularPermissions,
  getEffectivePermissions,
  getCustomPrivilegeLevel,
  getAllCustomPrivilegeLevels,
  createCustomPrivilegeLevel,
  updateCustomPrivilegeLevel,
  deleteCustomPrivilegeLevel
} = require('../middleware/privilege');

const router = express.Router();

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Validate request middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ============================================================================
// DEPARTMENTS ROUTES
// ============================================================================

// Get all departments
router.get('/departments', verifyToken, requirePrivilegeLevel(3), async (req, res) => {
  try {
    const departments = await getRows(`
      SELECT d.*, 
             u.name as manager_name,
             COUNT(e.id) as employee_count
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
      LEFT JOIN employees e ON d.id = e.department_id
      WHERE d.is_active = 1
      GROUP BY d.id
      ORDER BY d.name
    `);
    
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get department by ID
router.get('/departments/:id', verifyToken, requirePrivilegeLevel(3), async (req, res) => {
  try {
    const { id } = req.params;
    const department = await getRow(`
      SELECT d.*, 
             u.name as manager_name,
             COUNT(e.id) as employee_count
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
      LEFT JOIN employees e ON d.id = e.department_id
      WHERE d.id = ? AND d.is_active = 1
      GROUP BY d.id
    `, [id]);
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// Create new department
router.post('/departments', verifyToken, requirePrivilegeLevel(4), [
  body('name').notEmpty().withMessage('Department name is required'),
  body('description').optional(),
  body('manager_id').optional().isInt().withMessage('Manager ID must be a valid integer')
], validateRequest, async (req, res) => {
  try {
    const { name, description, manager_id } = req.body;
    
    // Check if department name already exists
    const existingDept = await getRow('SELECT id FROM departments WHERE name = ? AND is_active = 1', [name]);
    if (existingDept) {
      return res.status(400).json({ error: 'Department with this name already exists' });
    }
    
    // Verify manager exists if provided
    if (manager_id) {
      const manager = await getRow('SELECT id FROM users WHERE id = ? AND is_active = 1', [manager_id]);
      if (!manager) {
        return res.status(400).json({ error: 'Manager not found' });
      }
    }
    
    const result = await runQuery(`
      INSERT INTO departments (name, description, manager_id)
      VALUES (?, ?, ?)
    `, [name, description, manager_id]);
    
    const newDepartment = await getRow('SELECT * FROM departments WHERE id = ?', [result.id]);
    
    res.status(201).json({
      message: 'Department created successfully',
      department: newDepartment
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department
router.put('/departments/:id', verifyToken, requirePrivilegeLevel(4), [
  body('name').optional().notEmpty().withMessage('Department name cannot be empty'),
  body('description').optional(),
  body('manager_id').optional().isInt().withMessage('Manager ID must be a valid integer')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, manager_id } = req.body;
    
    // Check if department exists
    const existingDept = await getRow('SELECT * FROM departments WHERE id = ? AND is_active = 1', [id]);
    if (!existingDept) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Check if new name conflicts with existing department
    if (name && name !== existingDept.name) {
      const nameConflict = await getRow('SELECT id FROM departments WHERE name = ? AND id != ? AND is_active = 1', [name, id]);
      if (nameConflict) {
        return res.status(400).json({ error: 'Department with this name already exists' });
      }
    }
    
    // Verify manager exists if provided
    if (manager_id) {
      const manager = await getRow('SELECT id FROM users WHERE id = ? AND is_active = 1', [manager_id]);
      if (!manager) {
        return res.status(400).json({ error: 'Manager not found' });
      }
    }
    
    const updates = [];
    const params = [];
    
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    
    if (manager_id !== undefined) {
      updates.push('manager_id = ?');
      params.push(manager_id);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    await runQuery(`
      UPDATE departments 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);
    
    const updatedDepartment = await getRow('SELECT * FROM departments WHERE id = ?', [id]);
    
    res.json({
      message: 'Department updated successfully',
      department: updatedDepartment
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department (soft delete)
router.delete('/departments/:id', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if department exists
    const department = await getRow('SELECT * FROM departments WHERE id = ? AND is_active = 1', [id]);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Check if department has employees
    const employeeCount = await getRow('SELECT COUNT(*) as count FROM employees WHERE department_id = ? AND is_active = 1', [id]);
    if (employeeCount.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department. It has ${employeeCount.count} active employee(s).` 
      });
    }
    
    // Soft delete
    await runQuery(`
      UPDATE departments 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// ============================================================================
// USER PRIVILEGES ROUTES
// ============================================================================

// Get all users with privilege information
router.get('/users', verifyToken, requirePrivilegeLevel(4), async (req, res) => {
  try {
    const users = await getRows(`
      SELECT u.id, u.username, u.email, u.name, u.role, u.privilege_level,
             u.department_id, u.manager_id, u.is_active, u.created_at,
             d.name as department_name,
             m.name as manager_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.is_active = 1
      ORDER BY u.privilege_level DESC, u.name
    `);
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID with privilege information
router.get('/users/:id', verifyToken, requirePrivilegeLevel(4), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getRow(`
      SELECT u.id, u.username, u.email, u.name, u.role, u.privilege_level,
             u.department_id, u.manager_id, u.is_active, u.created_at,
             d.name as department_name,
             m.name as manager_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = ? AND u.is_active = 1
    `, [id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user privileges
router.put('/users/:id/privileges', verifyToken, requirePrivilegeLevel(5), [
  body('privilege_level').isInt({ min: 1, max: 5 }).withMessage('Privilege level must be between 1 and 5'),
  body('department_id').optional().isInt().withMessage('Department ID must be a valid integer'),
  body('manager_id').optional().isInt().withMessage('Manager ID must be a valid integer')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { privilege_level, department_id, manager_id } = req.body;
    
    // Check if user exists
    const user = await getRow('SELECT * FROM users WHERE id = ? AND is_active = 1', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent self-modification of privileges
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot modify your own privileges' });
    }
    
    // Verify department exists if provided
    if (department_id) {
      const department = await getRow('SELECT id FROM departments WHERE id = ? AND is_active = 1', [department_id]);
      if (!department) {
        return res.status(400).json({ error: 'Department not found' });
      }
    }
    
    // Verify manager exists if provided
    if (manager_id) {
      const manager = await getRow('SELECT id FROM users WHERE id = ? AND is_active = 1', [manager_id]);
      if (!manager) {
        return res.status(400).json({ error: 'Manager not found' });
      }
    }
    
    const updates = [];
    const params = [];
    
    updates.push('privilege_level = ?');
    params.push(privilege_level);
    
    if (department_id !== undefined) {
      updates.push('department_id = ?');
      params.push(department_id);
    }
    
    if (manager_id !== undefined) {
      updates.push('manager_id = ?');
      params.push(manager_id);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    await runQuery(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);
    
    const updatedUser = await getRow(`
      SELECT u.id, u.username, u.email, u.name, u.role, u.privilege_level,
             u.department_id, u.manager_id, u.is_active,
             d.name as department_name,
             m.name as manager_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = ?
    `, [id]);
    
    res.json({
      message: 'User privileges updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user privileges error:', error);
    res.status(500).json({ error: 'Failed to update user privileges' });
  }
});

// ============================================================================
// PRIVILEGE PERMISSIONS ROUTES
// ============================================================================

// Get all privilege permissions
router.get('/permissions', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const permissions = await getRows(`
      SELECT privilege_level, resource_type, action, scope, created_at
      FROM privilege_permissions
      ORDER BY privilege_level, resource_type, action
    `);
    
    // Group by privilege level for easier consumption
    const groupedPermissions = {};
    permissions.forEach(perm => {
      if (!groupedPermissions[perm.privilege_level]) {
        groupedPermissions[perm.privilege_level] = [];
      }
      groupedPermissions[perm.privilege_level].push(perm);
    });
    
    res.json({
      permissions: groupedPermissions,
      total: permissions.length
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Get permissions for specific privilege level
router.get('/permissions/:level', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const { level } = req.params;
    const permissions = await getRows(`
      SELECT privilege_level, resource_type, action, scope, created_at
      FROM privilege_permissions
      WHERE privilege_level = ?
      ORDER BY resource_type, action
    `, [level]);
    
    res.json({
      privilege_level: parseInt(level),
      permissions,
      total: permissions.length
    });
  } catch (error) {
    console.error('Get level permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// ============================================================================
// USER CONTEXT ROUTES
// ============================================================================

// Get current user's privilege context
router.get('/context', verifyToken, async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.userId);
    if (!userContext) {
      return res.status(404).json({ error: 'User context not found' });
    }
    
    // Get user's permissions
    const permissions = await getRows(`
      SELECT resource_type, action, scope
      FROM privilege_permissions
      WHERE privilege_level = ?
      ORDER BY resource_type, action
    `, [userContext.privilege_level]);
    
    res.json({
      user: userContext,
      permissions,
      privilege_level: userContext.privilege_level
    });
  } catch (error) {
    console.error('Get user context error:', error);
    res.status(500).json({ error: 'Failed to fetch user context' });
  }
});

// Get privilege level information
router.get('/levels', verifyToken, async (req, res) => {
  try {
    const levels = [
      {
        level: 1,
        name: 'View Only',
        description: 'Can view own data only',
        capabilities: ['View own profile', 'View own leave requests']
      },
      {
        level: 2,
        name: 'Basic User',
        description: 'Can create leave requests, view own data',
        capabilities: ['View own profile', 'Update own profile', 'Create leave requests', 'View own leave requests', 'Basic Google access']
      },
      {
        level: 3,
        name: 'Department Manager',
        description: 'Can manage department employees and approve leave',
        capabilities: ['Manage department employees', 'Approve department leave requests', 'Department Google access', 'Department calendar management']
      },
      {
        level: 4,
        name: 'HR Manager',
        description: 'Can manage all employees and access all HR functions',
        capabilities: ['Manage all employees', 'Approve all leave requests', 'Full Google integration', 'HR reporting and analytics']
      },
      {
        level: 5,
        name: 'System Administrator',
        description: 'Full system access and configuration',
        capabilities: ['System configuration', 'User management', 'Department management', 'Privilege management', 'Full system access']
      }
    ];
    
    res.json(levels);
  } catch (error) {
    console.error('Get privilege levels error:', error);
    res.status(500).json({ error: 'Failed to fetch privilege levels' });
  }
});

// ============================================================================
// GRANULAR PERMISSION MANAGEMENT ROUTES
// ============================================================================

// Get user's effective permissions (privilege level + granular)
router.get('/users/:id/effective-permissions', verifyToken, requirePrivilegeLevel(4), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await getRow('SELECT id, name FROM users WHERE id = ? AND is_active = 1', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const effectivePermissions = await getEffectivePermissions(id);
    const hasGranular = await hasGranularPermissions(id);
    
    res.json({
      user: user,
      effective_permissions: effectivePermissions,
      has_granular_permissions: hasGranular,
      total_permissions: effectivePermissions.length
    });
  } catch (error) {
    console.error('Get effective permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch effective permissions' });
  }
});

// Get user's granular permissions only
router.get('/users/:id/granular-permissions', verifyToken, requirePrivilegeLevel(4), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await getRow('SELECT id, name FROM users WHERE id = ? AND is_active = 1', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const granularPermissions = await getUserPermissions(id);
    
    res.json({
      user: user,
      granular_permissions: granularPermissions,
      total_granular: granularPermissions.length
    });
  } catch (error) {
    console.error('Get granular permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch granular permissions' });
  }
});

// Grant specific permission to user
router.post('/users/:id/grant-permission', verifyToken, requirePrivilegeLevel(5), [
  body('resource_type').notEmpty().withMessage('Resource type is required'),
  body('action').notEmpty().withMessage('Action is required'),
  body('scope').notEmpty().withMessage('Scope is required'),
  body('expires_at').optional().isISO8601().withMessage('Expires at must be a valid date')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { resource_type, action, scope, expires_at } = req.body;
    
    // Check if user exists
    const user = await getRow('SELECT id, name FROM users WHERE id = ? AND is_active = 1', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent granting permissions to yourself
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot grant permissions to yourself' });
    }
    
    // Validate scope
    const validScopes = ['own', 'department', 'all'];
    if (!validScopes.includes(scope)) {
      return res.status(400).json({ error: 'Invalid scope. Must be: own, department, or all' });
    }
    
    const result = await grantPermission(id, resource_type, action, scope, req.user.userId, expires_at);
    
    if (result.success) {
      const updatedPermissions = await getUserPermissions(id);
      res.json({
        message: result.message,
        user: user,
        granted_permission: { resource_type, action, scope, expires_at },
        updated_permissions: updatedPermissions
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Grant permission error:', error);
    res.status(500).json({ error: 'Failed to grant permission' });
  }
});

// Revoke specific permission from user
router.delete('/users/:id/revoke-permission', verifyToken, requirePrivilegeLevel(5), [
  body('resource_type').notEmpty().withMessage('Resource type is required'),
  body('action').notEmpty().withMessage('Action is required')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { resource_type, action } = req.body;
    
    // Check if user exists
    const user = await getRow('SELECT id, name FROM users WHERE id = ? AND is_active = 1', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if permission exists
    const permission = await getRow(`
      SELECT * FROM user_permissions 
      WHERE user_id = ? AND resource_type = ? AND action = ? AND is_active = 1
    `, [id, resource_type, action]);
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found or already revoked' });
    }
    
    const result = await revokePermission(id, resource_type, action, req.user.userId);
    
    if (result.success) {
      const updatedPermissions = await getUserPermissions(id);
      res.json({
        message: result.message,
        user: user,
        revoked_permission: { resource_type, action },
        updated_permissions: updatedPermissions
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Revoke permission error:', error);
    res.status(500).json({ error: 'Failed to revoke permission' });
  }
});

// Bulk grant permissions using template
router.post('/users/:id/grant-template', verifyToken, requirePrivilegeLevel(5), [
  body('template_id').isInt().withMessage('Template ID must be a valid integer')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { template_id } = req.body;
    
    // Check if user exists
    const user = await getRow('SELECT id, name FROM users WHERE id = ? AND is_active = 1', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get template
    const template = await getRow('SELECT * FROM permission_templates WHERE id = ?', [template_id]);
    if (!template) {
      return res.status(404).json({ error: 'Permission template not found' });
    }
    
    // Parse template permissions
    const permissions = JSON.parse(template.permissions);
    const results = [];
    
    // Grant each permission
    for (const perm of permissions) {
      const result = await grantPermission(
        id, 
        perm.resource_type, 
        perm.action, 
        perm.scope, 
        req.user.userId, 
        perm.expires_at
      );
      results.push({ permission: perm, result });
    }
    
    const updatedPermissions = await getUserPermissions(id);
    
    res.json({
      message: `Applied template "${template.name}" to user`,
      user: user,
      template: template,
      results: results,
      updated_permissions: updatedPermissions
    });
  } catch (error) {
    console.error('Grant template error:', error);
    res.status(500).json({ error: 'Failed to apply permission template' });
  }
});

// Get available permission templates
router.get('/templates', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const templates = await getRows(`
      SELECT pt.*, u.name as created_by_name
      FROM permission_templates pt
      LEFT JOIN users u ON pt.created_by = u.id
      ORDER BY pt.name
    `);
    
    res.json({
      templates: templates.map(t => ({
        ...t,
        permissions: JSON.parse(t.permissions)
      }))
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch permission templates' });
  }
});

// ============================================================================
// CUSTOM PRIVILEGE LEVELS ROUTES
// ============================================================================

// Get all custom privilege levels
router.get('/custom-levels', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const customLevels = await getAllCustomPrivilegeLevels();
    
    res.json({
      custom_levels: customLevels,
      total: customLevels.length
    });
  } catch (error) {
    console.error('Get custom levels error:', error);
    res.status(500).json({ error: 'Failed to fetch custom privilege levels' });
  }
});

// Get custom privilege level by number
router.get('/custom-levels/:levelNumber', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const { levelNumber } = req.params;
    const level = await getCustomPrivilegeLevel(parseInt(levelNumber));
    
    if (!level) {
      return res.status(404).json({ error: 'Custom privilege level not found' });
    }
    
    res.json({ custom_level: level });
  } catch (error) {
    console.error('Get custom level error:', error);
    res.status(500).json({ error: 'Failed to fetch custom privilege level' });
  }
});

// Create new custom privilege level
router.post('/custom-levels', verifyToken, requirePrivilegeLevel(5), [
  body('level_number').isInt({ min: 6 }).withMessage('Level number must be 6 or higher'),
  body('name').notEmpty().withMessage('Name is required'),
  body('description').optional(),
  body('permissions').isArray().withMessage('Permissions must be an array')
], validateRequest, async (req, res) => {
  try {
    const { level_number, name, description, permissions } = req.body;
    
    // Validate permissions structure
    for (const perm of permissions) {
      if (!perm.resource_type || !perm.action || !perm.scope) {
        return res.status(400).json({ 
          error: 'Each permission must have resource_type, action, and scope' 
        });
      }
      
      const validScopes = ['own', 'department', 'all'];
      if (!validScopes.includes(perm.scope)) {
        return res.status(400).json({ 
          error: `Invalid scope '${perm.scope}'. Must be: own, department, or all` 
        });
      }
    }
    
    const result = await createCustomPrivilegeLevel(
      level_number, 
      name, 
      description, 
      permissions, 
      req.user.userId
    );
    
    if (result.success) {
      const newLevel = await getCustomPrivilegeLevel(level_number);
      res.status(201).json({
        message: result.message,
        custom_level: newLevel
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Create custom level error:', error);
    res.status(500).json({ error: 'Failed to create custom privilege level' });
  }
});

// Update custom privilege level
router.put('/custom-levels/:levelNumber', verifyToken, requirePrivilegeLevel(5), [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional(),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
], validateRequest, async (req, res) => {
  try {
    const { levelNumber } = req.params;
    const { name, description, permissions } = req.body;
    
    // Check if level exists
    const existingLevel = await getCustomPrivilegeLevel(parseInt(levelNumber));
    if (!existingLevel) {
      return res.status(404).json({ error: 'Custom privilege level not found' });
    }
    
    // Validate permissions if provided
    if (permissions) {
      for (const perm of permissions) {
        if (!perm.resource_type || !perm.action || !perm.scope) {
          return res.status(400).json({ 
            error: 'Each permission must have resource_type, action, and scope' 
          });
        }
        
        const validScopes = ['own', 'department', 'all'];
        if (!validScopes.includes(perm.scope)) {
          return res.status(400).json({ 
            error: `Invalid scope '${perm.scope}'. Must be: own, department, or all` 
          });
        }
      }
    }
    
    const result = await updateCustomPrivilegeLevel(parseInt(levelNumber), {
      name, description, permissions
    });
    
    if (result.success) {
      const updatedLevel = await getCustomPrivilegeLevel(parseInt(levelNumber));
      res.json({
        message: result.message,
        custom_level: updatedLevel
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Update custom level error:', error);
    res.status(500).json({ error: 'Failed to update custom privilege level' });
  }
});

// Delete custom privilege level
router.delete('/custom-levels/:levelNumber', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const { levelNumber } = req.params;
    
    // Check if level exists
    const existingLevel = await getCustomPrivilegeLevel(parseInt(levelNumber));
    if (!existingLevel) {
      return res.status(404).json({ error: 'Custom privilege level not found' });
    }
    
    const result = await deleteCustomPrivilegeLevel(parseInt(levelNumber));
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Delete custom level error:', error);
    res.status(500).json({ error: 'Failed to delete custom privilege level' });
  }
});

// Get all privilege levels (standard + custom)
router.get('/all-levels', verifyToken, async (req, res) => {
  try {
    const standardLevels = [
      {
        level: 1,
        name: 'View Only',
        description: 'Can view own data only',
        type: 'standard'
      },
      {
        level: 2,
        name: 'Basic User',
        description: 'Can create leave requests, view own data',
        type: 'standard'
      },
      {
        level: 3,
        name: 'Department Manager',
        description: 'Can manage department employees and approve leave',
        type: 'standard'
      },
      {
        level: 4,
        name: 'HR Manager',
        description: 'Can manage all employees and access all HR functions',
        type: 'standard'
      },
      {
        level: 5,
        name: 'System Administrator',
        description: 'Full system access and configuration',
        type: 'standard'
      }
    ];
    
    const customLevels = await getAllCustomPrivilegeLevels();
    const customLevelsFormatted = customLevels.map(level => ({
      level: level.level_number,
      name: level.name,
      description: level.description,
      type: 'custom',
      permissions: level.permissions
    }));
    
    const allLevels = [...standardLevels, ...customLevelsFormatted];
    
    res.json({
      all_levels: allLevels,
      standard_count: standardLevels.length,
      custom_count: customLevels.length,
      total: allLevels.length
    });
  } catch (error) {
    console.error('Get all levels error:', error);
    res.status(500).json({ error: 'Failed to fetch privilege levels' });
  }
});

module.exports = router; 