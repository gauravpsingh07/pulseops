import { describe, expect, it } from "vitest";
import { createMonitorSchema, updateMonitorSchema } from "../src/utils/validation";

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/123/token";

describe("monitor validation", () => {
  it("accepts http and https monitor URLs", () => {
    for (const url of ["https://example.com/health", "http://example.com"]) {
      const result = createMonitorSchema.safeParse({ name: "Site", url });

      expect(result.success).toBe(true);
    }
  });

  it("rejects non-http monitor URL schemes", () => {
    for (const url of ["ftp://example.com", "file:///etc/passwd", "ws://example.com"]) {
      const result = createMonitorSchema.safeParse({ name: "Site", url });

      expect(result.success).toBe(false);
    }
  });

  it("accepts Discord webhook URLs", () => {
    const result = createMonitorSchema.safeParse({
      name: "Site",
      url: "https://example.com",
      alert_webhook_url: DISCORD_WEBHOOK
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.alert_webhook_url).toBe(DISCORD_WEBHOOK);
    }
  });

  it("rejects non-Discord webhook destinations", () => {
    const result = createMonitorSchema.safeParse({
      name: "Site",
      url: "https://example.com",
      alert_webhook_url: "https://attacker.example.com/collect"
    });

    expect(result.success).toBe(false);
  });

  it("clears a webhook when null or empty string is sent", () => {
    for (const cleared of [null, "", "   "]) {
      const result = updateMonitorSchema.safeParse({ alert_webhook_url: cleared });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.alert_webhook_url).toBeNull();
      }
    }
  });

  it("leaves the webhook unchanged when the field is omitted", () => {
    const result = updateMonitorSchema.safeParse({ name: "Renamed" });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.alert_webhook_url).toBeUndefined();
    }
  });
});
