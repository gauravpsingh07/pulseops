import type { Monitor } from "../../lib/api";
import { getStatusLabel, summarizeStatuses, type MonitorStatus } from "../../lib/status";

type StatusSummaryCardsProps = {
  monitors: Monitor[];
};

const cards: Array<{ key: "total" | MonitorStatus; label: string }> = [
  { key: "total", label: "Total" },
  { key: "operational", label: getStatusLabel("operational") },
  { key: "degraded", label: getStatusLabel("degraded") },
  { key: "down", label: getStatusLabel("down") },
  { key: "unknown", label: getStatusLabel("unknown") }
];

export function StatusSummaryCards({ monitors }: StatusSummaryCardsProps) {
  const summary = summarizeStatuses(monitors);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <section key={card.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-ink-500">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink-950">{summary[card.key]}</p>
        </section>
      ))}
    </div>
  );
}
