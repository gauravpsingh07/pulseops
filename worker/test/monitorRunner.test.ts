import { afterEach, describe, expect, it, vi } from "vitest";
import { runMonitorCheck } from "../src/services/monitorRunner";
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

describe("monitorRunner", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
