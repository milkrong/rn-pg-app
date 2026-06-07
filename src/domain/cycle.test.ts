import { describe, expect, it } from "vitest";
import {
  computeCycleSummary,
  estimateCycle,
  formatCycleDayLabel,
  formatFertileWindow,
  getTodayTasks
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

  it("returns null when there are no period records", () => {
    const records: AppCycleLog[] = [makeSymptomRecord("2026-06-04", "拉丝白带")];
    expect(computeCycleSummary(records, "2026-06-05")).toBeNull();
  });

  it("formats a fertile window into a friendly Chinese label", () => {
    expect(
      formatFertileWindow({ startsOn: "2026-06-06", peaksOn: "2026-06-10", endsOn: "2026-06-11" })
    ).toBe("6月6日-6月11日");
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
