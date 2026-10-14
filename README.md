# CommuteCircle — Campus & Community Ride-Sharing Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-black.svg)](https://socket.io/)

A closed-loop carpooling and ride-sharing platform engineered specifically for verified institutions (universities, colleges, research parks, and corporate communities). Drivers publish scheduled rides with available vehicle seats, and verified community members search, request seats, receive driver approval, get real-time audio/toast notifications, and rate drivers upon trip completion.

---

## 🏛️ Architecture & Key Characteristics

- **Zero-Trust Institutional Email Domain Verification:** Registration and login are strictly gated against an allowed domain whitelist (`ALLOWED_EMAIL_DOMAINS="college.edu,campus.edu,university.edu,org.com"`). Non-whitelisted domains are rejected at the API gateway with `403 Forbidden`.
- **Atomic Concurrency Seat Locking:** Seat reservation and driver approval execute inside ACID database transactions (`prisma.$transaction`) to prevent overbooking when multiple passengers request the last available seat simultaneously.
- **Hybrid Real-Time & Persistent Notifications:** Notifications are stored in PostgreSQL and broadcast instantaneously over Socket.IO to private user channels (`user:{userId}`), ensuring zero dropped messages for offline commuters.
- **Cross-Platform & Windows Native:** Uses npm workspaces monorepo structure (`apps/client`, `apps/server`, `packages/shared`) with cross-platform Node scripts compatible with Windows PowerShell.

---

## 📁 Repository Structure

```
ride-share/
├── apps/
│   ├── client/                      # React 18 + Vite + Tailwind CSS SPA
│   │   ├── src/
│   │   │   ├── api/                 # API client wrapper with JWT injection
│   │   │   ├── components/          # Navbar, ProtectedRoute, AdminRoute
│   │   │   ├── context/             # AuthContext, SocketContext
│   │   │   └── pages/               # Login, Dashboard, Search, Details, Create, MyRides, Garage, Admin
│   │   └── package.json
│   └── server/                      # Express + TypeScript + Prisma API & WebSocket Server
│       ├── prisma/
│       │   ├── schema.prisma        # PostgreSQL Schema (User, Vehicle, Ride, Request, Review, Notification)
│       │   └── seed.ts              # Database Seeder (Alice, Bob, Carol, Admin)
│       ├── src/
│       │   ├── controllers/         # Auth, Vehicle, Ride, Request, Review, Admin
│       │   ├── middleware/          # Domain Allowlist, JWT Auth, Error Handler
│       │   ├── routes/              # Express API Routes
│       │   ├── services/            # Notification & Seat Reservation Logic
│       │   └── sockets/             # Socket.IO connection & event hub
│       ├── tests/                   # Vitest API integration test suite
│       └── package.json
├── packages/
│   └── shared/                      # Single-source-of-truth TypeScript types & Zod schemas
│       ├── src/
│       │   ├── types.ts             # User, Vehicle, Ride, Request Enums & Interfaces
│       │   └── schemas.ts           # Zod validation schemas
│       └── package.json
├── docker-compose.yml               # Local PostgreSQL 15 Container
├── .env.example                     # Environment Configuration Template
├── PRD.md                           # Product Requirements Document
├── architecture.md                  # System Architecture Specifications
├── rules.md                         # Engineering Rules & Standards
├── design.md                        # UI/UX Specifications
├── task.md                          # Engineering Task Tracker
└── memory.md                        # State & Decision Records
```

---

## ⚡ Quick Start Guide (Windows PowerShell)

### 1. Prerequisites
- **Node.js:** v18+ (tested on v24 LTS)
- **Database:** PostgreSQL (local installation or Docker Desktop)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Ensure your `DATABASE_URL` matches your PostgreSQL configuration:
```env
DATABASE_URL="postgresql://postgres@localhost:5433/rideshare_db?schema=public"
JWT_SECRET="dev_secret_jwt_key_at_least_32_characters_long_for_commute_circle!"
ALLOWED_EMAIL_DOMAINS="college.edu,campus.edu,university.edu,org.com"
```

### 3. Install Dependencies & Build Shared Packages
```powershell
npm install
npm run build --workspace=@rideshare/shared
```

### 4. Database Setup & Seeding
Push the Prisma schema to PostgreSQL and populate initial campus test data:
```powershell
npm run db:push --workspace=server
npm run db:seed --workspace=server
```

### 5. Run the Integration Test Suite
```powershell
npm test --workspace=server
```
*(Tests verify domain whitelist blocking, JWT session issuance, vehicle registration, ride publishing, and atomic join-request seat decrement).*

### 6. Start the Servers
In separate PowerShell terminals:

**Backend API & Socket.IO (Port 5000):**
```powershell
npm run dev:server
```

**Frontend React Web App (Port 5173):**
```powershell
npm run dev:client
```

Open your browser to: **`http://localhost:5173`**

---

## 👥 Seed Test Personas (Instant 1-Click Login)

The application provides a 1-click **Quick Persona Switcher** on the login page and navigation header:

| Persona | Email | Role | Vehicle Registered | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Alice (Driver)** | `alice@campus.edu` | `USER` | Toyota Prius (4 seats) | Offering daily rides, approving join requests |
| **Bob (Passenger)** | `bob@campus.edu` | `USER` | — | Searching rides, requesting seats |
| **Carol (Driver)** | `carol@campus.edu` | `USER` | Honda Civic (3 seats) | Offering evening rides |
| **Campus Admin** | `admin@campus.edu` | `ADMIN` | — | Platform metrics, user governance & suspensions |

*Note: You can also test domain rejection by entering non-whitelisted emails like `test@gmail.com` on the login page!*

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health status and allowed domains | No |
| `POST` | `/api/auth/google` | Google OAuth login & token issue | No |
| `POST` | `/api/auth/dev-login` | Local dev quick-login bypass | No |
| `GET` | `/api/auth/me` | Current authenticated user profile | Yes |
| `PATCH` | `/api/auth/profile` | Update profile information | Yes |
| `GET` | `/api/vehicles` | List user registered vehicles | Yes |
| `POST` | `/api/vehicles` | Register a new vehicle | Yes |
| `DELETE`| `/api/vehicles/:id` | Delete vehicle (if not in active ride) | Yes |
| `GET` | `/api/rides` | Filtered search (origin, dest, date, seats) | No |
| `POST` | `/api/rides` | Publish a new ride | Yes (Driver) |
| `GET` | `/api/rides/:id` | Detailed ride view with passenger roster | No |
| `PATCH` | `/api/rides/:id/cancel` | Cancel ride and notify all passengers | Yes (Driver) |
| `PATCH` | `/api/rides/:id/complete`| Mark ride completed & request reviews | Yes (Driver) |
| `POST` | `/api/rides/:id/requests`| Request to join ride | Yes (Passenger) |
| `PATCH` | `/api/rides/:id/requests/:reqId/status` | Approve or decline request (atomic seat lock) | Yes (Driver) |
| `DELETE`| `/api/rides/:id/requests/:reqId` | Cancel join request (restores seat if approved)| Yes (Passenger) |
| `GET` | `/api/notifications` | Get user notifications & unread count | Yes |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read | Yes |
| `POST` | `/api/reviews/ride/:id` | Review driver or passenger after completion | Yes |
| `GET` | `/api/admin/metrics` | System KPI metrics | Yes (Admin) |
| `GET` | `/api/admin/users` | Member governance & role audit | Yes (Admin) |
| `PATCH` | `/api/admin/users/:id/status` | Suspend or reactivate user | Yes (Admin) |
