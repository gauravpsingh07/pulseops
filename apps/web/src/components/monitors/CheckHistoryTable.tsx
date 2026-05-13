import type { MonitorCheck } from "../../lib/api";
import { formatDateTime, formatMilliseconds } from "../../lib/formatters";
import { getCheckStatusLabel, getCheckStatusTone } from "../../lib/status";
import { Badge } from "../ui/Badge";

type CheckHistoryTableProps = {
  checks: MonitorCheck[];
};

export function CheckHistoryTable({ checks }: CheckHistoryTableProps) {
  if (checks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-ink-500">
        No checks have run yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Checked At</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Response</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {checks.map((check) => (
              <tr key={check.id}>
                <td className="whitespace-nowrap px-4 py-4 text-ink-700">
                  {formatDateTime(check.checked_at)}
                </td>
                <td className="px-4 py-4">
                  <Badge tone={getCheckStatusTone(check.status)}>
                    {getCheckStatusLabel(check.status)}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-ink-700">{check.status_code ?? "N/A"}</td>
                <td className="px-4 py-4 text-ink-700">
                  {formatMilliseconds(check.response_time_ms)}
                </td>
                <td className="min-w-64 px-4 py-4 text-ink-700">
                  {check.error_message ?? "None"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
