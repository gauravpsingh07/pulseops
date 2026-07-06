import type { CheckRow, IncidentRow, Monitor, MonitorRow } from "../src/db/queries";
import type { Env } from "../src/types/env";

type D1Result<T> = {
  results: T[];
};

type FakeTables = {
  alertLogs: Array<Record<string, unknown>>;
  checks: CheckRow[];
  dailyStats: Array<Record<string, unknown>>;
  incidents: IncidentRow[];
  monitors: Monitor[];
};

type PreparedStatement = {
  all<T>(): Promise<D1Result<T>>;
  bind(...values: unknown[]): PreparedStatement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
};

const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function toMonitorRow(monitor: Monitor): MonitorRow {
  return {
    ...monitor,
    is_active: monitor.is_active ? 1 : 0,
    is_public: monitor.is_public ? 1 : 0
  };
}

function toMonitor(row: MonitorRow): Monitor {
  return {
    ...row,
    is_active: row.is_active === 1,
    is_public: row.is_public === 1
  };
}

class FakePreparedStatement implements PreparedStatement {
  private values: unknown[] = [];

  constructor(
    private readonly sql: string,
    private readonly tables: FakeTables
  ) {}

  bind(...values: unknown[]): PreparedStatement {
    this.values = values;

    return this;
  }

  async all<T>(): Promise<D1Result<T>> {
    const sql = normalizeSql(this.sql);

    if (sql.includes("select response_time_ms from checks")) {
      const [monitorId, day] = this.values;

      return {
        results: this.tables.checks
          .filter(
            (check) =>
              check.monitor_id === monitorId &&
              check.checked_at.slice(0, 10) === day &&
              check.status === "success" &&
              check.response_time_ms !== null
          )
          .map((check) => ({ response_time_ms: check.response_time_ms })) as T[]
      };
    }

    if (sql.includes("from daily_stats")) {
      const [monitorId] = this.values;

      return {
        results: this.tables.dailyStats.filter(
          (row) => row.monitor_id === monitorId
        ) as T[]
      };
    }

    if (sql.includes("from checks")) {
      const monitorId = this.values[0];

      return {
        results: this.tables.checks
          .filter((check) => check.monitor_id === monitorId)
          .sort((left, right) => left.checked_at.localeCompare(right.checked_at)) as T[]
      };
    }

    throw new Error(`Unhandled fake D1 all query: ${this.sql}`);
  }

  async first<T>(): Promise<T | null> {
    const sql = normalizeSql(this.sql);

    if (sql.includes("count(*) as total_checks") && sql.includes("from checks")) {
      const [monitorId, day] = this.values;
      const dayChecks = this.tables.checks.filter(
        (check) => check.monitor_id === monitorId && check.checked_at.slice(0, 10) === day
      );
      const successful = dayChecks.filter((check) => check.status === "success");
      const responseTimes = successful
        .map((check) => check.response_time_ms)
        .filter((value): value is number => value !== null);

      return {
        total_checks: dayChecks.length,
        successful_checks: successful.length,
        avg_response_time_ms:
          responseTimes.length === 0
            ? null
            : responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
      } as T;
    }

    if (sql.includes("from monitors") && sql.includes("where id = ? and user_id = ?")) {
      const [monitorId, userId] = this.values;
      const monitor = this.tables.monitors.find(
        (candidate) =>
          candidate.id === monitorId && candidate.user_id === userId && candidate.is_active
      );

      return monitor ? (toMonitorRow(monitor) as T) : null;
    }

    if (sql.includes("from checks") && sql.includes("where id = ?")) {
      const [checkId] = this.values;

      return (this.tables.checks.find((check) => check.id === checkId) as T | undefined) ?? null;
    }

    if (sql.includes("from incidents") && sql.includes("where id = ?")) {
      const [incidentId] = this.values;

      return (
        (this.tables.incidents.find((incident) => incident.id === incidentId) as T | undefined) ??
        null
      );
    }

    if (sql.includes("from incidents") && sql.includes("where monitor_id = ? and status = 'open'")) {
      const [monitorId] = this.values;
      const incident = this.tables.incidents
        .filter((candidate) => candidate.monitor_id === monitorId && candidate.status === "open")
        .sort((left, right) => right.started_at.localeCompare(left.started_at))[0];

      return (incident as T | undefined) ?? null;
    }

    throw new Error(`Unhandled fake D1 first query: ${this.sql}`);
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const sql = normalizeSql(this.sql);

    if (sql.startsWith("insert into checks")) {
      const [id, monitorId, status, statusCode, responseTimeMs, errorMessage] = this.values;

      this.tables.checks.push({
        id: String(id),
        monitor_id: String(monitorId),
        status: status as CheckRow["status"],
        status_code: statusCode as number | null,
        response_time_ms: responseTimeMs as number | null,
        error_message: errorMessage as string | null,
        checked_at: now()
      });

      return { meta: { changes: 1 } };
    }

    if (sql.startsWith("insert into incidents")) {
      const [id, monitorId, title, failureReason] = this.values;

      this.tables.incidents.push({
        id: String(id),
        monitor_id: String(monitorId),
        title: String(title),
        status: "open",
        started_at: now(),
        resolved_at: null,
        failure_reason: failureReason as string | null,
        created_at: now(),
        updated_at: now()
      });

      return { meta: { changes: 1 } };
    }

    if (sql.startsWith("insert into daily_stats")) {
      const [id, monitorId, day, total, successful, failed, avg, p95] = this.values;
      const existing = this.tables.dailyStats.find(
        (row) => row.monitor_id === monitorId && row.day === day
      );
      const next = {
        id: existing?.id ?? id,
        monitor_id: monitorId,
        day,
        total_checks: total,
        successful_checks: successful,
        failed_checks: failed,
        avg_response_time_ms: avg,
        p95_response_time_ms: p95
      };

      if (existing) {
        Object.assign(existing, next);
      } else {
        this.tables.dailyStats.push(next);
      }

      return { meta: { changes: 1 } };
    }

    if (sql.startsWith("insert into alert_logs")) {
      this.tables.alertLogs.push({
        values: this.values
      });

      return { meta: { changes: 1 } };
    }

    if (sql.startsWith("update incidents")) {
      const [incidentId] = this.values;
      const incident = this.tables.incidents.find((candidate) => candidate.id === incidentId);

      if (incident) {
        incident.status = "resolved";
        incident.resolved_at = incident.resolved_at ?? now();
        incident.updated_at = now();
      }

      return { meta: { changes: incident ? 1 : 0 } };
    }

    if (sql.startsWith("update monitors") && sql.includes("status = 'operational'")) {
      const [monitorId, userId] = this.values;
      const monitor = this.tables.monitors.find(
        (candidate) => candidate.id === monitorId && candidate.user_id === userId
      );

      if (monitor) {
        monitor.status = "operational";
        monitor.failure_count = 0;
        monitor.success_count += 1;
        monitor.updated_at = now();
      }

      return { meta: { changes: monitor ? 1 : 0 } };
    }

    if (sql.startsWith("update monitors")) {
      const [status, failureCount, monitorId, userId] = this.values;
      const monitor = this.tables.monitors.find(
        (candidate) => candidate.id === monitorId && candidate.user_id === userId
      );

      if (monitor) {
        monitor.status = status as Monitor["status"];
        monitor.failure_count = Number(failureCount);
        monitor.updated_at = now();
      }

      return { meta: { changes: monitor ? 1 : 0 } };
    }

    throw new Error(`Unhandled fake D1 run query: ${this.sql}`);
  }
}

export function createMonitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: "mon_test",
    user_id: "user_test",
    name: "Test Monitor",
    url: "https://example.com",
    method: "GET",
    interval_minutes: 5,
    status: "unknown",
    failure_count: 0,
    success_count: 0,
    timeout_ms: 10000,
    is_active: true,
    is_public: false,
    public_slug: null,
    alert_webhook_url: null,
    created_at: now(),
    updated_at: now(),
    ...overrides
  };
}

export function createCheck(overrides: Partial<CheckRow> = {}): CheckRow {
  return {
    id: `chk_${crypto.randomUUID()}`,
    monitor_id: "mon_test",
    status: "success",
    status_code: 200,
    response_time_ms: 100,
    error_message: null,
    checked_at: now(),
    ...overrides
  };
}

export function createIncident(overrides: Partial<IncidentRow> = {}): IncidentRow {
  return {
    id: `inc_${crypto.randomUUID()}`,
    monitor_id: "mon_test",
    title: "Test Monitor is down",
    status: "open",
    started_at: now(),
    resolved_at: null,
    failure_reason: "Request failed.",
    created_at: now(),
    updated_at: now(),
    ...overrides
  };
}

export function createTestEnv(seed: Partial<FakeTables> = {}): Env & { tables: FakeTables } {
  const tables: FakeTables = {
    alertLogs: seed.alertLogs ?? [],
    checks: seed.checks ?? [],
    dailyStats: seed.dailyStats ?? [],
    incidents: seed.incidents ?? [],
    monitors: seed.monitors ?? [createMonitor()]
  };

  return {
    CRON_SECRET: "test-cron-secret",
    DB: {
      prepare(sql: string) {
        return new FakePreparedStatement(sql, tables);
      }
    } as unknown as D1Database,
    JWT_SECRET: "test-jwt-secret",
    tables
  };
}

export function readMonitor(env: Env & { tables: FakeTables }, monitorId = "mon_test"): Monitor {
  const monitor = env.tables.monitors.find((candidate) => candidate.id === monitorId);

  if (!monitor) {
    throw new Error(`Monitor ${monitorId} was not found.`);
  }

  return monitor;
}
