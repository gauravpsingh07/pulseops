import type { PublicIncident, PublicStatus } from "../../lib/api";
import { formatDateTime } from "../../lib/formatters";
import { getPublicStatusHeadline, getStatusLabel, getStatusTone } from "../../lib/status";
import { Badge } from "../ui/Badge";

type PublicStatusHeaderProps = {
  activeIncident: PublicIncident | null;
  status: PublicStatus;
};

const toneClasses: Record<ReturnType<typeof getStatusTone>, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-rose-200 bg-rose-50 text-rose-950"
};

export function PublicStatusHeader({ activeIncident, status }: PublicStatusHeaderProps) {
  const tone = getStatusTone(status.monitor.status);

  return (
    <header className={`rounded-lg border px-5 py-6 shadow-sm sm:px-8 ${toneClasses[tone]}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide opacity-75">PulseOps Status</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            {getPublicStatusHeadline(status.monitor.status)}
          </h1>
          <p className="mt-3 text-base font-medium opacity-80">{status.monitor.name}</p>
          <p className="mt-1 text-sm opacity-75">{status.monitor.hostname}</p>
        </div>
        <Badge tone={tone}>{getStatusLabel(status.monitor.status)}</Badge>
      </div>

      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium opacity-70">Last checked</p>
          <p className="mt-1 font-semibold">{formatDateTime(status.last_checked_at)}</p>
        </div>
        <div>
          <p className="font-medium opacity-70">Active incident</p>
          <p className="mt-1 font-semibold">{activeIncident ? activeIncident.title : "None"}</p>
        </div>
      </div>
    </header>
  );
}
