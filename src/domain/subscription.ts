import { getPlanLimits, type Plan } from "./entitlements";

export const PRO_ENTITLEMENT_ID = "pro";
export const DEFAULT_OFFERING_ID = "default";

export type SubscriptionFeature = {
  label: string;
  includedIn: Plan[];
};

export const SUBSCRIPTION_FEATURES: SubscriptionFeature[] = [
  {
    label: `每日 ${getPlanLimits("pro").dailyAiMessages} 次 AI 问答`,
    includedIn: ["pro"]
  },
  {
    label: "云端同步记录",
    includedIn: ["pro"]
  },
  {
    label: "深度趋势报告",
    includedIn: ["pro"]
  },
  {
    label: "HealthKit 记录同步",
    includedIn: ["free", "pro"]
  }
];

export function formatRenewalDate(value?: string | null): string {
  if (!value) {
    return "未获取到续费日期";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "续费日期异常";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
