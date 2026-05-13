import type { CheckRow, IncidentRow, Monitor } from "../db/queries";
import { getOpenIncidentByMonitor } from "../db/queries";
import type { Env } from "../types/env";
import { createId } from "../utils/ids";
import { sendIncidentAlert } from "./alertService";

export type IncidentTransitionResult = {
  incident: IncidentRow | null;
  created: boolean;
  resolved: boolean;
};

async function createIncident(
  env: Env,
  monitor: Monitor,
  failureReason: string | null
): Promise<IncidentRow> {
  const incidentId = createId("inc");
  const title = `${monitor.name} is down`;

  await env.DB.prepare(
    `INSERT INTO incidents (
       id,
       monitor_id,
       title,
       status,
       failure_reason
     )
     VALUES (?, ?, ?, 'open', ?)`
  )
    .bind(incidentId, monitor.id, title, failureReason)
    .run();

  const incident = await env.DB.prepare(
    `SELECT id, monitor_id, title, status, started_at, resolved_at, failure_reason, created_at, updated_at
     FROM incidents
     WHERE id = ?`
  )
    .bind(incidentId)
    .first<IncidentRow>();

  if (!incident) {
    throw new Error("Failed to load created incident.");
  }

  return incident;
}

export async function resolveIncident(env: Env, incidentId: string): Promise<IncidentRow> {
  await env.DB.prepare(
    `UPDATE incidents
     SET status = 'resolved',
         resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(incidentId)
    .run();

  const incident = await env.DB.prepare(
    `SELECT id, monitor_id, title, status, started_at, resolved_at, failure_reason, created_at, updated_at
     FROM incidents
     WHERE id = ?`
  )
    .bind(incidentId)
    .first<IncidentRow>();

  if (!incident) {
    throw new Error("Failed to load resolved incident.");
  }

  return incident;
}

async function safelySendIncidentAlert(
  env: Env,
  input: Parameters<typeof sendIncidentAlert>[1]
): Promise<void> {
  try {
    await sendIncidentAlert(env, input);
  } catch (error) {
    console.error("Incident alert failed", error);
  }
}

export async function handleFailedCheckIncident(
  env: Env,
  monitor: Monitor,
  check: CheckRow
): Promise<IncidentTransitionResult> {
  if (monitor.failure_count < 3) {
    return {
      incident: null,
      created: false,
      resolved: false
    };
  }

  const existingIncident = await getOpenIncidentByMonitor(env, monitor.id);

  if (existingIncident) {
    return {
      incident: existingIncident,
      created: false,
      resolved: false
    };
  }

  const incident = await createIncident(env, monitor, check.error_message);

  await safelySendIncidentAlert(env, {
    type: "incident_opened",
    monitor,
    incident,
    status: "down",
    failureReason: check.error_message
  });

  return {
    incident,
    created: true,
    resolved: false
  };
}

export async function handleSuccessfulCheckRecovery(
  env: Env,
  monitor: Monitor
): Promise<IncidentTransitionResult> {
  const openIncident = await getOpenIncidentByMonitor(env, monitor.id);

  if (!openIncident) {
    return {
      incident: null,
      created: false,
      resolved: false
    };
  }

  const incident = await resolveIncident(env, openIncident.id);

  await safelySendIncidentAlert(env, {
    type: "incident_resolved",
    monitor,
    incident,
    status: "operational",
    failureReason: incident.failure_reason
  });

  return {
    incident,
    created: false,
    resolved: true
  };
}
