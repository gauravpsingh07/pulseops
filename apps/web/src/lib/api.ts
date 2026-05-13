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
