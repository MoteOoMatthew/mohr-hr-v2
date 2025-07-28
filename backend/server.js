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

// Security middleware with environment-aware CSP
const cspConfig = isDevelopment 
  ? { 
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      dnsPrefetchControl: false,
      frameguard: false,
      hidePoweredBy: false,
      hsts: false,
      ieNoOpen: false,
      noSniff: false,
      permittedCrossDomainPolicies: false,
      referrerPolicy: false,
      xssFilter: false
    }  // Disable all security headers in development
  : {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://mohr-hr-v2.onrender.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"], // Allow API calls to production and fonts
        },
      },
    };

app.use(helmet(cspConfig));

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
      // 3. Return user object
      
      const user = {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0]?.value,
        googleId: profile.id
      };
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Backup scheduler initialization
const backupScheduler = require('./services/backupScheduler');
backupScheduler.initialize().then(() => {
  console.log('✅ Backup scheduler initialized');
}).catch((error) => {
  console.error('❌ Failed to initialize backup scheduler:', error);
});

// API Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/users', require('./routes/users'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/privileges', require('./routes/privileges'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/google', require('./routes/google'));

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
    version: '2.0.0'
  });
});

// Frontend serving logic
const serveFrontend = () => {
  if (isDevelopment) {
    // In development, try to proxy to Vite dev server, fallback to static files
    const { createProxyMiddleware } = require('http-proxy-middleware');
    
    // Check if Vite dev server is running
    const http = require('http');
    const checkViteServer = () => {
      return new Promise((resolve) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3001,
          path: '/',
          method: 'GET',
          timeout: 1000
        }, (res) => {
          resolve(true);
        });
        
        req.on('error', () => {
          resolve(false);
        });
        
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        
        req.end();
      });
    };
    
    // Try to proxy to Vite, fallback to static files
    checkViteServer().then(viteRunning => {
      if (viteRunning) {
        console.log('🔧 Development mode: Frontend proxied to Vite dev server');
        app.use('/', createProxyMiddleware({
          target: 'http://localhost:3001',
          changeOrigin: true,
          ws: true, // Enable WebSocket proxy for HMR
          logLevel: 'silent'
        }));
      } else {
        console.log('⚠️  Vite dev server not running, serving static files');
        serveStaticFiles();
      }
    }).catch(() => {
      console.log('⚠️  Vite server check failed, serving static files');
      serveStaticFiles();
    });
  } else {
    // In production, serve static files from backend/public
    serveStaticFiles();
  }
};

// Helper function to serve static files
const serveStaticFiles = () => {
  const publicPath = path.join(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    // Serve static files with proper MIME types
    app.use(express.static(publicPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        }
      }
    }));
    
    // Catch all handler: send back React's index.html file
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  } else {
    // Fallback for API-only deployment
    app.get('/', (req, res) => {
      res.json({
        message: 'MOHR HR System API V2',
        version: '2.0.0',
        status: 'running',
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
  console.log('🚀 MOHR HR System V2 - Unified Server');
  console.log(`📊 Server running on ${HOST}:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🔐 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  
  if (isDevelopment) {
    console.log('🔧 Development mode: Frontend proxied to Vite dev server');
    console.log('🌐 Frontend: http://localhost:3001 (via proxy)');
  } else {
    console.log('🌍 Production mode: Serving static frontend files');
    console.log('🌐 Frontend: http://localhost:5000');
  }
  
  if (process.env.NODE_ENV === 'production') {
    console.log('🌍 Server accessible from network');
  }
});

module.exports = app; 