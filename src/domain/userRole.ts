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
    title: "今天的备孕小目标已就位 ✨",
    subtitle: "Nurture",
    todayTitle: "女生备孕模式",
    heroLabel: "周期第 12 天",
    heroPhase: "好孕窗口快到了 🌸",
    heroTitle: "预计 6月10日 排卵",
    heroBody: "6月6日到11日是你的好孕窗口。今天开始每天测一下排卵试纸和体温就好。",
    timeline: ["5", "6", "7", "8", "9", "10", "11"].map((label) => ({ label, isPeak: label === "10" })),
    metrics: [
      { label: "LH 记录", value: "未测", detail: "今天还没测", tone: "coral" },
      { label: "基础体温", value: "36.62°C", detail: "比昨天高了 0.1°", tone: "sage" }
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
        description: "快到排卵期了，每天固定时间测一下，更容易看出变化。",
        tone: "primary"
      },
      {
        id: "temperature",
        title: "测量基础体温",
        description: "早上醒了先量体温，不用急着起床。",
        tone: "calm"
      },
      {
        id: "rest",
        title: "留出低压力时段",
        description: "今天也要对自己好一点，不用把备孕当任务赶。",
        tone: "care"
      }
    ],
    coachIntro: "有什么想问的尽管说～我可以帮你看排卵试纸、体温变化，也能聊聊生活节奏怎么调整。",
    coachPrompts: ["今天怎么安排？", "排卵试纸阳了怎么办？", "这轮记录怎么样？"],
    coachSummary: {
      cycleDay: 12,
      fertileWindow: "6月6日-6月11日",
      recentSymptoms: ["轻微乳房胀痛", "睡眠一般"]
    },
    cycleTitle: "周期记录",
    cyclePanelTitle: "健康数据同步",
    cyclePanelBody: "可以和 iPhone 健康 App 互通经期、体温和排卵数据。需要你授权后才会读写，放心。",
    cycleRecords: ["经血量：无", "LH 试纸：待记录", "基础体温：36.62°C", "症状：轻微乳房胀痛"],
    insights: [
      ["排卵窗口可信度", "中等", "连续记录 2-3 个周期后会更稳定"],
      ["黄体期估计", "13 天", "处于常见范围内"],
      ["记录连续性", "82%", "体温记录最稳定"]
    ],
    reportTitle: "Pro 月度复盘报告",
    reportBody: "自动帮你整理每月的排卵规律和身体变化，看医生时也能直接给大夫看。"
  },
  male: {
    role: "male",
    label: "男生",
    title: "今天能帮上忙的都在这 💪",
    subtitle: "Nurture Partner",
    todayTitle: "男生备孕模式",
    heroLabel: "一起备孕第 12 天",
    heroPhase: "关键期 · 要上心",
    heroTitle: "这周多注意休息，咱配合好节奏",
    heroBody: "好好睡觉、少喝酒、别泡太烫的澡，跟她商量好安排就行。",
    timeline: ["睡眠", "运动", "饮酒", "桑拿", "同房", "压力", "补剂"].map((label, index) => ({
      label,
      isPeak: index === 4
    })),
    metrics: [
      { label: "禁欲间隔", value: "2 天", detail: "节奏刚好", tone: "coral" },
      { label: "睡眠记录", value: "7.2h", detail: "最近三天挺稳", tone: "sage" }
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
        description: "今天别泡热水澡、蒸桑拿，电脑也别放腿上太久。",
        tone: "primary"
      },
      {
        id: "sleep",
        title: "保证睡眠",
        description: "尽量早点放下手机，睡个好觉比啥都强。",
        tone: "calm"
      },
      {
        id: "support",
        title: "同步伴侣计划",
        description: "跟她随意聊聊今天或明天的安排就好，别搞得太严肃。",
        tone: "care"
      }
    ],
    coachIntro: "想聊什么都行～生活习惯怎么调、怎么配合她的节奏，都可以问我。",
    coachPrompts: ["今天怎么配合？", "间隔几天比较好？", "哪些习惯要注意？"],
    coachSummary: {
      cycleDay: 12,
      fertileWindow: "伴侣预计 6月6日-6月11日",
      recentSymptoms: ["睡眠 7.2 小时", "近 3 天无饮酒", "计划配合同房窗口"]
    },
    cycleTitle: "备孕支持记录",
    cyclePanelTitle: "一起备孕",
    cyclePanelBody: "你这边主要记录生活习惯和同房安排，帮你看看有没有能改善的地方。",
    cycleRecords: ["禁欲间隔：2 天", "运动：30 分钟轻运动", "饮酒：无", "高温暴露：无"],
    insights: [
      ["同房节奏", "合适", "当前间隔适合配合易孕窗口"],
      ["生活习惯", "稳定", "睡眠和饮酒记录连续性较好"],
      ["支持任务", "3 项", "本周已完成 3 个伴侣支持任务"]
    ],
    reportTitle: "Pro 备孕搭档报告",
    reportBody: "帮你俩一起看看最近睡眠、运动、喝酒和作息的整体情况。"
  }
};

export function getRoleContent(role: UserRole | null): RoleContent | null {
  return role ? ROLE_CONTENT[role] : null;
}
