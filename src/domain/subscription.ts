import { getPlanLimits, type Plan } from "./entitlements";

export const PRO_ENTITLEMENT_ID = "pro";
export const DEFAULT_OFFERING_ID = "default";

export type SubscriptionFeature = {
  label: string;
  includedIn: Plan[];
};

export const SUBSCRIPTION_FEATURES: SubscriptionFeature[] = [
  {
    label: `每天 ${getPlanLimits("pro").dailyAiMessages} 次 AI 对话`,
    includedIn: ["pro"]
  },
  {
    label: "记录云端备份",
    includedIn: ["pro"]
  },
  {
    label: "月度分析报告",
    includedIn: ["pro"]
  },
  {
    label: "健康 App 数据同步",
    includedIn: ["free", "pro"]
  }
];

export function formatRenewalDate(value?: string | null): string {
  if (!value) {
    return "暂未获取到";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "日期有误";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
