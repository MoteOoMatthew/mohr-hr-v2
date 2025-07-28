const express = require('express');
const { body, validationResult } = require('express-validator');
const { runQuery, getRow, getRows } = require('../database/init');
const { 
  requirePermission, 
  requireRecordAccess, 
  getFilteredData,
  getUserContext 
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

// Get all employees (privilege-filtered)
router.get('/', verifyToken, requirePermission('employees', 'read'), async (req, res) => {
  try {
    const { department, position, is_active } = req.query;
    let baseQuery = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (department) {
      baseQuery += ' AND department = ?';
      params.push(department);
    }

    if (position) {
      baseQuery += ' AND position = ?';
      params.push(position);
    }

    if (is_active !== undefined) {
      baseQuery += ' AND is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    baseQuery += ' ORDER BY last_name, first_name';

    // Get filtered data based on user's privilege level
    const employees = await getFilteredData(req.user.userId, 'employees', baseQuery, params);
    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get employee by ID (privilege-checked)
router.get('/:id', verifyToken, requireRecordAccess('employees', 'read'), async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await getRow('SELECT * FROM employees WHERE id = ?', [id]);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Create new employee with E2EE support
router.post('/', verifyToken, requirePermission('employees', 'create'), [
  body('employee_id').notEmpty().withMessage('Employee ID is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('hire_date').isDate().withMessage('Valid hire date is required')
], validateRequest, async (req, res) => {
  try {
    const {
      employee_id,
      // Encrypted fields (sent as encrypted data)
      first_name_encrypted,
      last_name_encrypted,
      email_encrypted,
      phone_encrypted,
      salary_encrypted,
      ssn_encrypted,
      address_encrypted,
      performance_review_encrypted,
      // Unencrypted fields
      position,
      department,
      hire_date,
      manager_id,
      // New fields from staff roster
      age,
      gender,
      nationality,
      job_description,
      employment_type,
      education_qualifications,
      relevant_experience
    } = req.body;

    // Check if employee already exists
    const existingEmployee = await getRow(
      'SELECT * FROM employees WHERE employee_id = ?',
      [employee_id]
    );

    if (existingEmployee) {
      return res.status(400).json({ 
        error: 'Employee already exists with this ID' 
      });
    }

    const result = await runQuery(`
      INSERT INTO employees 
      (employee_id, first_name_encrypted, last_name_encrypted, email_encrypted, 
       phone_encrypted, salary_encrypted, ssn_encrypted, address_encrypted, 
       performance_review_encrypted, position, department, hire_date, manager_id,
       age, gender, nationality, job_description, employment_type, education_qualifications, relevant_experience)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [employee_id, first_name_encrypted, last_name_encrypted, email_encrypted, 
        phone_encrypted, salary_encrypted, ssn_encrypted, address_encrypted, 
        performance_review_encrypted, position, department, hire_date, manager_id,
        age, gender, nationality, job_description, employment_type, education_qualifications, relevant_experience]);

    const newEmployee = await getRow('SELECT * FROM employees WHERE id = ?', [result.lastID]);

    res.status(201).json({
      message: 'Employee created successfully',
      id: result.lastID,
      employee: newEmployee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Update employee
router.put('/:id', verifyToken, [
  body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
  body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Must be a valid email'),
  body('hire_date').optional().isDate().withMessage('Must be a valid date')
], validateRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove undefined values
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Check if employee exists
    const employee = await getRow('SELECT * FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Build dynamic SQL update
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    await runQuery(`UPDATE employees SET ${setClause} WHERE id = ?`, [...values, id]);

    const updatedEmployee = await getRow('SELECT * FROM employees WHERE id = ?', [id]);

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete employee
router.delete('/:id', verifyToken, requirePermission('employees', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await getRow('SELECT * FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await runQuery('DELETE FROM employees WHERE id = ?', [id]);

    res.json({
      message: 'Employee deleted successfully',
      employee_id: id
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Employees route working!' });
});

module.exports = router; 