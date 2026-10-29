import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { PLAN_IDS } from "@/lib/billing";

describe("hosted subscription foundation", () => {
  it("hashes passwords with a per-password salt", () => {
    const first = hashPassword("correct horse battery staple");
    const second = hashPassword("correct horse battery staple");
    expect(first).not.toBe(second);
    expect(verifyPassword("correct horse battery staple", first)).toBe(true);
    expect(verifyPassword("wrong password", first)).toBe(false);
  });

  it("exposes only the supported launch plan ids", () => {
    expect(PLAN_IDS).toEqual(["free", "merchant", "pro", "team"]);
  });
});
