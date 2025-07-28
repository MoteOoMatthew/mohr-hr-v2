# Custom Privilege Levels 🔧

## Overview

The MOHR HR system now supports **custom privilege levels** that allow you to create new privilege levels (Level 6 and above) as combinations of granular permissions. This provides maximum flexibility for role-based access control while maintaining the simplicity of privilege levels.

## How It Works

### **Three-Tier Permission System**

1. **Standard Privilege Levels** (Level 1-5)
   - Predefined levels with fixed permissions
   - Basic access control foundation

2. **Custom Privilege Levels** (Level 6+)
   - User-defined levels with custom permission combinations
   - Built from granular permissions
   - Can be created, modified, and deleted

3. **Granular Permissions** (Individual overrides)
   - Specific permissions granted to individual users
   - Override both standard and custom privilege levels
   - Can be temporary with expiration dates

### **Permission Hierarchy**

```
User Permission Check:
1. Check Granular Permissions (Individual grants) ← Highest priority
2. If no granular permission → Check Custom Privilege Level (6+)
3. If no custom level → Check Standard Privilege Level (1-5)
4. If no standard level → Access Denied
```

## Database Schema

### **custom_privilege_levels Table**
```sql
CREATE TABLE custom_privilege_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level_number INTEGER UNIQUE NOT NULL,    -- Level 6, 7, 8, etc.
  name TEXT NOT NULL,                      -- 'Senior HR Specialist'
  description TEXT,                        -- Description of the role
  permissions TEXT NOT NULL,               -- JSON array of permissions
  is_active BOOLEAN DEFAULT 1,
  created_by INTEGER,                      -- Who created this level
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users (id)
);
```

## Pre-built Custom Levels

### **Level 6: Senior HR Specialist**
```json
{
  "level_number": 6,
  "name": "Senior HR Specialist",
  "description": "Advanced HR functions with limited system access",
  "permissions": [
    { "resource_type": "employees", "action": "read", "scope": "all" },
    { "resource_type": "employees", "action": "create", "scope": "all" },
    { "resource_type": "employees", "action": "update", "scope": "all" },
    { "resource_type": "leave_requests", "action": "read", "scope": "all" },
    { "resource_type": "leave_requests", "action": "approve", "scope": "all" },
    { "resource_type": "google_docs", "action": "read", "scope": "all" },
    { "resource_type": "google_docs", "action": "write", "scope": "all" },
    { "resource_type": "google_sheets", "action": "read", "scope": "all" },
    { "resource_type": "google_sheets", "action": "write", "scope": "all" },
    { "resource_type": "google_calendar", "action": "read", "scope": "all" },
    { "resource_type": "google_calendar", "action": "write", "scope": "all" },
    { "resource_type": "google_drive", "action": "read", "scope": "all" },
    { "resource_type": "google_drive", "action": "write", "scope": "all" }
  ]
}
```

### **Level 7: Finance Manager**
```json
{
  "level_number": 7,
  "name": "Finance Manager",
  "description": "Financial data access with employee management",
  "permissions": [
    { "resource_type": "employees", "action": "read", "scope": "all" },
    { "resource_type": "employees", "action": "update", "scope": "all" },
    { "resource_type": "leave_requests", "action": "read", "scope": "all" },
    { "resource_type": "leave_requests", "action": "approve", "scope": "all" },
    { "resource_type": "google_sheets", "action": "read", "scope": "all" },
    { "resource_type": "google_sheets", "action": "write", "scope": "all" },
    { "resource_type": "google_docs", "action": "read", "scope": "all" },
    { "resource_type": "audit_log", "action": "read", "scope": "all" }
  ]
}
```

### **Level 8: IT Administrator**
```json
{
  "level_number": 8,
  "name": "IT Administrator",
  "description": "System administration without HR data access",
  "permissions": [
    { "resource_type": "users", "action": "read", "scope": "all" },
    { "resource_type": "users", "action": "create", "scope": "all" },
    { "resource_type": "users", "action": "update", "scope": "all" },
    { "resource_type": "users", "action": "delete", "scope": "all" },
    { "resource_type": "departments", "action": "read", "scope": "all" },
    { "resource_type": "departments", "action": "create", "scope": "all" },
    { "resource_type": "departments", "action": "update", "scope": "all" },
    { "resource_type": "departments", "action": "delete", "scope": "all" },
    { "resource_type": "privileges", "action": "read", "scope": "all" },
    { "resource_type": "privileges", "action": "create", "scope": "all" },
    { "resource_type": "privileges", "action": "update", "scope": "all" },
    { "resource_type": "privileges", "action": "delete", "scope": "all" },
    { "resource_type": "system", "action": "admin", "scope": "all" }
  ]
}
```

### **Level 9: Compliance Officer**
```json
{
  "level_number": 9,
  "name": "Compliance Officer",
  "description": "Read-only access for compliance and audit purposes",
  "permissions": [
    { "resource_type": "employees", "action": "read", "scope": "all" },
    { "resource_type": "leave_requests", "action": "read", "scope": "all" },
    { "resource_type": "audit_log", "action": "read", "scope": "all" },
    { "resource_type": "google_docs", "action": "read", "scope": "all" },
    { "resource_type": "google_sheets", "action": "read", "scope": "all" }
  ]
}
```

### **Level 10: Project Manager**
```json
{
  "level_number": 10,
  "name": "Project Manager",
  "description": "Project management with team access",
  "permissions": [
    { "resource_type": "employees", "action": "read", "scope": "department" },
    { "resource_type": "employees", "action": "update", "scope": "department" },
    { "resource_type": "leave_requests", "action": "read", "scope": "department" },
    { "resource_type": "leave_requests", "action": "approve", "scope": "department" },
    { "resource_type": "google_calendar", "action": "read", "scope": "all" },
    { "resource_type": "google_calendar", "action": "write", "scope": "all" },
    { "resource_type": "google_docs", "action": "read", "scope": "all" },
    { "resource_type": "google_docs", "action": "write", "scope": "all" },
    { "resource_type": "google_sheets", "action": "read", "scope": "all" },
    { "resource_type": "google_sheets", "action": "write", "scope": "all" }
  ]
}
```

## API Endpoints

### **Custom Privilege Level Management**

#### **Get All Custom Levels**
```http
GET /api/privileges/custom-levels
```

#### **Get Custom Level by Number**
```http
GET /api/privileges/custom-levels/:levelNumber
```

#### **Create New Custom Level**
```http
POST /api/privileges/custom-levels
Content-Type: application/json

{
  "level_number": 11,
  "name": "Marketing Manager",
  "description": "Marketing team management with limited HR access",
  "permissions": [
    { "resource_type": "employees", "action": "read", "scope": "department" },
    { "resource_type": "leave_requests", "action": "read", "scope": "department" },
    { "resource_type": "leave_requests", "action": "approve", "scope": "department" },
    { "resource_type": "google_docs", "action": "read", "scope": "all" },
    { "resource_type": "google_docs", "action": "write", "scope": "all" }
  ]
}
```

#### **Update Custom Level**
```http
PUT /api/privileges/custom-levels/:levelNumber
Content-Type: application/json

{
  "name": "Updated Marketing Manager",
  "description": "Updated description",
  "permissions": [
    // Updated permissions array
  ]
}
```

#### **Delete Custom Level**
```http
DELETE /api/privileges/custom-levels/:levelNumber
```

#### **Get All Levels (Standard + Custom)**
```http
GET /api/privileges/all-levels
```

## Usage Examples

### **Example 1: Create a Sales Manager Level**

```javascript
// Create a new custom privilege level for Sales Managers
const response = await fetch('/api/privileges/custom-levels', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    level_number: 11,
    name: 'Sales Manager',
    description: 'Sales team management with customer data access',
    permissions: [
      { resource_type: 'employees', action: 'read', scope: 'department' },
      { resource_type: 'employees', action: 'update', scope: 'department' },
      { resource_type: 'leave_requests', action: 'read', scope: 'department' },
      { resource_type: 'leave_requests', action: 'approve', scope: 'department' },
      { resource_type: 'google_calendar', action: 'read', scope: 'all' },
      { resource_type: 'google_calendar', action: 'write', scope: 'all' },
      { resource_type: 'google_sheets', action: 'read', scope: 'all' },
      { resource_type: 'google_sheets', action: 'write', scope: 'all' }
    ]
  })
});
```

### **Example 2: Assign Custom Level to User**

```javascript
// Assign the new Sales Manager level to a user
const response = await fetch('/api/privileges/users/123/privileges', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    privilege_level: 11  // Custom Sales Manager level
  })
});
```

### **Example 3: Get All Available Levels**

```javascript
// Get all privilege levels (standard + custom)
const response = await fetch('/api/privileges/all-levels', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
console.log('Available levels:', data.all_levels);
```

## Creating Custom Levels

### **Step-by-Step Process**

1. **Identify the Role Requirements**
   - What resources does this role need access to?
   - What actions should they be able to perform?
   - What scope (own, department, all) is appropriate?

2. **Choose a Level Number**
   - Must be 6 or higher
   - Should be logical and sequential
   - Consider future expansion

3. **Define Permissions**
   - Use the granular permission format
   - Include all necessary resource/action combinations
   - Be specific about scopes

4. **Create the Level**
   - Use the API to create the custom level
   - Test the permissions work correctly
   - Document the level's purpose

### **Permission Structure**

Each permission in a custom level follows this format:
```json
{
  "resource_type": "employees",     // What resource
  "action": "read",                 // What action
  "scope": "department"             // What scope
}
```

### **Available Resources**
- `employees` - Employee data management
- `leave_requests` - Leave request management
- `users` - User management
- `departments` - Department management
- `privileges` - Privilege management
- `google_docs` - Google Docs access
- `google_sheets` - Google Sheets access
- `google_calendar` - Google Calendar access
- `google_drive` - Google Drive access
- `audit_log` - Audit log access
- `system` - System configuration

### **Available Actions**
- `read` - View data
- `write` - Modify data
- `create` - Create new records
- `update` - Update existing records
- `delete` - Delete records
- `approve` - Approve requests
- `admin` - Administrative access

### **Available Scopes**
- `own` - User's own data only
- `department` - Department-level access
- `all` - Organization-wide access

## Best Practices

### **1. Naming Conventions**
- Use clear, descriptive names
- Include the role/function in the name
- Be consistent with naming patterns

### **2. Permission Design**
- Follow the principle of least privilege
- Only include necessary permissions
- Consider security implications

### **3. Level Numbering**
- Use logical sequences (6, 7, 8, etc.)
- Leave gaps for future levels
- Document the numbering scheme

### **4. Documentation**
- Document the purpose of each custom level
- Keep descriptions up to date
- Maintain a level catalog

### **5. Testing**
- Test custom levels thoroughly
- Verify permissions work as expected
- Test edge cases and boundaries

## Security Considerations

### **1. Level Creation**
- Only Level 5 users can create custom levels
- Validate all permissions before creation
- Audit level creation activities

### **2. Permission Validation**
- Ensure permissions are valid
- Check for permission conflicts
- Validate scope appropriateness

### **3. Level Assignment**
- Be careful when assigning custom levels
- Monitor level usage
- Regular review of custom levels

### **4. Level Deletion**
- Check for users using the level before deletion
- Soft delete to maintain audit trail
- Notify affected users

## Migration Strategy

### **From Standard Levels**
1. Identify roles that need custom permissions
2. Create appropriate custom levels
3. Migrate users to custom levels
4. Test and validate

### **From Granular Permissions**
1. Identify common permission patterns
2. Create custom levels for these patterns
3. Replace granular permissions with custom levels
4. Maintain individual overrides as needed

## Troubleshooting

### **Common Issues**

#### **Level Not Working**
1. Check if custom level exists and is active
2. Verify level number is 6 or higher
3. Check permission structure
4. Test individual permissions

#### **Permission Conflicts**
1. Check granular permission overrides
2. Verify permission hierarchy
3. Review effective permissions
4. Check for scope conflicts

#### **Level Creation Fails**
1. Verify level number is unique
2. Check permission format
3. Ensure all required fields
4. Validate permission values

## Future Enhancements

### **Planned Features**
1. **Level Inheritance** - Custom levels can inherit from other levels
2. **Conditional Permissions** - Time-based or context-based permissions
3. **Level Templates** - Pre-built level templates for common roles
4. **Level Analytics** - Usage tracking and optimization
5. **Level Versioning** - Track changes to custom levels over time 