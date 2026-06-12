import { describe, expect, it } from "vitest";
import {
  computeCycleSummary,
  estimateCycle,
  formatCycleDayLabel,
  formatFertileWindow,
  getFemaleRecordVisibility,
  getTodayTasks,
  inferCycleAverages,
  type ComputedCycleSummary
} from "./cycle";
import type { AppCycleLog } from "./records";

describe("cycle domain", () => {
  it("estimates cycle day and fertile window from the latest period start", () => {
    const estimate = estimateCycle({
      today: "2026-06-05",
      latestPeriodStart: "2026-05-25",
      averageCycleLength: 29,
      averagePeriodLength: 5
    });

    expect(estimate.cycleDay).toBe(12);
    expect(estimate.nextPeriodStart).toBe("2026-06-23");
    expect(estimate.fertileWindow).toEqual({
      startsOn: "2026-06-06",
      peaksOn: "2026-06-10",
      endsOn: "2026-06-11"
    });
    expect(estimate.phase).toBe("fertile-soon");
  });

  it("creates a human-readable Chinese cycle day label", () => {
    expect(formatCycleDayLabel(12)).toBe("周期第 12 天");
  });

  it("computes cycle summary from records, finding the start of the most recent period stretch", () => {
    const records: AppCycleLog[] = [
      makePeriodRecord("2026-05-25", "local-1"),
      makePeriodRecord("2026-05-26", "local-2"),
      makePeriodRecord("2026-05-27", "local-3"),
      makeSymptomRecord("2026-06-04", "拉丝白带"),
      makeSymptomRecord("2026-06-03", "乳房胀痛"),
      makePeriodRecord("2026-04-28", "local-old")
    ];

    const summary = computeCycleSummary(records, "2026-06-05", {
      averageCycleLength: 29,
      averagePeriodLength: 5
    });

    expect(summary).not.toBeNull();
    expect(summary?.cycleDay).toBe(12);
    expect(summary?.latestPeriodStart).toBe("2026-05-25");
    expect(summary?.fertileWindowLabel).toBe("6月6日-6月11日");
    expect(summary?.recentSymptoms).toEqual(["拉丝白带", "乳房胀痛"]);
  });

  it("infers per-user average cycle length from recent periods (robust to outliers)", () => {
    const records: AppCycleLog[] = [
      ...periodStretch("2026-01-05", 5),
      ...periodStretch("2026-02-04", 4),
      ...periodStretch("2026-03-05", 5),
      ...periodStretch("2026-04-03", 4),
      ...periodStretch("2026-06-15", 5)
    ];

    const inferred = inferCycleAverages(records);
    // Gaps are 30, 29, 29 (the 73-day gap after April is dropped as implausible).
    expect(inferred.averageCycleLength).toBe(29);
    expect(inferred.averagePeriodLength).toBe(5);
    expect(inferred.sampleCycles).toBe(3);
    expect(inferred.periodStretches[0].start).toBe("2026-06-15");
  });

  it("falls back to defaults when only one period is known", () => {
    const records: AppCycleLog[] = periodStretch("2026-06-01", 5);
    const inferred = inferCycleAverages(records);
    expect(inferred.averageCycleLength).toBe(28);
    expect(inferred.sampleCycles).toBe(0);
  });

  it("uses inferred averages inside computeCycleSummary", () => {
    const records: AppCycleLog[] = [
      ...periodStretch("2026-04-01", 4),
      ...periodStretch("2026-05-02", 4),
      ...periodStretch("2026-06-02", 4)
    ];
    const summary = computeCycleSummary(records, "2026-06-13");
    expect(summary).not.toBeNull();
    expect(summary?.averageCycleLength).toBe(31);
    expect(summary?.averagePeriodLength).toBe(4);
    expect(summary?.sampleCycles).toBe(2);
    expect(summary?.cycleDay).toBe(12);
  });

  it("returns null when there are no period records", () => {
    const records: AppCycleLog[] = [makeSymptomRecord("2026-06-04", "拉丝白带")];
    expect(computeCycleSummary(records, "2026-06-05")).toBeNull();
  });

  it("formats a fertile window into a friendly Chinese label", () => {
    expect(
      formatFertileWindow({ startsOn: "2026-06-06", peaksOn: "2026-06-10", endsOn: "2026-06-11" })
    ).toBe("6月6日-6月11日");
  });

  it("uses buffered visibility so a short-then-long cycle doesn't hide records prematurely", () => {
    // Cycle day 2 — peak period: LH meaningless, period flow primary.
    const day2 = makeSummary({ cycleDay: 2, phase: "period" });
    const day2Rel = getFemaleRecordVisibility(day2);
    expect(day2Rel.primary).toBe("period");
    expect(day2Rel.visible).not.toContain("ovulation_test");

    // Cycle day 6 — bleed officially over (avg 5 days) but we keep period
    // visible for two more days in case this cycle is heavier than usual.
    const day6 = makeSummary({ cycleDay: 6, phase: "follicular" });
    const day6Rel = getFemaleRecordVisibility(day6);
    expect(day6Rel.primary).toBe("temperature");
    expect(day6Rel.visible).toContain("period");
    expect(day6Rel.visible).toContain("ovulation_test");

    // Cycle day 12 — fertile window, period not plausible anywhere near here.
    const day12 = makeSummary({ cycleDay: 12, phase: "fertile-soon" });
    const day12Rel = getFemaleRecordVisibility(day12);
    expect(day12Rel.primary).toBe("ovulation_test");
    expect(day12Rel.visible).not.toContain("period");

    // Cycle day 25 — late luteal, next period expected day 29; period flow
    // should reappear so an early arrival can still be logged.
    const day25 = makeSummary({ cycleDay: 25, phase: "luteal" });
    const day25Rel = getFemaleRecordVisibility(day25);
    expect(day25Rel.primary).toBe("symptom");
    expect(day25Rel.visible).toContain("period");
    expect(day25Rel.visible).not.toContain("ovulation_test");
  });

  it("prioritizes LH and temperature tasks around the fertile window", () => {
    const tasks = getTodayTasks({
      today: "2026-06-08",
      latestPeriodStart: "2026-05-25",
      averageCycleLength: 29,
      averagePeriodLength: 5
    });

    expect(tasks.map((task) => task.title)).toEqual([
      "记录 LH 试纸",
      "测量基础体温",
      "安排轻松运动"
    ]);
  });
});

function makePeriodRecord(happenedOn: string, localId: string): AppCycleLog {
  return {
    localId,
    logType: "period",
    happenedOn,
    payload: { kind: "period", label: "经期", value: "中等", note: "" },
    clientUpdatedAt: `${happenedOn}T00:00:00.000Z`,
    syncStatus: "synced"
  };
}

function makeSummary(overrides: Partial<ComputedCycleSummary> & { cycleDay: number; phase: ComputedCycleSummary["phase"] }): ComputedCycleSummary {
  return {
    cycleDay: overrides.cycleDay,
    phase: overrides.phase,
    fertileWindow: overrides.fertileWindow ?? { startsOn: "2026-06-06", peaksOn: "2026-06-10", endsOn: "2026-06-11" },
    fertileWindowLabel: overrides.fertileWindowLabel ?? "6月6日-6月11日",
    recentSymptoms: overrides.recentSymptoms ?? [],
    latestPeriodStart: overrides.latestPeriodStart ?? "2026-05-25",
    averageCycleLength: overrides.averageCycleLength ?? 29,
    averagePeriodLength: overrides.averagePeriodLength ?? 5,
    sampleCycles: overrides.sampleCycles ?? 3
  };
}

function periodStretch(start: string, days: number): AppCycleLog[] {
  const result: AppCycleLog[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = addOffset(start, i);
    result.push(makePeriodRecord(date, `period-${date}`));
  }
  return result;
}

function addOffset(value: string, days: number): string {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function makeSymptomRecord(happenedOn: string, value: string): AppCycleLog {
  return {
    localId: `symptom-${happenedOn}`,
    logType: "symptom",
    happenedOn,
    payload: { kind: "symptom", label: "症状", value, note: "" },
    clientUpdatedAt: `${happenedOn}T00:00:00.000Z`,
    syncStatus: "synced"
  };
}
