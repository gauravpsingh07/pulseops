export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatMilliseconds(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "N/A";
  }

  return `${Math.round(value)} ms`;
}

export function getHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}
