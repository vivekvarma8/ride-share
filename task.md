# Engineering Task Execution Plan
## Project: CommuteCircle - Campus & Community Ride-Sharing Web Platform

---

### Phase 0: Project Setup & Monorepo Foundation
- [x] **T0.1: Initialize Root Monorepo & Workspaces**
  - **Dependencies:** None
  - **Definition of Done:** Root `package.json` configured with npm workspaces (`apps/*`, `packages/*`), `.gitignore` initialized (preventing `.env`, `node_modules`, `dist`), `tsconfig.base.json` created.
- [x] **T0.2: Configure Environment Template & Docker Compose**
  - **Dependencies:** T0.1
  - **Definition of Done:** `.env.example` defined with all required keys (`DATABASE_URL`, `JWT_SECRET`, `ALLOWED_EMAIL_DOMAINS`, `PORT`, `CLIENT_URL`); `docker-compose.yml` set up for local PostgreSQL 15 on port 5432 with health check.
- [x] **T0.3: Setup Shared Package (`packages/shared`)**
  - **Dependencies:** T0.1
  - **Definition of Done:** TypeScript contracts, Enums (`UserRole`, `RideStatus`, `RequestStatus`, `NotificationType`), and Zod validation schemas for auth, vehicles, and rides compiled and exportable.

---

### Phase 1: Database Architecture & Backend Core
- [x] **T1.1: Initialize Backend Express + TypeScript Service (`apps/server`)**
  - **Dependencies:** T0.2, T0.3
  - **Definition of Done:** `apps/server` initialized with Express, TypeScript, CORS, Helmet, Morgan, JSON parsing, error handling middleware, and health check route (`/api/health`).
- [x] **T1.2: Prisma Schema Design & Database Migration**
  - **Dependencies:** T1.1
  - **Definition of Done:** `prisma/schema.prisma` configured with models (`User`, `Vehicle`, `Ride`, `RideRequest`, `Review`, `Notification`), indexes, and cascade behaviors. Prisma client generated.
- [x] **T1.3: Database Seeding Script**
  - **Dependencies:** T1.2
  - **Definition of Done:** `prisma/seed.ts` populates realistic mock data: verified users (`alice@campus.edu`, `bob@campus.edu`, `carol@campus.edu`, `admin@campus.edu`), vehicles, sample rides, and notifications.

---

### Phase 2: Authentication & Domain Access Control
- [x] **T2.1: Domain Allowlist Guard & JWT Utilities**
  - **Dependencies:** T1.1
  - **Definition of Done:** Utility functions verifying email domains against `ALLOWED_EMAIL_DOMAINS`. JWT sign/verify utilities implemented with strong typing.
- [x] **T2.2: Auth API Endpoints (Google OAuth & Dev-Auth Bypass)**
  - **Dependencies:** T1.2, T2.1
  - **Definition of Done:** Endpoints `/api/auth/google` (Google token verification) and `/api/auth/dev-login` (local development bypass with allowed-domain validation), plus `/api/auth/me` to get authenticated user state.
- [x] **T2.3: Express Auth Middleware (`requireAuth`, `requireAdmin`)**
  - **Dependencies:** T2.2
  - **Definition of Done:** Reusable route middleware extracting Bearer token, verifying session validity and active account status, and populating `req.user`.

---

### Phase 3: Core Domain Services & API Routes
- [x] **T3.1: Vehicle Management Endpoints**
  - **Dependencies:** T2.3
  - **Definition of Done:** CRUD endpoints (`GET /api/vehicles`, `POST /api/vehicles`, `DELETE /api/vehicles/:id`) ensuring drivers own their vehicles.
- [x] **T3.2: Ride Management & Discovery Endpoints**
  - **Dependencies:** T3.1
  - **Definition of Done:**
    - `POST /api/rides`: Create ride with seat validation and vehicle check.
    - `GET /api/rides`: Filtered search by origin, destination, date, seats.
    - `GET /api/rides/:id`: Detailed ride view with passenger roster and vehicle info.
    - `PATCH /api/rides/:id/cancel`: Driver cancellation cascading to requests.
- [x] **T3.3: Ride Join Requests & Atomic Seat Locking**
  - **Dependencies:** T3.2
  - **Definition of Done:**
    - `POST /api/rides/:id/requests`: Create join request (status `PENDING`).
    - `PATCH /api/rides/:id/requests/:requestId/status`: Driver approve/decline with atomic seat decrement in `$transaction`.
    - `DELETE /api/rides/:id/requests/:requestId`: Passenger cancels request (restores seat if approved).
- [x] **T3.4: Reviews & Ratings API**
  - **Dependencies:** T3.3
  - **Definition of Done:** `POST /api/rides/:id/reviews` allowing mutual ratings for completed rides with star scores (1-5) and average rating calculation.
- [x] **T3.5: Admin Management Endpoints**
  - **Dependencies:** T2.3, T3.2
  - **Definition of Done:** `GET /api/admin/metrics`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/status`, and `PATCH /api/admin/rides/:id/cancel`.

---

### Phase 4: Real-Time Communication & Notifications
- [x] **T4.1: Socket.IO Server Setup & User Authentication**
  - **Dependencies:** T1.1, T2.1
  - **Definition of Done:** Socket.IO integrated with Express HTTP server, authenticating incoming connections via handshake JWT and joining `user:{userId}` rooms.
- [x] **T4.2: Notification Service & Event Dispatch Pipeline**
  - **Dependencies:** T4.1, T3.3
  - **Definition of Done:** Service storing notifications in PostgreSQL (`Notification` table) and broadcasting instantaneous Socket.IO events (`notification:new`) upon ride requests, approvals, declines, and cancellations.
- [x] **T4.3: Notification REST Endpoints**
  - **Dependencies:** T4.2
  - **Definition of Done:** `GET /api/notifications` (with unread count) and `PATCH /api/notifications/:id/read` + `PATCH /api/notifications/read-all`.

---

### Phase 5: Frontend Web Application (`apps/client`)
- [x] **T5.1: Initialize React + Vite + TypeScript + Tailwind CSS**
  - **Dependencies:** T0.1
  - **Definition of Done:** Client scaffolded with Vite, TypeScript, Tailwind CSS, Lucide icons, and Axios API client configured with auth token interceptors.
- [x] **T5.2: Auth Context, Routing & App Shell**
  - **Dependencies:** T5.1, T2.2
  - **Definition of Done:** React Router configured with route guards (`ProtectedRoute`, `AdminRoute`), Navigation bar with user avatar, notification bell, and responsive mobile menu.
- [x] **T5.3: Authentication & Login Page (`/login`)**
  - **Dependencies:** T5.2
  - **Definition of Done:** Campus-branded login page with Google OAuth button, trusted domain indicator, and Dev Quick-Login switcher for easy testing.
- [x] **T5.4: Dashboard View (`/dashboard`)**
  - **Dependencies:** T5.2
  - **Definition of Done:** Executive summary cards (next upcoming ride, rides joined, rides offered), quick CTA links, and recent activity list.
- [x] **T5.5: Ride Search & Discovery View (`/rides`)**
  - **Dependencies:** T3.2, T5.2
  - **Definition of Done:** Interactive search filter bar (origin, destination, date, seats), responsive ride cards with seat counters, price badge, and driver thumbnail.
- [x] **T5.6: Ride Details & Booking View (`/rides/:id`)**
  - **Dependencies:** T3.3, T5.5
  - **Definition of Done:** Full trip breakdown, vehicle details, passenger roster, and contextual "Request to Join" / "Cancel Request" / "Manage" action panel.
- [x] **T5.7: Publish Ride Form (`/rides/create`) & Vehicle Garage (`/vehicles`)**
  - **Dependencies:** T3.1, T3.2, T5.2
  - **Definition of Done:** Vehicle management modal (add car, plate, capacity), ride creation wizard validating future departure dates and seat constraints.
- [x] **T5.8: "My Rides" & Driver Request Approval Drawer (`/my-rides`)**
  - **Dependencies:** T3.3, T5.2
  - **Definition of Done:** Tabbed management of driven rides vs joined rides; driver modal to review applicant profiles and click "Approve" / "Decline" with live updates.
- [x] **T5.9: Real-Time Notification Center & Audio Alerts**
  - **Dependencies:** T4.2, T5.2
  - **Definition of Done:** Socket.IO hook listening for alerts, live unread counter badge, notification drawer, and transient toast popups.
- [x] **T5.10: User Profile & Rating Reviews (`/profile`)**
  - **Dependencies:** T3.4, T5.2
  - **Definition of Done:** User statistics, vehicle overview, past trip history, and completed ride review submission modal.
- [x] **T5.11: Admin Operations View (`/admin`)**
  - **Dependencies:** T3.5, T5.2
  - **Definition of Done:** Platform metrics cards, user suspension table, and ride supervision dashboard.

---

### Phase 6: Testing, Quality Assurance & Documentation
- [x] **T6.1: Backend Integration Tests**
  - **Dependencies:** T3.3, T2.2
  - **Definition of Done:** Automated test suites verifying domain allowlist rejection, valid auth session creation, ride publication, and join request approval/seat decrement flow.
- [x] **T6.2: End-to-End Verification & PowerShell Run Scripts**
  - **Dependencies:** T5.11, T6.1
  - **Definition of Done:** Windows-friendly execution scripts (`npm run dev`, `npm run seed`, `npm test`), verified clean startup without errors.
- [x] **T6.3: Comprehensive Setup & Operational Documentation (`README.md`)**
  - **Dependencies:** T6.2
  - **Definition of Done:** Step-by-step Windows setup guide (Prerequisites, Docker, Postgres, Prisma, Dev Auth, Socket.IO, troubleshooting tips).
