# UGT Tuners

## Overview
UGT Tuners is a React-based web application built with Vite, TypeScript, and TailwindCSS. It is a CRM/booking/scheduling management system with authentication for automotive tuning services.

## Project Structure
- `/src` - Frontend source code
  - `/app` - Main application components
  - `/styles` - CSS stylesheets
  - `/utils` - Utility functions (auth, helpers, security)
- `/server` - Backend API server
  - `index.cjs` - Express server with PostgreSQL connection
- `/public` - Static assets
- `vite.config.ts` - Vite configuration
- `package.json` - Node.js dependencies

## Tech Stack
- **Frontend**: React 18.3.1 + TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: TailwindCSS 4.1.12 with Emotion
- **UI Components**: Radix UI, MUI Material
- **Backend**: Express.js
- **Database**: PostgreSQL (external server)

## Database
The project uses an external PostgreSQL database with a dedicated schema `ugt_tuners`.

### Tables:
- `users` - User accounts and authentication
- `clients` - Customer records
- `services` - Available services
- `bookings` - Appointment bookings
- `transactions` - Financial transactions
- `tasks` - Task management
- `app_data` - Generic key-value storage

### Required Environment Variables:
- `POSTGRESQL_HOST` - Database host
- `POSTGRESQL_PORT` - Database port
- `POSTGRESQL_USER` - Database user
- `POSTGRESQL_PASSWORD` - Database password
- `POSTGRESQL_DBNAME` - Database name

## Development
The project uses two separate Replit workflows:
- **Backend**: `npm run server` - Express API on port 3001
- **Frontend**: `npm run dev` - Vite dev server on port 5000

Both workflows are managed by Replit and auto-restart on failure.

API requests to `/api/*` are proxied to the backend.

## Build
```bash
npm run build
```

## Database Schema
The project uses PostgreSQL with schema `ugt_tuners`. Tables:

### Core CRM Tables:
- `users` - System users (with role, branch, is_owner)
- `clients` - Customer records (with branch_id, source)
- `vehicles` - Client vehicles (brand, model, VIN, license plate)
- `services` - Available services
- `bookings` - Appointments (with vehicle_id, payment_status, amount)
- `client_records` - Service history per client
- `transactions` - Financial transactions
- `tasks` - Task management

### Organization Tables:
- `branches` - Company branches/locations
- `categories` - Income/expense categories
- `tags` - Filtering tags
- `entity_tags` - Tag associations

### Subscription/Payment Tables:
- `subscriptions` - Subscription plans (price, limits, features)
- `user_subscriptions` - User subscription status
- `payments` - Payment history

### Utility:
- `app_data` - Key-value settings storage

## API Endpoints
All endpoints are prefixed with `/api`:

### Clients & Vehicles:
- `GET/POST /clients` - List/create clients
- `PUT/DELETE /clients/:id` - Update/delete client
- `GET/POST /vehicles` - List/create vehicles
- `PUT/DELETE /vehicles/:id` - Update/delete vehicle
- `GET/POST /client-records` - List/create client records
- `PUT/DELETE /client-records/:id` - Update/delete record

### Tasks & Bookings:
- `GET/POST /tasks` - List/create tasks
- `PUT/DELETE /tasks/:id` - Update/delete task
- `GET/POST /bookings` - List/create bookings
- `PUT/DELETE /bookings/:id` - Update/delete booking

### Services & Finance:
- `GET/POST /services` - List/create services
- `PUT/DELETE /services/:id` - Update/delete service
- `GET/POST /transactions` - List/create transactions
- `DELETE /transactions/:id` - Delete transaction
- `GET/POST /categories` - List/create categories
- `PUT/DELETE /categories/:id` - Update/delete category
- `GET/POST /tags` - List/create tags
- `DELETE /tags/:id` - Delete tag
- `GET/POST /entity-tags` - List/create tag associations
- `DELETE /entity-tags/:id` - Delete tag association

### Organization:
- `GET/POST /branches` - List/create branches
- `PUT/DELETE /branches/:id` - Update/delete branch
- `GET /users` - List users

### Subscriptions & Payments:
- `GET/POST /subscriptions` - List/create subscription plans
- `GET/POST /user-subscriptions` - List/create user subscriptions
- `PUT /user-subscriptions/:id` - Update subscription status
- `GET/POST /payments` - List/create payments
- `PUT /payments/:id` - Update payment status

### Utility:
- `GET/POST /data/:key` - Generic key-value storage
- `GET /health` - Health check

## Authentication
The application uses secure email/password authentication:
- Passwords are hashed using scrypt algorithm with random salt before storage
- Passwords are never stored in plain text
- Minimum password length: 6 characters
- **Rate Limiting**: 3 failed login attempts from one IP = 5 minute block

### Auth API Endpoints:
- `POST /api/login` - Login with email/password, returns session token
- `POST /api/logout` - Invalidate session (requires auth)
- `POST /api/forgot-password` - Request password reset token
- `POST /api/reset-password` - Reset password with token
- `GET /api/user/:id` - Get user by ID

### Profile API Endpoints:
- `GET /api/profile` - Get current user profile (requires auth)
- `PUT /api/profile` - Update current user profile (requires auth)

### Admin User Management (owner only):
- `POST /api/admin/users` - Create new user (admin only)
- `PUT /api/admin/users/:id` - Update user (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)

### Session Management:
- Sessions stored in `sessions` table with 24hr expiration
- Bearer token authentication: `Authorization: Bearer <token>`
- Password reset tokens stored hashed with 1hr expiration
- Frontend automatically handles session expiry (redirects to login)

### Role Middleware:
- `authMiddleware` - Validates session token on protected routes
- `ownerOnly` - Restricts access to owner role
- `managerOrOwner` - Restricts access to manager or owner roles

## Recent Changes
- 2026-01-26: Added comprehensive input sanitization (XSS, SQL injection protection) via middleware
- 2026-01-26: Added global error handlers (uncaughtException, unhandledRejection) to prevent silent server crashes
- 2026-01-26: Added connection timeout (10s) and pool settings to PostgreSQL configuration
- 2026-01-26: Changed server to bind to 0.0.0.0 for reliable workflow detection
- 2026-01-26: Split dev command into separate Backend and Frontend workflows for stability
- 2026-01-26: Added startup logging for better debugging
- 2026-01-26: Added AdminPanel with dashboard layout, user management, and activity logs
- 2026-01-26: Implemented RBAC: Owner (full access), Manager (clients+calendar only), Master (read-only)
- 2026-01-26: Added activity_logs table for tracking user actions
- 2026-01-26: Hidden Tasks and Finance tabs for managers
- 2026-01-26: Added ProfilePage component with Apple-style minimalist design
- 2026-01-26: Added admin-only user management (create/update/delete users)
- 2026-01-26: Removed public registration - login-only with closed access
- 2026-01-26: Extended users table with first_name, last_name, avatar fields
- 2026-01-26: Added session-based authentication with tokens (24hr expiry)
- 2026-01-26: Added auth middleware for protected API routes
- 2026-01-26: Added password reset flow (forgot-password, reset-password endpoints)
- 2026-01-26: Added role-based access control middleware (owner, manager)
- 2026-01-26: Added secure login with password hashing (scrypt)
- 2026-01-25: Extended database schema with subscription/payment tables, vehicles, client records, categories, tags, branches
- 2026-01-25: Integrated frontend with PostgreSQL API for persistent data storage
- 2026-01-25: Added PostgreSQL backend with schema `ugt_tuners` for external database
- 2026-01-25: Initial Replit setup - configured Vite for Replit environment
- 2026-01-25: Initial Replit setup - configured Vite for Replit environment
