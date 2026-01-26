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
Run the development server:
```bash
npm run dev
```

This starts both:
- Frontend: `http://0.0.0.0:5000`
- Backend API: `http://localhost:3001`

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

### Auth API Endpoints:
- `POST /api/register` - Register new user (email, password, name)
- `POST /api/login` - Login with email/password
- `GET /api/user/:id` - Get user by ID

## Recent Changes
- 2026-01-26: Added secure login/registration with password hashing (scrypt)
- 2026-01-25: Extended database schema with subscription/payment tables, vehicles, client records, categories, tags, branches
- 2026-01-25: Integrated frontend with PostgreSQL API for persistent data storage
- 2026-01-25: Added PostgreSQL backend with schema `ugt_tuners` for external database
- 2026-01-25: Initial Replit setup - configured Vite for Replit environment
- 2026-01-25: Initial Replit setup - configured Vite for Replit environment
