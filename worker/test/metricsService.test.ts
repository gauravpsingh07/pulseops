import { describe, expect, it } from "vitest";
import { getMonitorMetrics } from "../src/services/metricsService";
import { createCheck, createMonitor, createTestEnv } from "./fakeD1";

describe("metricsService", () => {
  it("calculates uptime percentage correctly", async () => {
    const monitor = createMonitor();
    const env = createTestEnv({
      monitors: [monitor],
      checks: [
        createCheck({ id: "chk_1", status: "success" }),
        createCheck({ id: "chk_2", status: "success" }),
        createCheck({ id: "chk_3", status: "failure", response_time_ms: null })
      ]
    });

    const metrics = await getMonitorMetrics(env, monitor, "24h");

    expect(metrics.uptime_percentage).toBe(66.67);
    expect(metrics.total_checks).toBe(3);
    expect(metrics.successful_checks).toBe(2);
    expect(metrics.failed_checks).toBe(1);
  });

  it("handles zero checks cleanly", async () => {
    const monitor = createMonitor();
    const env = createTestEnv({
      monitors: [monitor],
      checks: []
    });

    const metrics = await getMonitorMetrics(env, monitor, "24h");

    expect(metrics.uptime_percentage).toBeNull();
    expect(metrics.average_response_time_ms).toBeNull();
    expect(metrics.p95_response_time_ms).toBeNull();
    expect(metrics.total_checks).toBe(0);
    expect(metrics.response_time_series).toEqual([]);
  });

  it("calculates average response time correctly from successful checks", async () => {
    const monitor = createMonitor();
    const env = createTestEnv({
      monitors: [monitor],
      checks: [
        createCheck({ id: "chk_1", status: "success", response_time_ms: 100 }),
        createCheck({ id: "chk_2", status: "success", response_time_ms: 200 }),
        createCheck({
          id: "chk_3",
          status: "failure",
          response_time_ms: 900,
          error_message: "Received HTTP 500."
        })
      ]
    });

    const metrics = await getMonitorMetrics(env, monitor, "24h");

    expect(metrics.average_response_time_ms).toBe(150);
    expect(metrics.p95_response_time_ms).toBe(200);
  });
});
