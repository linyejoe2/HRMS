# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
- `npm run dev` - Start Vite development server on port 5173
- `npm run build` - Build for production (TypeScript compile + Vite build)
- `npm run lint` - Run ESLint on React/TypeScript files
- `npm run preview` - Preview production build locally

### Build Configuration
- **Bundler**: Vite with React plugin and TypeScript support
- **Development Proxy**: `/api` requests proxy to `http://localhost:6002`
- **Build Output**: `dist/` directory with sourcemaps enabled
- **Code Splitting**: Manual chunks for vendor libraries (React, MUI)

## Architecture Overview

### Tech Stack
- **Framework**: React 18 with TypeScript and Vite
- **UI Library**: Material-UI (MUI) v5 with custom theme
- **State Management**: React Context API (AuthContext)
- **HTTP Client**: Axios with interceptors for authentication
- **Routing**: React Router v6 with protected routes
- **Form Handling**: React Hook Form with Yup validation
- **Notifications**: React Hot Toast

### Project Structure
```
src/
├── components/           # React components organized by feature
│   ├── Auth/            # LoginForm, RegisterForm
│   ├── Chat/            # ChatInterface component
│   └── Layout/          # AppLayout with drawer navigation
├── contexts/            # React Context providers
│   └── AuthContext.tsx  # Authentication state management
├── services/            # API service layers
│   └── api.ts           # Axios configuration and API methods
├── types/               # TypeScript type definitions
│   └── index.ts         # Shared interfaces and enums
├── theme.ts             # Material-UI theme configuration
├── App.tsx              # Main app with routing logic
└── main.tsx             # React application entry point
```

### Key Architecture Patterns

**Authentication Flow**:
- JWT token stored in localStorage
- AuthContext provides global auth state
- Axios interceptors handle token attachment and 401 responses
- Protected routes using ProtectedRoute wrapper component
- Public routes redirect authenticated users

**Routing Structure**:
- Public routes: `/login`, `/register`
- Protected routes: `/` (redirects to `/chat`), `/chat`, `/history`, `/settings`
- Route protection with loading states and automatic redirects

**Component Organization**:
- Feature-based component organization (Auth, Chat, Layout)
- Consistent use of Material-UI components and theming
- Responsive design with mobile-first approach using MUI breakpoints

**API Integration**:
- Centralized API configuration with base URL from environment variables
- Separate API modules: `authAPI`, `conversationAPI`, `aiAPI`
- Automatic token management and error handling
- Request/response interceptors for global error handling

### Material-UI Theme Configuration

**Design System**:
- Primary color: Blue (`#1976d2`) for main actions and branding
- Secondary color: Pink (`#dc004e`) for accent elements
- Custom component overrides for consistent styling
- Rounded corners (8px buttons, 12px cards/papers)
- Custom typography scale with Roboto font family

**User Level Color Coding**:
- Lawyer/Admin (Level 0): Blue (`#1976d2`)
- Co-Lawyer (Level 1): Green (`#388e3c`)
- Assistant (Level 2): Orange (`#f57c00`)
- Client (Level 3): Purple (`#7b1fa2`)

### Component Architecture

**AppLayout Component** (`src/components/Layout/AppLayout.tsx:34`):
- Responsive drawer navigation (280px width)
- Mobile-friendly with temporary drawer on small screens
- User profile integration with role-based avatar colors
- Navigation menu with selected state highlighting
- Persistent layout state management

**AuthContext** (`src/contexts/AuthContext.tsx:15`):
- Global authentication state management
- Automatic token validation on app startup
- Login/register/logout methods with error handling
- Loading states for authentication operations
- Integration with React Hot Toast for notifications

### Development Environment

**Vite Configuration**:
- Development server on port 5173 with host binding
- API proxy configuration for backend integration
- Build optimizations with manual code splitting
- Source maps enabled for debugging

**TypeScript Configuration**:
- Strict mode enabled with comprehensive linting rules
- ES2020 target with modern module resolution
- Absolute imports support with `@/*` path mapping
- JSX support with React 18 automatic runtime

**API Base URL Configuration**:
- Uses `VITE_API_URL` environment variable
- Fallback to `http://localhost:8002` for local development
- All API requests prefixed with `/api/`

### Error Handling Patterns

**API Error Handling**:
- Global 401 response interceptor for automatic logout
- Contextual error messages using React Hot Toast
- Graceful error boundaries for component-level failures

**Form Validation**:
- Client-side validation using Yup schemas
- Real-time form validation with React Hook Form
- Consistent error display patterns across forms

### Development Workflows

**Component Development**:
- Use existing MUI components and theme system
- Follow feature-based organization structure
- Implement responsive design using MUI breakpoints
- Use TypeScript interfaces for all props and state

**API Integration**:
- Extend existing API modules in `src/services/api.ts`
- Use TypeScript interfaces from `src/types/index.ts`
- Implement proper error handling and loading states
- Test API endpoints using browser network tools

**Styling Guidelines**:
- Use MUI theme system for consistent colors and spacing
- Leverage MUI's sx prop for component-specific styling
- Follow mobile-first responsive design principles
- Maintain consistent user level color coding