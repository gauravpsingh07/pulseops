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
