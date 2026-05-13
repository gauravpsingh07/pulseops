import type { MonitorMetrics, PublicStatus } from "../../lib/api";
import { formatDateTime, formatMilliseconds, formatPercentage } from "../../lib/formatters";

type PublicStatusMetricsProps = {
  metrics: MonitorMetrics;
  status: PublicStatus;
};

type MetricItem = {
  label: string;
  value: string | number;
};

export function PublicStatusMetrics({ metrics, status }: PublicStatusMetricsProps) {
  const items: MetricItem[] = [
    {
      label: "Uptime",
      value: formatPercentage(status.uptime_percentage)
    },
    {
      label: "Average response",
      value: formatMilliseconds(status.average_response_time_ms)
    },
    {
      label: "Last checked",
      value: formatDateTime(status.last_checked_at)
    },
    {
      label: "Checks in window",
      value: metrics.total_checks
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <section key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-ink-500">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950">{item.value}</p>
        </section>
      ))}
    </div>
  );
}
