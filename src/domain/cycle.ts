import { addDays, daysBetween, isWithin, parseDate } from "./date";
import type { AppCycleLog, RecordKind } from "./records";

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

export type CyclePhase =
  | "period"
  | "follicular"
  | "fertile-soon"
  | "fertile"
  | "luteal";

export type CycleInput = {
  today: string;
  latestPeriodStart: string;
  averageCycleLength: number;
  averagePeriodLength: number;
};

export type FertileWindow = {
  startsOn: string;
  peaksOn: string;
  endsOn: string;
};

export type CycleEstimate = {
  cycleDay: number;
  nextPeriodStart: string;
  ovulationDay: string;
  fertileWindow: FertileWindow;
  phase: CyclePhase;
};

export type TodayTask = {
  id: string;
  title: string;
  description: string;
  tone: "primary" | "calm" | "care";
};

export function estimateCycle(input: CycleInput): CycleEstimate {
  const cycleDay = daysBetween(input.latestPeriodStart, input.today) + 1;
  const nextPeriodStart = addDays(input.latestPeriodStart, input.averageCycleLength);
  const ovulationDay = addDays(nextPeriodStart, -13);
  const fertileWindow = {
    startsOn: addDays(ovulationDay, -4),
    peaksOn: ovulationDay,
    endsOn: addDays(ovulationDay, 1)
  };

  return {
    cycleDay,
    nextPeriodStart,
    ovulationDay,
    fertileWindow,
    phase: getPhase(input.today, cycleDay, input.averagePeriodLength, fertileWindow)
  };
}

export function formatCycleDayLabel(cycleDay: number): string {
  return `周期第 ${cycleDay} 天`;
}

/**
 * Female-only: decides which record kinds to surface today, ordered by how
 * relevant each one is for the current phase. Cycle length varies month to
 * month so visibility is computed with buffers, not hard phase boundaries:
 *
 *   - period flow: visible during the first {avgPeriod + 2} days (in case it
 *     runs longer than usual) AND during the last 4 days of the cycle (in
 *     case the next period arrives early).
 *   - ovulation test: visible from cycle day 3 (after the heavy bleed days
 *     when LH is suppressed) through {estimatedOvulationDay + 4} (in case
 *     she ovulates late).
 *   - temperature / symptom / intercourse / supplement: always visible.
 */
export function getFemaleRecordVisibility(summary: ComputedCycleSummary): {
  visible: RecordKind[];
  primary: RecordKind;
} {
  const order = FEMALE_PHASE_RECORD_ORDER[summary.phase];
  const visible = order.filter((kind) => isKindVisible(kind, summary));
  const primary = visible[0] ?? order[0];
  return { visible, primary };
}

function isKindVisible(kind: RecordKind, summary: ComputedCycleSummary): boolean {
  const { cycleDay, averagePeriodLength, averageCycleLength } = summary;

  if (kind === "period") {
    const inEarlyBuffer = cycleDay <= averagePeriodLength + PERIOD_END_BUFFER_DAYS;
    const inLateBuffer = cycleDay >= averageCycleLength - PERIOD_EARLY_ARRIVAL_DAYS;
    return inEarlyBuffer || inLateBuffer;
  }

  if (kind === "ovulation_test") {
    const estimatedOvulationCycleDay = Math.max(8, averageCycleLength - LUTEAL_PHASE_LENGTH);
    const afterPeriodBleed = cycleDay >= OVULATION_TEST_EARLIEST_DAY;
    const beforeLateLuteal = cycleDay <= estimatedOvulationCycleDay + OVULATION_LATE_BUFFER_DAYS;
    return afterPeriodBleed && beforeLateLuteal;
  }

  return true;
}

/** Days past the estimated end of bleed that we still show the period record. */
const PERIOD_END_BUFFER_DAYS = 2;
/** Days before the estimated next period that we re-show the period record. */
const PERIOD_EARLY_ARRIVAL_DAYS = 4;
/** Earliest cycle day on which an LH test result is meaningful. */
const OVULATION_TEST_EARLIEST_DAY = 3;
/** Days past the estimated ovulation that we still keep the LH option around. */
const OVULATION_LATE_BUFFER_DAYS = 4;
/** Typical luteal-phase length (used to estimate ovulation day). */
const LUTEAL_PHASE_LENGTH = 13;

/**
 * Per-phase ordering of every record kind. Visibility filtering above decides
 * which ones actually appear, but when an ambiguous kind (period flow,
 * ovulation test) is in its buffer window it slots in at the tail rather than
 * pushing the phase's primary record off the top.
 */
const FEMALE_PHASE_RECORD_ORDER: Record<CyclePhase, RecordKind[]> = {
  period: ["period", "symptom", "temperature", "intercourse", "supplement", "ovulation_test"],
  follicular: ["temperature", "symptom", "intercourse", "ovulation_test", "supplement", "period"],
  "fertile-soon": ["ovulation_test", "temperature", "intercourse", "symptom", "supplement", "period"],
  fertile: ["ovulation_test", "intercourse", "temperature", "symptom", "supplement", "period"],
  luteal: ["symptom", "temperature", "intercourse", "supplement", "period", "ovulation_test"]
};

export type ComputedCycleSummary = {
  cycleDay: number;
  fertileWindow: FertileWindow;
  fertileWindowLabel: string;
  phase: CyclePhase;
  recentSymptoms: string[];
  latestPeriodStart: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  /** Number of full cycle gaps observed; >=1 means we inferred from history. */
  sampleCycles: number;
};

export type InferredCycleAverages = {
  averageCycleLength: number;
  averagePeriodLength: number;
  /** Periods detected, sorted DESC by start day. */
  periodStretches: Array<{ start: string; length: number }>;
  /** Number of cycle gaps we trusted (after filtering implausible outliers). */
  sampleCycles: number;
};

const MIN_PLAUSIBLE_CYCLE = 18;
const MAX_PLAUSIBLE_CYCLE = 60;

/**
 * Infers per-user cycle length and period length from the actual records,
 * falling back to defaults when there isn't enough history to be confident.
 * Cycle length uses the median of recent gaps (robust to one missed cycle),
 * filtered to a plausible range.
 */
export function inferCycleAverages(records: AppCycleLog[]): InferredCycleAverages {
  const stretches = findPeriodStretches(records);

  const periodLengths = stretches.map((s) => s.length).filter((length) => length >= 1 && length <= 12);
  const averagePeriodLength =
    periodLengths.length > 0 ? Math.round(median(periodLengths)) : DEFAULT_PERIOD_LENGTH;

  const sortedAsc = [...stretches].sort((a, b) => a.start.localeCompare(b.start));
  const gaps: number[] = [];
  for (let i = 1; i < sortedAsc.length; i += 1) {
    const gap = daysBetween(sortedAsc[i - 1].start, sortedAsc[i].start);
    if (gap >= MIN_PLAUSIBLE_CYCLE && gap <= MAX_PLAUSIBLE_CYCLE) {
      gaps.push(gap);
    }
  }
  const recentGaps = gaps.slice(-6);
  const averageCycleLength =
    recentGaps.length > 0 ? Math.round(median(recentGaps)) : DEFAULT_CYCLE_LENGTH;

  return {
    averageCycleLength,
    averagePeriodLength,
    periodStretches: stretches,
    sampleCycles: recentGaps.length
  };
}

export function computeCycleSummary(
  records: AppCycleLog[],
  today: string,
  options?: { averageCycleLength?: number; averagePeriodLength?: number }
): ComputedCycleSummary | null {
  const inferred = inferCycleAverages(records);
  const latestPeriodStart = inferred.periodStretches[0]?.start ?? null;
  if (!latestPeriodStart) {
    return null;
  }

  const averageCycleLength = options?.averageCycleLength ?? inferred.averageCycleLength;
  const averagePeriodLength = options?.averagePeriodLength ?? inferred.averagePeriodLength;
  const estimate = estimateCycle({
    today,
    latestPeriodStart,
    averageCycleLength,
    averagePeriodLength
  });

  return {
    cycleDay: estimate.cycleDay,
    fertileWindow: estimate.fertileWindow,
    fertileWindowLabel: formatFertileWindow(estimate.fertileWindow),
    phase: estimate.phase,
    recentSymptoms: collectRecentSymptoms(records, today),
    latestPeriodStart,
    averageCycleLength,
    averagePeriodLength,
    sampleCycles: inferred.sampleCycles
  };
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function findPeriodStretches(records: AppCycleLog[]): Array<{ start: string; length: number }> {
  const dates = new Set(
    records.filter((record) => isPeriodRecord(record)).map((record) => record.happenedOn)
  );
  if (dates.size === 0) {
    return [];
  }

  const sortedAsc = Array.from(dates).sort();
  const stretches: Array<{ start: string; length: number }> = [];

  for (const date of sortedAsc) {
    if (dates.has(addDays(date, -1))) {
      continue;
    }
    let length = 1;
    let next = addDays(date, 1);
    while (dates.has(next)) {
      length += 1;
      next = addDays(next, 1);
    }
    stretches.push({ start: date, length });
  }

  return stretches.sort((a, b) => b.start.localeCompare(a.start));
}

export function formatFertileWindow(window: FertileWindow): string {
  return `${formatChineseDate(window.startsOn)}-${formatChineseDate(window.endsOn)}`;
}

function formatChineseDate(value: string): string {
  const date = parseDate(value);
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

function isPeriodRecord(record: AppCycleLog): boolean {
  if (record.logType === "period") {
    return true;
  }
  return record.payload.kind === "period";
}

function collectRecentSymptoms(records: AppCycleLog[], today: string, lookbackDays = 7): string[] {
  const since = addDays(today, -lookbackDays);
  const seen = new Set<string>();
  const result: string[] = [];

  const sorted = [...records]
    .filter((record) => record.happenedOn >= since && record.happenedOn <= today)
    .sort((a, b) => b.happenedOn.localeCompare(a.happenedOn));

  for (const record of sorted) {
    if (!isSymptomRecord(record)) {
      continue;
    }
    const value = typeof record.payload.value === "string" ? record.payload.value.trim() : "";
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
    if (result.length >= 3) {
      break;
    }
  }
  return result;
}

function isSymptomRecord(record: AppCycleLog): boolean {
  return record.logType === "symptom" || record.payload.kind === "symptom";
}

export function getTodayTasks(input: CycleInput): TodayTask[] {
  const estimate = estimateCycle(input);
  const tasks: TodayTask[] = [];

  if (estimate.phase === "fertile" || estimate.phase === "fertile-soon") {
    tasks.push({
      id: "lh-test",
      title: "记录 LH 试纸",
      description: "接近排卵窗口时每天固定时段记录更容易看出峰值。",
      tone: "primary"
    });
    tasks.push({
      id: "temperature",
      title: "测量基础体温",
      description: "醒来后先测温，帮助回看排卵后的体温变化。",
      tone: "calm"
    });
    tasks.push({
      id: "movement",
      title: "安排轻松运动",
      description: "保持低压力节奏，避免把备孕任务排得太满。",
      tone: "care"
    });
    return tasks;
  }

  if (estimate.phase === "period") {
    return [
      {
        id: "flow",
        title: "记录经血量",
        description: "记录颜色、流量和疼痛感，后续趋势会更准确。",
        tone: "primary"
      },
      {
        id: "rest",
        title: "关注休息",
        description: "今天优先观察身体感受，不强行安排备孕任务。",
        tone: "care"
      }
    ];
  }

  return [
    {
      id: "symptoms",
      title: "记录身体信号",
      description: "白带、睡眠、情绪和压力都会影响周期洞察。",
      tone: "calm"
    },
    {
      id: "coach-checkin",
      title: "查看 AI 今日建议",
      description: "让教练基于当前周期给出温和的行动建议。",
      tone: "primary"
    }
  ];
}

function getPhase(
  today: string,
  cycleDay: number,
  averagePeriodLength: number,
  fertileWindow: FertileWindow
): CyclePhase {
  if (cycleDay <= averagePeriodLength) {
    return "period";
  }

  if (isWithin(today, fertileWindow.startsOn, fertileWindow.endsOn)) {
    return today < fertileWindow.peaksOn ? "fertile-soon" : "fertile";
  }

  if (today === addDays(fertileWindow.startsOn, -1)) {
    return "fertile-soon";
  }

  if (today < fertileWindow.startsOn) {
    return "follicular";
  }

  return "luteal";
}
