import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import MonitorDetailPage from "./pages/MonitorDetailPage";
import NotFoundPage from "./pages/NotFoundPage";
import PublicStatusPage from "./pages/PublicStatusPage";
import RegisterPage from "./pages/RegisterPage";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function Shell() {
  return (
    <div className="min-h-screen bg-slate-50 text-ink-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <NavLink to="/dashboard" className="text-lg font-semibold tracking-normal text-ink-950">
            PulseOps
          </NavLink>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 font-medium ${
                  isActive ? "bg-slate-100 text-ink-950" : "text-ink-500 hover:text-ink-950"
                }`
              }
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 font-medium ${
                  isActive ? "bg-slate-100 text-ink-950" : "text-ink-500 hover:text-ink-950"
                }`
              }
            >
              Register
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitors/:id"
            element={
              <ProtectedRoute>
                <MonitorDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="/status/:slug" element={<PublicStatusPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return <Shell />;
}
