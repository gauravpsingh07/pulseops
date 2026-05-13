export function nowTimestampMs(): number {
  return Date.now();
}

export function elapsedMs(startTimestampMs: number): number {
  return Math.max(0, Date.now() - startTimestampMs);
}
