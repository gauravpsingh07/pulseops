import { describe, expect, it, vi } from "vitest";
import {
  handleFailedCheckIncident,
  handleSuccessfulCheckRecovery
} from "../src/services/incidentService";
import { createCheck, createIncident, createMonitor, createTestEnv } from "./fakeD1";

describe("incidentService", () => {
  it("does not create an incident before the failure threshold", async () => {
    const monitor = createMonitor({ failure_count: 2, status: "degraded" });
    const env = createTestEnv({ monitors: [monitor] });

    const result = await handleFailedCheckIncident(
      env,
      monitor,
      createCheck({ status: "failure", error_message: "Request failed." })
    );

    expect(result.created).toBe(false);
    expect(result.incident).toBeNull();
    expect(env.tables.incidents).toHaveLength(0);
  });

  it("creates an incident once the failure threshold is reached", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const monitor = createMonitor({ failure_count: 3, status: "down" });
    const env = createTestEnv({ monitors: [monitor] });

    const result = await handleFailedCheckIncident(
      env,
      monitor,
      createCheck({ status: "failure", error_message: "Request failed." })
    );

    expect(result.created).toBe(true);
    expect(result.incident?.title).toBe("Test Monitor is down");
    expect(env.tables.incidents).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves an open incident on recovery", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const monitor = createMonitor({ status: "operational" });
    const incident = createIncident({ status: "open" });
    const env = createTestEnv({
      incidents: [incident],
      monitors: [monitor]
    });

    const result = await handleSuccessfulCheckRecovery(env, monitor);

    expect(result.resolved).toBe(true);
    expect(result.incident?.status).toBe("resolved");
    expect(env.tables.incidents[0]?.status).toBe("resolved");
    expect(fetch).not.toHaveBeenCalled();
  });
});
