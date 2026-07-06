# Monitoring Logic

PulseOps uses one shared monitor runner for both manual checks and scheduled checks.

## Check Execution

Each monitor stores:

- `url`
- `method`: `GET` or `HEAD`
- `interval_minutes`: `5`, `10`, `15`, `30`, or `60`
- `timeout_ms`
- current status and counters

When a check runs, the Worker:

1. Creates an `AbortController`.
2. Sends `fetch(monitor.url)` with the configured method.
3. Reads the response body to complete the timing measurement.
4. Records the result in the `checks` table.
5. Updates monitor status and counters.
6. Passes the result into the incident service.

## Success Rules

A check is successful when the monitored endpoint returns an HTTP status from `200` through `399`.

Successful checks:

- Insert a `checks` row with `status = 'success'`.
- Store the HTTP status code.
- Store response time in milliseconds.
- Set the monitor status to `operational`.
- Reset `failure_count` to `0`.
- Increment `success_count`.
- Attempt to resolve an existing open incident.

## Failure Rules

A check fails when:

- The endpoint returns an HTTP status outside `200` through `399`.
- The request times out.
- The request throws a network error.

Failed checks:

- Insert a `checks` row with `status = 'failure'`.
- Store the HTTP status code if available.
- Store the response time if available.
- Store an error message.
- Increment `failure_count`.

Status changes:

- Failure 1: `degraded`
- Failure 2: `degraded`
- Failure 3 and later: `down`

## 3-Failure Threshold

PulseOps does not open an incident on the first failure. A monitor must reach three consecutive failures before the incident service creates an open incident.

This reduces noise from temporary network issues and short deploy blips.

## Incident Deduplication

When a monitor is down, the incident service checks for an existing open incident:

```text
failed check
 -> monitor failure_count >= 3
 -> get open incident for monitor
 -> if open incident exists, reuse it
 -> if none exists, create one
```

This prevents duplicate open incidents for the same ongoing outage.

## Recovery

On a successful check, PulseOps:

1. Marks the monitor `operational`.
2. Resets `failure_count` to `0`.
3. Looks for an open incident.
4. Resolves the open incident if one exists.
5. Writes a resolution alert log and sends Discord notification when configured.

## Alert Logging

Discord alert behavior is tracked in `alert_logs`.

Possible alert statuses:

- `sent`: Discord webhook accepted the alert.
- `failed`: webhook request failed or Discord returned a non-OK response.
- `skipped`: no Discord webhook was configured.

Alert types:

- `incident_opened`
- `incident_resolved`

The alert service catches webhook request failures and records them without crashing the monitor runner.

## Check Retention

Scheduled checks include retention cleanup:

```text
delete checks where checked_at < now - 30 days
delete rate_limits where window_start < now - 24 hours
```

The cleanup results are returned in the scheduled summary as `cleanupDeleted`
and `rateLimitRowsDeleted`.

Manual checks do not run retention cleanup.

## Manual vs Scheduled Checks

Manual checks:

- Triggered by `POST /api/monitors/:id/check`.
- Rate limited per authenticated user.
- Immediately refresh dashboard data.

Scheduled checks:

- Triggered by Cloudflare Cron through `scheduled()`.
- Skip monitors that are not due based on `interval_minutes` and latest check time.
- Continue checking other monitors if one monitor check fails.

## Metrics

Metrics are calculated from check history inside a selected time window:

- `24h`
- `7d`
- `30d`

Metrics include:

- Uptime percentage
- Average response time
- P95 response time
- Total checks
- Successful checks
- Failed checks
- Response-time series for charts

If there are no checks in the selected window, uptime and response-time values return `null`.
