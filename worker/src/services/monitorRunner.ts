import type { IncidentRow, Monitor, ScheduledMonitor } from "../db/queries";
import {
  deleteChecksOlderThan,
  deleteRateLimitsOlderThan,
  getActiveMonitorByIdForUser,
  listActiveMonitorsForScheduling,
  type CheckRow
} from "../db/queries";
import type { Env } from "../types/env";
import { createId } from "../utils/ids";
import { elapsedMs, nowTimestampMs } from "../utils/time";
import { deleteDailyStatsOlderThan, toDayUtc, upsertDailyStats } from "./dailyStatsService";
import {
  handleFailedCheckIncident,
  handleSuccessfulCheckRecovery
} from "./incidentService";

export type MonitorCheckResult = {
  check: CheckRow;
  monitor: Monitor;
  incident: IncidentRow | null;
  incident_created: boolean;
  incident_resolved: boolean;
};

export type ScheduledChecksSummary = {
  checked: number;
  skipped: number;
  failed: number;
  cleanupDeleted: number;
  rateLimitRowsDeleted: number;
};

type RawCheckResult = {
  status: "success" | "failure";
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
};

const CHECK_RETENTION_DAYS = 30;
const DAILY_STATS_RETENTION_DAYS = 90;
const RATE_LIMIT_RETENTION_HOURS = 24;
const SCHEDULED_DUE_GRACE_MS = 60 * 1000;

function parseSqliteTimestamp(timestamp: string): number {
  const parsed = Date.parse(`${timestamp.replace(" ", "T")}Z`);

  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isMonitorDue(monitor: ScheduledMonitor, nowMs: number): boolean {
  if (!monitor.last_checked_at) {
    return true;
  }

  const lastCheckedAtMs = parseSqliteTimestamp(monitor.last_checked_at);

  if (lastCheckedAtMs === 0) {
    return true;
  }

  const dueAtMs = lastCheckedAtMs + monitor.interval_minutes * 60 * 1000;

  return nowMs >= dueAtMs - SCHEDULED_DUE_GRACE_MS;
}

function getFetchErrorMessage(error: unknown, timeoutMs: number): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return `Request timed out after ${timeoutMs}ms.`;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Request failed.";
}

async function executeFetchCheck(monitor: Monitor): Promise<RawCheckResult> {
  const controller = new AbortController();
  const timeoutMs = monitor.timeout_ms || 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = nowTimestampMs();

  try {
    const response = await fetch(monitor.url, {
      method: monitor.method,
      signal: controller.signal
    });

    await response.arrayBuffer();

    const responseTimeMs = elapsedMs(startedAt);

    if (response.status >= 200 && response.status <= 399) {
      return {
        status: "success",
        status_code: response.status,
        response_time_ms: responseTimeMs,
        error_message: null
      };
    }

    return {
      status: "failure",
      status_code: response.status,
      response_time_ms: responseTimeMs,
      error_message: `Received HTTP ${response.status}.`
    };
  } catch (error) {
    return {
      status: "failure",
      status_code: null,
      response_time_ms: elapsedMs(startedAt),
      error_message: getFetchErrorMessage(error, timeoutMs)
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function insertCheck(
  env: Env,
  monitorId: string,
  result: RawCheckResult
): Promise<CheckRow> {
  const checkId = createId("chk");

  await env.DB.prepare(
    `INSERT INTO checks (
       id,
       monitor_id,
       status,
       status_code,
       response_time_ms,
       error_message
     )
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      checkId,
      monitorId,
      result.status,
      result.status_code,
      result.response_time_ms,
      result.error_message
    )
    .run();

  const check = await env.DB.prepare(
    `SELECT id, monitor_id, status, status_code, response_time_ms, error_message, checked_at
     FROM checks
     WHERE id = ?`
  )
    .bind(checkId)
    .first<CheckRow>();

  if (!check) {
    throw new Error("Failed to load created check.");
  }

  return check;
}

async function updateMonitorAfterCheck(
  env: Env,
  monitor: Monitor,
  status: "success" | "failure"
): Promise<Monitor> {
  if (status === "success") {
    await env.DB.prepare(
      `UPDATE monitors
       SET status = 'operational',
           failure_count = 0,
           success_count = success_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
      .bind(monitor.id, monitor.user_id)
      .run();
  } else {
    const nextFailureCount = monitor.failure_count + 1;
    const nextStatus = nextFailureCount >= 3 ? "down" : "degraded";

    await env.DB.prepare(
      `UPDATE monitors
       SET status = ?,
           failure_count = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
      .bind(nextStatus, nextFailureCount, monitor.id, monitor.user_id)
      .run();
  }

  const updatedMonitor = await getActiveMonitorByIdForUser(env, monitor.id, monitor.user_id);

  if (!updatedMonitor) {
    throw new Error("Failed to load updated monitor.");
  }

  return updatedMonitor;
}

export async function runMonitorCheck(env: Env, monitor: Monitor): Promise<MonitorCheckResult> {
  const result = await executeFetchCheck(monitor);
  const check = await insertCheck(env, monitor.id, result);
  const updatedMonitor = await updateMonitorAfterCheck(env, monitor, result.status);

  try {
    await upsertDailyStats(env, monitor.id, toDayUtc(check.checked_at));
  } catch (error) {
    console.error(`Daily stats update failed for monitor ${monitor.id}`, error);
  }

  const incidentTransition =
    result.status === "success"
      ? await handleSuccessfulCheckRecovery(env, updatedMonitor)
      : await handleFailedCheckIncident(env, updatedMonitor, check);

  return {
    check,
    monitor: updatedMonitor,
    incident: incidentTransition.incident,
    incident_created: incidentTransition.created,
    incident_resolved: incidentTransition.resolved
  };
}

export async function runScheduledChecks(env: Env): Promise<ScheduledChecksSummary> {
  const summary: ScheduledChecksSummary = {
    checked: 0,
    skipped: 0,
    failed: 0,
    cleanupDeleted: 0,
    rateLimitRowsDeleted: 0
  };
  const nowMs = Date.now();

  try {
    summary.cleanupDeleted = await deleteChecksOlderThan(env, CHECK_RETENTION_DAYS);
  } catch (error) {
    console.error("Scheduled check retention cleanup failed", error);
  }

  try {
    summary.rateLimitRowsDeleted = await deleteRateLimitsOlderThan(env, RATE_LIMIT_RETENTION_HOURS);
  } catch (error) {
    console.error("Scheduled rate-limit cleanup failed", error);
  }

  try {
    await deleteDailyStatsOlderThan(env, DAILY_STATS_RETENTION_DAYS);
  } catch (error) {
    console.error("Scheduled daily-stats cleanup failed", error);
  }

  const monitors = await listActiveMonitorsForScheduling(env);

  for (const monitor of monitors) {
    if (!isMonitorDue(monitor, nowMs)) {
      summary.skipped += 1;
      continue;
    }

    summary.checked += 1;

    try {
      const result = await runMonitorCheck(env, monitor);

      if (result.check.status === "failure") {
        summary.failed += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`Scheduled check failed for monitor ${monitor.id}`, error);
    }
  }

  return summary;
}
