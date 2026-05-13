import type { IncidentRow, Monitor } from "../db/queries";
import type { Env } from "../types/env";
import { createId } from "../utils/ids";

export type AlertType = "incident_opened" | "incident_resolved";

export type AlertLogStatus = "sent" | "failed" | "skipped";

type AlertInput = {
  type: AlertType;
  monitor: Monitor;
  incident: IncidentRow;
  status: "down" | "operational";
  failureReason?: string | null;
};

function getAlertTitle(type: AlertType): string {
  if (type === "incident_opened") {
    return "Incident opened";
  }

  return "Incident resolved";
}

function buildDiscordMessage(input: AlertInput): string {
  const lines = [
    `PulseOps - ${getAlertTitle(input.type)}`,
    `Monitor: ${input.monitor.name}`,
    `URL: ${input.monitor.url}`,
    `Status: ${input.status}`,
    `Incident: ${input.incident.title}`,
    `Timestamp: ${new Date().toISOString()}`
  ];

  if (input.failureReason) {
    lines.splice(5, 0, `Failure reason: ${input.failureReason}`);
  }

  return lines.join("\n");
}

async function writeAlertLog(
  env: Env,
  input: AlertInput,
  status: AlertLogStatus,
  errorMessage: string | null
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO alert_logs (
       id,
       monitor_id,
       incident_id,
       alert_type,
       sent_to,
       status,
       error_message
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      createId("alert"),
      input.monitor.id,
      input.incident.id,
      input.type,
      input.monitor.alert_webhook_url ? "discord_webhook" : null,
      status,
      errorMessage
    )
    .run();
}

export async function sendIncidentAlert(env: Env, input: AlertInput): Promise<void> {
  if (!input.monitor.alert_webhook_url) {
    await writeAlertLog(env, input, "skipped", "No Discord webhook configured.");
    return;
  }

  try {
    const response = await fetch(input.monitor.alert_webhook_url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: buildDiscordMessage(input)
      })
    });

    if (!response.ok) {
      await writeAlertLog(
        env,
        input,
        "failed",
        `Discord webhook returned HTTP ${response.status}.`
      );
      return;
    }

    await writeAlertLog(env, input, "sent", null);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Discord webhook request failed.";

    await writeAlertLog(env, input, "failed", errorMessage);
  }
}
