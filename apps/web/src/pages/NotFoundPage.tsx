import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";

export default function NotFoundPage() {
  return (
    <Card className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-semibold text-ink-950">Not Found</h1>
      <Link className="mt-6 inline-block text-sm font-semibold text-pulse-600" to="/dashboard">
        Dashboard
      </Link>
    </Card>
  );
}
