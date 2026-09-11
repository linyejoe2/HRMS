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
- `PGA.mdb` in `./data/` only when importing Access data

### Production

```
git clone <repo>
cd HRMS
./download_and_extract.sh --target-dir "$PWD" --preserve-launcher
./start.sh
```

`download_and_extract.sh` is the only tool that downloads, verifies, extracts, and retains the latest `release.zip`. With `--preserve-launcher`, it updates release files with matching names while retaining the local `start.sh`, `download_and_extract.sh`, `docker-compose.yml`, and `.env.example`. The archive is retained at `./release.zip` and served from `/public/release.zip`.

`start.sh` starts an already prepared release: it creates `.env` from `.env.example` when needed, adds `DATA=./data` to existing environment files that lack it, creates the default `./data/` directory, builds and starts Docker services, and runs health checks. It does not download or extract releases. Put `PGA.mdb` in `./data/` before importing data.

On Linux, the current user needs Docker socket access. If the script reports a permission error, review the security implications of Docker group membership and run:

```
sudo usermod -aG docker "$USER"
```

Then log out and back in, or start a new interactive shell with `newgrp docker` before running `./start.sh` again. On macOS, start Docker Desktop instead.

For manual startup, first download and extract the release so `./release.zip` exists for the Nginx bind mount, then copy `.env.example` to `.env` and run:

```
./download_and_extract.sh --target-dir "$PWD" --preserve-launcher
cp .env.example .env
docker compose up -d
```

- Web: <http://localhost:5200>
- API: <http://localhost:5200/api/health>
- Direct API: <http://localhost:5201/api/health>
- Release archive: <http://localhost:5200/public/release.zip>
- MongoDB: `localhost:27019`

### Linux/macOS Release Download

Before the first startup, and whenever updating a release, download and extract it with:

```
/path/to/HRMS/download_and_extract.sh --target-dir /path/to/HRMS --preserve-launcher
```

Run `./start.sh` only after this command succeeds. The script downloads, verifies, extracts, and retains `release.zip`; it overwrites release files with matching names, while `--preserve-launcher` retains the local launch scripts, Compose file, and `.env.example`. It requires Bash, either `curl` or `wget`, and one of `7z`, `7za`, or `unzip`.

The release source uses HTTPS, but no checksum or signature is currently published; verify the release through your trusted distribution process before running it.

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
  manager?: string; // empID of this employee's designated manager (drives 主管審核 routing)
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
  rejectionReason?: string; // also doubles as a general HR memo (e.g. the "說明" note written when HR creates the request on someone's behalf)
  approvedBy?: string;
  substitute: string; // empID chosen by the requester
  substituteApproveStatus: 'pending'|'approved'|'rejected';
  substituteMemo?: string;
  substituteApproveAt?: Date;
  manager?: string; // empID of whichever department manager acted
  managerApproveStatus: 'pending'|'approved'|'rejected';
  managerMemo?: string;
  managerApproveAt?: Date;
  agent?: string; // empID of the HR/admin who created+approved this request on the employee's behalf (hrMode)
  YYYY: string; // Application year
  mm: string; // Application month
  DD: string; // Application day
  hour: string;
  minutes: string;
}
```

Business-trip, post-clock, and official-business requests carry the same `manager`/`managerApproveStatus`/`managerMemo`/`managerApproveAt`/`agent` fields (no `substitute*` fields — only leave requires a substitute). Post-clock additionally carries a `witness`/`witnessApproveStatus`/`witnessMemo`/`witnessApproveAt` stage (a required 證明人, any active employee except the requester) that must approve before manager review.

**Auth Flow**: Migrate → Register → Login → JWT → Role-based access

---

## 🛠️ API Endpoints

**Auth (`/api/auth`)**  

- POST `/login`, `/register`, `/change-password`, `/logout`  
- GET/PUT `/profile`  

**Employees (`/api/employees`)**

- CRUD, search, deactivate

**Leave Management (`/api/leave`)**

- POST `/create` - Create leave request (requires `substitute` empID)
- GET `/my` - Get employee's leave requests
- GET `/all` - Get all leave requests (HR/Admin only)
- PUT `/:id/approve` - Approve leave request (HR/Admin only)
- PUT `/:id/reject` - Reject leave request (HR/Admin only)
- GET `/:id` - Get specific leave request
- GET `/pending/substitute` - Leave requests awaiting the caller's substitute review
- GET `/pending/manager` - Leave requests awaiting the caller's department manager review
- PUT `/:id/substitute-approve`, `/:id/substitute-reject` - Substitute review decision
- PUT `/:id/manager-approve`, `/:id/manager-reject` - Manager review decision (caller must be the requester's assigned `Employee.manager`)
- PUT `/:id/supporting-info` - Append supporting files (HR/Admin only); DELETE `/:id/supporting-info` - Remove one supporting file (HR/Admin only)

Business-trip (`/api/businesstrip`), post-clock (`/api/postclock`), and official-business (`/api/officialbusiness`) expose the equivalent `/pending/manager`, `/:id/manager-approve`, `/:id/manager-reject`, and `PUT`/`DELETE /:id/supporting-info` routes (no substitute step). Post-clock additionally requires a `witness` empID on `/create` and exposes `GET /pending/witness` plus `PUT /:id/witness-approve`/`/:id/witness-reject`; manager review is blocked until the witness approves.

Business-trip requests also carry a `clockTimes: { clockIn, clockOut }[]` field (one pair per day, defaulted from `constants.ts`'s working-time schedule on creation) and `PUT /api/businesstrip/:id/clock-times` lets the employee record/adjust it at any time, even after approval.

**Approvals (`/api/approvals`)**

- GET `/pending-manager` - Aggregated pending-manager items across all 4 request types, for the unified 主管審核 tab

**Attendance (`/api/attendance`)**

- POST `/scan/now` - Trigger attendance scan
- GET `/date/:date` - Get records by date
- GET `/daterange` - Get records by date range
- GET `/my` - Get personal attendance

**Migration (`/api/migration`)**

- POST `/migrate`
- GET `/access/count`, `/access/test`  

**Constants (`/api/constants`)**

- GET `/` - System-wide constants (working-time schedule: `workStart`, `workEnd`, etc.)

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
  - Must choose a substitute (代理人, any active employee) when creating a leave request; rejected with a 409 if the requester is already committed as someone else's substitute for an overlapping period, or if the chosen substitute already has an overlapping leave of their own
  - View personal leave request history
  - Download leave request forms as DOCX documents (includes the substitute's name)
  - Real-time status tracking (pending, approved, rejected)

- **Approval Workflow** (leave, business-trip, post-clock, official-business):
  - 代理審核 (substitute review, leave only), 證明審核 (witness review, post-clock only), and 主管審核 (manager review, all 4 types) tabs in 審核中心, visible to every employee
  - Manager review routes to whoever is set as the requester's `Employee.manager` (assigned in the employee edit dialog), not by role or department
  - Manager review only unlocks after the substitute (leave) or witness (post-clock) has approved
  - A substitute/witness/manager rejection freezes that stage without blocking HR/Admin's final decision
  - Leave's 狀態 chip (`AskLeaveTab.tsx`/`ApproveLeaveList.tsx`) shows the current stage — 代理人審核中 / 主管審核中 / 待審核 (HR) / 已核准 / 人事直接核准 (HR overrode before both stages cleared) — and is clickable to open a stage-by-stage `ApprovalTimelineModal` (reusable for other request types)
  - Post-clock's 狀態 chip (`PostClockTab.tsx`/`ApprovePostClockList.tsx`) follows the same pattern — 證明人審核中 / 主管審核中 / 審核中 (HR) / 已核准 / 人事直接核准 — also clickable to open the shared `ApprovalTimelineModal`

- **HR/Admin Features**:
  - Review all leave requests with DataGrid interface
  - Filter by status (created, approved, rejected, all)
  - Approve or reject requests with reasons, regardless of substitute/manager stage (with a confirmation prompt if not yet cleared)
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
- Business trips: uses the employee's own recorded per-day clock-in/out (`clockTimes`) when available, falling back to a computed work-hour estimate otherwise

**Testing**

```
npm test        # unit tests
npm run test:e2e
```

---

## 📝 Env Variables

```
NODE_ENV=development|production
SYSTEM_START_DATE=2025-01-01
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
