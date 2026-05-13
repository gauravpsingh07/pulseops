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

    return errorResponse("NOT_FOUND", "Route not found.", 404);
  } catch (error) {
    console.error("Unhandled request error", error);

    return errorResponse("INTERNAL_SERVER_ERROR", "Something went wrong.", 500);
  }
}

export async function scheduled(
  _event: ScheduledController,
  _env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  console.log("Scheduled checks are not implemented yet.");
}

export default {
  fetch: fetchHandler,
  scheduled
} satisfies ExportedHandler<Env>;
