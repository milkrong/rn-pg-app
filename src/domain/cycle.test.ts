import { describe, expect, it } from "vitest";
import {
  estimateCycle,
  formatCycleDayLabel,
  getTodayTasks
} from "./cycle";

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
