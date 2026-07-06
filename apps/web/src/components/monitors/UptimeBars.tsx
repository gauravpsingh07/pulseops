import type { DailyStat } from "../../lib/api";

type UptimeBarsProps = {
  stats: DailyStat[] | undefined;
  days?: number;
};

type BarSlot = {
  day: string;
  stat: DailyStat | null;
};

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildSlots(stats: DailyStat[], days: number): BarSlot[] {
  const statsByDay = new Map(stats.map((stat) => [stat.day, stat]));
  const slots: BarSlot[] = [];
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * 24 * 60 * 60 * 1000);
    const day = toDayKey(date);

    slots.push({ day, stat: statsByDay.get(day) ?? null });
  }

  return slots;
}

function barColor(stat: DailyStat | null): string {
  if (!stat || stat.uptime_percentage === null) {
    return "bg-slate-200";
  }

  if (stat.uptime_percentage >= 99.5) {
    return "bg-emerald-500";
  }

  if (stat.uptime_percentage >= 95) {
    return "bg-amber-400";
  }

  return "bg-red-500";
}

function barTitle(slot: BarSlot): string {
  if (!slot.stat || slot.stat.uptime_percentage === null) {
    return `${slot.day}: no data`;
  }

  return `${slot.day}: ${slot.stat.uptime_percentage}% uptime (${slot.stat.total_checks} checks)`;
}

export function UptimeBars({ stats, days = 90 }: UptimeBarsProps) {
  const slots = buildSlots(stats ?? [], days);
  const observed = slots.filter((slot) => slot.stat && slot.stat.uptime_percentage !== null);
  const overall =
    observed.length === 0
      ? null
      : Math.round(
          (observed.reduce((sum, slot) => sum + (slot.stat?.uptime_percentage ?? 0), 0) /
            observed.length) *
            100
        ) / 100;

  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="text-sm font-medium text-slate-600">Last {days} days</p>
        <p className="text-sm text-slate-500">
          {overall === null ? "No uptime history yet" : `${overall}% average uptime`}
        </p>
      </div>
      <div className="mt-2 flex h-10 items-stretch gap-[2px]" role="img" aria-label="Daily uptime history">
        {slots.map((slot) => (
          <div
            key={slot.day}
            title={barTitle(slot)}
            className={`min-w-[2px] flex-1 rounded-sm ${barColor(slot.stat)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{slots[0]?.day}</span>
        <span>today</span>
      </div>
    </div>
  );
}
