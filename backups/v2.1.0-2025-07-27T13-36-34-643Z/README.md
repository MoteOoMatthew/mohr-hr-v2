# MOHR HR System V2 🚀

A modern, cloud-native HR management system built with Node.js, Express, and Google integration.

## ✨ Features

- **🔐 Authentication**: JWT-based authentication with Google OAuth support
- **👥 Employee Management**: Complete employee lifecycle management
- **📅 Leave Management**: Request, approve, and track leave requests
- **👤 User Management**: Role-based access control (Admin/User)
- **📊 Analytics**: Comprehensive HR analytics and reporting
- **🔗 Google Integration**: Calendar and Drive integration
- **☁️ Cloud Ready**: Designed for Render deployment
- **🔒 Security**: Rate limiting, CORS, Helmet security headers

## 🏗️ Architecture

```
MOHR-V2/
├── backend/                 # Express.js API server
│   ├── database/           # Database initialization
│   ├── routes/             # API routes
│   └── server.js           # Main server file
├── frontend/               # React frontend (coming soon)
├── package.json            # Root package.json
├── render.yaml             # Render deployment config
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 8+
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd MOHR-V2
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the API**
   - API: http://localhost:5000
   - Health Check: http://localhost:5000/api/health

### Default Credentials

- **Admin User**: 
  - Username: `admin`
  - Password: `admin123`
  - Email: `admin@mohr.com`

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# Security
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret-key

# Google OAuth (Required for Google integration)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
```

### Google OAuth Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing

2. **Enable APIs**
   - Google+ API
   - Google Calendar API
   - Google Drive API

3. **Create OAuth 2.0 Credentials**
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs:
     - `http://localhost:5000/auth/google/callback` (development)
     - `https://your-app.onrender.com/auth/google/callback` (production)

4. **Update Environment Variables**
   - Copy Client ID and Client Secret to your `.env` file

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Employee Management

- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee
- `GET /api/employees/:id` - Get employee by ID
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Deactivate employee
- `GET /api/employees/stats/overview` - Employee statistics

### Leave Management

- `GET /api/leave` - Get leave requests
- `POST /api/leave` - Create leave request
- `PUT /api/leave/:id` - Update leave request (admin)
- `DELETE /api/leave/:id` - Delete leave request
- `GET /api/leave/stats/overview` - Leave statistics

### User Management (Admin Only)

- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Google Integration

- `GET /api/google/calendar/events` - Get calendar events
- `POST /api/google/calendar/events` - Create calendar event
- `PUT /api/google/calendar/events/:id` - Update calendar event
- `DELETE /api/google/calendar/events/:id` - Delete calendar event
- `POST /api/google/calendar/sync` - Sync calendar with database

## 🚀 Deployment to Render

### Automatic Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial MOHR V2 deployment"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` configuration

3. **Configure Environment Variables**
   - In Render dashboard, go to your service
   - Navigate to "Environment" tab
   - Add your Google OAuth credentials:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
   - Update `GOOGLE_CALLBACK_URL` to your Render URL

4. **Deploy**
   - Render will automatically deploy your application
   - Your API will be available at: `https://your-app-name.onrender.com`

### Manual Deployment

If you prefer manual setup:

1. **Create Web Service**
   - Service Type: Web Service
   - Environment: Node
   - Build Command: `npm run install:all`
   - Start Command: `npm start`

2. **Environment Variables**
   ```env
   NODE_ENV=production
   JWT_SECRET=your-production-jwt-secret
   SESSION_SECRET=your-production-session-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=https://your-app.onrender.com/auth/google/callback
   ```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS settings
- **Helmet Security**: Security headers protection
- **Input Validation**: Request validation using express-validator
- **SQL Injection Protection**: Parameterized queries
- **Password Hashing**: bcrypt password hashing

## 📊 Database Schema

### Users Table
- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `password_hash`
- `google_id` (Unique, for Google OAuth)
- `name`
- `picture_url`
- `role` (admin/user)
- `is_active`
- `created_at`
- `updated_at`

### Employees Table
- `id` (Primary Key)
- `employee_id` (Unique)
- `first_name`
- `last_name`
- `email` (Unique)
- `phone`
- `position`
- `department`
- `hire_date`
- `salary`
- `manager_id` (Foreign Key)
- `is_active`
- `created_at`
- `updated_at`

### Leave Requests Table
- `id` (Primary Key)
- `employee_id` (Foreign Key)
- `leave_type`
- `start_date`
- `end_date`
- `days_requested`
- `reason`
- `status` (pending/approved/rejected)
- `approved_by` (Foreign Key)
- `approved_at`
- `created_at`
- `updated_at`

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server (backend + frontend)
- `npm run dev:backend` - Start backend only
- `npm run dev:frontend` - Start frontend only
- `npm run build` - Build frontend for production
- `npm start` - Start production server
- `npm run install:all` - Install all dependencies

### Project Structure

```
backend/
├── database/
│   └── init.js              # Database initialization
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── employees.js         # Employee management routes
│   ├── leave.js             # Leave management routes
│   └── google.js            # Google integration routes
├── package.json             # Backend dependencies
└── server.js                # Main server file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and API documentation
- **Issues**: Create an issue on GitHub
- **Email**: Contact the development team

## 🔄 Version History

- **v2.0.0** - Complete rewrite with modern architecture
  - Google OAuth integration
  - Cloud-native design
  - Enhanced security
  - Comprehensive API
  - Render deployment ready

---

**Built with ❤️ for modern HR management**
