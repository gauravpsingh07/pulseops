export type MonitorStatus = "unknown" | "operational" | "degraded" | "down";
export type CheckStatus = "success" | "failure";
export type IncidentStatus = "open" | "resolved";

export function getStatusLabel(status: MonitorStatus): string {
  const labels: Record<MonitorStatus, string> = {
    unknown: "Unknown",
    operational: "Operational",
    degraded: "Degraded",
    down: "Down"
  };

  return labels[status];
}

export function getStatusTone(status: MonitorStatus): "neutral" | "success" | "warning" | "danger" {
  const tones: Record<MonitorStatus, "neutral" | "success" | "warning" | "danger"> = {
    unknown: "neutral",
    operational: "success",
    degraded: "warning",
    down: "danger"
  };

  return tones[status];
}

export function getCheckStatusLabel(status: CheckStatus): string {
  return status === "success" ? "Success" : "Failure";
}

export function getCheckStatusTone(status: CheckStatus): "success" | "danger" {
  return status === "success" ? "success" : "danger";
}

export function getIncidentStatusLabel(status: IncidentStatus): string {
  return status === "open" ? "Open" : "Resolved";
}

export function getIncidentStatusTone(status: IncidentStatus): "danger" | "success" {
  return status === "open" ? "danger" : "success";
}

export function summarizeStatuses(monitors: Array<{ status: MonitorStatus }>) {
  return monitors.reduce(
    (summary, monitor) => {
      summary.total += 1;
      summary[monitor.status] += 1;

      return summary;
    },
    {
      total: 0,
      operational: 0,
      degraded: 0,
      down: 0,
      unknown: 0
    }
  );
}
