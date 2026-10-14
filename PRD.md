# Product Requirements Document (PRD)
## Project: Campus & Community Ride-Sharing Platform (CommuteCircle)

---

### 1. Document Control
- **Document Version:** 1.0.0
- **Status:** Approved / Engineering Baseline
- **Target Audience:** Engineering, Product, QA, Operations
- **System Classification:** Internal Community Carpooling & Ride Matching

---

### 2. Product Overview
CommuteCircle is a closed-loop carpooling and ride-sharing web application engineered specifically for verified institutions (universities, colleges, corporate campuses, research parks). It connects drivers traveling to or from campus with passengers seeking affordable, safe, and convenient transit. By restricting access exclusively to verified organization email domains, the platform fosters trust, reduces single-occupancy vehicle emissions, mitigates campus parking shortages, and lowers transportation expenses for commuters.

---

### 3. Problem Statement
1. **Safety & Trust Deficit:** Public ride-hailing services are expensive, while public carpooling boards (e.g., Reddit, WhatsApp groups) lack safety verifications, background accountability, or structured driver-vehicle identification.
2. **Campus Transit Inefficiencies:** High traffic congestion, limited campus parking infrastructure, and irregular public transit schedules burden students and staff.
3. **Manual Coordination Overhead:** Existing ad-hoc carpool coordination through messaging apps fails at seat capacity tracking, route discoverability, schedule changes, and mutual driver-rider accountability.

---

### 4. Goals and Non-Goals

#### 4.1 Goals
- **Verified Community Access:** Strict email domain validation ensuring only authorized campus affiliates can register and transact.
- **Reliable Ride Lifecycle:** Structured ride publishing, seat tracking, origin/destination search, join requests, driver approval/rejection workflows, and completion auditing.
- **Real-Time Notification Pipeline:** Instantaneous push/in-app alerting for ride approvals, cancellations, and status transitions via Socket.IO backed by persistent relational storage.
- **Two-Way Trust Building:** Mutual post-trip star ratings, review notes, and vehicle profile registration.
- **Operational Auditing:** Basic administrative oversight to monitor ride activity, verify flagged users, and inspect system audit logs.

#### 4.2 Non-Goals
- **In-App Payment Gateway / Escrow:** In MVP, fuel cost sharing is cash/direct peer-to-peer (Venmo/UPI/Cash) or voluntary. Financial processing, split-fare banking APIs, and tax reporting are strictly out of scope for MVP.
- **Turn-by-Turn GPS Navigation:** The platform matches routes based on origin/destination waypoints, coordinates, and schedule times; it does not replicate Waze/Google Maps turn-by-turn routing during trips.
- **Instant On-Demand Dispatch:** This is a scheduled carpooling application, not an instant taxi-hailing (Uber/Lyft on-demand dispatch) engine.

---

### 5. Target Users & Personas

| Persona | Role | Primary Needs | Key Pain Points |
| :--- | :--- | :--- | :--- |
| **P1: Daily Student Commuter (Passenger)** | Undergraduate / Graduate Student | Low-cost commute, safety, reliable seat confirmation prior to class start. | Expensive public transit, unreliable bus schedules, stranded after late labs. |
| **P2: Student/Faculty Driver** | Driver with Personal Vehicle | Offset fuel and parking costs, companionship, control over who rides in their car. | Ghosting passengers, seat overcrowding, detour inconveniences. |
| **P3: Campus Employee / Staff** | Non-student staff commuter | Fixed departure times, professional conduct, clean vehicles. | Erratic student schedules, lack of punctuality. |
| **P4: Campus Safety / Community Admin** | University Operations / Admin | Incident audit trails, user deactivation, system health metrics. | Zero visibility into off-campus peer-to-peer incidents. |

---

### 6. Key User Journeys

#### Journey 1: Passenger Searches and Books a Commute
1. Passenger logs in with university Google account (`@college.edu`).
2. Passenger lands on Ride Search, inputs Departure Location ("North Campus Station"), Destination ("Engineering Hall"), Date, and required seats (1).
3. Search yields filtered ride cards showing driver profile, vehicle details, departure time, available seats, and estimated fuel share cost.
4. Passenger selects a ride, inputs optional pickup note, and clicks "Request to Join".
5. Status displays "PENDING_APPROVAL".
6. Driver approves request; passenger receives real-time notification sound/toast + in-app alert.
7. Upon ride completion, passenger receives a rating prompt to review the driver.

#### Journey 2: Driver Publishes a Ride and Manages Requests
1. Driver navigates to "Vehicles", verifies registered vehicle ("Toyota Prius - Blue - Plate ABC-1234").
2. Driver clicks "Create Ride", inputs Origin, Destination, Departure DateTime, Available Seats (3), Price per Seat ($3.00), and Ride Notes.
3. Ride is published and state is set to `OPEN`.
4. Driver receives real-time join request notification from Passenger A.
5. Driver reviews Passenger A's profile and campus rating (4.9 / 5.0) in "Manage Requests" drawer and clicks "Approve".
6. Available seats automatically decrement from 3 to 2.
7. Ride departs, driver marks ride as `COMPLETED`.

---

### 7. Feature Matrix: MVP vs. Post-MVP

| Feature Module | MVP Scope | Post-MVP / Roadmap |
| :--- | :--- | :--- |
| **Authentication** | Google OAuth 2.0 + JWT, strict domain allowlist (`ALLOWED_EMAIL_DOMAINS`), local mock/dev bypass auth option. | Multi-factor authentication (MFA), SAML/SSO campus portal integration. |
| **User Profile** | Name, avatar, verified email, bio, department/role, phone number. | Student ID card image upload & OCR verification. |
| **Vehicle Management** | Make, model, year, color, license plate, seat capacity. | Insurance policy verification & vehicle registration doc uploads. |
| **Ride Lifecycle** | Create, view, update, cancel, complete ride. Dynamic seat counter. | Recurring commute schedule rules (e.g., Every Mon/Wed at 8:30 AM). |
| **Ride Discovery** | Filter by Origin, Destination, Date range, Seats available. Text + coordinate search. | Geospatial radius search (PostGIS) with route detour polyline matching. |
| **Join Requests** | Request, Driver Approve, Driver Decline, Passenger Cancel. Auto-lock when full. | Waitlist queue with auto-promotion upon cancellation. |
| **Notifications** | Socket.IO real-time emission + Postgres persistent notification bell feed. | WebPush notifications, Twilio SMS alerts, transactional emails. |
| **Reviews & Ratings** | 1-to-5 star rating + text feedback after ride completion. Mutual evaluation. | Driver safety badges, punctuality metrics, automated dispute resolution. |
| **Administration** | Dashboard stats (users, rides, bookings), user deactivate/activate, ride force-cancel. | Automated spam detection, ride audit reporting, GDPR export compliance. |

---

### 8. Functional Requirements

#### FR-AUTH: Authentication & Domain Validation
- **FR-AUTH-1:** The system shall restrict authentication exclusively to email addresses whose domain suffixes match the configured `ALLOWED_EMAIL_DOMAINS` whitelist.
- **FR-AUTH-2:** Authentication tokens shall be issued as cryptographically signed JSON Web Tokens (JWT) with standard expiration and refresh/session validation.
- **FR-AUTH-3:** New users shall have their foundational profile automatically created upon first successful OAuth exchange.

#### FR-VEH: Vehicle Registry
- **FR-VEH-1:** A user must register at least one active vehicle before publishing any ride as a driver.
- **FR-VEH-2:** Vehicles must record make, model, year, color, license plate, and seating capacity (1-8 seats).

#### FR-RIDE: Ride Publishing & Management
- **FR-RIDE-1:** A driver shall specify departure location, destination, departure timestamp (must be in the future), available seat count, price contribution, and associated vehicle.
- **FR-RIDE-2:** Rides must transition through deterministic states: `SCHEDULED` -> `IN_PROGRESS` -> `COMPLETED`, or `CANCELLED`.
- **FR-RIDE-3:** When a ride is cancelled by the driver, all approved and pending passenger requests must immediately transition to `CANCELLED_BY_DRIVER`, and all affected passengers must be notified.

#### FR-REQ: Join Requests & Seat Locking
- **FR-REQ-1:** Passengers can submit a join request with a requested seat count $\le$ available seats.
- **FR-REQ-2:** Concurrent join requests must execute transactional seat locking to prevent overselling available vehicle capacity.
- **FR-REQ-3:** Upon driver approval, available seats are decremented. If available seats reach 0, status shifts to `FULL`, and remaining pending requests are either auto-rejected or flagged.
- **FR-REQ-4:** Passengers may cancel pending or approved requests prior to departure. Upon approved request cancellation, available seats are restored.

#### FR-NOTIF: Notification Delivery
- **FR-NOTIF-1:** The system shall persist all user notifications in the relational database with status `UNREAD` / `READ`.
- **FR-NOTIF-2:** If the recipient possesses an active WebSocket connection, the notification payload must be emitted instantaneously over Socket.IO.

#### FR-REV: Ratings & Reviews
- **FR-REV-1:** Passengers and drivers can submit mutual ratings (1-5 stars) only after a ride transitions to `COMPLETED`.
- **FR-REV-2:** A user cannot review the same ride booking multiple times.

#### FR-ADM: Administrative Governance
- **FR-ADM-1:** Authorized admin users (`role = ADMIN`) can view platform-wide metrics (total users, active rides, completed commutes).
- **FR-ADM-2:** Admins may suspend non-compliant users or terminate flagged rides.

---

### 9. Non-Functional Requirements

- **NFR-SEC-1 (Security):** All API inputs must be strictly validated against TypeScript/Zod schemas. HTTP security headers (Helmet), CORS restriction to authorized client origins, rate-limiting on sensitive endpoints (auth/search), and SQL injection prevention via Prisma ORM parameterized queries are mandatory.
- **NFR-PERF-1 (Performance):** Ride query and search responses shall return within $\le 300\text{ ms}$ under baseline load. Real-time Socket.IO dispatch latency shall be $\le 100\text{ ms}$.
- **NFR-A11Y-1 (Accessibility):** The web client must conform to WCAG 2.1 AA standards, supporting full keyboard navigation, high contrast ratios ($\ge 4.5:1$ text), and semantic ARIA labeling for form elements and modals.
- **NFR-REL-1 (Reliability):** Database operations mutating seat capacity and booking states must execute inside ACID transactions.
- **NFR-COMPAT-1 (Environment):** Development and operational scripts must execute seamlessly across Windows 10/11 (PowerShell) and Linux environments without POSIX-only shell dependencies.

---

### 10. Assumptions & Constraints
- **Assumptions:**
  - Campus users possess institutional Google Workspace or OAuth-compatible enterprise accounts.
  - Drivers possess valid personal driving licenses and compliant motor insurance per jurisdiction laws.
  - Financial compensation between peers remains strictly non-commercial cost-sharing.
- **Constraints:**
  - Zero budget for third-party commercial mapping software: use Google Maps Platform free tier / OpenStreetMap Leaflet fallbacks.
  - PostgreSQL standard deployment with Prisma ORM.

---

### 11. Success Metrics
- **Verification Rate:** 100% of registered accounts verified against allowed domains.
- **Booking Match Rate:** $\ge 65\%$ of published ride seats successfully requested and filled.
- **Drop-off / Cancellation Rate:** $< 10\%$ late-stage cancellations.
- **System Stability:** Zero concurrency race conditions (overbooking instances = 0).

---

### 12. Explicit Out of Scope
- Automated payment splitting and in-app credit card processing.
- Background checks with state DMV databases.
- Multi-leg transit routing combining trains/buses with carpools.
- Hardware telematics or OBD-II tracker integrations.

---

### 13. Risks and Mitigations

| Risk | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Race Condition Overbooking** | High | Prisma transactional updates (`$transaction`) with row-level seat locking. |
| **Non-Affiliate Account Infiltration** | High | Server-side domain suffix verification during OAuth callback, rejecting tokens from unapproved domains. |
| **Late Driver Cancellations** | Medium | Prominent driver cancellation metric displayed on public profile; automatic alerts to all passengers. |
| **Windows Tooling Compatibility** | Low | Use standard Node.js scripts in `package.json`, avoid shell-specific pipes (`&&` handled by npm or cross-env), specify PowerShell equivalents. |
