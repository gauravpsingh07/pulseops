# PulseOps Architecture

PulseOps is a serverless monitoring platform split into a static React frontend and a Cloudflare Worker API.

## High-Level Diagram

```text
User Browser
 -> Cloudflare Pages React App
 -> Cloudflare Worker API
 -> Cloudflare D1
```

## Scheduled Monitoring Diagram

```text
Cloudflare Cron Trigger
 -> scheduled()
 -> monitor runner
 -> checks table
 -> incident service
 -> Discord alert service
```

## Components

### React App

Location: `apps/web`

Responsibilities:

- Register and login flows.
- Authenticated dashboard.
- Monitor CRUD UI.
- Monitor detail page with checks, metrics, incidents, and settings.
- Public status page at `/status/:slug`.
- API client using same-origin `/api` during local Vite development.

### Cloudflare Worker API

Location: `worker`

Responsibilities:

- HTTP API routing.
- JWT auth and request validation.
- Monitor CRUD.
- Manual checks.
- Scheduled checks through `scheduled()`.
- Metrics aggregation.
- Incident lifecycle.
- Discord alert logging.
- Public status API.
- Rate limiting, CORS, security headers, and clean error responses.

### Cloudflare D1

Location: `worker/src/db/schema.sql`

Responsibilities:

- Store users, monitors, checks, incidents, alert logs, and rate limits.
- Provide relational queries for dashboard and public status APIs.

## Request Flow

Authenticated dashboard flow:

```text
Browser
 -> React Router page
 -> API client with Authorization bearer token
 -> Cloudflare Worker route
 -> D1 query or service
 -> JSON response
```

Manual check flow:

```text
Monitor Detail UI
 -> POST /api/monitors/:id/check
 -> runMonitorCheck()
 -> fetch monitored URL
 -> insert checks row
 -> update monitor status counters
 -> incident service
 -> optional Discord alert log
```

Public status flow:

```text
Public visitor
 -> /status/:slug
 -> GET /api/status/:slug
 -> GET /api/status/:slug/metrics
 -> GET /api/status/:slug/incidents
 -> public-safe response payload
```

## Security Boundary

Private authenticated APIs require `Authorization: Bearer <token>`.

Public status APIs do not require auth, but only return public-safe fields:

- Monitor name
- Hostname
- Current status
- Uptime and response-time metrics
- Active and resolved incidents
- Recent check summaries

They do not expose:

- User IDs
- Full monitor URLs
- Alert webhook URLs
- Password or auth data
