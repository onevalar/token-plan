import { describe, it, expect } from "vitest";
import { accountTitle, countdown, envelope, metricTitle, period } from "./usage";

describe("shared quota display", () => {
  it("uses compact periods without duplicate weekly labels", () => {
    expect(period(18000)).toBe("5h");
    expect(period(30 * 86400)).toBe("30d");
    expect(metricTitle("Argon Weekly", { kind: "quota", unit: "percent", windowSeconds: 604800 })).toBe("Argon · 1w");
  });
  it("does not manufacture reset times", () => {
    expect(countdown(undefined, 0)).toBeNull();
    expect(countdown("invalid", 0)).toBeNull();
    expect(countdown("1970-01-31T00:00:00Z", 0)).toBe("30d");
  });
  it("extracts the email without organization text", () => {
    expect(accountTitle("Claude — person@example.com's Organization")).toBe("person@example.com");
  });
  it("preserves distinct accounts and strips fields not in the display contract", () => {
    const p = { displayName: "Claude", fetchedAt: "", expiresAt: "", stale: true, resources: {} };
    const data = envelope.parse({ schema: "tokenplan.limits.v1", generatedAt: "", providers: { claude: p, "claude:second": p }, errors: [], accessToken: "test" });
    expect(Object.keys(data.providers)).toHaveLength(2);
    expect(data).not.toHaveProperty("accessToken");
    expect(() => envelope.parse({ schema: "other" })).toThrow();
  });
});
