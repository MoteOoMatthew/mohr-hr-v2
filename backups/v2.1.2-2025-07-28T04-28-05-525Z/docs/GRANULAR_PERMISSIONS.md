# Granular Permission System 🔐

## Overview

The MOHR HR system now supports **granular permissions** that allow individual rights to be granted and revoked for specific resources and actions, providing much more flexibility than the basic privilege level system.

## How It Works

### **Two-Tier Permission System**

1. **Privilege Levels** (Base permissions)
   - Level 1-5 with predefined permissions
   - Provides baseline access control

2. **Granular Permissions** (Individual overrides)
   - Specific permissions granted to individual users
   - Override privilege level permissions
   - Can be temporary with expiration dates

### **Permission Hierarchy**

```
User Permission Check:
1. Check Granular Permissions (Individual grants)
2. If no granular permission → Check Privilege Level
3. If no privilege level permission → Access Denied
```

## Database Schema

### **user_permissions Table**
```sql
CREATE TABLE user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  resource_type TEXT NOT NULL,    -- 'employees', 'leave_requests', etc.
  action TEXT NOT NULL,           -- 'read', 'write', 'create', 'delete', 'approve'
  scope TEXT NOT NULL,            -- 'own', 'department', 'all'
  granted_by INTEGER,             -- Who granted this permission
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,            -- Optional expiration date
  is_active BOOLEAN DEFAULT 1,
  
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (granted_by) REFERENCES users (id),
  UNIQUE(user_id, resource_type, action)
);
```

### **permission_templates Table**
```sql
CREATE TABLE permission_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL,      -- JSON array of permissions
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users (id)
);
```

## API Endpoints

### **Granular Permission Management**

#### **Get User's Effective Permissions**
```http
GET /api/privileges/users/:id/effective-permissions
```
Returns all permissions for a user (privilege level + granular)

#### **Get User's Granular Permissions Only**
```http
GET /api/privileges/users/:id/granular-permissions
```
Returns only individually granted permissions

#### **Grant Specific Permission**
```http
POST /api/privileges/users/:id/grant-permission
Content-Type: application/json

{
  "resource_type": "employees",
  "action": "read",
  "scope": "all",
  "expires_at": "2024-12-31T23:59:59Z"  // Optional
}
```

#### **Revoke Specific Permission**
```http
DELETE /api/privileges/users/:id/revoke-permission
Content-Type: application/json

{
  "resource_type": "employees",
  "action": "read"
}
```

#### **Apply Permission Template**
```http
POST /api/privileges/users/:id/grant-template
Content-Type: application/json

{
  "template_id": 1
}
```

#### **Get Available Templates**
```http
GET /api/privileges/templates
```

## Usage Examples

### **Example 1: Grant Temporary HR Access**

```javascript
// Grant temporary HR access to a Level 2 user
const response = await fetch('/api/privileges/users/123/grant-permission', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    resource_type: 'employees',
    action: 'read',
    scope: 'all',
    expires_at: '2024-12-31T23:59:59Z'
  })
});
```

### **Example 2: Grant Department Management**

```javascript
// Grant department management to a Level 2 user
const permissions = [
  { resource_type: 'employees', action: 'read', scope: 'department' },
  { resource_type: 'employees', action: 'update', scope: 'department' },
  { resource_type: 'leave_requests', action: 'approve', scope: 'department' }
];

for (const perm of permissions) {
  await fetch('/api/privileges/users/123/grant-permission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(perm)
  });
}
```

### **Example 3: Apply Template**

```javascript
// Apply "Department Supervisor" template
const response = await fetch('/api/privileges/users/123/grant-template', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    template_id: 2  // Department Supervisor template
  })
});
```

## Available Resources and Actions

### **Resource Types**
- `employees` - Employee data management
- `leave_requests` - Leave request management
- `profile` - User profile management
- `users` - User management
- `departments` - Department management
- `privileges` - Privilege management
- `google_docs` - Google Docs access
- `google_sheets` - Google Sheets access
- `google_calendar` - Google Calendar access
- `google_drive` - Google Drive access
- `audit_log` - Audit log access
- `system` - System configuration

### **Actions**
- `read` - View data
- `write` - Modify data
- `create` - Create new records
- `update` - Update existing records
- `delete` - Delete records
- `approve` - Approve requests
- `admin` - Administrative access

### **Scopes**
- `own` - User's own data only
- `department` - Department-level access
- `all` - Organization-wide access

## Permission Templates

### **Pre-built Templates**

#### **1. Temporary HR Access**
```json
{
  "name": "Temporary HR Access",
  "description": "Temporary access to HR functions for project work",
  "permissions": [
    { "resource_type": "employees", "action": "read", "scope": "all" },
    { "resource_type": "leave_requests", "action": "read", "scope": "all" },
    { "resource_type": "leave_requests", "action": "approve", "scope": "all" }
  ],
  "expires_at": "30 days from grant"
}
```

#### **2. Department Supervisor**
```json
{
  "name": "Department Supervisor",
  "description": "Department-level management permissions",
  "permissions": [
    { "resource_type": "employees", "action": "read", "scope": "department" },
    { "resource_type": "employees", "action": "update", "scope": "department" },
    { "resource_type": "leave_requests", "action": "read", "scope": "department" },
    { "resource_type": "leave_requests", "action": "approve", "scope": "department" }
  ]
}
```

#### **3. Google Integration Access**
```json
{
  "name": "Google Integration Access",
  "description": "Access to Google services for specific users",
  "permissions": [
    { "resource_type": "google_docs", "action": "read", "scope": "all" },
    { "resource_type": "google_docs", "action": "write", "scope": "all" },
    { "resource_type": "google_sheets", "action": "read", "scope": "all" },
    { "resource_type": "google_sheets", "action": "write", "scope": "all" },
    { "resource_type": "google_calendar", "action": "read", "scope": "all" },
    { "resource_type": "google_calendar", "action": "write", "scope": "all" }
  ]
}
```

#### **4. Audit Access**
```json
{
  "name": "Audit Access",
  "description": "Read-only access for audit purposes",
  "permissions": [
    { "resource_type": "employees", "action": "read", "scope": "all" },
    { "resource_type": "leave_requests", "action": "read", "scope": "all" },
    { "resource_type": "audit_log", "action": "read", "scope": "all" }
  ]
}
```

## Best Practices

### **1. Principle of Least Privilege**
- Start with privilege levels
- Grant granular permissions only when needed
- Use expiration dates for temporary access

### **2. Regular Audits**
- Review granular permissions regularly
- Remove expired permissions
- Document why permissions were granted

### **3. Use Templates**
- Create templates for common permission sets
- Use templates instead of individual grants when possible
- Keep templates updated and documented

### **4. Monitoring**
- Log all permission grants and revokes
- Monitor for unusual permission patterns
- Set up alerts for high-privilege grants

## Security Considerations

### **1. Permission Escalation**
- Granular permissions can override privilege levels
- Always verify the effective permissions
- Be careful with 'all' scope grants

### **2. Expiration Management**
- Set expiration dates for temporary access
- Regularly clean up expired permissions
- Monitor for expired permissions that need renewal

### **3. Audit Trail**
- All permission changes are logged
- Track who granted what to whom
- Maintain audit logs for compliance

### **4. Access Reviews**
- Regular reviews of granular permissions
- Remove unnecessary permissions
- Verify permissions are still needed

## Migration from Privilege Levels

### **When to Use Granular Permissions**

1. **Temporary Access** - Project work, covering for colleagues
2. **Specific Functions** - One-off tasks requiring specific permissions
3. **Department Overrides** - Users who need department access but aren't managers
4. **Google Integration** - Users who need Google access but aren't HR managers
5. **Audit Access** - External auditors or compliance checks

### **When to Stick with Privilege Levels**

1. **Standard Roles** - Regular job functions
2. **Permanent Access** - Long-term role requirements
3. **Simple Scenarios** - Basic access control needs
4. **Performance** - Privilege levels are faster to check

## Troubleshooting

### **Common Issues**

#### **Permission Not Working**
1. Check if granular permission exists
2. Verify expiration date
3. Check privilege level fallback
4. Ensure permission is active

#### **Unexpected Access**
1. Check effective permissions
2. Look for granular overrides
3. Verify privilege level
4. Review permission hierarchy

#### **Performance Issues**
1. Monitor permission cache
2. Check for too many granular permissions
3. Consider using templates
4. Review permission checking frequency

## Future Enhancements

### **Planned Features**
1. **Permission Groups** - Group related permissions
2. **Conditional Permissions** - Time-based or context-based access
3. **Permission Inheritance** - Inherit permissions from roles
4. **Advanced Templates** - Dynamic templates with variables
5. **Permission Analytics** - Usage and effectiveness tracking 