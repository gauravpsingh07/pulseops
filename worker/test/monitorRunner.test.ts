import { afterEach, describe, expect, it, vi } from "vitest";
import { isMonitorDue, runMonitorCheck } from "../src/services/monitorRunner";
import type { ScheduledMonitor } from "../src/db/queries";
import { createIncident, createMonitor, createTestEnv, readMonitor } from "./fakeD1";

function mockFetchSuccess(status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status }))
  );
}

function mockFetchFailure(message = "Network failure"): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error(message);
    })
  );
}

function createScheduledMonitor(overrides: Partial<ScheduledMonitor> = {}): ScheduledMonitor {
  return {
    ...createMonitor(),
    last_checked_at: null,
    ...overrides
  };
}

describe("monitorRunner", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats a monitor as due inside the scheduled grace window", () => {
    const monitor = createScheduledMonitor({
      interval_minutes: 5,
      last_checked_at: "2026-05-14 21:15:09"
    });
    const nowMs = Date.parse("2026-05-14T21:20:07Z");

    expect(isMonitorDue(monitor, nowMs)).toBe(true);
  });

  it("skips a monitor checked too recently", () => {
    const monitor = createScheduledMonitor({
      interval_minutes: 5,
      last_checked_at: "2026-05-14 21:18:30"
    });
    const nowMs = Date.parse("2026-05-14T21:20:00Z");

    expect(isMonitorDue(monitor, nowMs)).toBe(false);
  });

  it("treats a never-checked monitor as due", () => {
    const monitor = createScheduledMonitor({ last_checked_at: null });

    expect(isMonitorDue(monitor, Date.parse("2026-05-14T21:20:00Z"))).toBe(true);
  });

  it("marks a monitor operational after a successful check", async () => {
    mockFetchSuccess();
    const monitor = createMonitor({ failure_count: 2, status: "degraded" });
    const env = createTestEnv({ monitors: [monitor] });

    const result = await runMonitorCheck(env, readMonitor(env));

    expect(result.check.status).toBe("success");
    expect(result.monitor.status).toBe("operational");
    expect(result.monitor.failure_count).toBe(0);
    expect(result.monitor.success_count).toBe(1);
  });

  it("increments failure_count after a failed check", async () => {
    mockFetchFailure();
    const monitor = createMonitor({ failure_count: 0, status: "unknown" });
    const env = createTestEnv({ monitors: [monitor] });

    const result = await runMonitorCheck(env, readMonitor(env));

    expect(result.check.status).toBe("failure");
    expect(result.monitor.failure_count).toBe(1);
    expect(result.monitor.status).toBe("degraded");
  });

  it("opens an incident on the third consecutive failure", async () => {
    mockFetchFailure();
    const monitor = createMonitor({ failure_count: 2, status: "degraded" });
    const env = createTestEnv({ monitors: [monitor] });

    const result = await runMonitorCheck(env, readMonitor(env));

    expect(result.monitor.failure_count).toBe(3);
    expect(result.monitor.status).toBe("down");
    expect(result.incident_created).toBe(true);
    expect(result.incident?.status).toBe("open");
    expect(env.tables.incidents).toHaveLength(1);
  });

  it("does not create a duplicate open incident", async () => {
    mockFetchFailure();
    const monitor = createMonitor({ failure_count: 2, status: "degraded" });
    const incident = createIncident({ monitor_id: monitor.id, status: "open" });
    const env = createTestEnv({
      incidents: [incident],
      monitors: [monitor]
    });

    const result = await runMonitorCheck(env, readMonitor(env));

    expect(result.incident_created).toBe(false);
    expect(result.incident?.id).toBe(incident.id);
    expect(env.tables.incidents).toHaveLength(1);
  });

  it("resolves an open incident on recovery", async () => {
    mockFetchSuccess();
    const monitor = createMonitor({ failure_count: 3, status: "down" });
    const incident = createIncident({ monitor_id: monitor.id, status: "open" });
    const env = createTestEnv({
      incidents: [incident],
      monitors: [monitor]
    });

    const result = await runMonitorCheck(env, readMonitor(env));

    expect(result.monitor.status).toBe("operational");
    expect(result.incident_resolved).toBe(true);
    expect(result.incident?.status).toBe("resolved");
    expect(env.tables.incidents[0]?.status).toBe("resolved");
  });
});
