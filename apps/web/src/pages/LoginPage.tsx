import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";

export default function LoginPage() {
  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink-950">Login</h1>
      <p className="mt-3 text-sm leading-6 text-ink-500">Authentication screen placeholder.</p>
      <Link className="mt-6 inline-block text-sm font-semibold text-pulse-600" to="/register">
        Register
      </Link>
    </Card>
  );
}
