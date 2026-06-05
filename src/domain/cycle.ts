import { addDays, daysBetween, isWithin } from "./date";

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
