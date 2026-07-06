import type { Env } from "../types/env";
import { createId } from "../utils/ids";
import { getP95 } from "./metricsService";

export type DailyUptimePoint = {
  day: string;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  avg_response_time_ms: number | null;
  p95_response_time_ms: number | null;
  uptime_percentage: number | null;
};

type DailyStatRow = Omit<DailyUptimePoint, "uptime_percentage">;

export function toDayUtc(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export function computeUptimePercentage(totalChecks: number, successfulChecks: number): number | null {
  if (totalChecks <= 0) {
    return null;
  }

  return Math.round((successfulChecks / totalChecks) * 10000) / 100;
}

export async function upsertDailyStats(env: Env, monitorId: string, day: string): Promise<void> {
  const aggregate = await env.DB.prepare(
    `SELECT COUNT(*) AS total_checks,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful_checks,
            AVG(CASE WHEN status = 'success' THEN response_time_ms END) AS avg_response_time_ms
     FROM checks
     WHERE monitor_id = ? AND date(checked_at) = ?`
  )
    .bind(monitorId, day)
    .first<{
      total_checks: number;
      successful_checks: number | null;
      avg_response_time_ms: number | null;
    }>();

  if (!aggregate || aggregate.total_checks === 0) {
    return;
  }

  const responseTimes = await env.DB.prepare(
    `SELECT response_time_ms
     FROM checks
     WHERE monitor_id = ? AND date(checked_at) = ?
       AND status = 'success' AND response_time_ms IS NOT NULL`
  )
    .bind(monitorId, day)
    .all<{ response_time_ms: number }>();

  const successfulChecks = aggregate.successful_checks ?? 0;
  const p95 = getP95(responseTimes.results.map((row) => row.response_time_ms));
  const average =
    aggregate.avg_response_time_ms === null
      ? null
      : Math.round(aggregate.avg_response_time_ms * 100) / 100;

  await env.DB.prepare(
    `INSERT INTO daily_stats (
       id, monitor_id, day, total_checks, successful_checks, failed_checks,
       avg_response_time_ms, p95_response_time_ms
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(monitor_id, day) DO UPDATE SET
       total_checks = excluded.total_checks,
       successful_checks = excluded.successful_checks,
       failed_checks = excluded.failed_checks,
       avg_response_time_ms = excluded.avg_response_time_ms,
       p95_response_time_ms = excluded.p95_response_time_ms,
       updated_at = CURRENT_TIMESTAMP`
  )
    .bind(
      createId("day"),
      monitorId,
      day,
      aggregate.total_checks,
      successfulChecks,
      aggregate.total_checks - successfulChecks,
      average,
      p95
    )
    .run();
}

export async function getDailyUptime(
  env: Env,
  monitorId: string,
  days = 90
): Promise<DailyUptimePoint[]> {
  const result = await env.DB.prepare(
    `SELECT day, total_checks, successful_checks, failed_checks,
            avg_response_time_ms, p95_response_time_ms
     FROM daily_stats
     WHERE monitor_id = ? AND day >= date('now', ?)
     ORDER BY day ASC`
  )
    .bind(monitorId, `-${days - 1} days`)
    .all<DailyStatRow>();

  return result.results.map((row) => ({
    ...row,
    uptime_percentage: computeUptimePercentage(row.total_checks, row.successful_checks)
  }));
}

export async function deleteDailyStatsOlderThan(env: Env, retentionDays: number): Promise<number> {
  const result = await env.DB.prepare(
    `DELETE FROM daily_stats
     WHERE day < date('now', ?)`
  )
    .bind(`-${retentionDays} days`)
    .run();

  return result.meta.changes ?? 0;
}
