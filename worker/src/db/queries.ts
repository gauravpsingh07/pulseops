import type { Env } from "../types/env";
import { createId, createPublicSlug } from "../utils/ids";
import type { CreateMonitorInput, UpdateMonitorInput } from "../utils/validation";

export type MonitorRow = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method: "GET" | "HEAD";
  interval_minutes: 5 | 10 | 15 | 30 | 60;
  status: "unknown" | "operational" | "degraded" | "down";
  failure_count: number;
  success_count: number;
  timeout_ms: number;
  is_active: number;
  is_public: number;
  public_slug: string | null;
  alert_webhook_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Monitor = Omit<MonitorRow, "is_active" | "is_public"> & {
  is_active: boolean;
  is_public: boolean;
};

function toMonitor(row: MonitorRow): Monitor {
  return {
    ...row,
    is_active: row.is_active === 1,
    is_public: row.is_public === 1
  };
}

export async function listActiveMonitorsByUser(env: Env, userId: string): Promise<Monitor[]> {
  const result = await env.DB.prepare(
    `SELECT *
     FROM monitors
     WHERE user_id = ? AND is_active = 1
     ORDER BY created_at DESC`
  )
    .bind(userId)
    .all<MonitorRow>();

  return result.results.map(toMonitor);
}

export async function getActiveMonitorByIdForUser(
  env: Env,
  monitorId: string,
  userId: string
): Promise<Monitor | null> {
  const row = await env.DB.prepare(
    `SELECT *
     FROM monitors
     WHERE id = ? AND user_id = ? AND is_active = 1`
  )
    .bind(monitorId, userId)
    .first<MonitorRow>();

  return row ? toMonitor(row) : null;
}

async function publicSlugExists(env: Env, slug: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT id
     FROM monitors
     WHERE public_slug = ?`
  )
    .bind(slug)
    .first<{ id: string }>();

  return Boolean(row);
}

export async function createUniquePublicSlug(env: Env, name: string): Promise<string> {
  for (let attempts = 0; attempts < 8; attempts += 1) {
    const slug = createPublicSlug(name);

    if (!(await publicSlugExists(env, slug))) {
      return slug;
    }
  }

  return `monitor-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export async function createMonitor(
  env: Env,
  userId: string,
  input: CreateMonitorInput
): Promise<Monitor> {
  const monitorId = createId("mon");
  const publicSlug = input.is_public ? await createUniquePublicSlug(env, input.name) : null;

  await env.DB.prepare(
    `INSERT INTO monitors (
       id,
       user_id,
       name,
       url,
       method,
       interval_minutes,
       timeout_ms,
       is_public,
       public_slug,
       alert_webhook_url
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      monitorId,
      userId,
      input.name,
      input.url,
      input.method,
      input.interval_minutes,
      input.timeout_ms,
      input.is_public ? 1 : 0,
      publicSlug,
      input.alert_webhook_url ?? null
    )
    .run();

  const monitor = await getActiveMonitorByIdForUser(env, monitorId, userId);

  if (!monitor) {
    throw new Error("Failed to load created monitor.");
  }

  return monitor;
}

export async function updateMonitor(
  env: Env,
  existingMonitor: Monitor,
  input: UpdateMonitorInput
): Promise<Monitor> {
  const updates: string[] = [];
  const values: unknown[] = [];

  function setColumn(column: string, value: unknown): void {
    updates.push(`${column} = ?`);
    values.push(value);
  }

  if (input.name !== undefined) {
    setColumn("name", input.name);
  }

  if (input.url !== undefined) {
    setColumn("url", input.url);
  }

  if (input.method !== undefined) {
    setColumn("method", input.method);
  }

  if (input.interval_minutes !== undefined) {
    setColumn("interval_minutes", input.interval_minutes);
  }

  if (input.timeout_ms !== undefined) {
    setColumn("timeout_ms", input.timeout_ms);
  }

  if (input.alert_webhook_url !== undefined) {
    setColumn("alert_webhook_url", input.alert_webhook_url ?? null);
  }

  if (input.is_public !== undefined) {
    setColumn("is_public", input.is_public ? 1 : 0);

    if (input.is_public && !existingMonitor.public_slug) {
      const slugName = input.name ?? existingMonitor.name;
      setColumn("public_slug", await createUniquePublicSlug(env, slugName));
    }
  }

  if (updates.length === 0) {
    return existingMonitor;
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");

  await env.DB.prepare(
    `UPDATE monitors
     SET ${updates.join(", ")}
     WHERE id = ? AND user_id = ? AND is_active = 1`
  )
    .bind(...values, existingMonitor.id, existingMonitor.user_id)
    .run();

  const updatedMonitor = await getActiveMonitorByIdForUser(env, existingMonitor.id, existingMonitor.user_id);

  if (!updatedMonitor) {
    throw new Error("Failed to load updated monitor.");
  }

  return updatedMonitor;
}

export async function softDeleteMonitor(env: Env, monitor: Monitor): Promise<void> {
  await env.DB.prepare(
    `UPDATE monitors
     SET is_active = 0, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ? AND is_active = 1`
  )
    .bind(monitor.id, monitor.user_id)
    .run();
}
