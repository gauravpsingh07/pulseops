import { Link } from "react-router-dom";
import type { Monitor } from "../../lib/api";
import { formatDateTime, formatInterval, getHostname } from "../../lib/formatters";
import { getStatusLabel, getStatusTone } from "../../lib/status";
import { Badge } from "../ui/Badge";

type MonitorTableProps = {
  monitors: Monitor[];
};

export function MonitorTable({ monitors }: MonitorTableProps) {
  if (monitors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-ink-500">
        No monitors yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Interval</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {monitors.map((monitor) => (
              <tr key={monitor.id}>
                <td className="px-4 py-4">
                  <Link className="font-semibold text-ink-950 hover:text-pulse-600" to={`/monitors/${monitor.id}`}>
                    {monitor.name}
                  </Link>
                  <p className="mt-1 text-xs text-ink-500">
                    {monitor.type === "heartbeat" ? "heartbeat monitor" : getHostname(monitor.url)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <Badge tone={getStatusTone(monitor.status)}>{getStatusLabel(monitor.status)}</Badge>
                </td>
                <td className="px-4 py-4 text-ink-700">{formatInterval(monitor.interval_minutes)}</td>
                <td className="px-4 py-4 text-ink-700">{monitor.is_public ? "Public" : "Private"}</td>
                <td className="px-4 py-4 text-ink-700">{formatDateTime(monitor.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {monitors.map((monitor) => (
          <article key={monitor.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link className="font-semibold text-ink-950" to={`/monitors/${monitor.id}`}>
                  {monitor.name}
                </Link>
                <p className="mt-1 text-xs text-ink-500">
                  {monitor.type === "heartbeat" ? "heartbeat monitor" : getHostname(monitor.url)}
                </p>
              </div>
              <Badge tone={getStatusTone(monitor.status)}>{getStatusLabel(monitor.status)}</Badge>
            </div>
            <p className="mt-4 text-sm text-ink-700">
              {formatInterval(monitor.interval_minutes)} - {monitor.is_public ? "Public" : "Private"}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
