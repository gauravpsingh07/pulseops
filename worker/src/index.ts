import { handleAuthRoute } from "./routes/auth";
import { handleCheckRoute } from "./routes/checks";
import { handleCronRoute } from "./routes/cron";
import { handleIncidentRoute } from "./routes/incidents";
import { handleMonitorRoute } from "./routes/monitors";
import { runScheduledChecks } from "./services/monitorRunner";
import type { Env } from "./types/env";
import { errorResponse, successResponse } from "./utils/response";

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

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      return handleHealth();
    }

    if (request.method === "GET" && url.pathname === "/api/db-test") {
      return handleDbTest(env);
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
  } catch (error) {
    console.error("Unhandled request error", error);

    return errorResponse("INTERNAL_SERVER_ERROR", "Something went wrong.", 500);
  }
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
