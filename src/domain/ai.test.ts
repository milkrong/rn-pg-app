import { describe, expect, it } from "vitest";
import { buildCoachRequest, containsMedicalDiagnosisLanguage } from "./ai";

describe("ai coach policy", () => {
  it("builds a consent-scoped coach request", () => {
    const request = buildCoachRequest({
      userQuestion: "今天需要安排同房吗？",
      consent: { includeCycleData: true, includeSymptoms: false },
      cycleSummary: {
        cycleDay: 12,
        fertileWindow: "6月6日-6月11日",
        recentSymptoms: ["乳房胀痛"]
      }
    });

    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].content).toContain("周期第 12 天");
    expect(request.messages[1].content).not.toContain("乳房胀痛");
  });

  it("flags diagnosis-style language", () => {
    expect(containsMedicalDiagnosisLanguage("你已经确诊多囊卵巢综合征")).toBe(true);
    expect(containsMedicalDiagnosisLanguage("建议记录症状并咨询专业医生")).toBe(false);
  });
});
