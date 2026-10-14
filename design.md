# Product Design & UI/UX Specifications
## Project: CommuteCircle - Campus & Community Ride-Sharing Web Platform

---

### 1. Information Architecture (Site Map)

```
[Public Access]
└── /login (Google OAuth Sign-in & Domain Verification Gate)

[Authenticated App Shell]
├── /dashboard (Executive Summary: Upcoming Trips, Quick Actions, Activity Feed)
├── /rides
│   ├── /rides (Search & Discover Rides with Filter Sidebar)
│   ├── /rides/create (Publish New Ride Modal / Page)
│   └── /rides/:id (Ride Detail: Driver Info, Vehicle, Route, Request Action)
├── /my-rides (Tabbed Hub: "Driving" vs. "Passenger Bookings")
│   └── /my-rides/:id/manage (Driver Management View: Pending & Approved Join Requests)
├── /vehicles (Vehicle Garage: List, Add Vehicle, Edit/Remove)
├── /notifications (Notification Feed: Unread alerts, filters, mark as read)
├── /profile (User Details, Bio, Department, Phone, Reputational Ratings)
└── /admin (Admin Console: System Metrics, User Management, Ride Supervision)
```

---

### 2. Key Screen Specifications

#### 2.1 Login Screen (`/login`)
- **Header:** CommuteCircle branding, campus safety badge, trusted domain indicator pill.
- **Hero Card:**
  - One-click "Sign in with Google" button with official Google iconography.
  - Development quick-login selector (in dev mode) to switch between Alice (Driver) and Bob (Passenger).
  - Explicit notification callout: *"Only institutional accounts ending with approved domains (e.g., @college.edu) are permitted access."*
- **Footer:** Campus transit terms, privacy policy link, safety guidelines.

#### 2.2 Dashboard Screen (`/dashboard`)
- **Top Greeting & Stat Cards:**
  - Next Upcoming Ride (countdown, pickup time, driver/passenger tag).
  - Rides Offered (total completed as driver).
  - Rides Joined (total completed as rider).
  - Co2 Offset / Commute Savings estimate card.
- **Active Rides Carousel / List:**
  - Compact summary of rides occurring in the next 48 hours.
- **Quick Action Bar:**
  - Primary button: "+ Offer a Ride"
  - Secondary button: "Find a Ride"
- **Recent Activity Feed:** Latest notifications and booking status updates.

#### 2.3 Ride Search & List Screen (`/rides`)
- **Filter Controls Header / Sidebar:**
  - Origin Input (typeahead / text).
  - Destination Input (typeahead / text).
  - Departure Date Picker (default: today).
  - Minimum Available Seats selector (1 - 4).
  - Sort selector (Departure time ascending, price low-to-high).
- **Search Results Grid / List:**
  - Empty State: "No rides found for this route. Be the first to offer one!" with a CTA button.
  - Ride Cards:
    - Driver thumbnail, name, campus department, and star rating.
    - Departure time & estimated arrival.
    - Origin $\rightarrow$ Destination with clear visual waypoint iconography.
    - Seats remaining pill (e.g., "3 seats left" in Emerald green; "1 seat left" in Amber).
    - Price badge (e.g., "$3.00 / seat" or "Free").
    - "View Details" button.

#### 2.4 Ride Details Screen (`/rides/:id`)
- **Route Summary Panel:**
  - Detailed departure timestamp, address, arrival address.
  - Interactive route map preview (or mock route waypoint diagram).
- **Driver & Vehicle Information Card:**
  - Driver photo, verified domain badge, member since date, contact options.
  - Vehicle details: Make, Model, Year, Color, License Plate Number.
- **Passenger Roster:**
  - List of currently confirmed passengers with avatars and seat count.
- **Booking Action Panel (Sticky on Mobile):**
  - Current seats available counter.
  - Seat count selector (1 to $N$).
  - Optional pickup note textarea.
  - Conditional Action CTA:
    - Driver viewing own ride $\rightarrow$ "Manage Requests" button.
    - Passenger not joined $\rightarrow$ "Request to Join" button.
    - Passenger pending $\rightarrow$ "Request Pending Approval" badge + "Cancel Request" button.
    - Passenger approved $\rightarrow$ "Confirmed Booking" badge.
    - Ride full / completed $\rightarrow$ Disabled state.

#### 2.5 Create Ride Screen (`/rides/create`)
- **Prerequisite Guard:** If driver has no registered vehicles, display banner: *"Please register a vehicle before offering a ride"* with redirect button.
- **Form Fields:**
  - Vehicle Selector dropdown (lists registered vehicles).
  - Origin Address & Destination Address.
  - Departure Date and Time picker.
  - Available Seats number input (bounded by vehicle max capacity).
  - Suggested Cost Share input (currency, e.g., $0.00 to $15.00).
  - Additional Notes / Luggage / Rules textarea.
- **Submission Action:** "Publish Ride" button with loading spinner and validation error feedback.

#### 2.6 My Rides Screen (`/my-rides`)
- **Tab 1: Rides I'm Driving:**
  - Filter: Upcoming vs. Past.
  - List items displaying origin/destination, time, filled seats vs. total seats.
  - Actions: "Manage Requests" (with badge for pending count), "Cancel Ride", "Mark Complete".
- **Tab 2: Rides I've Joined:**
  - List items displaying driver name, vehicle, status badge (`PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`).
  - Actions: "Cancel Request", "View Details", "Rate Driver" (active when completed).

#### 2.7 Driver Request Management Modal / View (`/my-rides/:id/manage`)
- **Ride Snapshot:** Time, route, remaining seats counter.
- **Pending Requests Section:**
  - Card per applicant: Passenger avatar, name, department, campus rating, seats requested, pickup note.
  - Two primary actions: "Approve" (Green) and "Decline" (Red) with immediate optimistic feedback.
- **Confirmed Passengers Section:**
  - Confirmed passenger roster with direct phone/chat quick link.

#### 2.8 Vehicles Screen (`/vehicles`)
- **Vehicle Garage List:**
  - Cards showing vehicle make, model, year, color, license plate, and seating capacity.
  - Active/Default vehicle indicator.
  - "Add Vehicle" button triggering modal form.

#### 2.9 Notifications Screen (`/notifications`)
- **Notification Center:**
  - Filter pills: "All", "Unread", "Ride Updates".
  - "Mark All as Read" button.
  - Timestamped notification cards with type-based iconography:
    - Blue: New Join Request
    - Green: Request Approved
    - Red: Request Declined or Ride Cancelled
    - Gray: General System Notice

#### 2.10 User Profile Screen (`/profile`)
- **Personal Information:** Name, email (read-only, verified), department, phone number, bio.
- **Reputation Metrics:** Average star rating, number of reviews, completed trips as driver, completed trips as rider.
- **Recent Reviews Received:** Feedback commentary and ratings from community members.

#### 2.11 Admin Dashboard (`/admin`)
- **Access Guard:** Restricted to users with `role: ADMIN`.
- **KPI Metrics:** Total Users, Total Active Rides, Total Bookings, System Health.
- **User Governance Table:** Search users, toggle account active/suspended status.
- **Ride Governance Table:** View active rides, force cancel flagged or fraudulent listings.

---

### 3. Detailed UX Flows

#### Flow 1: Ride Creation
1. Driver clicks "Offer a Ride".
2. System checks user's vehicle roster.
   - If empty: routes to `/vehicles` with guidance banner.
   - If populated: presents ride form.
3. Driver completes form and clicks "Publish Ride".
4. Client validates data client-side with Zod; submits `POST /api/rides`.
5. Upon 201 Created, user is navigated to `/my-rides` with success toast.

#### Flow 2: Search and Request to Join
1. Rider navigates to `/rides`, specifies Origin, Destination, Date.
2. Filtered list updates dynamically.
3. Rider clicks ride card $\rightarrow$ `/rides/:id`.
4. Rider reviews seats, enters pickup note, selects seat count, clicks "Request to Join".
5. Backend verifies seat availability, creates request record with status `PENDING`, emits real-time WebSocket event to driver.
6. Rider's UI transitions to "Request Sent (Pending Approval)".

#### Flow 3: Driver Approves/Declines Request
1. Driver receives in-app notification (bell badge increments + audio toast).
2. Driver clicks notification or goes to `/my-rides/:id/manage`.
3. Driver clicks "Approve".
4. Backend executes transactional atomic seat decrement:
   - `Ride.availableSeats` decremented.
   - `RideRequest.status` set to `APPROVED`.
   - Real-time socket event dispatched to passenger.
5. Passenger's screen immediately reflects approved status.

#### Flow 4: Ride Cancellation & Notification Cascade
1. Driver clicks "Cancel Ride".
2. Modal confirmation appears: *"Are you sure? This will cancel bookings for $N$ passengers."*
3. Driver confirms cancellation.
4. Backend marks ride as `CANCELLED`, cascades status update to all related requests, and sends notifications to all passengers.
5. Passengers receive urgent notification alert.

---

### 4. UI Guidelines for Tailwind CSS

#### 4.1 Color Palette
- **Primary / Brand:** Indigo & Slate
  - `primary-50`: `#EEF2FF`
  - `primary-600`: `#4F46E5` (Interactive buttons, links)
  - `primary-700`: `#4338CA` (Hover state)
- **Success / Available:** Emerald
  - `emerald-50`: `#ECFDF5`
  - `emerald-600`: `#059669` (Available seats, approved badges)
- **Warning / Attention:** Amber
  - `amber-50`: `#FFFBEB`
  - `amber-500`: `#F59E0B` (Low seat alert, pending status)
- **Danger / Urgent:** Rose
  - `rose-50`: `#FFF1F2`
  - `rose-600`: `#E11D48` (Declined, cancelled, destructive actions)
- **Neutral / Surface:** Slate
  - `slate-50`: `#F8FAFC` (Page background)
  - `slate-100`: `#F1F5F9` (Card border, divider)
  - `slate-800`: `#1E293B` (Body headings)
  - `slate-900`: `#0F172A` (Text primary)

#### 4.2 Typography
- **Font Family:** `font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Headings:**
  - `h1`: `text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl`
  - `h2`: `text-xl font-semibold text-slate-900`
  - `h3`: `text-base font-semibold text-slate-800`
- **Body:** `text-sm text-slate-600 leading-relaxed`
- **Captions & Meta:** `text-xs font-medium text-slate-500`

#### 4.3 Spacing & Layout Tokens
- Container width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Card padding: `p-5 sm:p-6`
- Card styling: `bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow`
- Button sizing: `px-4 py-2 text-sm font-medium rounded-lg transition-colors`

---

### 5. Component Inventory

| Component Name | Category | Primary Function | Key Variants / States |
| :--- | :--- | :--- | :--- |
| `Button` | Input | Primary action trigger | `primary`, `secondary`, `danger`, `outline`, `loading`, `disabled` |
| `Input` / `Select` | Form | Text and dropdown data capture | Standard, focused, error (with assistive message) |
| `RideCard` | Display | Summarizes ride listing in search results | Default, booked, full, driver view |
| `StatusBadge` | Feedback | Categorical state indicator | `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` |
| `Modal` | Overlay | Focused contextual actions (e.g., Add Vehicle) | Standard modal with backdrop blur & Esc listener |
| `Toast` | Feedback | Global transient feedback alert | `success`, `error`, `info`, with auto-dismiss (4s) |
| `NotificationDropdown` | Overlay | Bell click popup with unread list | Empty state, unread badges, mark-read click |
| `RatingStars` | Input/Display | Star rating input and display | Interactive (click to rate) vs. Read-only (display score) |
| `EmptyState` | Display | Clear visual feedback when lists are empty | Search empty, garage empty, bookings empty |

---

### 6. Accessibility (a11y) Checklist

- [ ] **Semantic Elements:** Standard `<main>`, `<nav>`, `<header>`, `<section>`, `<button>`, and `<form>` tags utilized across all pages.
- [ ] **Contrast Compliance:** All text colors meet WCAG 2.1 AA minimum contrast ratio of 4.5:1 against their backgrounds.
- [ ] **Keyboard Navigation:** All interactive elements (buttons, inputs, dropdown items, modals) accessible and operable via `Tab`, `Enter`, `Space`, and `Escape`.
- [ ] **Focus Rings:** Distinct, high-contrast focus rings (`focus:ring-2 focus:ring-primary-500 focus:outline-none`) applied without suppression.
- [ ] **Accessible Forms:** All inputs explicitly paired with `<label>` tags or equipped with descriptive `aria-label` / `aria-labelledby` attributes.
- [ ] **Screen Reader Live Regions:** Dynamic notifications and toast alerts announced via `role="status"` and `aria-live="polite"`.
