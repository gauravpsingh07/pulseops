# Deployment Guide

This guide covers deploying PulseOps to Cloudflare Workers, Cloudflare D1, and Cloudflare Pages.

## Prerequisites

- Node.js LTS
- pnpm via Corepack
- Cloudflare account
- Wrangler authentication

Install dependencies:

```powershell
corepack enable
corepack pnpm install
```

Log in to Cloudflare:

```powershell
corepack pnpm --filter worker exec wrangler login
```

## Cloudflare D1 Creation

Create the database:

```powershell
corepack pnpm --filter worker exec wrangler d1 create pulseops-db
```

Wrangler returns a `database_id`. Add it to `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "pulseops-db"
database_id = "YOUR_DATABASE_ID"
```

## Wrangler Config

Current Worker config:

```toml
name = "pulseops-api"
main = "src/index.ts"
compatibility_date = "2026-05-13"

[[d1_databases]]
binding = "DB"
database_name = "pulseops-db"
database_id = "YOUR_DATABASE_ID"

[triggers]
crons = ["*/5 * * * *"]
```

The D1 binding name must remain `DB`, because the Worker uses `env.DB`.

## Secrets

Required Worker secrets:

- `JWT_SECRET`
- `CRON_SECRET`

Set them with Wrangler:

```powershell
corepack pnpm --filter worker exec wrangler secret put JWT_SECRET
corepack pnpm --filter worker exec wrangler secret put CRON_SECRET
```

Use long random values. Do not commit secrets.

Optional environment variable:

- `FRONTEND_ORIGIN`: deployed frontend origin for CORS, for example `https://pulseops.pages.dev`.

If `FRONTEND_ORIGIN` is not configured, the Worker allows localhost origins for development.

## D1 Remote Migration

Apply schema to the remote D1 database:

```powershell
corepack pnpm --filter worker exec wrangler d1 execute pulseops-db --remote --file=src/db/schema.sql
```

For local development:

```powershell
corepack pnpm --filter worker exec wrangler d1 execute pulseops-db --local --file=src/db/schema.sql
```

## Worker Deploy

Validate first:

```powershell
corepack pnpm --filter worker typecheck
corepack pnpm --filter worker test
```

Deploy the Worker:

```powershell
corepack pnpm --filter worker deploy
```

After deployment, note the Worker URL. It will be used by the frontend as `VITE_API_BASE_URL`.

## Cloudflare Pages Frontend Deployment

Create a Cloudflare Pages project connected to the GitHub repo.

Recommended settings:

- Framework preset: Vite
- Root directory: repository root
- Build command: `corepack pnpm --filter web build`
- Build output directory: `apps/web/dist`

Set Pages environment variables:

```text
VITE_API_BASE_URL=https://YOUR_WORKER_URL
```

If using Worker CORS with a fixed origin, set Worker `FRONTEND_ORIGIN` to the Pages URL.

## Cron Trigger Notes

`worker/wrangler.toml` includes:

```toml
[triggers]
crons = ["*/5 * * * *"]
```

The cron trigger calls the Worker's `scheduled()` handler. The scheduled handler:

1. Runs retention cleanup.
2. Loads active monitors.
3. Skips monitors that are not due.
4. Runs due checks.
5. Updates monitor status.
6. Opens or resolves incidents.
7. Sends Discord alerts when configured.

## Cron Fallback Route

For manual cron testing:

```powershell
curl.exe -X POST https://YOUR_WORKER_URL/api/cron/check-monitors `
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Local:

```powershell
curl.exe -X POST http://localhost:8787/api/cron/check-monitors `
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

The fallback route is rate limited and requires the secret header.

## GitHub Actions

CI runs on pushes and pull requests to `main`:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Deployment is not automated in the current phase.

## Free-Tier Notes

PulseOps is designed to fit small free-tier deployments:

- Static frontend on Cloudflare Pages.
- API on Cloudflare Workers.
- Relational data in Cloudflare D1.
- Scheduled checks through Cron Triggers.
- Discord webhooks for alerts.

Watch for platform limits as usage grows:

- Worker requests and CPU time.
- D1 reads and writes.
- Cron frequency.
- Monitor count and check interval.
- Discord webhook rate limits.

## Production Checklist

- Replace `YOUR_DATABASE_ID`.
- Set `JWT_SECRET`.
- Set `CRON_SECRET`.
- Apply D1 schema remotely.
- Deploy Worker.
- Deploy frontend to Pages.
- Set `VITE_API_BASE_URL`.
- Configure `FRONTEND_ORIGIN` if using strict CORS.
- Confirm public status pages load without auth.
- Confirm cron trigger appears in Cloudflare dashboard.
