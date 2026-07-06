import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ResponseTimeChart } from "../components/dashboard/ResponseTimeChart";
import { IncidentList } from "../components/incidents/IncidentList";
import { CheckHistoryTable } from "../components/monitors/CheckHistoryTable";
import { UptimeBars } from "../components/monitors/UptimeBars";
import { MonitorSettingsForm } from "../components/monitors/MonitorSettingsForm";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import type { Incident, Monitor, MonitorCheck, MonitorMetrics, UpdateMonitorPayload } from "../lib/api";
import {
  ApiError,
  getHeartbeatPingUrl,
  getMonitor,
  getMonitorMetrics,
  listMonitorChecks,
  listMonitorIncidents,
  runMonitorCheck,
  updateMonitor
} from "../lib/api";
import {
  formatDateTime,
  formatInterval,
  formatMilliseconds,
  formatPercentage,
  getHostname
} from "../lib/formatters";
import { getStatusLabel, getStatusTone } from "../lib/status";

type MetricCardProps = {
  label: string;
  value: string | number;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-ink-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink-950">{value}</p>
    </section>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default function MonitorDetailPage() {
  const { id } = useParams();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<MonitorCheck[]>([]);
  const [metrics, setMetrics] = useState<MonitorMetrics | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);

  const loadMonitorDetail = useCallback(async () => {
    if (!id) {
      setError("Monitor id is missing.");
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const [monitorResult, checksResult, metricsResult, incidentsResult] = await Promise.all([
        getMonitor(id),
        listMonitorChecks(id),
        getMonitorMetrics(id),
        listMonitorIncidents(id)
      ]);

      setMonitor(monitorResult);
      setChecks(checksResult);
      setMetrics(metricsResult);
      setIncidents(incidentsResult);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to load monitor detail."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadMonitorDetail();
  }, [loadMonitorDetail]);

  async function handleRunCheck() {
    if (!id) {
      return;
    }

    setRunningCheck(true);
    setActionError(null);
    setActionMessage(null);

    try {
      await runMonitorCheck(id);
      setActionMessage("Check completed.");
      await loadMonitorDetail();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError, "Unable to run check."));
    } finally {
      setRunningCheck(false);
    }
  }

  const handleSaveSettings = useCallback(async (payload: UpdateMonitorPayload) => {
    if (!id) {
      throw new Error("Monitor id is missing.");
    }

    setActionError(null);
    setActionMessage(null);

    const updatedMonitor = await updateMonitor(id, payload);
    setMonitor(updatedMonitor);
    await loadMonitorDetail();

    return updatedMonitor;
  }, [id, loadMonitorDetail]);

  if (loading) {
    return <LoadingState label="Loading monitor detail" />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!monitor || !metrics) {
    return <ErrorState message="Monitor detail could not be loaded." />;
  }

  const publicStatusPath = monitor.public_slug ? `/status/${monitor.public_slug}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="text-sm font-semibold text-pulse-700 hover:text-pulse-600" to="/dashboard">
            Back to dashboard
          </Link>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-semibold text-ink-950">{monitor.name}</h1>
            <Badge tone={getStatusTone(monitor.status)}>{getStatusLabel(monitor.status)}</Badge>
          </div>
          {monitor.type === "heartbeat" ? (
            <p className="mt-2 text-sm font-medium text-ink-500">
              Heartbeat monitor - expects a ping every {monitor.interval_minutes} min (+
              {monitor.heartbeat_grace_minutes} min grace)
            </p>
          ) : (
            <a
              className="mt-2 block break-all text-sm font-medium text-ink-500 hover:text-pulse-600"
              href={monitor.url}
              rel="noreferrer"
              target="_blank"
            >
              {monitor.url}
            </a>
          )}
        </div>
        {monitor.type !== "heartbeat" ? (
          <Button disabled={runningCheck} type="button" onClick={handleRunCheck}>
            {runningCheck ? "Running Check" : "Run Check"}
          </Button>
        ) : null}
      </div>

      {monitor.type === "heartbeat" && monitor.heartbeat_token ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink-950">Heartbeat ping URL</p>
          <p className="mt-1 text-xs text-slate-500">
            Call this URL from your cron job or scheduled task (GET or POST). Keep it secret -
            anyone with the URL can mark this monitor healthy.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-slate-100 px-2 py-1 text-xs text-ink-950">
              {getHeartbeatPingUrl(monitor.heartbeat_token)}
            </code>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(
                  getHeartbeatPingUrl(monitor.heartbeat_token ?? "")
                );
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}
      {actionMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Uptime" value={formatPercentage(metrics.uptime_percentage)} />
            <MetricCard
              label="Avg Response"
              value={formatMilliseconds(metrics.average_response_time_ms)}
            />
            <MetricCard label="P95 Response" value={formatMilliseconds(metrics.p95_response_time_ms)} />
            <MetricCard label="Total Checks" value={metrics.total_checks} />
          </div>

          <Card>
            <h2 className="text-lg font-semibold text-ink-950">Uptime History</h2>
            <div className="mt-5">
              <UptimeBars stats={metrics.daily_stats} />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink-950">Response Time</h2>
            <div className="mt-5">
              <ResponseTimeChart points={metrics.response_time_series} />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink-950">Recent Checks</h2>
            <div className="mt-5">
              <CheckHistoryTable checks={checks} />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink-950">Incidents</h2>
            <div className="mt-5">
              <IncidentList incidents={incidents} />
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-ink-950">Monitor Details</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-medium text-ink-500">Host</dt>
                <dd className="mt-1 text-ink-950">{getHostname(monitor.url)}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-500">Method</dt>
                <dd className="mt-1 text-ink-950">{monitor.method}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-500">Interval</dt>
                <dd className="mt-1 text-ink-950">{formatInterval(monitor.interval_minutes)}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-500">Timeout</dt>
                <dd className="mt-1 text-ink-950">{formatMilliseconds(monitor.timeout_ms)}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-500">Last Updated</dt>
                <dd className="mt-1 text-ink-950">{formatDateTime(monitor.updated_at)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <MonitorSettingsForm
              monitor={monitor}
              publicStatusPath={publicStatusPath}
              onSave={handleSaveSettings}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}
