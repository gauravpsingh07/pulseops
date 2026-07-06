import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ResponseTimeChart } from "../components/dashboard/ResponseTimeChart";
import { UptimeBars } from "../components/monitors/UptimeBars";
import { PublicIncidentHistory } from "../components/status/PublicIncidentHistory";
import { PublicStatusHeader } from "../components/status/PublicStatusHeader";
import { PublicStatusMetrics } from "../components/status/PublicStatusMetrics";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import type { MonitorMetrics, PublicIncident, PublicStatus } from "../lib/api";
import {
  ApiError,
  getPublicStatus,
  getPublicStatusMetrics,
  listPublicStatusIncidents
} from "../lib/api";

function getPublicStatusError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 404 ? "Status page not found." : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load status page.";
}

export default function PublicStatusPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState<PublicStatus | null>(null);
  const [metrics, setMetrics] = useState<MonitorMetrics | null>(null);
  const [incidents, setIncidents] = useState<PublicIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPublicStatus = useCallback(async () => {
    if (!slug) {
      setError("Status page slug is missing.");
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const [statusResult, metricsResult, incidentsResult] = await Promise.all([
        getPublicStatus(slug),
        getPublicStatusMetrics(slug),
        listPublicStatusIncidents(slug)
      ]);

      setStatus(statusResult);
      setMetrics(metricsResult);
      setIncidents(incidentsResult);
    } catch (caughtError) {
      setError(getPublicStatusError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadPublicStatus();
  }, [loadPublicStatus]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <LoadingState label="Loading status page" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState title="Status page unavailable" message={error} />
      </div>
    );
  }

  if (!status || !metrics) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState title="Status page unavailable" message="Status page data could not be loaded." />
      </div>
    );
  }

  const activeIncident =
    status.active_incident ?? incidents.find((incident) => incident.status === "open") ?? null;
  const resolvedIncidents = incidents.filter((incident) => incident.status === "resolved");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PublicStatusHeader activeIncident={activeIncident} status={status} />

      <PublicStatusMetrics metrics={metrics} status={status} />

      <Card>
        <h2 className="text-lg font-semibold text-ink-950">Uptime History</h2>
        <div className="mt-5">
          <UptimeBars stats={status.daily_stats} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-ink-950">Response Time</h2>
        <div className="mt-5">
          <ResponseTimeChart points={metrics.response_time_series} />
        </div>
      </Card>

      <PublicIncidentHistory
        activeIncident={activeIncident}
        resolvedIncidents={
          resolvedIncidents.length > 0 ? resolvedIncidents : status.resolved_incidents
        }
      />
    </div>
  );
}
