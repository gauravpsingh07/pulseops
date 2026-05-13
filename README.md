# PulseOps

Serverless Monitoring and Incident Status Platform

PulseOps is a portfolio-grade uptime monitoring platform built with React, TypeScript, Cloudflare Workers, Cloudflare D1, Worker Cron Triggers, and Discord webhooks. It lets users create monitors, run checks manually or on a schedule, track latency, automate incidents, and publish public status pages.

## 1. Overview

PulseOps monitors websites and APIs from a Cloudflare Worker. Authenticated users can manage monitors, inspect uptime metrics, view recent check history, configure Discord alerts, and expose a public status page for selected services.

## 2. Problem

Small projects and portfolio apps often need visibility into uptime but do not need expensive infrastructure. Typical monitoring tools can be overkill, while basic cron pings do not provide incident history, alert deduplication, response-time metrics, or public status communication.

## 3. Solution

PulseOps provides a lightweight monitoring system on a free-tier-friendly serverless architecture:

- Cloudflare Workers run the API and monitoring engine.
- Cloudflare D1 stores users, monitors, checks, incidents, alert logs, and rate limits.
- Cloudflare Cron Triggers schedule checks.
- Discord webhooks notify teams when incidents open or resolve.
- Cloudflare Pages can host the React dashboard and public status pages.

## 4. Features

- Email/password authentication with hashed passwords and JWT sessions.
- Monitor CRUD for website and API endpoints.
- Manual uptime checks from the dashboard.
- Scheduled checks through Cloudflare Cron Triggers.
- Response-time tracking and metrics cards.
- Recharts response-time charts.
- Incident automation with a 3-failure outage threshold.
- Incident deduplication and automatic recovery resolution.
- Discord webhook alerts and alert log persistence.
- Public status pages for selected monitors.
- D1-backed rate limiting for auth, monitor creation, manual checks, and cron fallback.
- CORS, security headers, Zod validation, and clean error responses.
- GitHub Actions CI for install, lint, typecheck, tests, and build.

## 5. Architecture

```text
User Browser
 -> Cloudflare Pages React App
 -> Cloudflare Worker API
 -> Cloudflare D1
```

Scheduled monitoring flow:

```text
Cloudflare Cron Trigger
 -> scheduled()
 -> monitor runner
 -> checks table
 -> incident service
 -> Discord alert service
```

See [docs/architecture.md](docs/architecture.md) for more detail.

## 6. Tech Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, React Router, Recharts
- Backend: Cloudflare Workers, TypeScript
- Database: Cloudflare D1
- Scheduler: Cloudflare Worker Cron Triggers
- Alerts: Discord webhooks
- Validation: Zod
- Tests: Vitest
- Package manager: pnpm workspaces
- CI: GitHub Actions

## 7. System Design

PulseOps separates the system into a React web app and a Worker API:

- `apps/web`: authenticated dashboard, monitor detail pages, and public status UI.
- `worker`: API routes, auth, D1 queries, monitor runner, incident logic, alerts, rate limiting, and cron entrypoint.
- `worker/src/db/schema.sql`: D1 schema.
- `.github/workflows/ci.yml`: CI workflow.

The frontend uses a Vite dev proxy for local `/api` calls. In production, set `VITE_API_BASE_URL` to the deployed Worker URL if the frontend and API are on different origins.

## 8. Database Schema

Main D1 tables:

- `users`: account records and password hashes.
- `monitors`: endpoint configuration, current status, counters, public slug, and optional alert webhook.
- `checks`: individual check results with status code, response time, error, and timestamp.
- `incidents`: open and resolved outage records.
- `alert_logs`: Discord alert delivery attempts, skipped alerts, and failures.
- `rate_limits`: D1-backed rate-limit counters.

Schema source: [worker/src/db/schema.sql](worker/src/db/schema.sql)

## 9. API Documentation

See [docs/api.md](docs/api.md).

Route groups:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/monitors`
- `POST /api/monitors`
- `GET /api/monitors/:id`
- `PATCH /api/monitors/:id`
- `DELETE /api/monitors/:id`
- `POST /api/monitors/:id/check`
- `GET /api/monitors/:id/checks`
- `GET /api/monitors/:id/metrics`
- `GET /api/monitors/:id/incidents`
- `GET /api/incidents`
- `PATCH /api/incidents/:id/resolve`
- `GET /api/status/:slug`
- `GET /api/status/:slug/metrics`
- `GET /api/status/:slug/incidents`
- `POST /api/cron/check-monitors`

## 10. Monitoring Logic

See [docs/monitoring-logic.md](docs/monitoring-logic.md).

Summary:

- HTTP `2xx` and `3xx` responses count as success.
- Other HTTP responses, network errors, and timeouts count as failure.
- A successful check marks the monitor `operational`, resets `failure_count`, and increments `success_count`.
- Failed checks increment `failure_count`.
- Failures 1 and 2 mark the monitor `degraded`.
- Failure 3 and later mark the monitor `down`.
- The first down transition opens one incident.
- Duplicate open incidents are not created.
- Recovery resolves the open incident and can send a Discord resolution alert.
- Scheduled check retention deletes checks older than 30 days.

## 11. Local Development

Install dependencies:

```powershell
corepack enable
corepack pnpm install
```

Create local Worker secrets:

```powershell
Copy-Item .env.example worker/.dev.vars
```

Edit `worker/.dev.vars`:

```text
JWT_SECRET=replace-with-long-random-secret
CRON_SECRET=replace-with-long-random-secret
```

Apply the D1 schema locally:

```powershell
corepack pnpm --filter worker exec wrangler d1 execute pulseops-db --local --file=src/db/schema.sql
```

Run the Worker:

```powershell
corepack pnpm --filter worker dev -- --port 8787
```

Run the web app:

```powershell
corepack pnpm dev:web
```

Open the Vite URL, usually `http://localhost:5173`.

## 12. Cloudflare D1 Setup

Create a D1 database:

```powershell
corepack pnpm --filter worker exec wrangler d1 create pulseops-db
```

Copy the returned `database_id` into `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "pulseops-db"
database_id = "YOUR_DATABASE_ID"
```

Apply the schema locally or remotely:

```powershell
corepack pnpm --filter worker exec wrangler d1 execute pulseops-db --local --file=src/db/schema.sql
corepack pnpm --filter worker exec wrangler d1 execute pulseops-db --remote --file=src/db/schema.sql
```

## 13. Worker Deployment

Set Worker secrets:

```powershell
corepack pnpm --filter worker exec wrangler secret put JWT_SECRET
corepack pnpm --filter worker exec wrangler secret put CRON_SECRET
```

Deploy:

```powershell
corepack pnpm --filter worker deploy
```

## 14. Frontend Deployment

Deploy `apps/web` to Cloudflare Pages.

Recommended Pages settings:

- Build command: `corepack pnpm --filter web build`
- Build output directory: `apps/web/dist`
- Root directory: repository root
- Environment variable: `VITE_API_BASE_URL=https://YOUR_WORKER_URL`

If the frontend and Worker are on different origins, keep Worker CORS configured with the deployed frontend origin.

## 15. Cron Trigger Setup

`worker/wrangler.toml` includes:

```toml
[triggers]
crons = ["*/5 * * * *"]
```

Cloudflare invokes the Worker's `scheduled()` handler. For local fallback testing:

```powershell
curl.exe -X POST http://localhost:8787/api/cron/check-monitors -H "x-cron-secret: YOUR_CRON_SECRET"
```

## 16. Free-Tier Notes

PulseOps is designed for a free-tier-friendly architecture:

- Cloudflare Workers host the API without a separate Node server.
- Cloudflare D1 stores relational data.
- Cloudflare Pages can host the static React app.
- Cron Triggers run scheduled checks.
- Discord webhooks provide alerting without a paid notification provider.

Production usage should still consider Worker invocation limits, D1 read/write limits, Cron frequency, and check volume.

## 17. Security Notes

- Passwords are hashed with PBKDF2-SHA256.
- JWTs are signed with `JWT_SECRET`.
- Secrets are never hardcoded.
- Zod validates request bodies.
- D1-backed rate limits protect auth, monitor creation, manual checks, and cron fallback.
- CORS allows configured frontend origin or localhost development origins.
- Security headers include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and restrictive `Permissions-Policy`.
- Public status routes intentionally omit user IDs, webhook URLs, and private monitor fields.

## 18. Testing

Run the full local validation path:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Backend service tests use Vitest and mocked D1/fetch behavior. They do not require a Cloudflare account or a Discord webhook.

## 19. Screenshots Placeholder

Add screenshots before publishing:

- Dashboard monitor list
- Monitor detail page with response-time chart
- Public status page
- Incident state

Recommended folder: `docs/screenshots/`

## 20. Future Improvements

- Multi-region checks.
- Team accounts and role-based access.
- Email or Slack alerts.
- Monitor tags and filtering.
- Custom status page branding.
- Status page custom domains.
- More granular uptime windows.
- Frontend component tests.
- Cloudflare analytics integration.

## 21. Resume Bullets

PulseOps | React, TypeScript, Cloudflare Workers, D1, Discord Webhooks

- Engineered a serverless monitoring platform with Cloudflare Workers, D1, and TypeScript, supporting scheduled uptime checks, latency tracking, incident automation, webhook alerts, and public status pages.
- Implemented reliability workflows including 3-failure outage detection, automatic incident resolution, alert deduplication, rate limiting, input validation, and check-history retention.
- Built a React + Tailwind dashboard with uptime metrics and response-time charts, deployed through Cloudflare Pages with GitHub Actions CI/CD on a free-tier cloud architecture.
