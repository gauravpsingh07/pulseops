import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { ApiError, apiRequest } from "../lib/api";

type RegisterResponse = {
  user: {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
  };
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiRequest<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      navigate("/login", { replace: true, state: { registeredEmail: email } });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Unable to register."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink-950">Register</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {error ? <ErrorState title="Registration failed" message={error} /> : null}
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
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button className="w-full" disabled={submitting} type="submit">
          {submitting ? "Creating account" : "Register"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-500">
        Already registered?{" "}
        <Link className="font-semibold text-pulse-600" to="/login">
          Login
        </Link>
      </p>
    </Card>
  );
}
