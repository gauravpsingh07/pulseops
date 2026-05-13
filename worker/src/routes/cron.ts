import { runScheduledChecks } from "../services/monitorRunner";
import type { Env } from "../types/env";
import { errorResponse, successResponse } from "../utils/response";

const CRON_SECRET_HEADER = "x-cron-secret";

export async function handleCronRoute(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response | null> {
  if (pathname !== "/api/cron/check-monitors") {
    return null;
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
  }

  const cronSecret = request.headers.get(CRON_SECRET_HEADER);

  if (!cronSecret || cronSecret !== env.CRON_SECRET) {
    return errorResponse("UNAUTHORIZED", "Missing or invalid cron secret.", 401);
  }

  const summary = await runScheduledChecks(env);

  return successResponse(summary);
}
