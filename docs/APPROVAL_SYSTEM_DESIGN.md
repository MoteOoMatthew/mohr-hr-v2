# Approval System Design - Phase 1A

## 🎯 **Overview**

A comprehensive approval system that handles all approval workflows across the MOHR HR system, ensuring proper authorization, routing, notifications, and audit trails.

## 🏗️ **System Architecture**

### **Core Components:**

1. **Approval Workflows** - Define approval chains and rules
2. **Approval Routing** - Route requests to appropriate approvers
3. **Approval Notifications** - Notify approvers and requesters
4. **Approval Logging** - Complete audit trail
5. **Approval Dashboard** - Centralized approval management

## 📊 **Database Schema**

### **1. Approval Workflows Table**
```sql
CREATE TABLE approval_workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL, -- 'leave', 'document', 'employee', 'expense'
  trigger_conditions TEXT, -- JSON conditions for when workflow applies
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **2. Approval Steps Table**
```sql
CREATE TABLE approval_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  step_order INTEGER NOT NULL,
  approver_type TEXT NOT NULL, -- 'role', 'user', 'manager', 'department_head'
  approver_value TEXT NOT NULL, -- role name, user ID, etc.
  approval_type TEXT NOT NULL, -- 'any', 'all', 'sequential'
  timeout_days INTEGER DEFAULT 7,
  is_required BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows (id)
);
```

### **3. Approval Requests Table**
```sql
CREATE TABLE approval_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER NOT NULL,
  requester_id INTEGER NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows (id),
  FOREIGN KEY (requester_id) REFERENCES users (id)
);
```

### **4. Approval Actions Table**
```sql
CREATE TABLE approval_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  step_id INTEGER NOT NULL,
  approver_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'approve', 'reject', 'request_changes', 'delegate'
  comments TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (request_id) REFERENCES approval_requests (id),
  FOREIGN KEY (step_id) REFERENCES approval_steps (id),
  FOREIGN KEY (approver_id) REFERENCES users (id)
);
```

### **5. Approval Notifications Table**
```sql
CREATE TABLE approval_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL, -- 'pending_approval', 'approved', 'rejected', 'reminder'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (request_id) REFERENCES approval_requests (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 🔄 **Approval Workflow Types**

### **1. Leave Requests**
- **Level 1**: Manager approval (≤ 5 days)
- **Level 2**: Department Head approval (6-14 days)
- **Level 3**: HR Director approval (≥ 15 days)
- **Special**: Medical leave requires HR approval

### **2. Document Approvals**
- **Level 1**: Department Head review
- **Level 2**: Legal/Compliance review (if applicable)
- **Level 3**: Final approval by authorized signatory

### **3. Employee Changes**
- **Level 1**: Direct manager approval
- **Level 2**: HR approval
- **Level 3**: Finance approval (if salary change)

### **4. Expense Approvals**
- **Level 1**: Manager approval (≤ $500)
- **Level 2**: Department Head approval ($501-$2000)
- **Level 3**: Finance approval (≥ $2001)

## 🎛️ **Approval Routing Logic**

### **Approver Types:**
1. **Role-based**: Approvers by role (e.g., "HR Manager")
2. **User-based**: Specific users (e.g., user ID 123)
3. **Manager-based**: Direct manager of requester
4. **Department-based**: Department head
5. **Hierarchy-based**: Up the organizational chain

### **Approval Types:**
1. **Any**: Any approver in the step can approve
2. **All**: All approvers in the step must approve
3. **Sequential**: Approvers must approve in order

## 📱 **Notification System**

### **Notification Types:**
1. **Pending Approval**: Notify approvers of new requests
2. **Approved**: Notify requester of approval
3. **Rejected**: Notify requester of rejection with comments
4. **Reminder**: Remind approvers of pending requests
5. **Escalation**: Notify supervisors of overdue approvals

### **Notification Channels:**
1. **In-app notifications** (primary)
2. **Email notifications** (optional)
3. **Dashboard alerts** (real-time)

## 🔍 **Audit Trail**

### **What Gets Logged:**
1. **Request creation** with all details
2. **Each approval action** with timestamp and user
3. **Comments and reasons** for decisions
4. **IP addresses and user agents** for security
5. **Workflow changes** and escalations
6. **Notification deliveries**

## 🎨 **User Interface**

### **1. Approval Dashboard**
- **Pending Approvals**: List of requests requiring user's approval
- **My Requests**: User's own approval requests
- **Approval History**: Past approvals and decisions
- **Statistics**: Approval metrics and trends

### **2. Request Creation**
- **Smart Workflow Selection**: Auto-select appropriate workflow
- **Approver Preview**: Show who will approve before submission
- **Estimated Timeline**: Show expected approval duration

### **3. Approval Actions**
- **Quick Actions**: Approve/Reject with one click
- **Detailed Review**: Full request details with comments
- **Bulk Actions**: Handle multiple approvals at once

## 🔧 **Implementation Phases**

### **Phase 1A.1: Core Infrastructure**
1. Create database tables
2. Implement basic approval service
3. Create approval API endpoints
4. Build approval dashboard

### **Phase 1A.2: Workflow Engine**
1. Implement workflow routing logic
2. Add notification system
3. Create audit logging
4. Build workflow management UI

### **Phase 1A.3: Integration**
1. Integrate with leave requests
2. Integrate with document management
3. Integrate with employee changes
4. Add email notifications

### **Phase 1A.4: Advanced Features**
1. Add approval delegation
2. Implement approval escalations
3. Add approval analytics
4. Create approval templates

## 🛡️ **Security Considerations**

### **Access Control:**
- Only authorized approvers can see pending requests
- Users can only see their own requests and approvals
- Audit trail is immutable and secure

### **Data Protection:**
- Sensitive data encrypted in transit and at rest
- Approval actions logged with full context
- IP tracking for security monitoring

## 📈 **Success Metrics**

### **Performance Metrics:**
- Average approval time
- Approval completion rate
- Escalation frequency
- User satisfaction scores

### **Operational Metrics:**
- Number of pending approvals
- Approval bottlenecks
- Workflow efficiency
- Compliance adherence

---

**This approval system will provide a solid foundation for all approval workflows in the MOHR HR system, ensuring proper authorization, transparency, and accountability.** 