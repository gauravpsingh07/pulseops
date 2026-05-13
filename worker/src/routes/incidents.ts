import {
  getIncidentByIdForUser,
  getMonitorByIdForUser,
  listIncidentsByMonitor,
  listIncidentsForUser
} from "../db/queries";
import { authenticateRequest } from "../middleware/authMiddleware";
import { resolveIncident } from "../services/incidentService";
import type { Env } from "../types/env";
import { errorResponse, successResponse } from "../utils/response";

const monitorIncidentsPattern = /^\/api\/monitors\/([^/]+)\/incidents$/;
const resolveIncidentPattern = /^\/api\/incidents\/([^/]+)\/resolve$/;

function getPathId(pattern: RegExp, pathname: string): string | null {
  const match = pattern.exec(pathname);

  return match?.[1] ?? null;
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

async function handleMonitorIncidents(
  request: Request,
  env: Env,
  monitorId: string
): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const monitor = await getMonitorByIdForUser(env, monitorId, auth.user.id);

  if (!monitor) {
    return errorResponse("NOT_FOUND", "Monitor not found.", 404);
  }

  const incidents = await listIncidentsByMonitor(env, monitor.id);

  return successResponse({ incidents });
}

async function handleUserIncidents(request: Request, env: Env): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const incidents = await listIncidentsForUser(env, auth.user.id);

  return successResponse({ incidents });
}

async function handleResolveIncident(
  request: Request,
  env: Env,
  incidentId: string
): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const existingIncident = await getIncidentByIdForUser(env, incidentId, auth.user.id);

  if (!existingIncident) {
    return errorResponse("NOT_FOUND", "Incident not found.", 404);
  }

  if (existingIncident.status === "resolved") {
    return successResponse({ incident: existingIncident });
  }

  const incident = await resolveIncident(env, existingIncident.id);

  return successResponse({ incident });
}

export async function handleIncidentRoute(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response | null> {
  const monitorId = getPathId(monitorIncidentsPattern, pathname);

  if (monitorId) {
    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    }

    return handleMonitorIncidents(request, env, monitorId);
  }

  if (pathname === "/api/incidents") {
    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    }

    return handleUserIncidents(request, env);
  }

  const incidentId = getPathId(resolveIncidentPattern, pathname);

  if (incidentId) {
    if (request.method !== "PATCH") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    }

    return handleResolveIncident(request, env, incidentId);
  }

  return null;
}
