# CLAUDE.md - Backend

This file provides guidance to Claude Code when working with the HRMS backend codebase.

## Development Commands

### Local Development
- `npm run dev` - Start development server with hot reload on port 3000
- `npm run build` - Build TypeScript to JavaScript in `dist/` folder
- `npm start` - Start production server from built files
- `npm test` - Run test suite (when implemented)

### Database Operations
- The system automatically connects to MongoDB on startup
- Migration endpoint: `POST /api/migration/migrate` (admin only)
- Health check: `GET /api/health`
- Legacy DB explorer: `GET /db` (development only)

### Docker Operations
- `docker-compose up -d` - Start all services
- `docker-compose build backend` - Rebuild backend service
- `docker-compose logs backend` - View backend logs

## Architecture Overview

### Tech Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with layered architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs password hashing
- **Security**: Helmet, CORS, express-rate-limit
- **Legacy Integration**: node-adodb for Access Database migration

### Project Structure
```
src/
├── app.ts               # Express app configuration
├── server.ts            # Server startup and graceful shutdown
├── config/              # Configuration management
│   ├── index.ts         # Environment variables and config
│   └── database.ts      # MongoDB connection setup
├── models/              # Mongoose models and schemas
│   ├── Employee.ts      # Employee model with auth fields
│   ├── Department.ts    # Department model
│   └── index.ts         # Model exports
├── services/            # Business logic layer
│   ├── employeeService.ts   # Employee CRUD and search
│   ├── authService.ts       # Authentication logic (embedded in employeeService.ts)
│   ├── migrationService.ts  # Access DB migration
│   └── index.ts         # Service exports
├── controllers/         # HTTP request handlers
│   ├── authController.ts    # Auth endpoints (/api/auth)
│   ├── employeeController.ts # Employee endpoints (/api/employees)
│   ├── migrationController.ts # Migration endpoints (/api/migration)
│   └── index.ts         # Controller exports
├── middleware/          # Express middleware
│   ├── auth.ts          # JWT authentication and role-based access
│   ├── validation.ts    # Joi schema validation
│   ├── errorHandler.ts  # Error handling and API errors
│   └── index.ts         # Middleware exports
├── routes/              # API route definitions
│   ├── authRoutes.ts    # Authentication routes
│   ├── employeeRoutes.ts # Employee management routes
│   ├── migrationRoutes.ts # Data migration routes
│   └── index.ts         # Main router
└── legacy/              # Legacy system integration
    └── accessRoutes.ts  # Access DB explorer (dev only)
```

### Key Architecture Patterns

**Layered Architecture**:
- **Routes** → **Controllers** → **Services** → **Models**
- Each layer has a single responsibility
- Business logic is contained in services
- Controllers handle HTTP concerns only

**Authentication Flow**:
- JWT tokens with 7-day expiration
- Employee registration requires existing `empID` from Access DB
- Role-based access control (admin, hr, employee, manager)
- Password hashing with bcrypt (12 rounds)

**Error Handling**:
- Custom `APIError` class for operational errors
- Global error handler middleware
- Validation errors with Joi schemas
- Rate limiting to prevent abuse

**Database Schema Design**:
- **Employee Model**: Core employee data + auth fields
- **Department Model**: Department management (future use)
- Soft delete pattern (isActive field)
- Audit fields (createdAt, updatedAt)

## API Endpoints Reference

### Authentication Routes (`/api/auth`)
```typescript
POST /login
  Body: { empID: string, password: string }
  Response: { token: string, employee: IEmployee }

POST /register  
  Body: { empID: string, password: string, email?: string, confirmPassword: string }
  Response: { token: string, employee: IEmployee }

GET /profile [Auth Required]
  Response: { employee: IEmployee }

PUT /profile [Auth Required]
  Body: { email?: string, address?: string, carNo?: string, carPosition?: string }
  Response: { employee: IEmployee }

POST /change-password [Auth Required]
  Body: { currentPassword: string, newPassword: string }
  Response: { success: true }

POST /logout [Auth Required]
  Response: { success: true }
```

### Employee Routes (`/api/employees`)
```typescript
GET / [Auth Required]
  Query: { page?: number, limit?: number, department?: string }
  Response: { employees: IEmployee[], total: number, pages: number }

GET /search [Auth Required]
  Query: { q: string }
  Response: { employees: IEmployee[] }

GET /:id [Auth Required]
  Response: { employee: IEmployee }

POST / [HR/Admin Only]
  Body: IEmployee
  Response: { employee: IEmployee }

PUT /:id [HR/Admin Only]  
  Body: Partial<IEmployee>
  Response: { employee: IEmployee }

DELETE /:id [Admin Only]
  Response: { success: true }
```

### Migration Routes (`/api/migration`) [Admin Only]
```typescript
POST /migrate
  Response: { migrated: number, errors: string[] }

GET /access/count
  Response: { count: number }

GET /access/test
  Response: { connected: boolean }
```

## Configuration Management

### Environment Variables
```typescript
// config/index.ts exports:
{
  port: number;           // Server port (default: 3000)
  nodeEnv: string;        // development | production
  mongodbUri: string;     // MongoDB connection string
  jwtSecret: string;      // JWT signing secret
  jwtExpiresIn: string;   // Token expiration (default: 7d)
  corsOrigins: string[];  // Allowed CORS origins
  rateLimitWindowMs: number;      // Rate limit window
  rateLimitMaxRequests: number;   // Max requests per window
  maxFileSize: number;    // File upload limit
  uploadPath: string;     // Upload directory path
}
```

### Required Environment Setup
```env
# .env file required variables:
NODE_ENV=development
MONGODB_URI=mongodb://root:good1234@mongodb:27017/HRMS?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
```

## Development Workflows

### Adding New API Endpoints
1. **Create/Update Model** in `src/models/` if needed
2. **Add Business Logic** in appropriate service in `src/services/`
3. **Create Controller Method** in `src/controllers/`
4. **Define Route** in `src/routes/`
5. **Add Validation Schema** in `src/middleware/validation.ts`
6. **Test Endpoint** using API client or frontend

### Authentication Integration
```typescript
// Protected route example:
router.get('/protected', authenticateToken, (req: AuthRequest, res) => {
  // req.user contains { id, empID, role, email }
  const userId = req.user.id;
  // ... handle request
});

// Role-based protection:
router.post('/admin-only', authenticateToken, requireRole(['admin']), handler);
```

### Database Operations
```typescript
// Service layer example:
class EmployeeService {
  async findByEmpID(empID: string): Promise<IEmployee | null> {
    return Employee.findOne({ empID, isActive: true });
  }
  
  async updateEmployee(id: string, data: Partial<IEmployee>) {
    return Employee.findByIdAndUpdate(id, data, { new: true });
  }
}
```

### Error Handling Patterns
```typescript
// Using APIError for operational errors:
import { APIError, asyncHandler } from '../middleware';

const controller = asyncHandler(async (req, res) => {
  const user = await UserService.findById(id);
  if (!user) {
    throw new APIError('User not found', 404);
  }
  res.json({ user });
});
```

## Data Migration Process

### Access Database Integration
The system includes a migration service to import employee data from the existing Access database (PGA.mdb):

```typescript
// Migration workflow:
1. Place PGA.mdb file in /data/ directory (or update path in migrationService.ts)
2. Test connection: GET /api/migration/access/test
3. Check record count: GET /api/migration/access/count  
4. Run migration: POST /api/migration/migrate
5. Verify data in MongoDB
```

### Migration Field Mapping
```typescript
// Access DB → MongoDB mapping:
{
  Name → name
  ID → id  
  EmpID → empID
  Department → department
  PhotoPath → photoPath
  CarNo → carNo
  CarPosition → carPosition
  Address → address
  Startdate → startDate
  EnableDate → enableDate
  EisableDate → disableDate
  ClassID → classID
  
  // New HRMS fields:
  password: undefined     // Set during registration
  email: undefined        // Set during registration  
  isActive: !disableDate  // Active if no disable date
  role: 'employee'        // Default role
}
```

## Security Implementation

### JWT Authentication
- **Token Generation**: Includes `{ id, empID, role }` in payload
- **Token Verification**: Middleware checks token validity and user existence
- **Token Expiration**: Configurable via JWT_EXPIRES_IN (default: 7d)
- **Refresh Strategy**: Client-side token refresh before expiration

### Password Security
- **Hashing**: bcrypt with 12 salt rounds
- **Validation**: Minimum 6 characters (configurable via Joi schema)
- **Change Password**: Requires current password verification

### Rate Limiting
- **Authentication Routes**: 5 requests per 15 minutes
- **General API**: 100-200 requests per 15 minutes
- **Migration Routes**: 5 requests per hour (admin only)

### Role-Based Access Control
```typescript
// Role hierarchy:
'admin'    → Full system access
'hr'       → Employee management, cannot delete
'manager'  → Department-level access (future)
'employee' → Personal profile access only
```

## Development Best Practices

### Code Style
- **TypeScript**: Strict mode enabled with proper typing
- **Async/Await**: Preferred over promises and callbacks  
- **Error Handling**: Use APIError for operational errors
- **Validation**: Joi schemas for input validation
- **Security**: Never log passwords or sensitive data

### Testing Strategy (Future Implementation)
- **Unit Tests**: Service layer business logic
- **Integration Tests**: API endpoint testing
- **Database Tests**: Model validation and queries
- **Authentication Tests**: JWT and role-based access

### Performance Considerations
- **Database Indexing**: Indexes on empID, email, department, isActive
- **Query Optimization**: Use selective fields and pagination
- **Caching**: Consider Redis for session management (future)
- **Connection Pooling**: MongoDB connection management

### Monitoring and Logging
- **Health Checks**: `/api/health` endpoint for service monitoring
- **Error Logging**: Console.error for development, structured logging for production
- **Request Logging**: Access logs via nginx in production
- **Database Monitoring**: MongoDB performance metrics

## Troubleshooting Guide

### Common Issues

**MongoDB Connection Errors**:
```bash
# Check MongoDB service
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Test connection
curl http://localhost:3000/api/health
```

**Authentication Issues**:
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check token in request headers:
# Authorization: Bearer <token>
```

**Migration Issues**:
```bash
# Verify Access DB file location
ls -la data/PGA.mdb

# Test Access connection
curl http://localhost:3000/api/migration/access/test
```

**Rate Limiting**:
```bash
# Clear rate limit (restart service)
docker-compose restart backend

# Check rate limit headers in response
```

### Debugging Commands
```bash
# Enter backend container
docker exec -it HRMS-backend sh

# View application logs
docker-compose logs -f backend

# Check environment variables
docker exec HRMS-backend env | grep NODE_ENV
```

## Future Enhancements

### Planned Features
- **Employee Photos**: File upload and storage
- **Department Management**: CRUD operations for departments
- **Attendance Tracking**: Time in/out functionality
- **Reports**: Employee reports and analytics
- **Notifications**: System notifications
- **Audit Log**: Track all user actions

### Scalability Improvements
- **Redis Caching**: Session and data caching
- **Database Sharding**: For large employee datasets
- **Microservices**: Split services for better scaling
- **Background Jobs**: For heavy operations like migrations
- **API Versioning**: For backward compatibility

### Security Enhancements
- **2FA**: Two-factor authentication
- **OAuth Integration**: SSO with company systems
- **API Key Management**: For external integrations
- **Data Encryption**: Encrypt sensitive fields at rest
- **Audit Trail**: Comprehensive action logging