import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Monitor, UpdateMonitorPayload } from "../../lib/api";
import { ApiError } from "../../lib/api";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";
import { Input } from "../ui/Input";

type MonitorSettingsFormProps = {
  monitor: Monitor;
  publicStatusPath: string | null;
  onSave: (payload: UpdateMonitorPayload) => Promise<Monitor>;
};

const intervalOptions = [5, 10, 15, 30, 60] as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Unable to save monitor settings.";
}

export function MonitorSettingsForm({ monitor, publicStatusPath, onSave }: MonitorSettingsFormProps) {
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url);
  const [method, setMethod] = useState<Monitor["method"]>(monitor.method);
  const [intervalMinutes, setIntervalMinutes] = useState<Monitor["interval_minutes"]>(
    monitor.interval_minutes
  );
  const [timeoutMs, setTimeoutMs] = useState(monitor.timeout_ms);
  const [graceMinutes, setGraceMinutes] = useState(monitor.heartbeat_grace_minutes);
  const [alertWebhookUrl, setAlertWebhookUrl] = useState(monitor.alert_webhook_url ?? "");
  const [isPublic, setIsPublic] = useState(monitor.is_public);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(monitor.name);
    setUrl(monitor.url);
    setMethod(monitor.method);
    setIntervalMinutes(monitor.interval_minutes);
    setTimeoutMs(monitor.timeout_ms);
    setGraceMinutes(monitor.heartbeat_grace_minutes);
    setAlertWebhookUrl(monitor.alert_webhook_url ?? "");
    setIsPublic(monitor.is_public);
  }, [
    monitor.alert_webhook_url,
    monitor.heartbeat_grace_minutes,
    monitor.id,
    monitor.interval_minutes,
    monitor.is_public,
    monitor.method,
    monitor.name,
    monitor.timeout_ms,
    monitor.url
  ]);

  const isHeartbeat = monitor.type === "heartbeat";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    const payload: UpdateMonitorPayload = isHeartbeat
      ? {
          name: name.trim(),
          interval_minutes: intervalMinutes,
          heartbeat_grace_minutes: graceMinutes,
          is_public: isPublic
        }
      : {
          name: name.trim(),
          url: url.trim(),
          method,
          interval_minutes: intervalMinutes,
          timeout_ms: timeoutMs,
          is_public: isPublic
        };

    // Send null when the field is emptied so the API clears a saved webhook.
    const trimmedWebhookUrl = alertWebhookUrl.trim();
    payload.alert_webhook_url = trimmedWebhookUrl || null;

    try {
      await onSave(payload);
      setSuccess("Monitor settings saved.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-ink-950">Monitor Settings</h2>

      {error ? <ErrorState title="Settings update failed" message={error} /> : null}
      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {success}
        </div>
      ) : null}

      <Input label="Name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
      {!isHeartbeat ? (
        <Input
          label="URL"
          name="url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        {!isHeartbeat ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-ink-700">Method</span>
            <select
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink-950 outline-none focus:border-pulse-500 focus:ring-4 focus:ring-pulse-100"
              value={method}
              onChange={(event) => setMethod(event.target.value as Monitor["method"])}
            >
              <option value="GET">GET</option>
              <option value="HEAD">HEAD</option>
            </select>
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink-700">
            {isHeartbeat ? "Expected every" : "Interval"}
          </span>
          <select
            className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink-950 outline-none focus:border-pulse-500 focus:ring-4 focus:ring-pulse-100"
            value={intervalMinutes}
            onChange={(event) => setIntervalMinutes(Number(event.target.value) as Monitor["interval_minutes"])}
          >
            {intervalOptions.map((interval) => (
              <option key={interval} value={interval}>
                {interval} min
              </option>
            ))}
          </select>
        </label>

        {isHeartbeat ? (
          <Input
            label="Grace (min)"
            name="heartbeat_grace_minutes"
            type="number"
            min={1}
            max={1440}
            value={graceMinutes}
            onChange={(event) => setGraceMinutes(Number(event.target.value))}
            required
          />
        ) : (
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
        )}
      </div>

      <Input
        label="Discord webhook"
        name="alert_webhook_url"
        type="url"
        value={alertWebhookUrl}
        onChange={(event) => setAlertWebhookUrl(event.target.value)}
      />

      <label className="flex items-center justify-between gap-4 text-sm font-medium text-ink-700">
        <span>Public status page</span>
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-pulse-600 focus:ring-pulse-500"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
        />
      </label>

      {monitor.is_public && publicStatusPath ? (
        <Link
          className="block break-all rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-pulse-700 hover:text-pulse-600"
          to={publicStatusPath}
        >
          {publicStatusPath}
        </Link>
      ) : null}

      <Button className="w-full" disabled={saving} type="submit">
        {saving ? "Saving Settings" : "Save Settings"}
      </Button>
    </form>
  );
}
