import type { CheckRow, Monitor } from "../db/queries";
import type { Env } from "../types/env";

export type MetricsWindow = "24h" | "7d" | "30d";

export type ResponseTimePoint = {
  checked_at: string;
  response_time_ms: number | null;
  status: "success" | "failure";
  status_code: number | null;
};

export type MonitorMetrics = {
  uptime_percentage: number | null;
  average_response_time_ms: number | null;
  p95_response_time_ms: number | null;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  latest_status: Monitor["status"];
  response_time_series: ResponseTimePoint[];
};

const windowModifiers: Record<MetricsWindow, string> = {
  "24h": "-24 hours",
  "7d": "-7 days",
  "30d": "-30 days"
};

export function parseMetricsWindow(value: string | null): MetricsWindow {
  if (value === "7d" || value === "30d") {
    return value;
  }

  return "24h";
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function getAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return roundMetric(total / values.length);
}

export function getP95(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const index = Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * 0.95) - 1);

  return sortedValues[index];
}

async function getChecksForWindow(
  env: Env,
  monitorId: string,
  window: MetricsWindow
): Promise<CheckRow[]> {
  const result = await env.DB.prepare(
    `SELECT id, monitor_id, status, status_code, response_time_ms, error_message, checked_at
     FROM checks
     WHERE monitor_id = ? AND checked_at >= datetime('now', ?)
     ORDER BY checked_at ASC`
  )
    .bind(monitorId, windowModifiers[window])
    .all<CheckRow>();

  return result.results;
}

export async function getMonitorMetrics(
  env: Env,
  monitor: Monitor,
  window: MetricsWindow
): Promise<MonitorMetrics> {
  const checks = await getChecksForWindow(env, monitor.id, window);
  const totalChecks = checks.length;
  const successfulChecks = checks.filter((check) => check.status === "success").length;
  const failedChecks = checks.filter((check) => check.status === "failure").length;
  const successfulResponseTimes = checks
    .filter((check) => check.status === "success" && check.response_time_ms !== null)
    .map((check) => check.response_time_ms as number);

  return {
    // Null means there is not enough check history in the selected window.
    uptime_percentage:
      totalChecks === 0 ? null : roundMetric((successfulChecks / totalChecks) * 100),
    average_response_time_ms: getAverage(successfulResponseTimes),
    p95_response_time_ms: getP95(successfulResponseTimes),
    total_checks: totalChecks,
    successful_checks: successfulChecks,
    failed_checks: failedChecks,
    latest_status: monitor.status,
    response_time_series: checks.map((check) => ({
      checked_at: check.checked_at,
      response_time_ms: check.response_time_ms,
      status: check.status,
      status_code: check.status_code
    }))
  };
}
