import {
  getOpenIncidentByMonitor,
  getPublicMonitorBySlug,
  getRecentChecksByMonitor,
  listIncidentsByMonitor,
  type CheckRow,
  type IncidentRow,
  type Monitor
} from "../db/queries";
import { getMonitorMetrics, parseMetricsWindow } from "../services/metricsService";
import type { Env } from "../types/env";
import { errorResponse, successResponse } from "../utils/response";

const publicStatusPattern = /^\/api\/status\/([^/]+)$/;
const publicIncidentsPattern = /^\/api\/status\/([^/]+)\/incidents$/;
const publicMetricsPattern = /^\/api\/status\/([^/]+)\/metrics$/;

type PublicIncident = {
  id: string;
  title: string;
  status: "open" | "resolved";
  started_at: string;
  resolved_at: string | null;
  failure_reason: string | null;
};

type PublicCheck = {
  checked_at: string;
  status: "success" | "failure";
  status_code: number | null;
  response_time_ms: number | null;
};

function getSlug(pattern: RegExp, pathname: string): string | null {
  const match = pattern.exec(pathname);

  return match?.[1] ?? null;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function toPublicIncident(incident: IncidentRow): PublicIncident {
  return {
    id: incident.id,
    title: incident.title,
    status: incident.status,
    started_at: incident.started_at,
    resolved_at: incident.resolved_at,
    failure_reason: incident.failure_reason
  };
}

function toPublicCheck(check: CheckRow): PublicCheck {
  return {
    checked_at: check.checked_at,
    status: check.status,
    status_code: check.status_code,
    response_time_ms: check.response_time_ms
  };
}

async function getVisibleMonitor(env: Env, slug: string): Promise<Monitor | null> {
  return getPublicMonitorBySlug(env, slug);
}

async function handlePublicStatus(env: Env, slug: string): Promise<Response> {
  const monitor = await getVisibleMonitor(env, slug);

  if (!monitor) {
    return errorResponse("NOT_FOUND", "Status page not found.", 404);
  }

  const [metrics, recentChecks, activeIncident, incidents] = await Promise.all([
    getMonitorMetrics(env, monitor, "24h"),
    getRecentChecksByMonitor(env, monitor.id, 10),
    getOpenIncidentByMonitor(env, monitor.id),
    listIncidentsByMonitor(env, monitor.id)
  ]);
  const resolvedIncidents = incidents.filter((incident) => incident.status === "resolved");
  const latestCheck = recentChecks[0] ?? null;

  return successResponse({
    monitor: {
      name: monitor.name,
      hostname: getHostname(monitor.url),
      status: monitor.status
    },
    uptime_percentage: metrics.uptime_percentage,
    average_response_time_ms: metrics.average_response_time_ms,
    last_checked_at: latestCheck?.checked_at ?? null,
    recent_checks: recentChecks.map(toPublicCheck),
    active_incident: activeIncident ? toPublicIncident(activeIncident) : null,
    resolved_incidents: resolvedIncidents.map(toPublicIncident)
  });
}

async function handlePublicIncidents(env: Env, slug: string): Promise<Response> {
  const monitor = await getVisibleMonitor(env, slug);

  if (!monitor) {
    return errorResponse("NOT_FOUND", "Status page not found.", 404);
  }

  const incidents = await listIncidentsByMonitor(env, monitor.id);

  return successResponse({
    incidents: incidents.map(toPublicIncident)
  });
}

async function handlePublicMetrics(
  env: Env,
  slug: string,
  searchParams: URLSearchParams
): Promise<Response> {
  const monitor = await getVisibleMonitor(env, slug);

  if (!monitor) {
    return errorResponse("NOT_FOUND", "Status page not found.", 404);
  }

  const window = parseMetricsWindow(searchParams.get("window"));
  const metrics = await getMonitorMetrics(env, monitor, window);

  return successResponse(metrics);
}

export async function handleStatusRoute(
  request: Request,
  env: Env,
  pathname: string,
  searchParams: URLSearchParams
): Promise<Response | null> {
  const statusSlug = getSlug(publicStatusPattern, pathname);

  if (statusSlug) {
    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    }

    return handlePublicStatus(env, statusSlug);
  }

  const incidentsSlug = getSlug(publicIncidentsPattern, pathname);

  if (incidentsSlug) {
    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    }

    return handlePublicIncidents(env, incidentsSlug);
  }

  const metricsSlug = getSlug(publicMetricsPattern, pathname);

  if (metricsSlug) {
    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    }

    return handlePublicMetrics(env, metricsSlug, searchParams);
  }

  return null;
}
