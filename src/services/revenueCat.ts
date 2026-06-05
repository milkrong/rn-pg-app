import type { Plan } from "@/domain/entitlements";

export type SubscriptionState = {
  plan: Plan;
  renewalDate?: string;
  managementUrl?: string;
};

export async function getSubscriptionState(): Promise<SubscriptionState> {
  return {
    plan: "pro",
    renewalDate: "2026-07-05"
  };
}

export async function restorePurchases(): Promise<SubscriptionState> {
  return getSubscriptionState();
}
