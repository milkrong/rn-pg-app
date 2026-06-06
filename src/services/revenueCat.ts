import { Platform } from "react-native";
import Purchases, { type CustomerInfo, type PurchasesPackage } from "react-native-purchases";

import { PRO_ENTITLEMENT_ID, DEFAULT_OFFERING_ID } from "@/domain/subscription";
import type { Plan } from "@/domain/entitlements";

import { getCurrentUserId, getEntitlement } from "./cloudSync";

export type SubscriptionPackage = {
  identifier: string;
  title: string;
  description: string;
  price: string;
  period: string | null;
};

export type SubscriptionState = {
  plan: Plan;
  renewalDate?: string | null;
  managementUrl?: string | null;
  package?: SubscriptionPackage;
  canPurchase: boolean;
  source: "supabase" | "revenuecat";
};

let configuredUserId: string | null = null;

export async function getSubscriptionState(): Promise<SubscriptionState> {
  const entitlement = await getEntitlement();
  const fallback: SubscriptionState = {
    plan: entitlement.plan,
    renewalDate: entitlement.expiresAt,
    canPurchase: hasRevenueCatApiKey(),
    source: "supabase"
  };

  if (!hasRevenueCatApiKey()) {
    return fallback;
  }

  try {
    await configureRevenueCat();
    const [customerInfo, purchasePackage] = await Promise.all([
      Purchases.getCustomerInfo(),
      getPreferredPackage()
    ]);

    return mergeCustomerInfo(customerInfo, fallback, purchasePackage);
  } catch {
    return fallback;
  }
}

export async function purchasePro(): Promise<SubscriptionState> {
  assertRevenueCatConfigured();
  await configureRevenueCat();

  const purchasePackage = await getPreferredPackage();
  if (!purchasePackage) {
    throw new Error("RevenueCat 未配置可购买的 offering/package。");
  }

  const result = await Purchases.purchasePackage(purchasePackage.raw);
  const cloudState = await getEntitlement().catch(() => null);

  return mergeCustomerInfo(result.customerInfo, {
    plan: cloudState?.plan ?? getPlanFromCustomerInfo(result.customerInfo),
    renewalDate: cloudState?.expiresAt ?? getRenewalDate(result.customerInfo),
    canPurchase: true,
    source: "revenuecat"
  }, purchasePackage);
}

export async function restorePurchases(): Promise<SubscriptionState> {
  assertRevenueCatConfigured();
  await configureRevenueCat();

  const customerInfo = await Purchases.restorePurchases();
  const purchasePackage = await getPreferredPackage().catch(() => null);
  const cloudState = await getEntitlement().catch(() => null);

  return mergeCustomerInfo(customerInfo, {
    plan: cloudState?.plan ?? getPlanFromCustomerInfo(customerInfo),
    renewalDate: cloudState?.expiresAt ?? getRenewalDate(customerInfo),
    canPurchase: true,
    source: "revenuecat"
  }, purchasePackage);
}

export async function refreshSubscriptionFromCloud(): Promise<SubscriptionState> {
  const entitlement = await getEntitlement();
  return {
    plan: entitlement.plan,
    renewalDate: entitlement.expiresAt,
    canPurchase: hasRevenueCatApiKey(),
    source: "supabase"
  };
}

function hasRevenueCatApiKey(): boolean {
  return Boolean(getRevenueCatApiKey());
}

function assertRevenueCatConfigured() {
  if (!hasRevenueCatApiKey()) {
    throw new Error("请先配置 RevenueCat 公钥：EXPO_PUBLIC_REVENUECAT_IOS_API_KEY 或 EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY。");
  }
}

async function configureRevenueCat() {
  const userId = await getCurrentUserId();
  if (configuredUserId === userId && (await Purchases.isConfigured().catch(() => false))) {
    return;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    throw new Error("RevenueCat API key is missing.");
  }

  Purchases.configure({ apiKey, appUserID: userId });
  configuredUserId = userId;
}

function getRevenueCatApiKey(): string | null {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? null;
  }

  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? null;
  }

  return process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? null;
}

async function getPreferredPackage(): Promise<{ raw: PurchasesPackage; view: SubscriptionPackage } | null> {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current ?? offerings.all[DEFAULT_OFFERING_ID] ?? Object.values(offerings.all)[0];
  const purchasePackage = offering?.availablePackages[0] ?? null;

  if (!purchasePackage) {
    return null;
  }

  return {
    raw: purchasePackage,
    view: {
      identifier: purchasePackage.identifier,
      title: purchasePackage.product.title || "Nurture Pro",
      description: purchasePackage.product.description || "解锁 Pro 功能",
      price: purchasePackage.product.priceString,
      period: purchasePackage.product.subscriptionPeriod
    }
  };
}

function mergeCustomerInfo(
  customerInfo: CustomerInfo,
  fallback: SubscriptionState,
  purchasePackage: { view: SubscriptionPackage } | null
): SubscriptionState {
  return {
    plan: getPlanFromCustomerInfo(customerInfo) === "pro" ? "pro" : fallback.plan,
    renewalDate: getRenewalDate(customerInfo) ?? fallback.renewalDate,
    managementUrl: customerInfo.managementURL ?? fallback.managementUrl,
    package: purchasePackage?.view ?? fallback.package,
    canPurchase: true,
    source: "revenuecat"
  };
}

function getPlanFromCustomerInfo(customerInfo: CustomerInfo): Plan {
  return customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive ? "pro" : "free";
}

function getRenewalDate(customerInfo: CustomerInfo): string | null {
  return customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]?.expirationDate ?? customerInfo.latestExpirationDate;
}
