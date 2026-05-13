import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ResponseTimePoint } from "../../lib/api";
import { formatDateTime, formatMilliseconds } from "../../lib/formatters";

type ResponseTimeChartProps = {
  points: ResponseTimePoint[];
};

type ChartPoint = {
  checkedAt: string;
  label: string;
  responseTimeMs: number | null;
  status: ResponseTimePoint["status"];
  statusCode: number | null;
};

function toChartPoint(point: ResponseTimePoint): ChartPoint {
  return {
    checkedAt: point.checked_at,
    label: new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(point.checked_at)),
    responseTimeMs: point.response_time_ms,
    status: point.status,
    statusCode: point.status_code
  };
}

export function ResponseTimeChart({ points }: ResponseTimeChartProps) {
  const data = points.map(toChartPoint);

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-ink-500">
        No response time data yet.
      </div>
    );
  }

  return (
    <div className="h-72 rounded-lg border border-slate-200 bg-white p-4">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ bottom: 8, left: 0, right: 16, top: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            minTickGap={24}
            stroke="#64748b"
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value} ms`}
            tickLine={false}
            width={68}
          />
          <Tooltip
            formatter={(value) => [formatMilliseconds(Number(value)), "Response time"]}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload as ChartPoint | undefined;

              return point ? formatDateTime(point.checkedAt) : "";
            }}
          />
          <Line
            connectNulls
            dataKey="responseTimeMs"
            dot={{ r: 3 }}
            name="Response time"
            stroke="#2563eb"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
