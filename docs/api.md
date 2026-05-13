# PulseOps API Documentation

Base URL:

- Local Worker: `http://localhost:8787`
- Local Vite proxy: `http://localhost:5173/api`
- Production: deployed Cloudflare Worker URL

All responses use this envelope:

```json
{
  "success": true,
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A readable error message."
  }
}
```

Authenticated routes require:

```text
Authorization: Bearer <token>
```

## Health

### GET /api/health

Auth: none

Response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "pulseops-api"
  }
}
```

### GET /api/db-test

Auth: none

Development helper that verifies D1 connectivity.

## Auth

### POST /api/auth/register

Auth: none

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "created_at": "2026-05-13 12:00:00",
      "updated_at": "2026-05-13 12:00:00"
    }
  }
}
```

### POST /api/auth/login

Auth: none

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "created_at": "2026-05-13 12:00:00",
      "updated_at": "2026-05-13 12:00:00"
    }
  }
}
```

### GET /api/auth/me

Auth: required

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "created_at": "2026-05-13 12:00:00",
      "updated_at": "2026-05-13 12:00:00"
    }
  }
}
```

## Monitors

Monitor object:

```json
{
  "id": "mon_123",
  "user_id": "user-id",
  "name": "Example API",
  "url": "https://example.com",
  "method": "GET",
  "interval_minutes": 5,
  "status": "unknown",
  "failure_count": 0,
  "success_count": 0,
  "timeout_ms": 10000,
  "is_active": true,
  "is_public": false,
  "public_slug": null,
  "alert_webhook_url": null,
  "created_at": "2026-05-13 12:00:00",
  "updated_at": "2026-05-13 12:00:00"
}
```

### GET /api/monitors

Auth: required

Response:

```json
{
  "success": true,
  "data": {
    "monitors": []
  }
}
```

### POST /api/monitors

Auth: required

Request:

```json
{
  "name": "Example API",
  "url": "https://example.com",
  "method": "GET",
  "interval_minutes": 5,
  "timeout_ms": 10000,
  "is_public": false,
  "alert_webhook_url": "https://discord.com/api/webhooks/..."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "monitor": {
      "id": "mon_123",
      "name": "Example API",
      "url": "https://example.com",
      "method": "GET",
      "interval_minutes": 5,
      "status": "unknown"
    }
  }
}
```

### GET /api/monitors/:id

Auth: required

Returns one active monitor owned by the authenticated user.

### PATCH /api/monitors/:id

Auth: required

Request can include any editable monitor field:

```json
{
  "name": "New name",
  "url": "https://example.com/health",
  "method": "HEAD",
  "interval_minutes": 10,
  "timeout_ms": 5000,
  "is_public": true,
  "alert_webhook_url": "https://discord.com/api/webhooks/..."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "monitor": {}
  }
}
```

### DELETE /api/monitors/:id

Auth: required

Soft-deletes a monitor.

Response:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

## Checks and Metrics

### POST /api/monitors/:id/check

Auth: required

Runs one manual uptime check.

Response:

```json
{
  "success": true,
  "data": {
    "check": {
      "id": "chk_123",
      "monitor_id": "mon_123",
      "status": "success",
      "status_code": 200,
      "response_time_ms": 123,
      "error_message": null,
      "checked_at": "2026-05-13 12:00:00"
    },
    "monitor_status": "operational",
    "monitor": {},
    "incident": null,
    "incident_created": false,
    "incident_resolved": false
  }
}
```

### GET /api/monitors/:id/checks

Auth: required

Optional query:

```text
?limit=50
```

Response:

```json
{
  "success": true,
  "data": {
    "checks": []
  }
}
```

### GET /api/monitors/:id/metrics

Auth: required

Optional query:

```text
?window=24h
?window=7d
?window=30d
```

Response:

```json
{
  "success": true,
  "data": {
    "uptime_percentage": 99.5,
    "average_response_time_ms": 180,
    "p95_response_time_ms": 350,
    "total_checks": 200,
    "successful_checks": 199,
    "failed_checks": 1,
    "latest_status": "operational",
    "response_time_series": [
      {
        "checked_at": "2026-05-13 12:00:00",
        "response_time_ms": 120,
        "status": "success",
        "status_code": 200
      }
    ]
  }
}
```

## Incidents

### GET /api/monitors/:id/incidents

Auth: required

Returns incidents for one monitor.

### GET /api/incidents

Auth: required

Returns all incidents for the authenticated user.

### PATCH /api/incidents/:id/resolve

Auth: required

Manually resolves an incident.

Response:

```json
{
  "success": true,
  "data": {
    "incident": {
      "id": "inc_123",
      "monitor_id": "mon_123",
      "title": "Example API is down",
      "status": "resolved",
      "started_at": "2026-05-13 12:00:00",
      "resolved_at": "2026-05-13 12:10:00",
      "failure_reason": "Request failed."
    }
  }
}
```

## Public Status

Public status routes require no auth. They only return public-safe fields.

### GET /api/status/:slug

Auth: none

Response:

```json
{
  "success": true,
  "data": {
    "monitor": {
      "name": "Example API",
      "hostname": "example.com",
      "status": "operational"
    },
    "uptime_percentage": 100,
    "average_response_time_ms": 120,
    "last_checked_at": "2026-05-13 12:00:00",
    "recent_checks": [],
    "active_incident": null,
    "resolved_incidents": []
  }
}
```

### GET /api/status/:slug/metrics

Auth: none

Returns the same metrics shape as monitor metrics.

### GET /api/status/:slug/incidents

Auth: none

Response:

```json
{
  "success": true,
  "data": {
    "incidents": []
  }
}
```

## Cron Fallback

### POST /api/cron/check-monitors

Auth: `x-cron-secret` header

Request header:

```text
x-cron-secret: your-cron-secret
```

Response:

```json
{
  "success": true,
  "data": {
    "checked": 3,
    "skipped": 2,
    "failed": 0,
    "cleanupDeleted": 0
  }
}
```

## Rate Limits

- Auth routes: 10 requests per 10 minutes per IP.
- Monitor create: 20 requests per hour per user.
- Manual check: 10 requests per 10 minutes per user.
- Cron fallback: 10 requests per 10 minutes per IP.

Rate-limited response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later."
  }
}
```
