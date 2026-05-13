import { handleAuthRoute } from "./routes/auth";
import { handleCheckRoute } from "./routes/checks";
import { handleCronRoute } from "./routes/cron";
import { handleIncidentRoute } from "./routes/incidents";
import { handleMonitorRoute } from "./routes/monitors";
import { handleStatusRoute } from "./routes/status";
import { runScheduledChecks } from "./services/monitorRunner";
import type { Env } from "./types/env";
import { withErrorHandling } from "./middleware/errorMiddleware";
import {
  errorResponse,
  optionsResponse,
  successResponse,
  withResponseHeaders
} from "./utils/response";

async function handleHealth(): Promise<Response> {
  return successResponse({
    status: "ok",
    service: "pulseops-api"
  });
}

async function handleDbTest(env: Env): Promise<Response> {
  const result = await env.DB.prepare("SELECT 1 as ok").first<{ ok: number }>();

  return successResponse({
    connected: result?.ok === 1,
    result
  });
}

async function fetchHandler(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return optionsResponse(request, env);
  }

  const response = await withErrorHandling(async () => {
    if (request.method === "GET" && url.pathname === "/api/health") {
      return handleHealth();
    }

    if (request.method === "GET" && url.pathname === "/api/db-test") {
      return handleDbTest(env);
    }

    const statusResponse = await handleStatusRoute(request, env, url.pathname, url.searchParams);

    if (statusResponse) {
      return statusResponse;
    }

    const cronResponse = await handleCronRoute(request, env, url.pathname);

    if (cronResponse) {
      return cronResponse;
    }

    const authResponse = await handleAuthRoute(request, env, url.pathname);

    if (authResponse) {
      return authResponse;
    }

    const checkResponse = await handleCheckRoute(request, env, url.pathname, url.searchParams);

    if (checkResponse) {
      return checkResponse;
    }

    const incidentResponse = await handleIncidentRoute(request, env, url.pathname);

    if (incidentResponse) {
      return incidentResponse;
    }

    const monitorResponse = await handleMonitorRoute(request, env, url.pathname);

    if (monitorResponse) {
      return monitorResponse;
    }

    return errorResponse("NOT_FOUND", "Route not found.", 404);
  });

  return withResponseHeaders(response, request, env);
}

export async function scheduled(
  _event: ScheduledController,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  ctx.waitUntil(
    runScheduledChecks(env)
      .then((summary) => {
        console.log("Scheduled monitor checks completed", summary);
      })
      .catch((error) => {
        console.error("Scheduled monitor checks failed", error);
      })
  );
}

export default {
  fetch: fetchHandler,
  scheduled
} satisfies ExportedHandler<Env>;
