import type { Env } from "../types/env";
import { errorResponse } from "../utils/response";

type RateLimitOptions = {
  identifier: string;
  maxRequests: number;
  route: string;
  windowSeconds: number;
};

const rateLimitedResponse = () =>
  errorResponse("RATE_LIMITED", "Too many requests. Please try again later.", 429);

function getWindowStart(now: Date, windowSeconds: number): Date {
  return new Date(now.getTime() - windowSeconds * 1000);
}

export function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}

export async function checkRateLimit(
  env: Env,
  options: RateLimitOptions
): Promise<Response | null> {
  const now = new Date();
  const windowStart = getWindowStart(now, options.windowSeconds);
  const existing = await env.DB.prepare(
    `SELECT id, request_count, window_start
     FROM rate_limits
     WHERE identifier = ? AND route = ?
     ORDER BY window_start DESC
     LIMIT 1`
  )
    .bind(options.identifier, options.route)
    .first<{ id: string; request_count: number; window_start: string }>();

  if (!existing || Date.parse(existing.window_start) < windowStart.getTime()) {
    await env.DB.prepare(
      `INSERT INTO rate_limits (id, identifier, route, request_count, window_start)
       VALUES (?, ?, ?, 1, ?)`
    )
      .bind(crypto.randomUUID(), options.identifier, options.route, now.toISOString())
      .run();

    return null;
  }

  if (existing.request_count >= options.maxRequests) {
    return rateLimitedResponse();
  }

  await env.DB.prepare(
    `UPDATE rate_limits
     SET request_count = request_count + 1
     WHERE id = ?`
  )
    .bind(existing.id)
    .run();

  return null;
}
