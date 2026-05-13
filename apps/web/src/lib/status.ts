export type MonitorStatus = "unknown" | "operational" | "degraded" | "down";

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
