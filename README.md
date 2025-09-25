# Human Resource Management System (HRMS)

A modern HRMS built with **React**, **Node.js**, and **MongoDB**. Provides employee management, authentication, leave management, attendance tracking, and HR workflows.

---

## 🏗️ Architecture

**Backend**: Node.js (TS), Express, MongoDB (Mongoose), JWT + bcrypt, Helmet, CORS, rate limiting, Access DB migration  
**Frontend**: React 18 (TS), MUI v5, Context API, Axios, React Hook Form + Yup, Vite  
**Infrastructure**: Docker, Nginx, MongoDB, Docker Compose

---

## 🚀 Quick Start

### Prerequisites

- Docker & Compose  
- Node.js 18+  
- `PGA.mdb` in `./data/`  

### Production

```
git clone <repo>
cd HRMS
cp .env.example .env
docker-compose up -d
```

- Web: <http://localhost>  
- API: <http://localhost/api/health>  
- DB Admin: <http://localhost:27019>  

### Development

```
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

---

## 📊 Database

**Employee Collection**

```
{
  empID: string;
  name: string;
  department: string;
  email?: string;
  password?: string;
  role: 'admin'|'hr'|'manager'|'employee';
  isActive: boolean;
  startDate: Date;
  lastLogin?: Date;
}
```

**Leave Collection**

```
{
  empID: string;
  name: string;
  department: string;
  leaveType: string; // 婚假, 喪假, 病假, 事假, etc.
  reason: string;
  leaveStart: Date;
  leaveEnd: Date;
  status: 'created'|'approved'|'rejected';
  rejectionReason?: string;
  approvedBy?: string;
  YY: string; // Application year
  mm: string; // Application month
  DD: string; // Application day
  hour: string;
  minutes: string;
}
```

**Auth Flow**: Migrate → Register → Login → JWT → Role-based access

---

## 🛠️ API Endpoints

**Auth (`/api/auth`)**  

- POST `/login`, `/register`, `/change-password`, `/logout`  
- GET/PUT `/profile`  

**Employees (`/api/employees`)**

- CRUD, search, deactivate

**Leave Management (`/api/leave`)**

- POST `/create` - Create leave request
- GET `/my` - Get employee's leave requests
- GET `/all` - Get all leave requests (HR/Admin only)
- PUT `/:id/approve` - Approve leave request (HR/Admin only)
- PUT `/:id/reject` - Reject leave request (HR/Admin only)
- GET `/:id` - Get specific leave request

**Attendance (`/api/attendance`)**

- POST `/scan/now` - Trigger attendance scan
- GET `/date/:date` - Get records by date
- GET `/daterange` - Get records by date range
- GET `/my` - Get personal attendance

**Migration (`/api/migration`)**

- POST `/migrate`
- GET `/access/count`, `/access/test`  

---

## 🔒 Security

- JWT tokens, bcrypt hashing  
- Role-based access (admin/hr/manager/employee)  
- Helmet, CORS, rate limiting  
- Soft delete, audit trail, validation  

---

## 🐳 Docker

- **nginx** (80)  
- **backend** (3000)  
- **frontend** (80)  
- **mongodb** (27019)  

```
docker-compose build
docker-compose up -d
docker-compose logs
```

---

## 🔧 Development

**Backend Structure**

```
controllers/        # Request handlers (auth, employee, leave, attendance)
services/           # Business logic (employeeService, leaveService, etc.)
models/             # MongoDB schemas (Employee, Leave, Attendance)
middleware/         # Auth, validation, error handling
routes/             # API route definitions
config/             # Database & environment config
legacy/             # Access DB migration tools
```

**Frontend Structure**

```
components/         # React components
├── Auth/           # Login, Register forms
├── Employee/       # Employee management
├── Leave/          # Leave request & approval
├── Attendance/     # Attendance tracking
└── Layout/         # Navigation, layout
contexts/           # React Context (AuthContext)
services/           # API clients (axios)
types/              # TypeScript interfaces
utils/              # Utilities (docx generation)
theme.ts            # MUI theme configuration
```

## ✨ Features

### 📝 Leave Management
- **Employee Features**:
  - Create leave requests with multiple types (婚假, 喪假, 病假, 事假, etc.)
  - View personal leave request history
  - Download leave request forms as DOCX documents
  - Real-time status tracking (pending, approved, rejected)

- **HR/Admin Features**:
  - Review all leave requests with DataGrid interface
  - Filter by status (created, approved, rejected, all)
  - Approve or reject requests with reasons
  - Sortable columns and pagination
  - Audit trail with approval history

### 👤 Employee Management
- Complete CRUD operations for employee data
- Role-based access control (Admin, HR, Manager, Employee)
- Department-based filtering and search
- Employee status management (active/inactive)

### ⏰ Attendance Tracking
- Automated attendance data import
- Date range queries and reporting
- Individual and department-level analytics
- Integration with existing attendance systems

**Testing**

```
npm test        # unit tests
npm run test:e2e
```

---

## 📝 Env Variables

```
NODE_ENV=development|production
PORT=3000
MONGODB_URI=mongodb://user:pass@host:port/db?authSource=admin
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
NGINX_PORT=80
```

---

## 🚀 Deployment

- Strong JWT secret  
- Production MongoDB URI  
- NODE_ENV=production  
- Proper CORS + HTTPS  
- Backups + monitoring  

Scaling: MongoDB replica sets, multiple backend instances, CDN for frontend.
