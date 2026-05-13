import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/utils/crypto";

describe("auth password hashing", () => {
  it("verifies the correct password", async () => {
    const passwordHash = await hashPassword("correct-password");

    await expect(verifyPassword("correct-password", passwordHash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const passwordHash = await hashPassword("correct-password");

    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(false);
  });
});
