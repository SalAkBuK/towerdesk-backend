# Towerdesk Backend Boilerplate

NestJS + TypeScript backend scaffold with Prisma, JWT auth, and clean modular structure.

## Requirements
- Node.js 18+
- PostgreSQL

## Setup
1) Install dependencies:
   npm install

2) Configure environment:
   Copy `.env.example` to `.env` and update values.

3) Generate Prisma client and run migrations:
   npm run prisma:generate
   npm run prisma:migrate

4) Seed baseline roles and permissions:
   npm run prisma:seed

5) Start the server:
   npm run dev

API docs: http://localhost:PORT/docs

## Deploy on Render + Neon
1) Provision a Neon Postgres database and copy the connection string.
2) In Render, create a new Web Service from this repo.
3) Set the following environment variables in Render:
   - DATABASE_URL
   - NODE_ENV=production
   - PORT (Render sets this automatically)
   - JWT_ACCESS_SECRET
   - JWT_REFRESH_SECRET
   - JWT_ACCESS_TTL
   - JWT_REFRESH_TTL
4) Render build command:
   npm ci && npx prisma generate && npm run build
5) Render start command:
   npm run render-start
6) Verify the service:
   GET /health should return { "status": "ok", "timestamp": "..." }

Notes:
- Render free tier may sleep when idle; the first request can be slow.
- Prisma migrations are applied at startup via `render-start` using `prisma migrate deploy`.

## Performance & Cost
Tuning env vars (optional):
- `PGOPTIONS` (recommended: `-c statement_timeout=8000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=30000`)
- `PRISMA_APPLY_SESSION_TIMEOUTS` (fallback: run `SET` on connect)
- `HTTP_BODY_LIMIT` (default `1mb`)
- `THROTTLE_TTL` / `THROTTLE_LIMIT` (default 60s / 300)
- `THROTTLE_AUTH_TTL` / `THROTTLE_AUTH_LIMIT` (default 60s / 10)
- `DEFAULT_PAGE_SIZE` (default 50)
- `MAX_PAGE_SIZE` (default 100)
- `REQUEST_METRICS_ENABLED` (default true in production)
- `REQUEST_METRICS_INTERVAL_MS` (default 60000)
- `REQUEST_METRICS_SAMPLE_SIZE` (default 300)
- `HTTP_SERVER_TIMEOUT_MS` (default 30000)
- `HTTP_HEADERS_TIMEOUT_MS` (default 35000)
- `HTTP_KEEP_ALIVE_TIMEOUT_MS` (default 5000)

Basic load test:
```bash
# defaults to http://localhost:3000/health
npm run loadtest

# or target a custom URL
LOADTEST_URL=http://localhost:3000/health npm run loadtest
```

## Org scoping (Phase 1)
1) Apply migrations:
   npm run prisma:migrate
2) Seed demo org/building/admin user:
   npm run prisma:seed
3) Run tests:
   npm run test

Notes:
- Platform org creation is under `POST /api/platform/orgs`; in production it requires `PLATFORM_API_KEY` and the `x-platform-key` header.
- Platform endpoints may also be accessed with a platform superadmin JWT (permissions: `platform.org.read`, `platform.org.create`, `platform.org.admin.read`, `platform.org.admin.create`).
- Org-scoped building endpoints are under `POST /api/org/buildings` and `GET /api/org/buildings`.
- Seeding is blocked in production (`NODE_ENV=production`) to avoid accidental data changes.
- Expected results: seed creates "Towerdesk Demo Org", "Towerdesk HQ", and `admin@towerdesk.local`; tests should report all suites passing.

## Org bootstrap (Phase 2)
- Create org admin: `POST /api/platform/orgs/:orgId/admins` with body `{ name, email, password? }`.
  - If `password` is omitted, a temporary password is generated and returned.
  - New admins are created with `mustChangePassword=true`.
- Update password: `POST /api/auth/change-password` with `{ currentPassword, newPassword }` (requires `Authorization: Bearer <accessToken>`).
- Emails are globally unique (single `User.email` unique constraint).
 - Platform superadmin seed (optional):
   - `PLATFORM_SUPERADMIN_EMAIL` (default `platform-admin@towerdesk.local`)
   - `PLATFORM_SUPERADMIN_PASSWORD` (default `Admin123!`)
- List orgs: `GET /api/platform/orgs`
- List org admins (per org): `GET /api/platform/orgs/:orgId/admins`
- List org admins (all orgs): `GET /api/platform/org-admins`

Example (local):
```bash
# Create org (platform)
curl -H "x-platform-key: $PLATFORM_API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Acme Org"}' http://localhost:3000/api/platform/orgs

# Create org admin (platform)
curl -H "x-platform-key: $PLATFORM_API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Org Admin","email":"admin@acme.com"}' \
  http://localhost:3000/api/platform/orgs/<orgId>/admins

# Login with temp password, then change it
curl -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"<tempPassword>"}' \
  http://localhost:3000/api/auth/login
```

## Buildings + Units (Phase 3)
- Building detail: `GET /api/org/buildings/:buildingId`
- Create unit: `POST /api/org/buildings/:buildingId/units`
- List units: `GET /api/org/buildings/:buildingId/units`
- Availability filtering is available via `?available=true` (see Phase 4).

Example (local):
```bash
# Create a building
curl -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"Alpha Tower"}' http://localhost:3000/api/org/buildings

# Create a unit
curl -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"label":"A-101","floor":1,"notes":"Near elevator"}' \
  http://localhost:3000/api/org/buildings/<buildingId>/units
```

## Assignments + Occupancy (Phase 4)
- Assign staff/manager: `POST /api/org/buildings/:buildingId/assignments`
- List assignments: `GET /api/org/buildings/:buildingId/assignments`
- Create occupancy: `POST /api/org/buildings/:buildingId/occupancies`
- List active occupancies: `GET /api/org/buildings/:buildingId/occupancies`
- Available units: `GET /api/org/buildings/:buildingId/units?available=true`
- Resident onboarding flows will be covered in Phase 5.

Example (local):
```bash
# Assign a manager
curl -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"userId":"<userId>","type":"MANAGER"}' \
  http://localhost:3000/api/org/buildings/<buildingId>/assignments

# Create occupancy
curl -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"unitId":"<unitId>","residentUserId":"<residentUserId>"}' \
  http://localhost:3000/api/org/buildings/<buildingId>/occupancies

# List available units
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:3000/api/org/buildings/<buildingId>/units?available=true
```

## Building-scoped access (Phase 5)
- Building-scoped routes are authorized by:
  - global RBAC permission keys, OR
  - building assignment type:
    - READ: STAFF, MANAGER, BUILDING_ADMIN
    - WRITE: BUILDING_ADMIN
- Resident access is limited to resident-safe routes (e.g. `GET /api/org/buildings/:buildingId/units/basic`).

Tests (Phase 5):
```bash
npm run prisma:generate
npm run test
```
Expected: all suites pass, including `test/building-access.e2e.spec.ts`.

## Residents onboarding (Phase 5.1)
- Onboard resident: `POST /api/org/buildings/:buildingId/residents`
- List residents: `GET /api/org/buildings/:buildingId/residents`
- Manager write requires explicit global permission (`residents.write`) granted by an org admin.
- BUILDING_ADMIN assignments can still write without global permission.
- Residents created this way get `mustChangePassword=true`; when password is omitted, the API returns a temporary password.

Example (local):
```bash
# Onboard a resident (admin or manager with residents.write)
curl -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"name":"Resident One","email":"resident@acme.com","unitId":"<unitId>"}' \
  http://localhost:3000/api/org/buildings/<buildingId>/residents

# List residents for a building
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:3000/api/org/buildings/<buildingId>/residents
```

## Org users (admin-managed)
- Create org user: `POST /api/users`
  - Body: `{ name, email, password?, roleKeys? }`
  - Requires `users.write`
  - Returns temp password when password omitted
- Assign building roles: `POST /api/org/buildings/:buildingId/assignments`
  - Use `MANAGER`, `STAFF`, or `BUILDING_ADMIN`
- Tenants should be created with the residents onboarding endpoint.

## Maintenance requests (Phase 6A)
Resident flow:
- Create request: `POST /api/resident/requests`
- List own requests: `GET /api/resident/requests`
- View request: `GET /api/resident/requests/:requestId`
- Update request (OPEN only): `PATCH /api/resident/requests/:requestId`
- Cancel request: `POST /api/resident/requests/:requestId/cancel`
- Comment: `POST /api/resident/requests/:requestId/comments`
- List comments: `GET /api/resident/requests/:requestId/comments`

Ops flow (building-scoped):
- List building requests: `GET /api/org/buildings/:buildingId/requests`
- View request: `GET /api/org/buildings/:buildingId/requests/:requestId`
- Assign to staff: `POST /api/org/buildings/:buildingId/requests/:requestId/assign`
- Update status: `POST /api/org/buildings/:buildingId/requests/:requestId/status`
- Comment: `POST /api/org/buildings/:buildingId/requests/:requestId/comments`
- List comments: `GET /api/org/buildings/:buildingId/requests/:requestId/comments`

Status transitions:
- OPEN -> ASSIGNED -> IN_PROGRESS -> COMPLETED
- CANCEL sets status to CANCELED

Permissions:
- Managers can assign/update status only with explicit global keys (`requests.assign`, `requests.update_status`).
- BUILDING_ADMIN can assign/update without global keys.
- STAFF can update status only when assigned to the request.
- Org admins can comment without assignment via `requests.comment`.

## Org + User profiles (Phase 6B)
Org profile:
- Get profile: `GET /api/org/profile`
- Update profile: `PATCH /api/org/profile` (requires `org.profile.write`)

User profile:
- Update self: `PATCH /api/users/me/profile`

Cloudinary unsigned upload (frontend flow):
1) Upload file directly to Cloudinary using your unsigned preset (cloud name: `dzxeljant`).
2) Take the returned `secure_url`.
3) Send it to the backend as `logoUrl` or `avatarUrl`.

## Notifications (Phase 6C)
Endpoints:
- List notifications: `GET /api/notifications?unreadOnly=true&cursor=<id>&limit=50`
- Mark one read: `POST /api/notifications/:id/read`
- Mark all read: `POST /api/notifications/read-all`

Emitted for maintenance requests:
- REQUEST_CREATED: resident creates a request (notifies building admins/managers)
- REQUEST_ASSIGNED: request assigned (notifies resident + assigned staff)
- REQUEST_STATUS_CHANGED: status updated (notifies resident)
- REQUEST_COMMENTED: comment added (notifies the other side)
- REQUEST_CANCELED: resident cancels (notifies ops + assigned staff)

Notification `data` includes `requestId`, `buildingId`, `unitId`, `actorUserId` and optional `status`/`commentId`.

Tests (Phase 6C):
```bash
npm run prisma:generate
npm test -- test/maintenance-requests.e2e.spec.ts
npm test -- test/notifications.e2e.spec.ts
```
Expected: both suites pass.

## Scripts
- `npm run dev` - start NestJS in watch mode
- `npm run build` - build for production
- `npm run start` - start built app
- `npm run start:prod` - start built app (prod)
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - run migrations
- `npm run prisma:migrate:deploy` - apply migrations in production
- `npm run prisma:seed` - seed baseline roles/permissions
- `npm run loadtest` - basic autocannon load test
- `npm run prisma:studio` - open Prisma Studio
- `npm run lint` - lint
- `npm run test` - unit tests

## Notes
- Refresh tokens are stored hashed in the database and rotated on refresh.
- Storage and queue modules are scaffolded as placeholders and require configuration before use.
- The access control migration drops the legacy `User.role` column; assign roles via the access-control endpoints or Prisma Studio.
