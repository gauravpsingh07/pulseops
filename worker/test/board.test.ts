import { describe, expect, it } from "vitest";
import { getOverallBoardStatus } from "../src/routes/board";

describe("status board", () => {
  it("reports down when any monitor is down", () => {
    expect(getOverallBoardStatus(["operational", "down", "degraded"])).toBe("down");
  });

  it("reports degraded when the worst monitor is degraded", () => {
    expect(getOverallBoardStatus(["operational", "degraded"])).toBe("degraded");
  });

  it("reports operational when all reporting monitors are healthy", () => {
    expect(getOverallBoardStatus(["operational", "operational", "unknown"])).toBe("operational");
  });

  it("reports unknown for empty or entirely unknown boards", () => {
    expect(getOverallBoardStatus([])).toBe("unknown");
    expect(getOverallBoardStatus(["unknown"])).toBe("unknown");
  });
});
