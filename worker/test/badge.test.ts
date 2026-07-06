import { describe, expect, it } from "vitest";
import { buildBadgeValueText, buildStatusBadgeSvg } from "../src/utils/badge";

describe("status badge", () => {
  it("renders status and uptime in the value segment", () => {
    expect(buildBadgeValueText("operational", 99.98)).toBe("99.98% - operational");
    expect(buildBadgeValueText("down", 42.5)).toBe("42.5% - down");
  });

  it("falls back to status only when uptime is unknown", () => {
    expect(buildBadgeValueText("unknown", null)).toBe("unknown");
  });

  it("produces valid svg with the monitor name and status color", () => {
    const svg = buildStatusBadgeSvg({
      name: "My API",
      status: "operational",
      uptimePercentage: 100
    });

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("my api");
    expect(svg).toContain("#2da44e");
    expect(svg).toContain("100% - operational");
  });

  it("uses the red palette when the monitor is down", () => {
    const svg = buildStatusBadgeSvg({
      name: "My API",
      status: "down",
      uptimePercentage: 12.34
    });

    expect(svg).toContain("#cf222e");
  });

  it("escapes markup in monitor names", () => {
    const svg = buildStatusBadgeSvg({
      name: "<script>alert(1)</script>",
      status: "unknown",
      uptimePercentage: null
    });

    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("truncates very long monitor names", () => {
    const svg = buildStatusBadgeSvg({
      name: "an extremely long monitor name that keeps going",
      status: "operational",
      uptimePercentage: 99.9
    });

    expect(svg).toContain("…");
  });
});
