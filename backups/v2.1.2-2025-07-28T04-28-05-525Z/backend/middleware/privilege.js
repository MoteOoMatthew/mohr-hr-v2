const { getRow, getRows, runQuery } = require('../database/init');

/**
 * Privilege Levels:
 * 1: View Only - Can view own data only
 * 2: Basic User - Can create leave requests, view own data
 * 3: Department Manager - Can manage department employees and approve leave
 * 4: HR Manager - Can manage all employees and access all HR functions
 * 5: System Administrator - Full system access
 */

// Cache for privilege permissions (refresh every 5 minutes)
let privilegeCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get privilege permissions from cache or database
 */
const getPrivilegePermissions = async () => {
  const now = Date.now();
  
  if (privilegeCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return privilegeCache;
  }
  
  try {
    const permissions = await getRows(`
      SELECT privilege_level, resource_type, action, scope 
      FROM privilege_permissions 
      ORDER BY privilege_level, resource_type, action
    `);
    
    // Group permissions by level for faster lookup
    const groupedPermissions = {};
    permissions.forEach(perm => {
      if (!groupedPermissions[perm.privilege_level]) {
        groupedPermissions[perm.privilege_level] = {};
      }
      if (!groupedPermissions[perm.privilege_level][perm.resource_type]) {
        groupedPermissions[perm.privilege_level][perm.resource_type] = {};
      }
      groupedPermissions[perm.privilege_level][perm.resource_type][perm.action] = perm.scope;
    });
    
    privilegeCache = groupedPermissions;
    cacheTimestamp = now;
    
    return groupedPermissions;
  } catch (error) {
    console.error('Error loading privilege permissions:', error);
    return {};
  }
};

/**
 * Check if user has permission for a specific resource and action
 * Now supports privilege levels, custom privilege levels, and granular permissions
 */
const hasPermission = async (userId, privilegeLevel, resourceType, action, scope = null) => {
  try {
    // First check granular user permissions (these override everything)
    const userPermission = await getRow(`
      SELECT scope, expires_at, is_active 
      FROM user_permissions 
      WHERE user_id = ? AND resource_type = ? AND action = ? AND is_active = 1
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `, [userId, resourceType, action]);
    
    if (userPermission) {
      // User has specific permission granted
      if (scope) {
        return userPermission.scope === 'all' || userPermission.scope === scope;
      }
      return true;
    }
    
    // Check custom privilege level permissions (Level 6+)
    if (privilegeLevel >= 6) {
      const customLevel = await getRow(`
        SELECT permissions 
        FROM custom_privilege_levels 
        WHERE level_number = ? AND is_active = 1
      `, [privilegeLevel]);
      
      if (customLevel) {
        const customPermissions = JSON.parse(customLevel.permissions);
        const matchingPermission = customPermissions.find(perm => 
          perm.resource_type === resourceType && perm.action === action
        );
        
        if (matchingPermission) {
          if (scope) {
            return matchingPermission.scope === 'all' || matchingPermission.scope === scope;
          }
          return true;
        }
      }
    }
    
    // Fall back to standard privilege level permissions (Level 1-5)
    if (privilegeLevel >= 1 && privilegeLevel <= 5) {
      const permissions = await getPrivilegePermissions();
      
      // Check if privilege level exists and has the resource
      if (!permissions[privilegeLevel] || 
          !permissions[privilegeLevel][resourceType] || 
          !permissions[privilegeLevel][resourceType][action]) {
        return false;
      }
      
      const userScope = permissions[privilegeLevel][resourceType][action];
      
      // If specific scope is requested, check if user's scope covers it
      if (scope) {
        return userScope === 'all' || userScope === scope;
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Get user's department and manager information
 */
const getUserContext = async (userId) => {
  try {
    // First try to get user with department info
    let user = await getRow(`
      SELECT u.id, u.privilege_level, u.department_id, u.manager_id,
             d.name as department_name, d.manager_id as dept_manager_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `, [userId]);
    
    // If that fails, try without department join
    if (!user) {
      user = await getRow(`
        SELECT id, privilege_level, department_id, manager_id
        FROM users
        WHERE id = ?
      `, [userId]);
    }
    
    // Ensure privilege_level is a number
    if (user) {
      user.privilege_level = parseInt(user.privilege_level) || 1;
      // Set default values for missing fields
      user.department_name = user.department_name || null;
      user.dept_manager_id = user.dept_manager_id || null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
};

/**
 * Check if user can access a specific record based on scope
 */
const canAccessRecord = async (userId, resourceType, recordId, action = 'read') => {
  try {
    const userContext = await getUserContext(userId);
    if (!userContext) return false;
    
    const permissions = await getPrivilegePermissions();
    const userScope = permissions[userContext.privilege_level]?.[resourceType]?.[action];
    
    if (!userScope) return false;
    
    // 'all' scope can access everything
    if (userScope === 'all') return true;
    
    // 'own' scope - check if user owns the record
    if (userScope === 'own') {
      if (resourceType === 'employees') {
        const employee = await getRow('SELECT id FROM employees WHERE id = ? AND user_id = ?', [recordId, userId]);
        return !!employee;
      } else if (resourceType === 'leave_requests') {
        const leaveRequest = await getRow('SELECT id FROM leave_requests WHERE id = ? AND employee_id = ?', [recordId, userId]);
        return !!leaveRequest;
      } else if (resourceType === 'profile') {
        return parseInt(recordId) === userId;
      }
    }
    
    // 'department' scope - check if record belongs to user's department
    if (userScope === 'department' && userContext.department_id) {
      if (resourceType === 'employees') {
        const employee = await getRow('SELECT id FROM employees WHERE id = ? AND department_id = ?', [recordId, userContext.department_id]);
        return !!employee;
      } else if (resourceType === 'leave_requests') {
        const leaveRequest = await getRow(`
          SELECT lr.id FROM leave_requests lr
          JOIN employees e ON lr.employee_id = e.id
          WHERE lr.id = ? AND e.department_id = ?
        `, [recordId, userContext.department_id]);
        return !!leaveRequest;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking record access:', error);
    return false;
  }
};

/**
 * Middleware to require specific privilege level
 */
const requirePrivilegeLevel = (minLevel) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userContext = await getUserContext(req.user.userId);
      if (!userContext) {
        return res.status(403).json({ error: 'User context not found' });
      }
      
      if (userContext.privilege_level < minLevel) {
        return res.status(403).json({ 
          error: `Insufficient privileges. Required level: ${minLevel}, User level: ${userContext.privilege_level}` 
        });
      }
      
      // Add user context to request for use in route handlers
      req.userContext = userContext;
      next();
    } catch (error) {
      console.error('Privilege level check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to require permission for specific resource and action
 */
const requirePermission = (resourceType, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userContext = await getUserContext(req.user.userId);
      if (!userContext) {
        return res.status(403).json({ error: 'User context not found' });
      }
      
      const hasAccess = await hasPermission(
        req.user.userId, 
        userContext.privilege_level, 
        resourceType, 
        action
      );
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: `Access denied. Required permission: ${resourceType}:${action}` 
        });
      }
      
      req.userContext = userContext;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to require record access permission
 */
const requireRecordAccess = (resourceType, action = 'read') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const recordId = req.params.id || req.body.id;
      if (!recordId) {
        return res.status(400).json({ error: 'Record ID required' });
      }
      
      const canAccess = await canAccessRecord(req.user.userId, resourceType, recordId, action);
      if (!canAccess) {
        return res.status(403).json({ 
          error: `Access denied to ${resourceType} record ${recordId}` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Record access check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Get filtered data based on user's scope
 */
const getFilteredData = async (userId, resourceType, baseQuery, params = []) => {
  try {
    const userContext = await getUserContext(userId);
    if (!userContext) return [];
    
    const permissions = await getPrivilegePermissions();
    const userScope = permissions[userContext.privilege_level]?.[resourceType]?.['read'];
    
    if (!userScope) return [];
    
    // 'all' scope - return all data
    if (userScope === 'all') {
      return await getRows(baseQuery, params);
    }
    
    // 'own' scope - filter by user ownership
    if (userScope === 'own') {
      if (resourceType === 'employees') {
        return await getRows(`${baseQuery} AND user_id = ?`, [...params, userId]);
      } else if (resourceType === 'leave_requests') {
        return await getRows(`${baseQuery} AND employee_id = ?`, [...params, userId]);
      } else if (resourceType === 'profile') {
        return await getRows(`${baseQuery} AND id = ?`, [...params, userId]);
      }
    }
    
    // 'department' scope - filter by department
    if (userScope === 'department' && userContext.department_id) {
      if (resourceType === 'employees') {
        return await getRows(`${baseQuery} AND department_id = ?`, [...params, userContext.department_id]);
      } else if (resourceType === 'leave_requests') {
        return await getRows(`
          ${baseQuery} 
          AND employee_id IN (
            SELECT id FROM employees WHERE department_id = ?
          )
        `, [...params, userContext.department_id]);
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error getting filtered data:', error);
    return [];
  }
};

/**
 * Grant specific permission to a user
 */
const grantPermission = async (userId, resourceType, action, scope, grantedBy, expiresAt = null) => {
  try {
    await runQuery(`
      INSERT OR REPLACE INTO user_permissions 
      (user_id, resource_type, action, scope, granted_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, resourceType, action, scope, grantedBy, expiresAt]);
    
    return { success: true, message: 'Permission granted successfully' };
  } catch (error) {
    console.error('Error granting permission:', error);
    return { success: false, error: 'Failed to grant permission' };
  }
};

/**
 * Revoke specific permission from a user
 */
const revokePermission = async (userId, resourceType, action, revokedBy) => {
  try {
    await runQuery(`
      UPDATE user_permissions 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND resource_type = ? AND action = ?
    `, [userId, resourceType, action]);
    
    return { success: true, message: 'Permission revoked successfully' };
  } catch (error) {
    console.error('Error revoking permission:', error);
    return { success: false, error: 'Failed to revoke permission' };
  }
};

/**
 * Get all permissions for a specific user
 */
const getUserPermissions = async (userId) => {
  try {
    const permissions = await getRows(`
      SELECT up.*, u.name as granted_by_name
      FROM user_permissions up
      LEFT JOIN users u ON up.granted_by = u.id
      WHERE up.user_id = ? AND up.is_active = 1
      AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
      ORDER BY up.resource_type, up.action
    `, [userId]);
    
    return permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
};

/**
 * Check if user has any granular permissions
 */
const hasGranularPermissions = async (userId) => {
  try {
    const count = await getRow(`
      SELECT COUNT(*) as count
      FROM user_permissions 
      WHERE user_id = ? AND is_active = 1
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `, [userId]);
    
    return count.count > 0;
  } catch (error) {
    console.error('Error checking granular permissions:', error);
    return false;
  }
};

/**
 * Get effective permissions for a user (privilege level + custom level + granular)
 */
const getEffectivePermissions = async (userId) => {
  try {
    const userContext = await getUserContext(userId);
    if (!userContext) return [];
    
    let basePermissions = [];
    
    // Get base permissions based on privilege level type
    if (userContext.privilege_level >= 6) {
      // Custom privilege level
      const customLevel = await getRow(`
        SELECT permissions 
        FROM custom_privilege_levels 
        WHERE level_number = ? AND is_active = 1
      `, [userContext.privilege_level]);
      
      if (customLevel) {
        basePermissions = JSON.parse(customLevel.permissions).map(perm => ({
          resource_type: perm.resource_type,
          action: perm.action,
          scope: perm.scope,
          is_custom_level: true
        }));
      }
    } else {
      // Standard privilege level (1-5)
      basePermissions = await getRows(`
        SELECT resource_type, action, scope
        FROM privilege_permissions
        WHERE privilege_level = ?
        ORDER BY resource_type, action
      `, [userContext.privilege_level]);
    }
    
    // Get granular permissions
    const granularPermissions = await getUserPermissions(userId);
    
    // Combine and mark granular permissions as overrides
    const effectivePermissions = [...basePermissions];
    
    granularPermissions.forEach(gp => {
      const existingIndex = effectivePermissions.findIndex(
        p => p.resource_type === gp.resource_type && p.action === gp.action
      );
      
      if (existingIndex >= 0) {
        // Override base permission
        effectivePermissions[existingIndex] = {
          ...effectivePermissions[existingIndex],
          scope: gp.scope,
          is_granular: true,
          granted_by: gp.granted_by,
          granted_at: gp.granted_at,
          expires_at: gp.expires_at
        };
      } else {
        // Add new granular permission
        effectivePermissions.push({
          resource_type: gp.resource_type,
          action: gp.action,
          scope: gp.scope,
          is_granular: true,
          granted_by: gp.granted_by,
          granted_at: gp.granted_at,
          expires_at: gp.expires_at
        });
      }
    });
    
    return effectivePermissions;
  } catch (error) {
    console.error('Error getting effective permissions:', error);
    return [];
  }
};

/**
 * Get custom privilege level by number
 */
const getCustomPrivilegeLevel = async (levelNumber) => {
  try {
    const level = await getRow(`
      SELECT * FROM custom_privilege_levels 
      WHERE level_number = ? AND is_active = 1
    `, [levelNumber]);
    
    if (level) {
      return {
        ...level,
        permissions: JSON.parse(level.permissions)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting custom privilege level:', error);
    return null;
  }
};

/**
 * Get all custom privilege levels
 */
const getAllCustomPrivilegeLevels = async () => {
  try {
    const levels = await getRows(`
      SELECT * FROM custom_privilege_levels 
      WHERE is_active = 1
      ORDER BY level_number
    `);
    
    return levels.map(level => ({
      ...level,
      permissions: JSON.parse(level.permissions)
    }));
  } catch (error) {
    console.error('Error getting custom privilege levels:', error);
    return [];
  }
};

/**
 * Create custom privilege level
 */
const createCustomPrivilegeLevel = async (levelNumber, name, description, permissions, createdBy) => {
  try {
    // Check if level number already exists
    const existing = await getRow(`
      SELECT id FROM custom_privilege_levels 
      WHERE level_number = ?
    `, [levelNumber]);
    
    if (existing) {
      return { success: false, error: 'Privilege level number already exists' };
    }
    
    await runQuery(`
      INSERT INTO custom_privilege_levels 
      (level_number, name, description, permissions, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [levelNumber, name, description, JSON.stringify(permissions), createdBy]);
    
    return { success: true, message: 'Custom privilege level created successfully' };
  } catch (error) {
    console.error('Error creating custom privilege level:', error);
    return { success: false, error: 'Failed to create custom privilege level' };
  }
};

/**
 * Update custom privilege level
 */
const updateCustomPrivilegeLevel = async (levelNumber, updates) => {
  try {
    const { name, description, permissions } = updates;
    const updateFields = [];
    const params = [];
    
    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    
    if (permissions) {
      updateFields.push('permissions = ?');
      params.push(JSON.stringify(permissions));
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(levelNumber);
    
    await runQuery(`
      UPDATE custom_privilege_levels 
      SET ${updateFields.join(', ')}
      WHERE level_number = ?
    `, params);
    
    return { success: true, message: 'Custom privilege level updated successfully' };
  } catch (error) {
    console.error('Error updating custom privilege level:', error);
    return { success: false, error: 'Failed to update custom privilege level' };
  }
};

/**
 * Delete custom privilege level (soft delete)
 */
const deleteCustomPrivilegeLevel = async (levelNumber) => {
  try {
    // Check if any users are using this level
    const usersWithLevel = await getRow(`
      SELECT COUNT(*) as count FROM users 
      WHERE privilege_level = ? AND is_active = 1
    `, [levelNumber]);
    
    if (usersWithLevel.count > 0) {
      return { 
        success: false, 
        error: `Cannot delete level. ${usersWithLevel.count} user(s) are currently using this privilege level.` 
      };
    }
    
    await runQuery(`
      UPDATE custom_privilege_levels 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE level_number = ?
    `, [levelNumber]);
    
    return { success: true, message: 'Custom privilege level deleted successfully' };
  } catch (error) {
    console.error('Error deleting custom privilege level:', error);
    return { success: false, error: 'Failed to delete custom privilege level' };
  }
};

/**
 * Clear privilege cache (useful for testing or when permissions change)
 */
const clearPrivilegeCache = () => {
  privilegeCache = null;
  cacheTimestamp = 0;
};

module.exports = {
  hasPermission,
  getUserContext,
  canAccessRecord,
  requirePrivilegeLevel,
  requirePermission,
  requireRecordAccess,
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
  deleteCustomPrivilegeLevel,
  clearPrivilegeCache,
  getPrivilegePermissions
}; 