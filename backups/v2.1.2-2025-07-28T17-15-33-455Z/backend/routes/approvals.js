const express = require('express');
const { body, validationResult } = require('express-validator');
const approvalService = require('../services/approvalService');

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

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get pending approvals for current user
router.get('/pending', verifyToken, async (req, res) => {
  try {
    const approvals = await approvalService.getPendingApprovals(req.user.userId);
    res.json(approvals);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// Get approval history for current user
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await approvalService.getApprovalHistory(req.user.userId, parseInt(limit));
    res.json(history);
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({ error: 'Failed to fetch approval history' });
  }
});

// Get approval statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const stats = await approvalService.getApprovalStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({ error: 'Failed to fetch approval statistics' });
  }
});

// Get approval request details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get approval request details
    const { getRow } = require('../database/init');
    const request = await getRow(`
      SELECT 
        ar.*,
        aw.name as workflow_name,
        aw.description as workflow_description,
        u.name as requester_name,
        u.email as requester_email
      FROM approval_requests ar
      JOIN approval_workflows aw ON ar.workflow_id = aw.id
      JOIN users u ON ar.requester_id = u.id
      WHERE ar.id = ?
    `, [id]);

    if (!request) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    // Get current step details
    const { step, approvers } = await approvalService.getStepApprovers(id, request.current_step);

    // Get approval actions history
    const { getAll } = require('../database/init');
    const actions = await getAll(`
      SELECT 
        aa.*,
        u.name as approver_name,
        s.step_order
      FROM approval_actions aa
      JOIN users u ON aa.approver_id = u.id
      JOIN approval_steps s ON aa.step_id = s.id
      WHERE aa.request_id = ?
      ORDER BY aa.created_at ASC
    `, [id]);

    res.json({
      request,
      currentStep: step,
      currentApprovers: approvers,
      actions
    });
  } catch (error) {
    console.error('Get approval request error:', error);
    res.status(500).json({ error: 'Failed to fetch approval request' });
  }
});

// Process approval action
router.post('/:id/action', verifyToken, [
  body('action').isIn(['approve', 'reject', 'request_changes']).withMessage('Valid action is required'),
  body('comments').optional().isLength({ max: 1000 }).withMessage('Comments must be less than 1000 characters')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body;

    // Get current step details
    const { step, approvers } = await approvalService.getStepApprovers(id, 1); // We'll get the current step

    // Check if user is authorized to approve
    const isAuthorized = approvers.some(approver => approver.id === req.user.userId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'You are not authorized to approve this request' });
    }

    // Process the action
    const result = await approvalService.processApprovalAction(
      id,
      step.id,
      req.user.userId,
      action,
      comments,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      message: result.message,
      status: result.status
    });
  } catch (error) {
    console.error('Process approval action error:', error);
    res.status(500).json({ error: 'Failed to process approval action' });
  }
});

// Create approval request (for integration with other systems)
router.post('/', verifyToken, [
  body('resource_type').isIn(['leave', 'document', 'employee', 'expense']).withMessage('Valid resource type is required'),
  body('resource_id').isInt().withMessage('Valid resource ID is required'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Valid priority is required')
], validateRequest, async (req, res) => {
  try {
    const { resource_type, resource_id, priority = 'normal' } = req.body;

    // Get resource data to determine workflow
    const { getRow } = require('../database/init');
    let resourceData = {};

    switch (resource_type) {
      case 'leave':
        const leaveRequest = await getRow('SELECT * FROM leave_requests WHERE id = ?', [resource_id]);
        if (!leaveRequest) {
          return res.status(404).json({ error: 'Leave request not found' });
        }
        resourceData = {
          leave_type: leaveRequest.leave_type,
          days_requested: leaveRequest.days_requested
        };
        break;
      case 'document':
        const document = await getRow('SELECT * FROM documents WHERE id = ?', [resource_id]);
        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }
        resourceData = {
          category: document.category
        };
        break;
      case 'employee':
        const employee = await getRow('SELECT * FROM employees WHERE id = ?', [resource_id]);
        if (!employee) {
          return res.status(404).json({ error: 'Employee not found' });
        }
        resourceData = {
          change_type: 'employee_change' // This would be more specific in real implementation
        };
        break;
      default:
        return res.status(400).json({ error: 'Unsupported resource type' });
    }

    // Get appropriate workflow
    const workflow = await approvalService.getWorkflowForResource(resource_type, resourceData);
    if (!workflow) {
      return res.status(400).json({ error: 'No appropriate workflow found for this request' });
    }

    // Create approval request
    const requestId = await approvalService.createApprovalRequest(
      workflow.id,
      resource_type,
      resource_id,
      req.user.userId,
      priority
    );

    res.status(201).json({
      message: 'Approval request created successfully',
      request_id: requestId,
      workflow: workflow.name
    });
  } catch (error) {
    console.error('Create approval request error:', error);
    res.status(500).json({ error: 'Failed to create approval request' });
  }
});

// Get workflows (admin only)
router.get('/workflows', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { getAll } = require('../database/init');
    const workflows = await getAll(`
      SELECT 
        aw.*,
        COUNT(s.id) as step_count
      FROM approval_workflows aw
      LEFT JOIN approval_steps s ON aw.id = s.workflow_id
      GROUP BY aw.id
      ORDER BY aw.name ASC
    `);

    res.json(workflows);
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Get workflow steps (admin only)
router.get('/workflows/:id/steps', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { id } = req.params;
    const { getAll } = require('../database/init');
    const steps = await getAll(`
      SELECT * FROM approval_steps 
      WHERE workflow_id = ?
      ORDER BY step_order ASC
    `, [id]);

    res.json(steps);
  } catch (error) {
    console.error('Get workflow steps error:', error);
    res.status(500).json({ error: 'Failed to fetch workflow steps' });
  }
});

// Get notifications for current user
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const { limit = 20, unread_only = false } = req.query;
    const { getAll } = require('../database/init');
    
    let sql = `
      SELECT 
        an.*,
        ar.resource_type,
        ar.resource_id,
        aw.name as workflow_name
      FROM approval_notifications an
      JOIN approval_requests ar ON an.request_id = ar.id
      JOIN approval_workflows aw ON ar.workflow_id = aw.id
      WHERE an.user_id = ?
    `;
    
    const params = [req.user.userId];
    
    if (unread_only === 'true') {
      sql += ' AND an.is_read = 0';
    }
    
    sql += ' ORDER BY an.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const notifications = await getAll(sql, params);
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { runQuery } = require('../database/init');
    
    await runQuery(`
      UPDATE approval_notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [id, req.user.userId]);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', verifyToken, async (req, res) => {
  try {
    const { runQuery } = require('../database/init');
    
    await runQuery(`
      UPDATE approval_notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_read = 0
    `, [req.user.userId]);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

module.exports = router; 