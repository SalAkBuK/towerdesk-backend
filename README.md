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
