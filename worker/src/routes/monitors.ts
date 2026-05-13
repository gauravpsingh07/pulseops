import {
  createMonitor,
  getActiveMonitorByIdForUser,
  listActiveMonitorsByUser,
  softDeleteMonitor,
  updateMonitor
} from "../db/queries";
import { authenticateRequest } from "../middleware/authMiddleware";
import { checkRateLimit } from "../middleware/rateLimitMiddleware";
import type { Env } from "../types/env";
import { errorResponse, successResponse } from "../utils/response";
import {
  createMonitorSchema,
  getValidationMessage,
  parseJsonBody,
  updateMonitorSchema
} from "../utils/validation";

const monitorDetailPattern = /^\/api\/monitors\/([^/]+)$/;
const MONITOR_CREATE_RATE_LIMIT = {
  maxRequests: 20,
  route: "monitor:create",
  windowSeconds: 60 * 60
};

function getMonitorId(pathname: string): string | null {
  const match = monitorDetailPattern.exec(pathname);

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

async function handleListMonitors(request: Request, env: Env): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const monitors = await listActiveMonitorsByUser(env, auth.user.id);

  return successResponse({ monitors });
}

async function handleCreateMonitor(request: Request, env: Env): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const rateLimitResponse = await checkRateLimit(env, {
    ...MONITOR_CREATE_RATE_LIMIT,
    identifier: auth.user.id
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body = await parseJsonBody(request);
  const result = createMonitorSchema.safeParse(body);

  if (!result.success) {
    return errorResponse("VALIDATION_ERROR", getValidationMessage(result.error), 400);
  }

  const monitor = await createMonitor(env, auth.user.id, result.data);

  return successResponse({ monitor }, 201);
}

async function handleGetMonitor(request: Request, env: Env, monitorId: string): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const monitor = await getActiveMonitorByIdForUser(env, monitorId, auth.user.id);

  if (!monitor) {
    return errorResponse("NOT_FOUND", "Monitor not found.", 404);
  }

  return successResponse({ monitor });
}

async function handleUpdateMonitor(request: Request, env: Env, monitorId: string): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const existingMonitor = await getActiveMonitorByIdForUser(env, monitorId, auth.user.id);

  if (!existingMonitor) {
    return errorResponse("NOT_FOUND", "Monitor not found.", 404);
  }

  const body = await parseJsonBody(request);
  const result = updateMonitorSchema.safeParse(body);

  if (!result.success) {
    return errorResponse("VALIDATION_ERROR", getValidationMessage(result.error), 400);
  }

  const monitor = await updateMonitor(env, existingMonitor, result.data);

  return successResponse({ monitor });
}

async function handleDeleteMonitor(request: Request, env: Env, monitorId: string): Promise<Response> {
  const { auth, response } = await requireAuth(request, env);

  if (!auth) {
    return response;
  }

  const monitor = await getActiveMonitorByIdForUser(env, monitorId, auth.user.id);

  if (!monitor) {
    return errorResponse("NOT_FOUND", "Monitor not found.", 404);
  }

  await softDeleteMonitor(env, monitor);

  return successResponse({ deleted: true });
}

export async function handleMonitorRoute(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response | null> {
  if (pathname === "/api/monitors") {
    if (request.method === "GET") {
      return handleListMonitors(request, env);
    }

    if (request.method === "POST") {
      return handleCreateMonitor(request, env);
    }

    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
  }

  const monitorId = getMonitorId(pathname);

  if (!monitorId) {
    return null;
  }

  if (request.method === "GET") {
    return handleGetMonitor(request, env, monitorId);
  }

  if (request.method === "PATCH") {
    return handleUpdateMonitor(request, env, monitorId);
  }

  if (request.method === "DELETE") {
    return handleDeleteMonitor(request, env, monitorId);
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
}
