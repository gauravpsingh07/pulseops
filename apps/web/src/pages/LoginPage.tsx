import { type FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/api";

type LoginLocationState = {
  from?: string;
  registeredEmail?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, loading: authLoading } = useAuth();
  const locationState = location.state as LoginLocationState | null;
  const [email, setEmail] = useState(locationState?.registeredEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = locationState?.from ?? "/dashboard";

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to log in."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink-950">Login</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {locationState?.registeredEmail ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Account created. Log in to continue.
          </div>
        ) : null}
        {error ? <ErrorState title="Login failed" message={error} /> : null}
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button className="w-full" disabled={submitting} type="submit">
          {submitting ? "Logging in" : "Login"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-500">
        Need an account?{" "}
        <Link className="font-semibold text-pulse-600" to="/register">
          Register
        </Link>
      </p>
    </Card>
  );
}
