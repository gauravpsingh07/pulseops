import {
  getOpenIncidentByMonitor,
  getUserBoardSlug,
  getUserIdByBoardSlug,
  listPublicMonitorsByUser,
  setUserBoardSlug,
  type Monitor
} from "../db/queries";
import { authenticateRequest } from "../middleware/authMiddleware";
import { getDailyUptime, type DailyUptimePoint } from "../services/dailyStatsService";
import type { Env } from "../types/env";
import { createPublicSlug } from "../utils/ids";
import { errorResponse, successResponse } from "../utils/response";

const publicBoardPattern = /^\/api\/board\/([^/]+)$/;

type BoardMonitor = {
  name: string;
  hostname: string;
  status: Monitor["status"];
  public_slug: string | null;
  has_open_incident: boolean;
  daily_stats: DailyUptimePoint[];
};

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function getOverallBoardStatus(statuses: Monitor["status"][]): Monitor["status"] {
  if (statuses.includes("down")) {
    return "down";
  }

  if (statuses.includes("degraded")) {
    return "degraded";
  }

  if (statuses.includes("operational")) {
    return "operational";
  }

  return "unknown";
}

async function ensureBoardSlug(env: Env, userId: string, email: string): Promise<string> {
  const existing = await getUserBoardSlug(env, userId);

  if (existing) {
    return existing;
  }

  const base = email.split("@")[0] || "status";

  for (let attempts = 0; attempts < 8; attempts += 1) {
    const slug = createPublicSlug(base);

    if (!(await getUserIdByBoardSlug(env, slug))) {
      await setUserBoardSlug(env, userId, slug);

      return slug;
    }
  }

  const fallback = `board-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

  await setUserBoardSlug(env, userId, fallback);

  return fallback;
}

async function handlePublicBoard(env: Env, slug: string): Promise<Response> {
  const ownerId = await getUserIdByBoardSlug(env, slug);

  if (!ownerId) {
    return errorResponse("NOT_FOUND", "Status board not found.", 404);
  }

  const monitors = await listPublicMonitorsByUser(env, ownerId);
  const boardMonitors: BoardMonitor[] = await Promise.all(
    monitors.map(async (monitor) => {
      const [openIncident, dailyStats] = await Promise.all([
        getOpenIncidentByMonitor(env, monitor.id),
        getDailyUptime(env, monitor.id)
      ]);

      return {
        name: monitor.name,
        hostname: getHostname(monitor.url),
        status: monitor.status,
        public_slug: monitor.public_slug,
        has_open_incident: Boolean(openIncident),
        daily_stats: dailyStats
      };
    })
  );

  return successResponse({
    board_slug: slug,
    overall_status: getOverallBoardStatus(boardMonitors.map((monitor) => monitor.status)),
    monitors: boardMonitors
  });
}

export async function handleBoardRoute(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response | null> {
  if (pathname === "/api/board") {
    const auth = await authenticateRequest(request, env);

    if (!auth) {
      return errorResponse("UNAUTHORIZED", "Missing or invalid authorization token.", 401);
    }

    if (request.method === "GET") {
      return successResponse({ board_slug: await getUserBoardSlug(env, auth.user.id) });
    }

    if (request.method === "POST") {
      return successResponse({
        board_slug: await ensureBoardSlug(env, auth.user.id, auth.user.email)
      });
    }

    return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
  }

  const slugMatch = publicBoardPattern.exec(pathname);

  if (slugMatch?.[1]) {
    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405);
    }

    return handlePublicBoard(env, slugMatch[1]);
  }

  return null;
}
