import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../hooks/useAuth";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-ink-500">Monitor overview placeholder.</p>
          {user ? <p className="mt-2 text-sm font-medium text-ink-700">{user.email}</p> : null}
        </div>
        <Button type="button" variant="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </Card>
  );
}
