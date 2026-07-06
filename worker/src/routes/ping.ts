import { getActiveHeartbeatMonitorByToken } from "../db/queries";
import { checkRateLimit } from "../middleware/rateLimitMiddleware";
import { recordHeartbeatPing } from "../services/monitorRunner";
import type { Env } from "../types/env";
import { errorResponse, successResponse } from "../utils/response";

const pingPattern = /^\/api\/ping\/([^/]+)$/;
const PING_RATE_LIMIT = {
  maxRequests: 60,
  route: "heartbeat:ping",
  windowSeconds: 60
};

export async function handlePingRoute(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response | null> {
  const match = pingPattern.exec(pathname);

  if (!match?.[1]) {
    return null;
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
  }

  const token = match[1];
  const rateLimitResponse = await checkRateLimit(env, {
    ...PING_RATE_LIMIT,
    identifier: token
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const monitor = await getActiveHeartbeatMonitorByToken(env, token);

  if (!monitor) {
    return errorResponse("NOT_FOUND", "Heartbeat not found.", 404);
  }

  const result = await recordHeartbeatPing(env, monitor);

  return successResponse({
    ok: true,
    monitor_status: result.monitor.status,
    incident_resolved: result.incident_resolved
  });
}
