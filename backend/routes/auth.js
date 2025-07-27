const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { runQuery, getRow } = require('../database/init');

const router = express.Router();

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Middleware to validate request
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register new user
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required')
], validateRequest, async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await getRow('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email or username' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await runQuery(`
      INSERT INTO users (username, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `, [username, email, hashedPassword, name, 'user']);

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.lastID, email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.lastID,
        username,
        email,
        name,
        role: 'user'
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginField = email || username;

    if (!loginField) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    // Find user by email or username
    const user = await getRow('SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1', [loginField, loginField]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        picture_url: user.picture_url
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth callback handler
router.post('/google/callback', async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'Google ID and email are required' });
    }

    // Check if user exists with Google ID
    let user = await getRow('SELECT * FROM users WHERE google_id = ?', [googleId]);

    if (!user) {
      // Check if user exists with email
      user = await getRow('SELECT * FROM users WHERE email = ?', [email]);

      if (user) {
        // Update existing user with Google ID
        await runQuery(`
          UPDATE users 
          SET google_id = ?, picture_url = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [googleId, picture, user.id]);
      } else {
        // Create new user with Google ID
        const result = await runQuery(`
          INSERT INTO users (email, google_id, name, picture_url, role)
          VALUES (?, ?, ?, ?, ?)
        `, [email, googleId, name, picture, 'user']);

        user = {
          id: result.lastID,
          email,
          google_id: googleId,
          name,
          picture_url: picture,
          role: 'user'
        };
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Google authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        picture_url: user.picture_url
      }
    });

  } catch (error) {
    console.error('Google callback error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await getRow('SELECT id, username, email, name, role, picture_url, created_at FROM users WHERE id = ?', [req.user.userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get current user profile (alternative endpoint)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await getRow('SELECT id, username, email, name, role, picture_url, created_at FROM users WHERE id = ?', [req.user.userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', verifyToken, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Must be a valid email')
], validateRequest, async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (email) {
      updates.push('email = ?');
      params.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.user.userId);

    await runQuery(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router; 