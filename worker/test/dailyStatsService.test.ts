import { afterEach, describe, expect, it, vi } from "vitest";
import { runMonitorCheck } from "../src/services/monitorRunner";
import {
  computeUptimePercentage,
  getDailyUptime,
  toDayUtc
} from "../src/services/dailyStatsService";
import { createCheck, createMonitor, createTestEnv, readMonitor } from "./fakeD1";

describe("dailyStatsService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("converts timestamps to UTC day keys", () => {
    expect(toDayUtc("2026-07-05 12:34:56")).toBe("2026-07-05");
    expect(toDayUtc("2026-07-05T12:34:56.000Z")).toBe("2026-07-05");
  });

  it("computes uptime percentage with two-decimal rounding", () => {
    expect(computeUptimePercentage(288, 288)).toBe(100);
    expect(computeUptimePercentage(288, 287)).toBe(99.65);
    expect(computeUptimePercentage(3, 1)).toBe(33.33);
    expect(computeUptimePercentage(0, 0)).toBeNull();
  });

  it("upserts a daily rollup after a monitor check", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 }))
    );
    const monitor = createMonitor();
    const today = new Date().toISOString().slice(0, 10);
    const env = createTestEnv({
      checks: [
        createCheck({ checked_at: `${today} 01:00:00`, response_time_ms: 100 }),
        createCheck({ checked_at: `${today} 02:00:00`, response_time_ms: 300, status: "failure" })
      ],
      monitors: [monitor]
    });

    await runMonitorCheck(env, readMonitor(env));

    expect(env.tables.dailyStats).toHaveLength(1);
    const row = env.tables.dailyStats[0];

    expect(row.day).toBe(today);
    expect(row.total_checks).toBe(3);
    expect(row.successful_checks).toBe(2);
    expect(row.failed_checks).toBe(1);

    const daily = await getDailyUptime(env, monitor.id);

    expect(daily).toHaveLength(1);
    expect(daily[0]?.uptime_percentage).toBe(66.67);
  });
});
