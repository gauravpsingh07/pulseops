import { type FormEvent, useState } from "react";
import type { CreateMonitorPayload } from "../../lib/api";
import { ApiError, createMonitor } from "../../lib/api";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";
import { Input } from "../ui/Input";

type MonitorFormProps = {
  onCreated: () => Promise<void>;
};

const intervalOptions = [5, 10, 15, 30, 60] as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Unable to create monitor.";
}

export function MonitorForm({ onCreated }: MonitorFormProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<CreateMonitorPayload["method"]>("GET");
  const [intervalMinutes, setIntervalMinutes] = useState<CreateMonitorPayload["interval_minutes"]>(5);
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [alertWebhookUrl, setAlertWebhookUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setUrl("");
    setMethod("GET");
    setIntervalMinutes(5);
    setTimeoutMs(10000);
    setAlertWebhookUrl("");
    setIsPublic(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await createMonitor({
        name,
        url,
        method,
        interval_minutes: intervalMinutes,
        timeout_ms: timeoutMs,
        alert_webhook_url: alertWebhookUrl.trim() || undefined,
        is_public: isPublic
      });
      resetForm();
      setSuccess("Monitor created.");
      await onCreated();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error ? <ErrorState title="Monitor creation failed" message={error} /> : null}
      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {success}
        </div>
      ) : null}
      <Input label="Name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
      <Input
        label="URL"
        name="url"
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        required
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink-700">Method</span>
          <select
            className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink-950 outline-none focus:border-pulse-500 focus:ring-4 focus:ring-pulse-100"
            value={method}
            onChange={(event) => setMethod(event.target.value as CreateMonitorPayload["method"])}
          >
            <option value="GET">GET</option>
            <option value="HEAD">HEAD</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink-700">Interval</span>
          <select
            className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink-950 outline-none focus:border-pulse-500 focus:ring-4 focus:ring-pulse-100"
            value={intervalMinutes}
            onChange={(event) =>
              setIntervalMinutes(Number(event.target.value) as CreateMonitorPayload["interval_minutes"])
            }
          >
            {intervalOptions.map((interval) => (
              <option key={interval} value={interval}>
                {interval} min
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Timeout"
          name="timeout_ms"
          type="number"
          min={1000}
          max={30000}
          step={1000}
          value={timeoutMs}
          onChange={(event) => setTimeoutMs(Number(event.target.value))}
          required
        />
      </div>
      <Input
        label="Discord webhook"
        name="alert_webhook_url"
        type="url"
        value={alertWebhookUrl}
        onChange={(event) => setAlertWebhookUrl(event.target.value)}
      />
      <label className="flex items-center gap-3 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-pulse-600 focus:ring-pulse-500"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
        />
        Public status
      </label>
      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? "Creating monitor" : "Create Monitor"}
      </Button>
    </form>
  );
}
