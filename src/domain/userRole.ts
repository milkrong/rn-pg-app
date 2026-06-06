import type { CycleSummary } from "./ai";
import type { TodayTask } from "./cycle";

export type UserRole = "female" | "male";

export type RoleMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "coral" | "sage";
};

export type RoleQuickLog = {
  icon: "water-outline" | "thermometer-outline" | "flask-outline" | "leaf-outline" | "fitness-outline" | "bed-outline" | "wine-outline" | "heart-outline";
  label: string;
};

export type RoleContent = {
  role: UserRole;
  label: string;
  title: string;
  subtitle: string;
  todayTitle: string;
  heroLabel: string;
  heroPhase: string;
  heroTitle: string;
  heroBody: string;
  timeline: Array<{ label: string; isPeak?: boolean }>;
  metrics: RoleMetric[];
  quickLogs: RoleQuickLog[];
  tasks: TodayTask[];
  coachIntro: string;
  coachPrompts: string[];
  coachSummary: CycleSummary;
  cycleTitle: string;
  cyclePanelTitle: string;
  cyclePanelBody: string;
  cycleRecords: string[];
  insights: Array<[string, string, string]>;
  reportTitle: string;
  reportBody: string;
};

export const ROLE_CONTENT: Record<UserRole, RoleContent> = {
  female: {
    role: "female",
    label: "女生",
    title: "今天慢慢来，也有方向",
    subtitle: "Nurture",
    todayTitle: "女生备孕模式",
    heroLabel: "周期第 12 天",
    heroPhase: "易孕期临近",
    heroTitle: "预测排卵峰值在 6月10日",
    heroBody: "你的易孕窗口预计为 6月6日-6月11日。今天适合开始固定记录 LH 试纸和基础体温。",
    timeline: ["5", "6", "7", "8", "9", "10", "11"].map((label) => ({ label, isPeak: label === "10" })),
    metrics: [
      { label: "LH 记录", value: "未测", detail: "今日待测", tone: "coral" },
      { label: "基础体温", value: "36.62°C", detail: "较昨日 +0.1", tone: "sage" }
    ],
    quickLogs: [
      { icon: "water-outline", label: "经期" },
      { icon: "thermometer-outline", label: "体温" },
      { icon: "flask-outline", label: "LH 试纸" },
      { icon: "leaf-outline", label: "症状" }
    ],
    tasks: [
      {
        id: "lh-test",
        title: "记录 LH 试纸",
        description: "接近排卵窗口时每天固定时段记录更容易看出峰值。",
        tone: "primary"
      },
      {
        id: "temperature",
        title: "测量基础体温",
        description: "醒来后先测温，帮助回看排卵后的体温变化。",
        tone: "calm"
      },
      {
        id: "rest",
        title: "留出低压力时段",
        description: "备孕不是任务清单，把身体感受和情绪也一起照顾到。",
        tone: "care"
      }
    ],
    coachIntro: "你可以问周期、LH、体温、症状和同房安排。我会给出非诊断的记录和生活方式建议。",
    coachPrompts: ["今天怎么安排？", "LH 阳性后怎么办？", "本周期趋势怎么看？"],
    coachSummary: {
      cycleDay: 12,
      fertileWindow: "6月6日-6月11日",
      recentSymptoms: ["轻微乳房胀痛", "睡眠一般"]
    },
    cycleTitle: "周期记录",
    cyclePanelTitle: "HealthKit 同步",
    cyclePanelBody: "读取并写入经期、基础体温和排卵测试结果。所有同步都需要你在 iOS 权限弹窗中明确授权。",
    cycleRecords: ["经血量：无", "LH 试纸：待记录", "基础体温：36.62°C", "症状：轻微乳房胀痛"],
    insights: [
      ["排卵窗口可信度", "中等", "连续记录 2-3 个周期后会更稳定"],
      ["黄体期估计", "13 天", "处于常见范围内"],
      ["记录连续性", "82%", "体温记录最稳定"]
    ],
    reportTitle: "Pro 深度报告",
    reportBody: "汇总周期长度、LH 峰值、体温升高和症状变化，生成适合复盘或就医沟通的月度备孕报告。"
  },
  male: {
    role: "male",
    label: "男生",
    title: "把备孕支持做得更具体",
    subtitle: "Nurture Partner",
    todayTitle: "男生备孕模式",
    heroLabel: "备孕支持第 12 天",
    heroPhase: "配合窗口",
    heroTitle: "本周重点是规律、休息和计划",
    heroBody: "保持睡眠、减少酒精和高温暴露，和伴侣一起安排低压力的同房节奏。",
    timeline: ["睡眠", "运动", "饮酒", "桑拿", "同房", "压力", "补剂"].map((label, index) => ({
      label,
      isPeak: index === 4
    })),
    metrics: [
      { label: "禁欲间隔", value: "2 天", detail: "适合配合窗口", tone: "coral" },
      { label: "睡眠记录", value: "7.2h", detail: "近 3 天稳定", tone: "sage" }
    ],
    quickLogs: [
      { icon: "fitness-outline", label: "运动" },
      { icon: "bed-outline", label: "睡眠" },
      { icon: "wine-outline", label: "饮酒" },
      { icon: "heart-outline", label: "同房" }
    ],
    tasks: [
      {
        id: "heat",
        title: "避免高温暴露",
        description: "今天尽量避开桑拿、热水泡澡和长时间把电脑放在腿上。",
        tone: "primary"
      },
      {
        id: "sleep",
        title: "保证睡眠",
        description: "规律睡眠比临时补救更重要，晚上优先留出放松时间。",
        tone: "calm"
      },
      {
        id: "support",
        title: "同步伴侣计划",
        description: "用轻松的方式确认今天或明天的安排，减少临时压力。",
        tone: "care"
      }
    ],
    coachIntro: "你可以问精子健康习惯、同房计划、运动睡眠、压力管理和如何支持伴侣。",
    coachPrompts: ["今天怎么配合？", "禁欲几天合适？", "哪些习惯影响精子？"],
    coachSummary: {
      cycleDay: 12,
      fertileWindow: "伴侣预计 6月6日-6月11日",
      recentSymptoms: ["睡眠 7.2 小时", "近 3 天无饮酒", "计划配合同房窗口"]
    },
    cycleTitle: "备孕支持记录",
    cyclePanelTitle: "伴侣协作",
    cyclePanelBody: "男生侧重点不是记录经期，而是同步易孕窗口、同房节奏、睡眠运动和影响精子健康的生活习惯。",
    cycleRecords: ["禁欲间隔：2 天", "运动：30 分钟轻运动", "饮酒：无", "高温暴露：无"],
    insights: [
      ["同房节奏", "合适", "当前间隔适合配合易孕窗口"],
      ["生活习惯", "稳定", "睡眠和饮酒记录连续性较好"],
      ["支持任务", "3 项", "本周已完成 3 个伴侣支持任务"]
    ],
    reportTitle: "Pro 伴侣协作报告",
    reportBody: "汇总同房节奏、睡眠运动、饮酒压力和高温暴露记录，帮助两个人一起复盘备孕状态。"
  }
};

export function getRoleContent(role: UserRole | null): RoleContent | null {
  return role ? ROLE_CONTENT[role] : null;
}
