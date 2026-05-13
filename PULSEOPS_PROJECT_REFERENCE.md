# PulseOps Project Reference

## Project

PulseOps | Serverless Monitoring and Incident Status Platform

## Goal

PulseOps is a serverless uptime monitoring platform. Users can register, log in, create website/API monitors, manually run checks, automatically run scheduled checks, track response times, detect downtime, create incidents, send Discord alerts, and publish public status pages.

## Core Stack

- Frontend: Vite React, TypeScript, Tailwind CSS, React Router, Recharts
- Backend: Cloudflare Workers, TypeScript
- Database: Cloudflare D1
- Scheduler: Cloudflare Worker Cron Triggers
- Alerts: Discord webhooks
- Validation: Zod
- Tests: Vitest
- Package manager: pnpm workspaces
- CI: GitHub Actions

## Repository Layout

```text
apps/web
  Vite React frontend

worker
  Cloudflare Worker API
  D1 schema
  backend services
  Vitest tests

docs
  architecture, API, monitoring logic, and deployment docs

.github/workflows
  GitHub Actions CI
```

## Main User Flows

1. User registers or logs in.
2. User creates a monitor with URL, method, interval, timeout, optional public status, and optional Discord webhook.
3. User views monitors on the dashboard.
4. User opens a monitor detail page.
5. User runs a manual check.
6. Worker records check history and updates metrics.
7. Scheduled cron checks run due monitors.
8. Three consecutive failures open an incident.
9. A successful recovery resolves the incident.
10. Discord alerts are sent or logged as skipped/failed.
11. Public status pages expose safe status data for public monitors.

## Monitoring States

- `unknown`: no useful signal yet.
- `operational`: latest check succeeded.
- `degraded`: one or two consecutive failures.
- `down`: three or more consecutive failures.

## Important Backend Routes

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Monitors: `/api/monitors`, `/api/monitors/:id`
- Checks: `/api/monitors/:id/check`, `/api/monitors/:id/checks`
- Metrics: `/api/monitors/:id/metrics`
- Incidents: `/api/monitors/:id/incidents`, `/api/incidents`, `/api/incidents/:id/resolve`
- Public status: `/api/status/:slug`, `/api/status/:slug/metrics`, `/api/status/:slug/incidents`
- Cron fallback: `/api/cron/check-monitors`

## Security Notes

- Passwords are hashed.
- JWT sessions are signed with `JWT_SECRET`.
- Cron fallback requires `CRON_SECRET`.
- Secrets are not hardcoded.
- Auth, monitor creation, manual checks, and cron fallback are rate limited.
- Public status payloads avoid private fields.

## Validation and CI

Local validation:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

GitHub Actions runs the same validation on pushes and pull requests to `main`.
