import { Link } from "react-router-dom";
import type { Monitor } from "../../lib/api";
import { formatDateTime, formatInterval, getHostname } from "../../lib/formatters";
import { getStatusLabel, getStatusTone } from "../../lib/status";
import { Badge } from "../ui/Badge";

type MonitorCardProps = {
  monitor: Monitor;
};

export function MonitorCard({ monitor }: MonitorCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="text-base font-semibold text-ink-950 hover:text-pulse-600" to={`/monitors/${monitor.id}`}>
            {monitor.name}
          </Link>
          <p className="mt-1 text-sm text-ink-500">
            {monitor.type === "heartbeat" ? "heartbeat monitor" : getHostname(monitor.url)}
          </p>
        </div>
        <Badge tone={getStatusTone(monitor.status)}>{getStatusLabel(monitor.status)}</Badge>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="font-medium text-ink-500">Method</dt>
          <dd className="mt-1 text-ink-950">{monitor.method}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink-500">Interval</dt>
          <dd className="mt-1 text-ink-950">{formatInterval(monitor.interval_minutes)}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink-500">Updated</dt>
          <dd className="mt-1 text-ink-950">{formatDateTime(monitor.updated_at)}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink-500">Visibility</dt>
          <dd className="mt-1 text-ink-950">{monitor.is_public ? "Public" : "Private"}</dd>
        </div>
      </dl>
    </article>
  );
}
