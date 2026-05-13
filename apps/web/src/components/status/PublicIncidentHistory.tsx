import type { PublicIncident } from "../../lib/api";
import { formatDateTime } from "../../lib/formatters";
import { getIncidentStatusLabel, getIncidentStatusTone } from "../../lib/status";
import { Badge } from "../ui/Badge";

type PublicIncidentHistoryProps = {
  activeIncident: PublicIncident | null;
  resolvedIncidents: PublicIncident[];
};

function IncidentItem({ incident }: { incident: PublicIncident }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-950">{incident.title}</h3>
          <p className="mt-2 text-sm text-ink-500">Started {formatDateTime(incident.started_at)}</p>
        </div>
        <Badge tone={getIncidentStatusTone(incident.status)}>
          {getIncidentStatusLabel(incident.status)}
        </Badge>
      </div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-ink-500">Resolved</dt>
          <dd className="mt-1 text-ink-950">{formatDateTime(incident.resolved_at)}</dd>
        </div>
        <div>
          <dt className="font-medium text-ink-500">Reason</dt>
          <dd className="mt-1 text-ink-950">{incident.failure_reason ?? "N/A"}</dd>
        </div>
      </dl>
    </article>
  );
}

export function PublicIncidentHistory({
  activeIncident,
  resolvedIncidents
}: PublicIncidentHistoryProps) {
  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-lg font-semibold text-ink-950">Active Incident</h2>
        <div className="mt-4">
          {activeIncident ? (
            <IncidentItem incident={activeIncident} />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-ink-500">
              No active incident.
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink-950">Resolved Incident History</h2>
        <div className="mt-4 space-y-3">
          {resolvedIncidents.length > 0 ? (
            resolvedIncidents.map((incident) => <IncidentItem key={incident.id} incident={incident} />)
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-ink-500">
              No resolved incidents.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
