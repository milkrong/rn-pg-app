import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";
import { getPlanLimits } from "@/domain/entitlements";
import { formatRenewalDate, SUBSCRIPTION_FEATURES } from "@/domain/subscription";
import { getAuthSnapshot, subscribeToAuthChanges } from "@/services/auth";
import { getAiUsageToday, getEntitlement } from "@/services/cloudSync";
import {
  getSubscriptionState,
  purchasePro,
  refreshSubscriptionFromCloud,
  restorePurchases,
  type SubscriptionState
} from "@/services/revenueCat";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

const proLimits = getPlanLimits("pro");

export default function SubscriptionScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [aiUsage, setAiUsage] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getAuthSnapshot()
      .then((snapshot) => {
        if (isMounted) {
          setUser(snapshot.user);
        }
      })
      .catch(() => undefined);

    const unsubscribe = subscribeToAuthChanges(setUser);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setPlan("free");
      setAiUsage(0);
      setSubscription(null);
      return;
    }

    let isMounted = true;
    Promise.all([getEntitlement(), getAiUsageToday(), getSubscriptionState()])
      .then(([entitlement, usage, subscriptionState]) => {
        if (!isMounted) {
          return;
        }
        setPlan(subscriptionState.plan ?? entitlement.plan);
        setAiUsage(usage);
        setSubscription(subscriptionState);
      })
      .catch(() => {
        if (isMounted) {
          setError("无法读取订阅或 AI 用量。");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleAction(action: "purchase" | "restore" | "refresh") {
    if (!user) {
      setError("请先登录，再管理订阅。");
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const next =
        action === "purchase"
          ? await purchasePro()
          : action === "restore"
            ? await restorePurchases()
            : await refreshSubscriptionFromCloud();

      setSubscription(next);
      setPlan(next.plan);
      setMessage(
        action === "purchase"
          ? "购买完成，订阅状态已刷新。"
          : action === "restore"
            ? "恢复购买完成。若刚完成支付，RevenueCat webhook 可能需要几秒同步。"
            : "订阅状态已刷新。"
      );
    } catch (subscriptionError) {
      setError(subscriptionError instanceof Error ? subscriptionError.message : "订阅操作失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function openManagement() {
    if (!subscription?.managementUrl) {
      setError("当前没有可打开的订阅管理链接。");
      return;
    }
    await Linking.openURL(subscription.managementUrl);
  }

  return (
    <Screen title="订阅">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" color={colors.ink} size={18} />
          <Text style={styles.backText}>返回</Text>
        </Pressable>

        {!user ? (
          <View style={styles.hintCard}>
            <Text style={styles.hintTitle}>需要登录</Text>
            <Text style={styles.hintBody}>先登录才能管理订阅。</Text>
            <Pressable
              onPress={() => router.push("/profile/login")}
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            >
              <Text style={styles.linkButtonText}>去登录</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.plan}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planEyebrow}>我的套餐</Text>
              <Text style={styles.planTitle}>{plan === "pro" ? "Nurture Pro" : "Nurture Free"}</Text>
            </View>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{plan === "pro" ? "PRO" : "FREE"}</Text>
            </View>
          </View>
          <Text style={styles.planBody}>
            今天已用 AI {aiUsage}/{getPlanLimits(plan).dailyAiMessages} 次。升级 Pro 每天可问 {proLimits.dailyAiMessages} 次，还能云端同步和看详细分析。
          </Text>
          <View style={styles.featureList}>
            {SUBSCRIPTION_FEATURES.map((feature) => {
              const included = feature.includedIn.includes(plan);
              return (
                <View key={feature.label} style={styles.featureRow}>
                  <Text style={[styles.featureMark, included && styles.featureMarkActive]}>{included ? "✓" : "+"}</Text>
                  <Text style={styles.featureText}>{feature.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.subscriptionMeta}>
            <Text style={styles.subscriptionMetaText}>
              {subscription?.package?.price ? `${subscription.package.price}/月` : "正在获取价格…"}
            </Text>
            <Text style={styles.subscriptionMetaText}>
              {plan === "pro" ? `Pro 有效期至 ${formatRenewalDate(subscription?.renewalDate)}` : "升级后自动激活 Pro"}
            </Text>
          </View>
          <View style={styles.subscriptionActions}>
            <Pressable
              disabled={!user || isBusy || plan === "pro"}
              onPress={() => handleAction("purchase")}
              style={[styles.primaryButton, (!user || isBusy || plan === "pro") && styles.disabledButton]}
            >
              <Text style={styles.primaryButtonText}>
                {plan === "pro" ? "已是 Pro" : isBusy ? "处理中" : "升级到 Pro"}
              </Text>
            </Pressable>
            <Pressable
              disabled={!user || isBusy}
              onPress={() => handleAction("restore")}
              style={[styles.secondaryButton, (!user || isBusy) && styles.disabledButton]}
            >
              <Text style={styles.secondaryButtonText}>恢复购买</Text>
            </Pressable>
          </View>
          <View style={styles.subscriptionFooter}>
            <Pressable disabled={!user || isBusy} onPress={() => handleAction("refresh")}>
              <Text style={styles.planAction}>刷新</Text>
            </Pressable>
            {subscription?.managementUrl ? (
              <Pressable onPress={openManagement}>
                <Text style={styles.planAction}>管理订阅</Text>
              </Pressable>
            ) : null}
          </View>
          {!subscription?.canPurchase ? (
            <Text style={styles.subscriptionHint}>订阅功能需要正式打包后才能使用。</Text>
          ) : null}
        </View>

        {message ? <Text selectable style={styles.messageText}>{message}</Text> : null}
        {error ? <Text selectable style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    marginBottom: spacing.md,
    paddingVertical: 6
  },
  backText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  hintCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  hintTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  hintBody: {
    ...typography.body,
    color: colors.text
  },
  linkButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.coral,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10
  },
  linkButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  plan: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    gap: spacing.md,
    padding: spacing.lg
  },
  planHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  planEyebrow: {
    color: colors.blush,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4
  },
  planTitle: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "900"
  },
  planBadge: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  planBadgeText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  planBody: {
    ...typography.body,
    color: colors.blush
  },
  featureList: {
    gap: spacing.sm
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  featureMark: {
    color: colors.blush,
    fontSize: 15,
    fontWeight: "900",
    width: 18
  },
  featureMarkActive: {
    color: colors.surface
  },
  featureText: {
    color: colors.surface,
    flex: 1,
    fontSize: 14,
    fontWeight: "800"
  },
  subscriptionMeta: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.sm,
    gap: 6,
    padding: spacing.sm
  },
  subscriptionMetaText: {
    color: colors.blush,
    fontSize: 13,
    lineHeight: 19
  },
  subscriptionActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: radius.sm,
    flex: 1,
    padding: spacing.md
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md
  },
  secondaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  disabledButton: {
    opacity: 0.48
  },
  subscriptionFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  planAction: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  subscriptionHint: {
    color: colors.blush,
    fontSize: 13,
    lineHeight: 19
  },
  messageText: {
    color: colors.sage,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.md
  },
  errorText: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.md
  },
  pressed: {
    opacity: 0.7
  }
});
