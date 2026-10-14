# Project Memory & Technical State
## Project: RouteMate - Community Carpooling & Ride-Sharing Web Platform

---

### 1. Current Status
- **Current Phase:** Production Iteration Complete.
- **Engineering State:** Platform rebranded to **RouteMate**, prices formatted in INR (₹), open email domain access enabled (`ALLOWED_EMAIL_DOMAINS="*"` allowing Gmail, Yahoo, Outlook, custom domains), and dynamic role-differentiated Driver, Passenger, and Admin dashboards implemented. All 14 automated integration tests passing.

---

### 2. Completed Tasks & Updates
- [x] **Rebranding to RouteMate:** Renamed across HTML, Navbar, Login, Dashboard, Admin Console, and metadata.
- [x] **Currency in INR (₹):** Updated database seed (`₹150`, `₹180`, `₹120`), ride creation schemas, search filters, details page, drives, and bookings.
- [x] **Open Email Domains:** Configured `ALLOWED_EMAIL_DOMAINS="*"` so any valid email address (Gmail, Yahoo, Outlook, etc.) can sign in and participate.
- [x] **Differentiated Dashboards:**
  - **Driver View:** Urgent pending passenger requests with 1-click Approve/Decline directly on the dashboard, total fuel share earned in ₹, active drives roster, and vehicle quick management.
  - **Passenger View:** Inline ride search bar, active booked trips with driver details and pickup instructions, estimated transit savings in ₹, and upcoming carpools.
  - **Admin View:** Platform health, user status moderation, and operations console access.
  - **Interactive Mode Switcher:** Toggle between Driver View and Passenger View seamlessly on the dashboard.
- [x] **14/14 Integration Tests Passing:** Verifying open email domain access, INR pricing, vehicle registration, and atomic seat reservation.
- [x] **T0.1 - T0.3 (Monorepo Foundation):** Root workspaces (`apps/client`, `apps/server`, `packages/shared`), `.gitignore`, `tsconfig.base.json`, `packages/shared` types & Zod schemas.
- [x] **T1.1 - T1.3 (Database & Backend Core):** Express TypeScript app, Prisma PostgreSQL schema, migrations, seed script (`prisma/seed.ts`).
- [x] **T2.1 - T2.3 (Auth & Domain Security):** Email allowlist validator (`ALLOWED_EMAIL_DOMAINS`), Google OAuth token exchange + local Dev Quick Login bypass, JWT signing & `requireAuth` / `requireAdmin` guards.
- [x] **T3.1 - T3.5 (Core Business Logic):** Vehicle management CRUD, Ride search & publish, atomic join-request seat decrement in `$transaction`, mutual review ratings, and admin moderation endpoints.
- [x] **T4.1 - T4.3 (Real-Time Dissemination):** Socket.IO rooms per user (`user:{userId}`), instant notification delivery, persistent PostgreSQL notifications, unread counter badge.
- [x] **T5.1 - T5.11 (Frontend Client SPA):** React 18 + Vite + Tailwind CSS web app with all screens (`/login`, `/dashboard`, `/rides`, `/rides/create`, `/rides/:id`, `/my-rides`, `/vehicles`, `/notifications`, `/profile`, `/admin`).
- [x] **T6.1 - T6.3 (QA & Documentation):** 13/13 Vitest integration test suite passing, live PowerShell execution verified, comprehensive `README.md` created.

---

### 3. Immediate Next Tasks (Top 3–5)
1. **Interactive Demo / Acceptance Testing:** Walkthrough by user on `http://localhost:5173` using seed accounts (Alice, Bob, Carol, Admin).
2. **Production Cloud Deployment:** Follow `architecture.md` to deploy backend on Render/Railway and SPA on Vercel with cloud PostgreSQL.
3. **Optional Extended Features:** PostGIS geospatial radius search, SMS alerts via Twilio.

---

### 4. Key Architectural Decisions & Rationale

| Decision ID | Decision | Rationale | Alternatives Considered |
| :--- | :--- | :--- | :--- |
| **ADR-001** | **Monorepo via npm Workspaces** | Native npm workspaces provide seamless TypeScript reference sharing between client and server (`packages/shared`), eliminating dual repository synchronization overhead while avoiding complex monorepo tooling like Nx/Turborepo that can cause friction on Windows. | Multi-repo (high drift risk for shared DTOs/types); Nx/Lerna (unnecessary complexity for college project). |
| **ADR-002** | **Prisma ORM with PostgreSQL** | Strict relational consistency and ACID transactions (`$transaction`) are mandatory to prevent race conditions during seat locking when multiple passengers request the last available seat simultaneously. | MongoDB / Mongoose (lacks native transactional seat integrity without complex distributed locking). |
| **ADR-003** | **Dual Auth Pipeline (OAuth + Dev Bypass)** | Production enforces Google OAuth with email domain verification (`ALLOWED_EMAIL_DOMAINS`). Local development/testing provides a dedicated `/api/auth/dev-login` endpoint that generates authentic JWTs for test users while still enforcing domain validation, enabling reliable automated testing without needing active Google Cloud console credentials. | Mocking Google OAuth in browser (cumbersome for automated CI and integration tests). |
| **ADR-004** | **Hybrid Notification Pipeline (Socket.IO + Postgres)** | Every notification is first written to PostgreSQL (`Notification` entity) and then emitted via Socket.IO to `user:${userId}` room. This guarantees zero message loss for offline users while delivering sub-second real-time notifications for active users. | Polling-only (too slow for real-time ride approvals); Firebase Cloud Messaging (requires external account configuration). |
| **ADR-005** | **Windows-First Cross-Platform Tooling** | All npm scripts use cross-platform tools (`cross-env`, `rimraf`, standard Node scripts). No bash-specific commands (e.g. `export`, `rm -rf`, `grep`) are used in build pipelines to ensure out-of-the-box PowerShell compatibility. | Bash scripts (fail natively on Windows cmd/PowerShell without WSL). |

---

### 5. Known Issues & Risks

1. **PostgreSQL Local Availability:** The system assumes either a local PostgreSQL instance or Docker Desktop is available on port 5432. If Docker is not running on the host, a direct local PostgreSQL installation or cloud PostgreSQL connection string (e.g. Neon, Supabase) can be provided in `.env`.
2. **Socket.IO Network Port Access:** Node server running on port 5000 and Vite on 5173 must not be blocked by local Windows Defender firewall alerts.

---

### 6. Environment Specifications (Windows Host)
- **Host OS:** Windows 10/11
- **Shell:** PowerShell
- **Node.js Environment:** LTS
- **Package Manager:** npm (v9+ with native workspaces support)
- **Database:** PostgreSQL 15+ (Docker Compose or local service)
- **Allowed Domains Default:** `college.edu,campus.edu,university.edu,org.com`
