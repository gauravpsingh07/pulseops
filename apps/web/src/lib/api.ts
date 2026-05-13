import { getToken } from "./auth";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export type Monitor = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method: "GET" | "HEAD";
  interval_minutes: 5 | 10 | 15 | 30 | 60;
  status: "unknown" | "operational" | "degraded" | "down";
  failure_count: number;
  success_count: number;
  timeout_ms: number;
  is_active: boolean;
  is_public: boolean;
  public_slug: string | null;
  alert_webhook_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateMonitorPayload = {
  name: string;
  url: string;
  method?: "GET" | "HEAD";
  interval_minutes?: 5 | 10 | 15 | 30 | 60;
  timeout_ms?: number;
  alert_webhook_url?: string;
  is_public?: boolean;
};

export type UpdateMonitorPayload = Partial<CreateMonitorPayload>;

export type MonitorCheck = {
  id: string;
  monitor_id: string;
  status: "success" | "failure";
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
};

export type Incident = {
  id: string;
  monitor_id: string;
  title: string;
  status: "open" | "resolved";
  started_at: string;
  resolved_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type ResponseTimePoint = {
  checked_at: string;
  response_time_ms: number | null;
  status: MonitorCheck["status"];
  status_code: number | null;
};

export type PublicCheck = ResponseTimePoint;

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

export type RunMonitorCheckResult = {
  check: MonitorCheck;
  monitor_status: Monitor["status"];
  monitor: Monitor;
  incident: Incident | null;
  incident_created: boolean;
  incident_resolved: boolean;
};

export type PublicIncident = Omit<Incident, "monitor_id" | "created_at" | "updated_at">;

export type PublicStatus = {
  monitor: {
    name: string;
    hostname: string;
    status: Monitor["status"];
  };
  uptime_percentage: number | null;
  average_response_time_ms: number | null;
  last_checked_at: string | null;
  recent_checks: PublicCheck[];
  active_incident: PublicIncident | null;
  resolved_incidents: PublicIncident[];
};

const apiBaseUrl = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_BASE_URL ?? "");

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error: {
        code: "INVALID_RESPONSE",
        message: "The API returned an invalid response."
      }
    };
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach the API.";

    throw new ApiError("NETWORK_ERROR", message, 0);
  }

  const payload = await readApiResponse<T>(response);

  if (!payload.success) {
    throw new ApiError(payload.error.code, payload.error.message, response.status);
  }

  return payload.data;
}

export async function listMonitors(): Promise<Monitor[]> {
  const result = await apiRequest<{ monitors: Monitor[] }>("/api/monitors");

  return result.monitors;
}

export async function createMonitor(payload: CreateMonitorPayload): Promise<Monitor> {
  const result = await apiRequest<{ monitor: Monitor }>("/api/monitors", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return result.monitor;
}

export async function getMonitor(id: string): Promise<Monitor> {
  const result = await apiRequest<{ monitor: Monitor }>(`/api/monitors/${id}`);

  return result.monitor;
}

export async function updateMonitor(id: string, payload: UpdateMonitorPayload): Promise<Monitor> {
  const result = await apiRequest<{ monitor: Monitor }>(`/api/monitors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

  return result.monitor;
}

export async function runMonitorCheck(id: string): Promise<RunMonitorCheckResult> {
  return apiRequest<RunMonitorCheckResult>(`/api/monitors/${id}/check`, {
    method: "POST"
  });
}

export async function listMonitorChecks(id: string, limit = 50): Promise<MonitorCheck[]> {
  const result = await apiRequest<{ checks: MonitorCheck[] }>(
    `/api/monitors/${id}/checks?limit=${limit}`
  );

  return result.checks;
}

export async function getMonitorMetrics(id: string): Promise<MonitorMetrics> {
  return apiRequest<MonitorMetrics>(`/api/monitors/${id}/metrics`);
}

export async function listMonitorIncidents(id: string): Promise<Incident[]> {
  const result = await apiRequest<{ incidents: Incident[] }>(`/api/monitors/${id}/incidents`);

  return result.incidents;
}

export async function getPublicStatus(slug: string): Promise<PublicStatus> {
  return apiRequest<PublicStatus>(`/api/status/${slug}`);
}

export async function getPublicStatusMetrics(slug: string): Promise<MonitorMetrics> {
  return apiRequest<MonitorMetrics>(`/api/status/${slug}/metrics`);
}

export async function listPublicStatusIncidents(slug: string): Promise<PublicIncident[]> {
  const result = await apiRequest<{ incidents: PublicIncident[] }>(`/api/status/${slug}/incidents`);

  return result.incidents;
}
