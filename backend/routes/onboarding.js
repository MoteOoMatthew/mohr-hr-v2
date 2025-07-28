const express = require('express');
const { getRow, getRows, runQuery } = require('../database/init');
const { requirePermission, getUserContext } = require('../middleware/privilege');

const router = express.Router();

// GET /api/onboarding/templates - Get onboarding templates
router.get('/templates', requirePermission('employees', 'read'), async (req, res) => {
  try {
    const templates = await getRows(`
      SELECT 
        ot.*,
        dc.name as category_name,
        dc.color as category_color,
        u.name as created_by_name
      FROM onboarding_templates ot
      LEFT JOIN document_categories dc ON ot.category_id = dc.id
      LEFT JOIN users u ON ot.created_by = u.id
      WHERE ot.is_active = 1
      ORDER BY ot.name
    `);

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching onboarding templates:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding templates' });
  }
});

// GET /api/onboarding/checklist - Get onboarding checklist
router.get('/checklist', requirePermission('employees', 'read'), async (req, res) => {
  try {
    const checklist = await getRows(`
      SELECT 
        oc.*,
        u.name as assigned_to_name,
        u.email as assigned_to_email
      FROM onboarding_checklist oc
      LEFT JOIN users u ON oc.assigned_to = u.id
      WHERE oc.is_active = 1
      ORDER BY oc.order_index
    `);

    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Error fetching onboarding checklist:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding checklist' });
  }
});

// POST /api/onboarding/start - Start onboarding process
router.post('/start', requirePermission('employees', 'create'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    const {
      employee_data,
      template_id,
      assigned_manager_id,
      start_date,
      notes
    } = req.body;

    // Validate required fields
    if (!employee_data || !employee_data.first_name || !employee_data.last_name || !employee_data.email) {
      return res.status(400).json({ error: 'Missing required employee information' });
    }

    // Generate employee ID
    const employeeId = `EMP${Date.now()}`;

    // Create employee record
    const employeeResult = await runQuery(`
      INSERT INTO employees (
        employee_id, first_name, last_name, email,
        position, department, hire_date, is_active,
        age, gender, nationality, job_description, employment_type, education_qualifications, relevant_experience
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      employeeId,
      employee_data.first_name,
      employee_data.last_name,
      employee_data.email,
      employee_data.position || '',
      employee_data.department || '',
      start_date || new Date().toISOString(),
      1, // is_active
      employee_data.age || null,
      employee_data.gender || null,
      employee_data.nationality || null,
      employee_data.job_description || null,
      employee_data.employment_type || 'Full-time',
      employee_data.education_qualifications || null,
      employee_data.relevant_experience || null
    ]);

    // Create onboarding process record
    const onboardingResult = await runQuery(`
      INSERT INTO onboarding_processes (
        employee_id, template_id, assigned_manager_id, status,
        start_date, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      employeeId,
      template_id || null,
      assigned_manager_id || userContext.user_id,
      'in_progress',
      start_date || new Date().toISOString(),
      notes || '',
      userContext.user_id
    ]);

    // Create onboarding tasks from checklist
    const checklist = await getRows('SELECT * FROM onboarding_checklist WHERE is_active = 1 ORDER BY order_index');
    
    for (const item of checklist) {
      await runQuery(`
        INSERT INTO onboarding_tasks (
          process_id, checklist_item_id, task_name, description,
          assigned_to, due_date, status, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        onboardingResult.id,
        item.id,
        item.task_name,
        item.description,
        item.assigned_to || assigned_manager_id || userContext.user_id,
        new Date(Date.now() + (item.default_days || 7) * 24 * 60 * 60 * 1000).toISOString(),
        'pending',
        item.order_index
      ]);
    }

    res.json({
      success: true,
      message: 'Onboarding process started successfully',
      employee_id: employeeId,
      process_id: onboardingResult.id
    });
  } catch (error) {
    console.error('Error starting onboarding process:', error);
    res.status(500).json({ error: 'Failed to start onboarding process' });
  }
});

// GET /api/onboarding/processes - Get onboarding processes
router.get('/processes', requirePermission('employees', 'read'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    let query = `
      SELECT 
        op.*,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.position,
        e.department,
        e.hire_date,
        e.age,
        e.gender,
        e.nationality,
        e.job_description,
        e.employment_type,
        e.education_qualifications,
        e.relevant_experience,
        ot.name as template_name,
        u1.name as assigned_manager_name,
        u2.name as created_by_name
      FROM onboarding_processes op
      LEFT JOIN employees e ON op.employee_id = e.employee_id
      LEFT JOIN onboarding_templates ot ON op.template_id = ot.id
      LEFT JOIN users u1 ON op.assigned_manager_id = u1.id
      LEFT JOIN users u2 ON op.created_by = u2.id
      WHERE op.status != 'completed'
    `;

    const params = [];

    // Apply privilege-based filtering
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1) {
        query += ' AND op.created_by = ?';
        params.push(userContext.user_id);
      } else if (userContext.privilege_level <= 3) {
        query += ' AND (op.created_by = ? OR op.assigned_manager_id = ? OR e.department = ?)';
        params.push(userContext.user_id, userContext.user_id, userContext.department_name);
      }
    }

    query += ' ORDER BY op.created_at DESC';

    const processes = await getRows(query, params);

    res.json({ success: true, processes });
  } catch (error) {
    console.error('Error fetching onboarding processes:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding processes' });
  }
});

// GET /api/onboarding/processes/:id - Get specific onboarding process
router.get('/processes/:id', requirePermission('employees', 'read'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    const process = await getRow(`
      SELECT 
        op.*,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.position,
        e.department,
        e.hire_date,
        e.age,
        e.gender,
        e.nationality,
        e.job_description,
        e.employment_type,
        e.education_qualifications,
        e.relevant_experience,
        ot.name as template_name,
        u1.name as assigned_manager_name,
        u2.name as created_by_name
      FROM onboarding_processes op
      LEFT JOIN employees e ON op.employee_id = e.employee_id
      LEFT JOIN onboarding_templates ot ON op.template_id = ot.id
      LEFT JOIN users u1 ON op.assigned_manager_id = u1.id
      LEFT JOIN users u2 ON op.created_by = u2.id
      WHERE op.id = ?
    `, [req.params.id]);

    if (!process) {
      return res.status(404).json({ error: 'Onboarding process not found' });
    }

    // Check access permissions
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1 && process.created_by !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userContext.privilege_level <= 3 && 
          process.created_by !== userContext.user_id && 
          process.assigned_manager_id !== userContext.user_id &&
          process.department !== userContext.department_name) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get tasks for this process
    const tasks = await getRows(`
      SELECT 
        ot.*,
        oci.task_name as checklist_task_name,
        oci.description as checklist_description,
        u.name as assigned_to_name,
        u.email as assigned_to_email
      FROM onboarding_tasks ot
      LEFT JOIN onboarding_checklist oci ON ot.checklist_item_id = oci.id
      LEFT JOIN users u ON ot.assigned_to = u.id
      WHERE ot.process_id = ?
      ORDER BY ot.order_index
    `, [req.params.id]);

    // Get documents for this process
    const documents = await getRows(`
      SELECT 
        d.*,
        dc.name as category_name,
        dc.color as category_color,
        u.name as uploaded_by_name
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.metadata LIKE '%"onboarding_process_id":"${req.params.id}"%'
      AND d.status = 'active'
      ORDER BY d.created_at DESC
    `);

    res.json({
      success: true,
      process: {
        ...process,
        tasks,
        documents: documents.map(doc => ({
          ...doc,
          tags: doc.tags ? JSON.parse(doc.tags) : [],
          metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching onboarding process:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding process' });
  }
});

// PUT /api/onboarding/tasks/:id - Update onboarding task
router.put('/tasks/:id', requirePermission('employees', 'update'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    const { status, notes, completed_at } = req.body;

    // Check if user can update this task
    const task = await getRow(`
      SELECT ot.*, op.assigned_manager_id, op.created_by
      FROM onboarding_tasks ot
      JOIN onboarding_processes op ON ot.process_id = op.id
      WHERE ot.id = ?
    `, [req.params.id]);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permissions
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1 && task.assigned_to !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userContext.privilege_level <= 3 && 
          task.assigned_to !== userContext.user_id &&
          task.assigned_manager_id !== userContext.user_id &&
          task.created_by !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Update task
    await runQuery(`
      UPDATE onboarding_tasks 
      SET status = ?, notes = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      status,
      notes || null,
      status === 'completed' ? (completed_at || new Date().toISOString()) : null,
      req.params.id
    ]);

    // Check if all tasks are completed
    const remainingTasks = await getRow(`
      SELECT COUNT(*) as count
      FROM onboarding_tasks
      WHERE process_id = ? AND status != 'completed'
    `, [task.process_id]);

    if (remainingTasks.count === 0) {
      // Mark process as completed
      await runQuery(`
        UPDATE onboarding_processes 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [task.process_id]);

      // Update employee status
      await runQuery(`
        UPDATE employees 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = (SELECT employee_id FROM onboarding_processes WHERE id = ?)
      `, [task.process_id]);
    }

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating onboarding task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// POST /api/onboarding/processes/:id/complete - Complete onboarding process
router.post('/processes/:id/complete', requirePermission('employees', 'update'), async (req, res) => {
  try {
    const userContext = await getUserContext(req.user.id);
    if (!userContext) {
      return res.status(403).json({ error: 'User context not found' });
    }

    const { notes } = req.body;

    // Check if user can complete this process
    const process = await getRow(`
      SELECT op.*, e.employee_id
      FROM onboarding_processes op
      LEFT JOIN employees e ON op.employee_id = e.employee_id
      WHERE op.id = ?
    `, [req.params.id]);

    if (!process) {
      return res.status(404).json({ error: 'Process not found' });
    }

    // Check permissions
    if (userContext.privilege_level < 4) {
      if (userContext.privilege_level === 1 && process.created_by !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userContext.privilege_level <= 3 && 
          process.created_by !== userContext.user_id &&
          process.assigned_manager_id !== userContext.user_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Complete all remaining tasks
    await runQuery(`
      UPDATE onboarding_tasks 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE process_id = ? AND status != 'completed'
    `, [req.params.id]);

    // Mark process as completed
    await runQuery(`
      UPDATE onboarding_processes 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, notes = ?
      WHERE id = ?
    `, [notes || process.notes, req.params.id]);

    // Update employee status
    await runQuery(`
      UPDATE employees 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = ?
    `, [process.employee_id]);

    res.json({ success: true, message: 'Onboarding process completed successfully' });
  } catch (error) {
    console.error('Error completing onboarding process:', error);
    res.status(500).json({ error: 'Failed to complete onboarding process' });
  }
});

module.exports = router; 