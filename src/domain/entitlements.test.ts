import { describe, expect, it } from "vitest";
import { canUseAiCoach, getPlanLimits } from "./entitlements";

describe("entitlements", () => {
  it("allows free users limited AI coaching", () => {
    expect(canUseAiCoach({ plan: "free", aiMessagesUsedToday: 2 })).toBe(true);
    expect(canUseAiCoach({ plan: "free", aiMessagesUsedToday: 3 })).toBe(false);
  });

  it("allows pro users more AI coaching", () => {
    expect(getPlanLimits("pro").dailyAiMessages).toBe(30);
    expect(canUseAiCoach({ plan: "pro", aiMessagesUsedToday: 29 })).toBe(true);
  });
});
