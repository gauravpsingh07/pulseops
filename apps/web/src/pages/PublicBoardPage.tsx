import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UptimeBars } from "../components/monitors/UptimeBars";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import type { Monitor, PublicBoard } from "../lib/api";
import { ApiError, getPublicBoard } from "../lib/api";

const overallCopy: Record<Monitor["status"], string> = {
  operational: "All systems operational",
  degraded: "Some systems degraded",
  down: "Service disruption in progress",
  unknown: "Awaiting first checks"
};

const overallTone: Record<Monitor["status"], string> = {
  operational: "border-emerald-200 bg-emerald-50 text-emerald-800",
  degraded: "border-amber-200 bg-amber-50 text-amber-800",
  down: "border-red-200 bg-red-50 text-red-800",
  unknown: "border-slate-200 bg-slate-50 text-slate-600"
};

const statusTone: Record<Monitor["status"], "neutral" | "success" | "warning" | "danger"> = {
  operational: "success",
  degraded: "warning",
  down: "danger",
  unknown: "neutral"
};

function getBoardError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 404 ? "Status board not found." : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load status board.";
}

export default function PublicBoardPage() {
  const { slug } = useParams();
  const [board, setBoard] = useState<PublicBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    if (!slug) {
      setError("Status board slug is missing.");
      setLoading(false);
      return;
    }

    setError(null);

    try {
      setBoard(await getPublicBoard(slug));
    } catch (caughtError) {
      setError(getBoardError(caughtError));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <LoadingState label="Loading status board" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorState title="Status board unavailable" message={error ?? "Board data missing."} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className={`rounded-xl border px-6 py-5 ${overallTone[board.overall_status]}`}>
        <h1 className="text-xl font-semibold">{overallCopy[board.overall_status]}</h1>
        <p className="mt-1 text-sm opacity-80">
          Live status for {board.monitors.length} public
          {board.monitors.length === 1 ? " service" : " services"}.
        </p>
      </div>

      {board.monitors.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            No public monitors are attached to this board yet.
          </p>
        </Card>
      ) : (
        board.monitors.map((monitor) => (
          <Card key={`${monitor.name}-${monitor.public_slug ?? monitor.hostname}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink-950">{monitor.name}</h2>
                <p className="text-sm text-slate-500">{monitor.hostname}</p>
              </div>
              <div className="flex items-center gap-2">
                {monitor.has_open_incident ? <Badge tone="danger">active incident</Badge> : null}
                <Badge tone={statusTone[monitor.status]}>{monitor.status}</Badge>
                {monitor.public_slug ? (
                  <Link
                    className="text-sm font-medium text-blue-600 hover:underline"
                    to={`/status/${monitor.public_slug}`}
                  >
                    Details
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="mt-4">
              <UptimeBars stats={monitor.daily_stats} />
            </div>
          </Card>
        ))
      )}

      <p className="text-center text-xs text-slate-400">Powered by PulseOps</p>
    </div>
  );
}
