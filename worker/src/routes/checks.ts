import { getMonitorByIdForUser, getRecentChecksByMonitor } from "../db/queries";
import { authenticateRequest } from "../middleware/authMiddleware";
import { runMonitorCheck } from "../services/monitorRunner";
import type { Env } from "../types/env";
import { errorResponse, successResponse } from "../utils/response";

const runCheckPattern = /^\/api\/monitors\/([^/]+)\/check$/;
const recentChecksPattern = /^\/api\/monitors\/([^/]+)\/checks$/;

function getPathMonitorId(pattern: RegExp, pathname: string): string | null {
  const match = pattern.exec(pathname);

  return match?.[1] ?? null;
}

function getLimit(searchParams: URLSearchParams): number {
  const rawLimit = Number(searchParams.get("limit") ?? "50");

  if (!Number.isInteger(rawLimit) || rawLimit < 1) {
    return 50;
  }

  return Math.min(rawLimit, 100);
}

async function requireAuth(request: Request, env: Env) {
  const auth = await authenticateRequest(request, env);

  if (!auth) {
    return {
      response: errorResponse("UNAUTHORIZED", "Missing or invalid authorization token.", 401),
      auth: null
    };
  }

  return {
    response: null,
    auth
  };
}

async function handleRunCheck(request: Request, env: Env, monitorId: string): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const monitor = await getMonitorByIdForUser(env, monitorId, auth.user.id);

  if (!monitor) {
    return errorResponse("NOT_FOUND", "Monitor not found.", 404);
  }

  if (!monitor.is_active) {
    return errorResponse("MONITOR_INACTIVE", "Monitor is inactive.", 400);
  }

  const result = await runMonitorCheck(env, monitor);

  return successResponse({
    check: result.check,
    monitor_status: result.monitor.status,
    monitor: result.monitor
  });
}

async function handleRecentChecks(
  request: Request,
  env: Env,
  monitorId: string,
  searchParams: URLSearchParams
): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const monitor = await getMonitorByIdForUser(env, monitorId, auth.user.id);

  if (!monitor) {
    return errorResponse("NOT_FOUND", "Monitor not found.", 404);
  }

  if (!monitor.is_active) {
    return errorResponse("MONITOR_INACTIVE", "Monitor is inactive.", 400);
  }

  const checks = await getRecentChecksByMonitor(env, monitor.id, getLimit(searchParams));

  return successResponse({ checks });
}

export async function handleCheckRoute(
  request: Request,
  env: Env,
  pathname: string,
  searchParams: URLSearchParams
): Promise<Response | null> {
  const runCheckMonitorId = getPathMonitorId(runCheckPattern, pathname);

  if (runCheckMonitorId) {
    if (request.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    }

    return handleRunCheck(request, env, runCheckMonitorId);
  }

  const recentChecksMonitorId = getPathMonitorId(recentChecksPattern, pathname);

  if (recentChecksMonitorId) {
    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    }

    return handleRecentChecks(request, env, recentChecksMonitorId, searchParams);
  }

  return null;
}
