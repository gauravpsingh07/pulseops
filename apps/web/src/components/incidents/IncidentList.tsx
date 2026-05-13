import type { Incident } from "../../lib/api";
import { formatDateTime } from "../../lib/formatters";
import { getIncidentStatusLabel, getIncidentStatusTone } from "../../lib/status";
import { Badge } from "../ui/Badge";

type IncidentListProps = {
  incidents: Incident[];
};

export function IncidentList({ incidents }: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-ink-500">
        No incidents recorded.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <article key={incident.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink-950">{incident.title}</h3>
              <p className="mt-2 text-sm text-ink-500">
                Started {formatDateTime(incident.started_at)}
              </p>
            </div>
            <Badge tone={getIncidentStatusTone(incident.status)}>
              {getIncidentStatusLabel(incident.status)}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-ink-500">Resolved At</dt>
              <dd className="mt-1 text-ink-950">{formatDateTime(incident.resolved_at)}</dd>
            </div>
            <div>
              <dt className="font-medium text-ink-500">Failure Reason</dt>
              <dd className="mt-1 text-ink-950">{incident.failure_reason ?? "N/A"}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
