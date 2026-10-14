# Engineering Rules & Development Standards
## Project: CommuteCircle - Campus & Community Ride-Sharing Web Platform

---

### 1. Core Development Principles

1. **Correctness Over Cleverness:** Write transparent, readable TypeScript code. Favor explicit type signatures and defensive validations over complex meta-programming or implicit type casting.
2. **Atomic Data Integrity:** Operations involving seat capacity, bookings, and ride state mutations MUST be atomic (`prisma.$transaction`). Overbooking or orphan records are zero-tolerance defects.
3. **Defense in Depth:** Never trust client-supplied input. Sanitize and validate every incoming payload with Zod schemas on the backend, regardless of client-side validation.
4. **Incremental Delivery:** Build and verify small, testable vertical slices (Model -> Route -> Service -> UI -> Integration Test) rather than large unvalidated batches.
5. **Cross-Platform Parity:** All commands, scripts, and tooling must execute seamlessly on Windows PowerShell and POSIX shells without friction.

---

### 2. Git Workflow & Version Control

#### 2.1 Branch Naming Conventions
- `feature/<ticket-id>-<short-description>` (e.g., `feature/T1.2-auth-google-jwt`)
- `fix/<ticket-id>-<short-description>` (e.g., `fix/T3.1-seat-decrement-bug`)
- `refactor/<short-description>` (e.g., `refactor/socket-connection-pool`)
- `docs/<short-description>` (e.g., `docs/api-spec-update`)

#### 2.2 Pull Request (PR) Rules
- Every PR must address a specific task ID from `task.md`.
- PR description must specify:
  1. Summary of changes.
  2. How it was tested (commands & screenshot or test logs).
  3. Breaking changes / DB schema migrations required.
- PRs must pass linting, type-checks (`npm run type-check`), and all test suites before merge.

#### 2.3 Code Review Checklist
- [ ] No hardcoded credentials, JWT secrets, or connection strings.
- [ ] Explicit error handling with standard HTTP status codes.
- [ ] New database queries are indexed or verified for query efficiency.
- [ ] Form inputs are properly validated and sanitized.
- [ ] UI components are fully responsive and meet accessibility contrast standards.

---

### 3. Commit Message Convention (Conventional Commits)

All commit messages must adhere to the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

#### Allowed Types
- `feat`: A new user-facing feature.
- `fix`: A bug fix.
- `docs`: Documentation changes only.
- `style`: Formatting, missing semi-colons, no code logic change.
- `refactor`: Code change that neither fixes a bug nor adds a feature.
- `test`: Adding or correcting tests.
- `chore`: Build process, package updates, tooling config.

#### Examples
- `feat(auth): enforce allowed email domain validation in google oauth callback`
- `fix(rides): prevent race condition when two passengers request last seat`
- `test(api): add integration test suite for join-request approval flow`

---

### 4. Coding Standards

#### 4.1 TypeScript Standards
- `strict: true` must remain enabled in all `tsconfig.json` configurations.
- `any` is strictly prohibited. Use `unknown` with type guards or generic type constraints when type is dynamic.
- Prefer interfaces for object signatures and data contracts; use type aliases for unions, primitives, and tuples.
- Shared domain types must live in `packages/shared/src/types.ts` to guarantee single-source-of-truth between client and server.

#### 4.2 Naming Conventions
- **Files & Folders:**
  - React Components: PascalCase (e.g., `RideCard.tsx`, `NotificationBell.tsx`).
  - Services / Utils / Routes: kebab-case (e.g., `ride.service.ts`, `jwt-helper.ts`, `auth.routes.ts`).
  - Directories: kebab-case (e.g., `components/`, `use-cases/`, `ride-details/`).
- **Variables & Functions:** camelCase (e.g., `availableSeats`, `calculateRemainingCapacity()`).
- **Types & Interfaces:** PascalCase (e.g., `RideRequestPayload`, `UserProfile`).
- **Constants & Enums:** UPPER_SNAKE_CASE (e.g., `DEFAULT_PAGE_SIZE`, `RideStatus.COMPLETED`).

#### 4.3 Linting & Formatting
- ESLint with TypeScript rules enabled.
- Prettier configuration:
  - Single quotes: `true`
  - Trailing commas: `all`
  - Print width: `100`
  - Tab width: `2`
  - Semi-colons: `true`

---

### 5. API Standards

#### 5.1 RESTful Conventions
- **Resources:** Plural nouns (e.g., `/api/rides`, `/api/vehicles`, `/api/users`).
- **Nested Resources:** Sub-collections for dependent entities (e.g., `/api/rides/:rideId/requests`).
- **HTTP Methods:**
  - `GET`: Read resource(s) — safe and idempotent.
  - `POST`: Create resource.
  - `PUT`: Full update / replace resource.
  - `PATCH`: Partial update (e.g., `/api/rides/:id/requests/:reqId/status` with `{ "action": "APPROVE" }`).
  - `DELETE`: Remove / soft-delete resource.

#### 5.2 Standard Response Structure
All API responses must follow a predictable JSON envelope:

**Success Response (200 / 201):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Ride created successfully"
}
```

**Paginated Success Response (200):**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 42,
    "totalPages": 5
  }
}
```

**Error Response (400, 401, 403, 404, 422, 500):**
```json
{
  "success": false,
  "error": {
    "code": "SEATS_EXHAUSTED",
    "message": "No seats remaining on this ride",
    "details": [ ... ]
  }
}
```

---

### 6. Testing Standards

- **Integration Testing Priority:** Core business flows (e.g., authentication, ride publication, request submission, atomic driver approval) must be tested with integration tests using `supertest` against an ephemeral or test database.
- **Unit Testing:** Complex utility functions (e.g., domain extraction, distance calculations, date validation) must have 100% test coverage.
- **Test File Organization:** Tests reside in `tests/` directories adjacent to code modules or in dedicated `tests/integration` folders with `.test.ts` extensions.

---

### 7. Security Rules

1. **Zero Secret Leaks:**
   - Never commit `.env` files. Ensure `.gitignore` explicitly excludes `.env`, `.env.local`, `.env.*.local`.
   - All sample secrets must be documented with placeholder values in `.env.example`.
2. **JWT Safety:**
   - Tokens must be signed with secure secrets ($\ge 256$ bits) and contain reasonable expiration windows (e.g., 7 days).
3. **CORS & CSRF:**
   - CORS origin must explicitly match the frontend URL in production; wildcards (`*`) are disallowed on credentials-enabled routes.
4. **Email Allowlist Enforcement:**
   - Validation must take place on the server during every authentication flow. Client-side domain checks are for UI guidance only.

---

### 8. Windows-Specific Environment Notes

To ensure high reliability on Windows 10/11:
1. **PowerShell Native:**
   - Avoid Linux-only commands like `export VAR=val`, `rm -rf`, `touch`, or POSIX subshells `$(...)`.
   - Use cross-platform npm packages (`rimraf`, `cross-env`) for build scripts.
2. **Line Endings:**
   - Configure Git for consistent line ending handling: `git config --global core.autocrlf true` or maintain `.gitattributes` with `* text=auto eol=lf`.
3. **Path Separators:**
   - Never hardcode backslashes (`\`) or forward slashes (`/`) in Node.js scripts; use `path.join()` or `path.resolve()`.
4. **Port Availability:**
   - On Windows, verify ports 5000 and 5173 are not monopolized by Hyper-V or WSL reserved ranges.
