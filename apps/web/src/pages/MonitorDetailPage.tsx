import { useParams } from "react-router-dom";
import { Card } from "../components/ui/Card";

export default function MonitorDetailPage() {
  const { id } = useParams();

  return (
    <Card>
      <h1 className="text-2xl font-semibold text-ink-950">Monitor Detail</h1>
      <p className="mt-3 text-sm leading-6 text-ink-500">{id}</p>
    </Card>
  );
}
