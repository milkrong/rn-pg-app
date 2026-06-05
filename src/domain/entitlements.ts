export type Plan = "free" | "pro";

export type PlanLimits = {
  dailyAiMessages: number;
  cloudSync: boolean;
  deepInsights: boolean;
  healthKitSync: boolean;
};

const LIMITS: Record<Plan, PlanLimits> = {
  free: {
    dailyAiMessages: 3,
    cloudSync: false,
    deepInsights: false,
    healthKitSync: true
  },
  pro: {
    dailyAiMessages: 30,
    cloudSync: true,
    deepInsights: true,
    healthKitSync: true
  }
};

export function getPlanLimits(plan: Plan): PlanLimits {
  return LIMITS[plan];
}

export function canUseAiCoach(input: {
  plan: Plan;
  aiMessagesUsedToday: number;
}): boolean {
  return input.aiMessagesUsedToday < getPlanLimits(input.plan).dailyAiMessages;
}
