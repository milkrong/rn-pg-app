import type { Ionicons } from "@expo/vector-icons";

import type { Json } from "@/services/database.types";
import type { CycleLogType } from "@/services/cloudSync";

import type { UserRole } from "./userRole";

export type RecordKind =
  | "period"
  | "temperature"
  | "ovulation_test"
  | "symptom"
  | "intercourse"
  | "supplement"
  | "sleep"
  | "exercise"
  | "alcohol"
  | "stress"
  | "heat";

export type RecordOption = {
  kind: RecordKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  logType: CycleLogType;
  quickValues: string[];
  placeholder: string;
};

export type AppCycleLog = {
  localId: string;
  logType: CycleLogType;
  happenedOn: string;
  payload: Record<string, Json | undefined>;
  clientUpdatedAt: string;
  syncStatus: "local" | "synced";
};

export const FEMALE_RECORD_OPTIONS: RecordOption[] = [
  {
    kind: "period",
    label: "经期",
    icon: "water-outline",
    logType: "period",
    quickValues: ["少量", "中等", "较多", "点滴"],
    placeholder: "经血量、颜色或痛感"
  },
  {
    kind: "temperature",
    label: "体温",
    icon: "thermometer-outline",
    logType: "temperature",
    quickValues: ["36.3", "36.5", "36.7", "36.9"],
    placeholder: "基础体温，例如 36.62"
  },
  {
    kind: "ovulation_test",
    label: "LH 试纸",
    icon: "flask-outline",
    logType: "ovulation_test",
    quickValues: ["阴性", "弱阳", "阳性", "强阳"],
    placeholder: "LH 结果或试纸颜色变化"
  },
  {
    kind: "symptom",
    label: "症状",
    icon: "leaf-outline",
    logType: "symptom",
    quickValues: ["腹胀", "乳房胀痛", "拉丝白带", "情绪波动"],
    placeholder: "身体信号或情绪"
  },
  {
    kind: "intercourse",
    label: "同房",
    icon: "heart-outline",
    logType: "intercourse",
    quickValues: ["已安排", "已记录", "低压力", "跳过"],
    placeholder: "同房安排或备注"
  },
  {
    kind: "supplement",
    label: "补充剂",
    icon: "medkit-outline",
    logType: "supplement",
    quickValues: ["叶酸", "维D", "辅酶Q10", "按时"],
    placeholder: "今天服用的补充剂"
  }
];

export const MALE_RECORD_OPTIONS: RecordOption[] = [
  {
    kind: "sleep",
    label: "睡眠",
    icon: "bed-outline",
    logType: "symptom",
    quickValues: ["6h", "7h", "8h", "睡眠一般"],
    placeholder: "睡眠时长或质量"
  },
  {
    kind: "exercise",
    label: "运动",
    icon: "fitness-outline",
    logType: "symptom",
    quickValues: ["散步", "30分钟", "力量训练", "休息"],
    placeholder: "运动类型和时长"
  },
  {
    kind: "alcohol",
    label: "饮酒",
    icon: "wine-outline",
    logType: "symptom",
    quickValues: ["无", "少量", "社交饮酒", "已避免"],
    placeholder: "饮酒情况"
  },
  {
    kind: "heat",
    label: "高温",
    icon: "sunny-outline",
    logType: "symptom",
    quickValues: ["无", "热水澡", "桑拿", "久坐"],
    placeholder: "高温暴露情况"
  },
  {
    kind: "intercourse",
    label: "同房",
    icon: "heart-outline",
    logType: "intercourse",
    quickValues: ["已安排", "已记录", "低压力", "跳过"],
    placeholder: "同房节奏或备注"
  },
  {
    kind: "stress",
    label: "压力",
    icon: "pulse-outline",
    logType: "symptom",
    quickValues: ["低", "中等", "偏高", "已放松"],
    placeholder: "压力状态或放松方式"
  }
];

export function getRecordOptions(role: UserRole): RecordOption[] {
  return role === "male" ? MALE_RECORD_OPTIONS : FEMALE_RECORD_OPTIONS;
}

export function getRecordOption(role: UserRole, kind: RecordKind): RecordOption {
  return getRecordOptions(role).find((option) => option.kind === kind) ?? getRecordOptions(role)[0];
}

export function createRecordPayload(option: RecordOption, value: string, note: string): Record<string, Json> {
  return {
    kind: option.kind,
    label: option.label,
    value: value.trim(),
    note: note.trim()
  };
}

export function formatRecordTitle(log: Pick<AppCycleLog, "payload" | "logType">): string {
  const label = typeof log.payload.label === "string" ? log.payload.label : fallbackLabel(log.logType);
  const value = typeof log.payload.value === "string" ? log.payload.value : "";
  return value ? `${label}：${value}` : label;
}

export function formatRecordDetail(log: Pick<AppCycleLog, "payload" | "happenedOn" | "syncStatus">): string {
  const note = typeof log.payload.note === "string" ? log.payload.note : "";
  const syncLabel = log.syncStatus === "synced" ? "已同步" : "本地";
  return [log.happenedOn, note, syncLabel].filter(Boolean).join(" · ");
}

function fallbackLabel(logType: CycleLogType): string {
  const labels: Record<CycleLogType, string> = {
    period: "经期",
    symptom: "记录",
    temperature: "体温",
    ovulation_test: "LH 试纸",
    intercourse: "同房",
    supplement: "补充剂"
  };

  return labels[logType];
}
