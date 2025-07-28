const { getRow, getAll, runQuery } = require('../database/init');

class ApprovalService {
  constructor() {
    this.notificationService = null; // Will be injected
  }

  // Set notification service
  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  // Get appropriate workflow for a resource
  async getWorkflowForResource(resourceType, resourceData) {
    try {
      const workflows = await getAll(`
        SELECT * FROM approval_workflows 
        WHERE resource_type = ? AND is_active = 1
        ORDER BY id ASC
      `, [resourceType]);

      for (const workflow of workflows) {
        if (this.matchesTriggerConditions(workflow.trigger_conditions, resourceData)) {
          return workflow;
        }
      }

      return null; // No matching workflow
    } catch (error) {
      console.error('Error getting workflow for resource:', error);
      throw error;
    }
  }

  // Check if resource data matches workflow trigger conditions
  matchesTriggerConditions(triggerConditions, resourceData) {
    try {
      const conditions = JSON.parse(triggerConditions);
      
      for (const [key, value] of Object.entries(conditions)) {
        if (!this.matchesCondition(key, value, resourceData[key])) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error parsing trigger conditions:', error);
      return false;
    }
  }

  // Match individual condition
  matchesCondition(key, expectedValue, actualValue) {
    if (Array.isArray(expectedValue)) {
      return expectedValue.includes(actualValue);
    } else if (typeof expectedValue === 'object') {
      if (expectedValue.min !== undefined && actualValue < expectedValue.min) {
        return false;
      }
      if (expectedValue.max !== undefined && actualValue > expectedValue.max) {
        return false;
      }
      return true;
    } else {
      return expectedValue === actualValue;
    }
  }

  // Create approval request
  async createApprovalRequest(workflowId, resourceType, resourceId, requesterId, priority = 'normal') {
    try {
      const result = await runQuery(`
        INSERT INTO approval_requests 
        (workflow_id, resource_type, resource_id, requester_id, priority, due_date)
        VALUES (?, ?, ?, ?, ?, datetime('now', '+7 days'))
      `, [workflowId, resourceType, resourceId, requesterId, priority]);

      const requestId = result.lastID;
      
      // Get the first step and notify approvers
      await this.notifyStepApprovers(requestId, 1);
      
      return requestId;
    } catch (error) {
      console.error('Error creating approval request:', error);
      throw error;
    }
  }

  // Get current approvers for a step
  async getStepApprovers(requestId, stepNumber) {
    try {
      const request = await getRow(`
        SELECT ar.*, aw.name as workflow_name
        FROM approval_requests ar
        JOIN approval_workflows aw ON ar.workflow_id = aw.id
        WHERE ar.id = ?
      `, [requestId]);

      if (!request) {
        throw new Error('Approval request not found');
      }

      const step = await getRow(`
        SELECT * FROM approval_steps 
        WHERE workflow_id = ? AND step_order = ?
      `, [request.workflow_id, stepNumber]);

      if (!step) {
        throw new Error('Approval step not found');
      }

      // Get approvers based on approver type
      const approvers = await this.getApproversByType(step.approver_type, step.approver_value, request.requester_id);
      
      return {
        step,
        approvers,
        request
      };
    } catch (error) {
      console.error('Error getting step approvers:', error);
      throw error;
    }
  }

  // Get approvers by type
  async getApproversByType(approverType, approverValue, requesterId) {
    switch (approverType) {
      case 'role':
        return await this.getApproversByRole(approverValue);
      case 'manager':
        return await this.getApproversByManager(requesterId, approverValue);
      case 'user':
        return await this.getApproversByUserId(approverValue);
      case 'department_head':
        return await this.getApproversByDepartmentHead(requesterId);
      default:
        throw new Error(`Unknown approver type: ${approverType}`);
    }
  }

  // Get approvers by role
  async getApproversByRole(roleName) {
    return await getAll(`
      SELECT id, username, name, email 
      FROM users 
      WHERE role = ? AND is_active = 1
    `, [roleName]);
  }

  // Get approvers by manager relationship
  async getApproversByManager(requesterId, managerType) {
    if (managerType === 'direct') {
      return await getAll(`
        SELECT u.id, u.username, u.name, u.email
        FROM users u
        JOIN employees e ON u.id = e.manager_id
        WHERE e.id = ? AND u.is_active = 1
      `, [requesterId]);
    }
    return [];
  }

  // Get approvers by user ID
  async getApproversByUserId(userId) {
    return await getAll(`
      SELECT id, username, name, email 
      FROM users 
      WHERE id = ? AND is_active = 1
    `, [userId]);
  }

  // Get approvers by department head
  async getApproversByDepartmentHead(requesterId) {
    return await getAll(`
      SELECT u.id, u.username, u.name, u.email
      FROM users u
      JOIN employees e ON u.id = e.id
      WHERE e.department = (
        SELECT department FROM employees WHERE id = ?
      ) AND u.role = 'department_head' AND u.is_active = 1
    `, [requesterId]);
  }

  // Notify approvers for a step
  async notifyStepApprovers(requestId, stepNumber) {
    try {
      const { step, approvers, request } = await this.getStepApprovers(requestId, stepNumber);
      
      for (const approver of approvers) {
        await this.createNotification(
          requestId,
          approver.id,
          'pending_approval',
          'Approval Required',
          `You have a pending approval request for ${request.resource_type} #${request.resource_id}`
        );
      }
    } catch (error) {
      console.error('Error notifying step approvers:', error);
      throw error;
    }
  }

  // Create notification
  async createNotification(requestId, userId, type, title, message) {
    try {
      await runQuery(`
        INSERT INTO approval_notifications 
        (request_id, user_id, notification_type, title, message)
        VALUES (?, ?, ?, ?, ?)
      `, [requestId, userId, type, title, message]);

      // If notification service is available, send real-time notification
      if (this.notificationService) {
        this.notificationService.sendNotification(userId, {
          type,
          title,
          message,
          requestId
        });
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Process approval action
  async processApprovalAction(requestId, stepId, approverId, action, comments = '', ipAddress = '', userAgent = '') {
    try {
      // Log the action
      await runQuery(`
        INSERT INTO approval_actions 
        (request_id, step_id, approver_id, action, comments, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [requestId, stepId, approverId, action, comments, ipAddress, userAgent]);

      const request = await getRow('SELECT * FROM approval_requests WHERE id = ?', [requestId]);
      const step = await getRow('SELECT * FROM approval_steps WHERE id = ?', [stepId]);

      if (action === 'reject') {
        // Reject the request
        await runQuery(`
          UPDATE approval_requests 
          SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [requestId]);

        // Notify requester
        await this.createNotification(
          requestId,
          request.requester_id,
          'rejected',
          'Request Rejected',
          `Your ${request.resource_type} request #${request.resource_id} has been rejected.`
        );

        return { status: 'rejected', message: 'Request rejected successfully' };
      }

      if (action === 'approve') {
        // Check if this is the last step
        const nextStep = await getRow(`
          SELECT * FROM approval_steps 
          WHERE workflow_id = ? AND step_order = ?
        `, [request.workflow_id, step.step_order + 1]);

        if (!nextStep) {
          // This was the last step - approve the request
          await runQuery(`
            UPDATE approval_requests 
            SET status = 'approved', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [requestId]);

          // Notify requester
          await this.createNotification(
            requestId,
            request.requester_id,
            'approved',
            'Request Approved',
            `Your ${request.resource_type} request #${request.resource_id} has been approved.`
          );

          return { status: 'approved', message: 'Request approved successfully' };
        } else {
          // Move to next step
          await runQuery(`
            UPDATE approval_requests 
            SET current_step = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [step.step_order + 1, requestId]);

          // Notify next step approvers
          await this.notifyStepApprovers(requestId, step.step_order + 1);

          return { status: 'next_step', message: 'Approved, moving to next step' };
        }
      }

      return { status: 'unknown', message: 'Unknown action' };
    } catch (error) {
      console.error('Error processing approval action:', error);
      throw error;
    }
  }

  // Get pending approvals for a user
  async getPendingApprovals(userId) {
    try {
      const approvals = await getAll(`
        SELECT 
          ar.*,
          aw.name as workflow_name,
          aw.description as workflow_description,
          u.name as requester_name,
          s.step_order,
          s.approver_type,
          s.approver_value,
          s.timeout_days
        FROM approval_requests ar
        JOIN approval_workflows aw ON ar.workflow_id = aw.id
        JOIN users u ON ar.requester_id = u.id
        JOIN approval_steps s ON aw.id = s.workflow_id AND ar.current_step = s.step_order
        WHERE ar.status = 'pending'
        AND (
          (s.approver_type = 'role' AND EXISTS (
            SELECT 1 FROM users WHERE id = ? AND role = s.approver_value
          ))
          OR (s.approver_type = 'user' AND s.approver_value = ?)
          OR (s.approver_type = 'manager' AND EXISTS (
            SELECT 1 FROM employees WHERE id = ar.requester_id AND manager_id = ?
          ))
          OR (s.approver_type = 'department_head' AND EXISTS (
            SELECT 1 FROM users WHERE id = ? AND role = 'department_head'
            AND EXISTS (
              SELECT 1 FROM employees e1, employees e2 
              WHERE e1.id = ar.requester_id AND e2.id = ? 
              AND e1.department = e2.department
            )
          ))
        )
        ORDER BY ar.priority DESC, ar.created_at ASC
      `, [userId, userId, userId, userId, userId]);

      return approvals;
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  // Get approval history for a user
  async getApprovalHistory(userId, limit = 50) {
    try {
      const history = await getAll(`
        SELECT 
          ar.*,
          aw.name as workflow_name,
          u.name as requester_name,
          aa.action,
          aa.comments,
          aa.created_at as action_date,
          approver.name as approver_name
        FROM approval_requests ar
        JOIN approval_workflows aw ON ar.workflow_id = aw.id
        JOIN users u ON ar.requester_id = u.id
        JOIN approval_actions aa ON ar.id = aa.request_id
        JOIN users approver ON aa.approver_id = approver.id
        WHERE ar.requester_id = ? OR aa.approver_id = ?
        ORDER BY aa.created_at DESC
        LIMIT ?
      `, [userId, userId, limit]);

      return history;
    } catch (error) {
      console.error('Error getting approval history:', error);
      throw error;
    }
  }

  // Get approval statistics
  async getApprovalStats(userId = null) {
    try {
      let whereClause = '';
      let params = [];

      if (userId) {
        whereClause = 'WHERE requester_id = ?';
        params = [userId];
      }

      const stats = await getRow(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests,
          AVG(CASE WHEN status IN ('approved', 'rejected') 
            THEN (julianday(updated_at) - julianday(created_at)) 
            ELSE NULL END) as avg_processing_days
        FROM approval_requests
        ${whereClause}
      `, params);

      return stats;
    } catch (error) {
      console.error('Error getting approval stats:', error);
      throw error;
    }
  }

  // Check for overdue approvals and send reminders
  async checkOverdueApprovals() {
    try {
      const overdueApprovals = await getAll(`
        SELECT 
          ar.*,
          aw.name as workflow_name,
          s.timeout_days,
          u.name as requester_name
        FROM approval_requests ar
        JOIN approval_workflows aw ON ar.workflow_id = aw.id
        JOIN approval_steps s ON aw.id = s.workflow_id AND ar.current_step = s.step_order
        JOIN users u ON ar.requester_id = u.id
        WHERE ar.status = 'pending'
        AND datetime(ar.created_at, '+' || s.timeout_days || ' days') < datetime('now')
      `);

      for (const approval of overdueApprovals) {
        const { approvers } = await this.getStepApprovers(approval.id, approval.current_step);
        
        for (const approver of approvers) {
          await this.createNotification(
            approval.id,
            approver.id,
            'reminder',
            'Overdue Approval Reminder',
            `You have an overdue approval request for ${approval.resource_type} #${approval.resource_id}`
          );
        }
      }

      return overdueApprovals.length;
    } catch (error) {
      console.error('Error checking overdue approvals:', error);
      throw error;
    }
  }
}

module.exports = new ApprovalService(); 