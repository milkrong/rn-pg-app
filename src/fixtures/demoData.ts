import type { CycleInput } from "@/domain/cycle";

export const demoCycleInput: CycleInput = {
  today: "2026-06-05",
  latestPeriodStart: "2026-05-25",
  averageCycleLength: 29,
  averagePeriodLength: 5
};

export const demoLogs = {
  lh: "未测",
  temperature: "36.62°C"
};

export const demoCalendarDays = Array.from({ length: 28 }, (_, index) => {
  const label = String(index + 1);
  const kind =
    index >= 0 && index <= 4
      ? "period"
      : index >= 12 && index <= 17
        ? "fertile"
        : "normal";

  return {
    date: `2026-06-${String(index + 1).padStart(2, "0")}`,
    label,
    kind,
    meta: kind === "period" ? "经期" : kind === "fertile" ? "易孕" : ""
  };
});

export const demoCoachContext = {
  userQuestion: "今天需要安排同房吗？",
  consent: {
    includeCycleData: true,
    includeSymptoms: true
  },
  cycleSummary: {
    cycleDay: 12,
    fertileWindow: "6月6日-6月11日",
    recentSymptoms: ["轻微乳房胀痛", "睡眠一般"]
  }
};
