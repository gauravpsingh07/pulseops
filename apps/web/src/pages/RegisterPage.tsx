import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";

export default function RegisterPage() {
  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-ink-950">Register</h1>
      <p className="mt-3 text-sm leading-6 text-ink-500">Account creation placeholder.</p>
      <Link className="mt-6 inline-block text-sm font-semibold text-pulse-600" to="/login">
        Login
      </Link>
    </Card>
  );
}
