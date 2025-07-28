const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const isDevelopment = process.env.NODE_ENV !== 'production';

// Simplified security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy (only if credentials are configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Here you would typically:
      // 1. Check if user exists in your database
      // 2. Create user if they don't exist
      // 3. Return the user object
      return done(null, profile);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// API Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/users', require('./routes/users'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/google', require('./routes/google'));
app.use('/api/approvals', require('./routes/approvals'));

// Google OAuth routes (only if Google OAuth is configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // Successful authentication, redirect to frontend
      res.redirect('/');
    }
  );
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.1.4'
  });
});

// SIMPLIFIED FRONTEND SERVING - Always serve built files
const serveFrontend = () => {
  const publicPath = path.join(__dirname, 'public');
  
  if (fs.existsSync(publicPath)) {
    // Serve static files
    app.use(express.static(publicPath));
    
    // Catch all handler: send back React's index.html file
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
    
    console.log('✅ Serving frontend from:', publicPath);
  } else {
    // Fallback for API-only deployment
    app.get('/', (req, res) => {
      res.json({
        message: 'MOHR HR System API V2',
        version: '2.1.4',
        status: 'running',
        note: 'Frontend not built. Run: npm run build:frontend',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth',
          users: '/api/users',
          employees: '/api/employees',
          leave: '/api/leave',
          google: '/api/google'
        }
      });
    });
    
    console.log('⚠️  Frontend not found. API-only mode.');
  }
};

// Initialize frontend serving
serveFrontend();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log('🚀 MOHR HR System V2 - Simplified Server');
  console.log(`📊 Server running on ${HOST}:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🔐 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  console.log(`🌍 Frontend: http://localhost:${PORT}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('🌍 Server accessible from network');
  }
});

module.exports = app; 