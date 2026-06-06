import { describe, expect, it } from "vitest";

import { createRecordPayload, formatRecordDetail, formatRecordTitle, getRecordOption, getRecordOptions } from "./records";

describe("records domain", () => {
  it("returns role-specific record options", () => {
    expect(getRecordOptions("female").map((option) => option.kind)).toContain("ovulation_test");
    expect(getRecordOptions("male").map((option) => option.kind)).toContain("heat");
  });

  it("creates a compact payload for Supabase storage", () => {
    const option = getRecordOption("female", "temperature");
    expect(createRecordPayload(option, " 36.62 ", " 起床后测 ")).toEqual({
      kind: "temperature",
      label: "体温",
      value: "36.62",
      note: "起床后测"
    });
  });

  it("formats record rows for display", () => {
    const log = {
      logType: "symptom" as const,
      happenedOn: "2026-06-06",
      payload: { label: "睡眠", value: "7h", note: "醒来状态不错" },
      syncStatus: "local" as const
    };

    expect(formatRecordTitle(log)).toBe("睡眠：7h");
    expect(formatRecordDetail(log)).toBe("2026-06-06 · 醒来状态不错 · 本地");
  });
});
