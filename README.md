# Human Resource Management System (HRMS)

A modern web-based Human Resource Management System built with React, Node.js, and MongoDB. This system helps companies manage employee information, authentication, and HR processes efficiently.

## 🏗️ Architecture

### Tech Stack

**Backend:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with layered architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with bcrypt password hashing
- **Security**: Helmet, CORS, Rate limiting
- **Legacy Integration**: Access Database (.mdb) migration support

**Frontend:**
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Context API
- **HTTP Client**: Axios with interceptors
- **Form Handling**: React Hook Form with Yup validation
- **Build Tool**: Vite

**Infrastructure:**
- **Containerization**: Docker with multi-stage builds
- **Reverse Proxy**: Nginx with load balancing
- **Database**: MongoDB with authentication
- **Environment**: Docker Compose orchestration

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Access to existing PGA.mdb database file (placed in `./data/` directory)

### Production Deployment

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd HRMS
   cp .env.example .env
   ```

2. **Configure Environment**
   Edit `.env` file with your settings:
   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   MONGODB_URI=mongodb://root:good1234@mongodb:27017/HRMS?authSource=admin
   NGINX_PORT=80
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Access Application**
   - **Web App**: http://localhost:80
   - **API Health**: http://localhost:80/api/health
   - **Database Admin**: http://localhost:27019 (MongoDB Express)

### Development Setup

1. **Backend Development**
   ```bash
   cd backend
   npm install
   npm run dev  # Starts on port 3000
   ```

2. **Frontend Development**
   ```bash
   cd frontend
   npm install
   npm run dev  # Starts on port 5173
   ```

3. **Access Development Tools**
   - **API**: http://localhost:3000/api/health
   - **Legacy DB Explorer**: http://localhost:3000/db
   - **Frontend**: http://localhost:5173

## 📊 Database Schema

### Employee Collection
```typescript
{
  name: string;           // Employee full name
  id: string;            // Original ID from Access DB
  empID: string;         // Unique employee identifier
  department: string;    // Department name
  email?: string;        // Email address (optional)
  password?: string;     // Hashed password (set during registration)
  role: 'admin' | 'hr' | 'employee' | 'manager';
  isActive: boolean;     // Account status
  startDate: Date;       // Employment start date
  lastLogin?: Date;      // Last login timestamp
  // ... additional fields from Access DB
}
```

### Authentication Flow
1. **Data Migration**: Import existing employee data from Access DB
2. **Employee Registration**: Employees register with existing `empID`
3. **Login**: Authenticate using `empID` and password
4. **JWT Token**: Issued upon successful authentication
5. **Protected Routes**: Access based on user role

## 🛠️ API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - Employee login
- `POST /register` - Employee registration (requires existing empID)
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change password
- `POST /logout` - Logout (client-side token removal)

### Employee Management (`/api/employees`)
- `GET /` - List all employees (paginated)
- `GET /search?q=term` - Search employees
- `GET /:id` - Get employee details
- `POST /` - Create employee (HR/Admin only)
- `PUT /:id` - Update employee (HR/Admin only)
- `DELETE /:id` - Deactivate employee (Admin only)

### Data Migration (`/api/migration`) - Admin Only
- `POST /migrate` - Migrate data from Access DB
- `GET /access/count` - Get Access DB record count
- `GET /access/test` - Test Access DB connection

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with expiration
- **Password Hashing**: bcrypt with salt rounds
- **Role-based Access**: Admin, HR, Manager, Employee roles
- **Rate Limiting**: API endpoint protection

### Security Headers & CORS
- **Helmet**: Security headers (XSS, CSRF, etc.)
- **CORS**: Cross-origin request handling
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Joi schema validation

### Data Protection
- **Password Policy**: Minimum 6 characters
- **Unique Constraints**: Prevent duplicate emails/empIDs
- **Soft Delete**: Deactivate instead of hard delete
- **Audit Trail**: Creation and update timestamps

## 🐳 Docker Configuration

### Services Overview
- **nginx**: Reverse proxy and load balancer (Port: 80)
- **backend**: Node.js API server (Internal: 3000)
- **frontend**: React SPA (Internal: 80)  
- **mongodb**: Database server (Port: 27019)

### Networking
- **Internal Network**: `hrms-network` for service communication
- **Volume Mounting**: Persistent data storage for MongoDB
- **Health Checks**: Service health monitoring

### Build Process
```bash
# Multi-stage Docker builds for optimization
docker-compose build  # Build all services
docker-compose up -d  # Start in detached mode
docker-compose logs   # View logs
```

## 🔧 Development Workflow

### Code Structure
```
backend/
├── src/
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic layer
│   ├── models/          # Database models
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route definitions
│   ├── config/          # Configuration files
│   └── legacy/          # Access DB integration
frontend/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React Context providers
│   ├── services/        # API service calls
│   ├── types/           # TypeScript definitions
│   └── theme.ts         # Material-UI theme
```

### Testing Strategy
```bash
# Backend testing
cd backend
npm test

# Frontend testing  
cd frontend
npm test

# E2E testing
npm run test:e2e
```

## 📝 Environment Variables

### Required Configuration
```env
# Server
NODE_ENV=development|production
PORT=3000

# Database
MONGODB_URI=mongodb://user:pass@host:port/db?authSource=admin

# Security
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Docker
NGINX_PORT=80
BACKEND_PORT=3000
FRONTEND_PORT=80
```

## 🚀 Deployment

### Production Checklist
- [ ] Update JWT_SECRET to strong random value
- [ ] Configure production MongoDB URI
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Set up SSL certificates for HTTPS
- [ ] Configure backup strategies
- [ ] Set up monitoring and logging

### Scaling Considerations
- **Database**: MongoDB replica sets for high availability
- **API Server**: Multiple backend instances behind nginx
- **Frontend**: CDN distribution for static assets
- **Monitoring**: Application and infrastructure monitoring

## 📋 Migration from Legacy System

### Access Database Integration
1. **Data Assessment**: Review existing Access DB schema
2. **Schema Mapping**: Map Access fields to MongoDB schema
3. **Data Migration**: Use `/api/migration/migrate` endpoint
4. **Validation**: Verify data integrity after migration
5. **User Onboarding**: Guide employees through registration process

### Migration Steps
```bash
# 1. Test Access DB connection
curl http://localhost:3000/api/migration/access/test

# 2. Check record count
curl http://localhost:3000/api/migration/access/count

# 3. Run migration (Admin token required)
curl -X POST http://localhost:3000/api/migration/migrate \
  -H "Authorization: Bearer <admin-token>"
```

## 🤝 Contributing

### Development Guidelines
1. **Code Style**: Follow TypeScript and ESLint rules
2. **Testing**: Write unit tests for new features
3. **Documentation**: Update README for significant changes
4. **Security**: Follow secure coding practices

### Git Workflow
```bash
git checkout -b feature/your-feature
git commit -m "feat: add new feature"
git push origin feature/your-feature
# Create Pull Request
```

## 📞 Support

### Common Issues
- **Database Connection**: Check MongoDB service and credentials
- **Authentication**: Verify JWT secret and token validity
- **Migration**: Ensure Access DB file is accessible
- **CORS**: Check origin configuration for frontend

### Logs and Debugging
```bash
# View service logs
docker-compose logs nginx
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Access container for debugging
docker exec -it HRMS-backend sh
```

## 📄 License

This project is proprietary software developed for internal company use.

---

**Version**: 1.0.0  
**Last Updated**: 2024-09-11  
**Maintained By**: Development Team