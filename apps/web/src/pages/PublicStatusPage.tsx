import { useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";

export default function PublicStatusPage() {
  const { slug } = useParams();

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink-950">Public Status</h1>
        <Badge tone="neutral">{slug}</Badge>
      </div>
    </Card>
  );
}
