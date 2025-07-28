# 🔐 Privileges Management UI Guide

## 🎯 **How to Access the Privileges Screen**

### **Step 1: Start the Application**
1. **Backend Server** (if not already running):
   ```bash
   cd backend
   node server.js
   ```

2. **Frontend Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```

### **Step 2: Navigate to Privileges**
1. **Open your browser** and go to: `http://localhost:5173`
2. **Login** with your credentials
3. **Look for "Privileges"** in the left sidebar navigation
4. **Click on "Privileges"** to access the management interface

---

## 📱 **What You'll See**

### **Three Main Tabs:**

#### **1. All Levels Tab** 📊
- **Shows**: All privilege levels (standard 1-5 + custom 6+)
- **Features**:
  - Visual cards for each level
  - Permission count display
  - Level type indicators (Standard/Custom)
  - Quick delete buttons for custom levels
  - "Create Custom Level" button

#### **2. Custom Levels Tab** ⚙️
- **Shows**: Only custom privilege levels (6+)
- **Features**:
  - Detailed permission breakdown
  - Edit and delete options
  - Permission scope indicators (🔒 All, 🔓 Department, 👁️ Own)
  - Create new custom levels

#### **3. Permission Templates Tab** 📋
- **Shows**: Pre-built permission templates
- **Features**:
  - Template descriptions
  - Permission previews
  - "Apply Template" buttons

---

## 🛠️ **How to Use the Interface**

### **Creating a Custom Privilege Level:**

1. **Click "Create Custom Level"** button
2. **Fill in the form**:
   - **Level Number**: Must be 6 or higher
   - **Name**: Descriptive name (e.g., "Sales Manager")
   - **Description**: Explain the role's purpose
3. **Add Permissions**:
   - Click "Add Permission" for each permission needed
   - Select **Resource** (employees, leave_requests, etc.)
   - Select **Action** (read, write, create, etc.)
   - Select **Scope** (own, department, all)
4. **Click "Create Level"**

### **Example: Creating a "Marketing Manager" Level**

```json
{
  "level_number": 11,
  "name": "Marketing Manager",
  "description": "Marketing team management with limited HR access",
  "permissions": [
    { "resource_type": "employees", "action": "read", "scope": "department" },
    { "resource_type": "leave_requests", "action": "read", "scope": "department" },
    { "resource_type": "leave_requests", "action": "approve", "scope": "department" },
    { "resource_type": "google_docs", "action": "read", "scope": "all" },
    { "resource_type": "google_docs", "action": "write", "scope": "all" },
    { "resource_type": "google_sheets", "action": "read", "scope": "all" },
    { "resource_type": "google_sheets", "action": "write", "scope": "all" }
  ]
}
```

### **Managing Existing Levels:**

- **View Details**: Click on any level card to see permissions
- **Edit Custom Level**: Click the edit icon (✏️) on custom levels
- **Delete Custom Level**: Click the trash icon (🗑️) on custom levels
- **Apply Templates**: Use pre-built templates for common roles

---

## 🎨 **Visual Indicators**

### **Level Type Colors:**
- 🔵 **Blue**: Standard levels (1-5)
- 🟢 **Green**: HR-focused levels
- 🔴 **Red**: System administrator levels
- 🟣 **Purple**: Custom levels (6+)

### **Permission Scope Icons:**
- 🔒 **Lock**: All (organization-wide access)
- 🔓 **Unlock**: Department (department-level access)
- 👁️ **Eye**: Own (user's own data only)

### **Status Indicators:**
- ✅ **Check Circle**: Active permissions
- ❌ **X Circle**: Denied access
- ⚠️ **Alert Circle**: Requires attention

---

## 📊 **Available Resources & Actions**

### **Resources:**
- **employees** - Employee data management
- **leave_requests** - Leave request management
- **users** - User management
- **departments** - Department management
- **privileges** - Privilege management
- **google_docs** - Google Docs access
- **google_sheets** - Google Sheets access
- **google_calendar** - Google Calendar access
- **google_drive** - Google Drive access
- **audit_log** - Audit log access
- **system** - System configuration

### **Actions:**
- **read** - View data
- **write** - Modify data
- **create** - Create new records
- **update** - Update existing records
- **delete** - Delete records
- **approve** - Approve requests
- **admin** - Administrative access

### **Scopes:**
- **own** - User's own data only
- **department** - Department-level access
- **all** - Organization-wide access

---

## 🔐 **Security Features**

### **Access Control:**
- Only Level 5+ users can access the Privileges page
- All API calls require proper authentication
- Permission validation on all operations

### **Safety Features:**
- Confirmation dialogs for deletions
- Soft delete for custom levels
- Check for users before deletion
- Audit trail maintained

---

## 🚀 **Quick Start Examples**

### **Common Custom Levels to Create:**

1. **Sales Manager** (Level 11):
   - Department employee access
   - Leave approval for team
   - Google tools access

2. **Finance Manager** (Level 12):
   - All employee data access
   - Financial reporting tools
   - Audit log access

3. **IT Support** (Level 13):
   - User management
   - System configuration
   - No HR data access

4. **Compliance Officer** (Level 14):
   - Read-only access to all data
   - Audit log access
   - No modification permissions

---

## 🎯 **Next Steps**

### **After Creating Custom Levels:**
1. **Assign to Users**: Use the API to assign levels to users
2. **Test Permissions**: Verify access control works correctly
3. **Monitor Usage**: Track how levels are being used
4. **Refine Permissions**: Adjust based on actual needs

### **Advanced Features:**
- **Individual Permissions**: Grant specific permissions to users
- **Permission Templates**: Use pre-built templates
- **Temporary Access**: Set expiration dates for permissions
- **Audit Logging**: Track all permission changes

---

## 🆘 **Troubleshooting**

### **Common Issues:**

**"Privileges" not showing in navigation:**
- Ensure you're logged in as Level 5+ user
- Check browser console for errors
- Verify frontend is running on correct port

**Can't create custom levels:**
- Verify backend server is running
- Check authentication token
- Ensure level number is 6 or higher

**Permissions not working:**
- Check user's privilege level
- Verify permission structure
- Test with API endpoints directly

---

## 📞 **Support**

If you encounter any issues:
1. Check the browser console for errors
2. Verify both frontend and backend are running
3. Test API endpoints directly
4. Review the test results in `CUSTOM_LEVELS_TEST_RESULTS.md`

The Privileges Management UI is now **fully functional** and ready for production use! 🎉 