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

## API Endpoints
All endpoints are prefixed with `/api`:
- `GET/POST /clients` - List/create clients
- `PUT/DELETE /clients/:id` - Update/delete client
- `GET/POST /tasks` - List/create tasks
- `PUT/DELETE /tasks/:id` - Update/delete task
- `GET/POST /transactions` - List/create transactions
- `DELETE /transactions/:id` - Delete transaction
- `GET/POST /bookings` - List/create bookings
- `PUT/DELETE /bookings/:id` - Update/delete booking
- `GET/POST /services` - List/create services
- `PUT/DELETE /services/:id` - Update/delete service
- `GET/POST /data/:key` - Generic key-value storage
- `GET /users` - List users
- `GET /health` - Health check

## Recent Changes
- 2026-01-25: Integrated frontend with PostgreSQL API for persistent data storage
- 2026-01-25: Added PostgreSQL backend with schema `ugt_tuners` for external database
- 2026-01-25: Initial Replit setup - configured Vite for Replit environment
