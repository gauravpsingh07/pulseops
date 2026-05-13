import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorCard } from "../components/dashboard/MonitorCard";
import { StatusSummaryCards } from "../components/dashboard/StatusSummaryCards";
import { MonitorForm } from "../components/monitors/MonitorForm";
import { MonitorTable } from "../components/monitors/MonitorTable";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { useAuth } from "../hooks/useAuth";
import type { Monitor } from "../lib/api";
import { ApiError, listMonitors } from "../lib/api";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMonitors = useCallback(async () => {
    setError(null);

    try {
      const result = await listMonitors();
      setMonitors(result);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Unable to load monitors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMonitors();
  }, [loadMonitors]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Dashboard</h1>
          {user ? <p className="mt-2 text-sm font-medium text-ink-500">{user.email}</p> : null}
        </div>
        <Button type="button" variant="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <LoadingState label="Loading monitors" />
      ) : (
        <>
          <StatusSummaryCards monitors={monitors} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-950">Monitors</h2>
              </div>
              <MonitorTable monitors={monitors} />
              {monitors.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {monitors.map((monitor) => (
                    <MonitorCard key={monitor.id} monitor={monitor} />
                  ))}
                </div>
              ) : null}
            </section>
            <Card>
              <h2 className="text-lg font-semibold text-ink-950">Create Monitor</h2>
              <div className="mt-5">
                <MonitorForm onCreated={loadMonitors} />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
