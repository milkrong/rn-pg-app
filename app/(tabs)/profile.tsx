import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { User } from "@supabase/supabase-js";
import { getPlanLimits } from "@/domain/entitlements";
import { formatRenewalDate, SUBSCRIPTION_FEATURES } from "@/domain/subscription";
import type { UserRole } from "@/domain/userRole";
import { ROLE_CONTENT } from "@/domain/userRole";
import { deleteAccount, formatAuthError, getAuthSnapshot, signInWithEmail, signOut, signUpWithEmail, subscribeToAuthChanges } from "@/services/auth";
import { getAiUsageToday, getEntitlement } from "@/services/cloudSync";
import {
  getSubscriptionState,
  purchasePro,
  refreshSubscriptionFromCloud,
  restorePurchases,
  type SubscriptionState
} from "@/services/revenueCat";
import { getUserRole, saveUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

const proLimits = getPlanLimits("pro");

const legalLinks = [
  { label: "隐私政策", url: "https://example.com/nurture/privacy" },
  { label: "服务条款", url: "https://example.com/nurture/terms" },
  { label: "订阅条款", url: "https://example.com/nurture/subscription-terms" }
];

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [aiUsage, setAiUsage] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [isSubscriptionBusy, setIsSubscriptionBusy] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);
  const [aiContextEnabled, setAiContextEnabled] = useState(true);
  const [healthWriteEnabled, setHealthWriteEnabled] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let isMounted = true;

    getAuthSnapshot()
      .then((snapshot) => {
        if (!isMounted) {
          return;
        }

        setUser(snapshot.user);
        setIsConfigured(snapshot.isConfigured);
      })
      .catch(() => {
        if (isMounted) {
          setError("无法读取登录状态。");
        }
      });

    const unsubscribe = subscribeToAuthChanges(setUser);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getUserRole().then((storedRole) => {
      if (isMounted) {
        setRole(storedRole);
      }
    });

    const unsubscribe = subscribeUserRole(setRole);

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

  async function submitAuth(mode: "sign-in" | "sign-up") {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "sign-in") {
        const nextUser = await signInWithEmail({ email: email.trim(), password });
        setUser(nextUser);
        setMessage("登录成功。");
        return;
      }

      const result = await signUpWithEmail({ email: email.trim(), password });
      setUser(result.user);
      setMessage(result.needsEmailConfirmation ? "注册成功，请先完成邮箱确认。" : "注册并登录成功。");
    } catch (authError) {
      setError(formatAuthError(authError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await signOut();
      setUser(null);
      setMessage("已退出登录。");
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "退出失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function chooseRole(nextRole: UserRole) {
    setRole(nextRole);
    await saveUserRole(nextRole);
  }

  async function handleSubscriptionAction(action: "purchase" | "restore" | "refresh") {
    if (!user) {
      setError("请先登录，再管理订阅。");
      return;
    }

    setIsSubscriptionBusy(true);
    setError(null);
    setMessage(null);

    try {
      const nextSubscription =
        action === "purchase"
          ? await purchasePro()
          : action === "restore"
            ? await restorePurchases()
            : await refreshSubscriptionFromCloud();

      setSubscription(nextSubscription);
      setPlan(nextSubscription.plan);
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
      setIsSubscriptionBusy(false);
    }
  }

  async function openSubscriptionManagement() {
    if (!subscription?.managementUrl) {
      setError("当前没有可打开的订阅管理链接。");
      return;
    }

    await Linking.openURL(subscription.managementUrl);
  }

  function confirmDeleteAccount() {
    if (!user) {
      setError("请先登录，再删除账号。");
      return;
    }

    Alert.alert(
      "删除账号",
      "删除后你的账号、备孕记录、AI 对话都会清除，而且无法恢复。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确认删除",
          style: "destructive",
          onPress: handleDeleteAccount
        }
      ]
    );
  }

  async function handleDeleteAccount() {
    setIsDeletingAccount(true);
    setError(null);
    setMessage(null);

    try {
      await deleteAccount();
      setUser(null);
      setMessage("账号和云端数据已删除。");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除账号失败。");
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <Screen title="我的">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!isConfigured ? (
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>服务未就绪</Text>
            <Text selectable style={styles.authBody}>
              后台服务还没配好，暂时无法使用。
            </Text>
          </View>
        ) : null}

        {isConfigured ? (
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>{user ? "已登录" : "登录账号"}</Text>
            {user ? (
              <>
                <Text selectable style={styles.authBody}>{user.email}</Text>
                <Pressable disabled={isSubmitting} onPress={handleSignOut} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{isSubmitting ? "处理中" : "退出登录"}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="邮箱"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  textContentType="emailAddress"
                  value={email}
                />
                <TextInput
                  onChangeText={setPassword}
                  placeholder="密码"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  style={styles.input}
                  textContentType="password"
                  value={password}
                />
                <View style={styles.authActions}>
                  <Pressable disabled={isSubmitting} onPress={() => submitAuth("sign-in")} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>{isSubmitting ? "处理中" : "登录"}</Text>
                  </Pressable>
                  <Pressable disabled={isSubmitting} onPress={() => submitAuth("sign-up")} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>注册</Text>
                  </Pressable>
                </View>
              </>
            )}
            {message ? <Text selectable style={styles.messageText}>{message}</Text> : null}
            {error ? <Text selectable style={styles.errorText}>{error}</Text> : null}
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
              disabled={!user || isSubscriptionBusy || plan === "pro"}
              onPress={() => handleSubscriptionAction("purchase")}
              style={[styles.planPrimaryButton, (!user || isSubscriptionBusy || plan === "pro") && styles.disabledButton]}
            >
              <Text style={styles.planPrimaryButtonText}>
                {plan === "pro" ? "已是 Pro" : isSubscriptionBusy ? "处理中" : "升级到 Pro"}
              </Text>
            </Pressable>
            <Pressable
              disabled={!user || isSubscriptionBusy}
              onPress={() => handleSubscriptionAction("restore")}
              style={[styles.planSecondaryButton, (!user || isSubscriptionBusy) && styles.disabledButton]}
            >
              <Text style={styles.planSecondaryButtonText}>恢复购买</Text>
            </Pressable>
          </View>
          <View style={styles.subscriptionFooter}>
            <Pressable disabled={!user || isSubscriptionBusy} onPress={() => handleSubscriptionAction("refresh")}>
              <Text style={styles.planAction}>刷新</Text>
            </Pressable>
            {subscription?.managementUrl ? (
              <Pressable onPress={openSubscriptionManagement}>
                <Text style={styles.planAction}>管理订阅</Text>
              </Pressable>
            ) : null}
          </View>
          {!subscription?.canPurchase ? (
            <Text style={styles.subscriptionHint}>订阅功能需要正式打包后才能使用。</Text>
          ) : null}
        </View>

        <View style={styles.roleCard}>
          <Text style={styles.roleTitle}>我的模式</Text>
          <Text style={styles.roleBody}>当前是{role ? ROLE_CONTENT[role].label : "未选择"}模式。切换后所有页面内容会跟着变。</Text>
          <View style={styles.roleActions}>
            <Pressable
              onPress={() => chooseRole("female")}
              style={[styles.roleButton, role === "female" && styles.roleButtonActive]}
            >
              <Text style={[styles.roleButtonText, role === "female" && styles.roleButtonTextActive]}>女生</Text>
            </Pressable>
            <Pressable
              onPress={() => chooseRole("male")}
              style={[styles.roleButton, role === "male" && styles.roleButtonActive]}
            >
              <Text style={[styles.roleButtonText, role === "male" && styles.roleButtonTextActive]}>男生</Text>
            </Pressable>
          </View>
        </View>

        <PreferenceRow
          title="云同步"
          body="开启后你的记录会备份到云端。"
          enabled={cloudSyncEnabled}
          onChange={setCloudSyncEnabled}
        />
        <PreferenceRow
          title="AI 使用健康上下文"
          body="AI 只会看你允许它看的数据。"
          enabled={aiContextEnabled}
          onChange={setAiContextEnabled}
        />
        <PreferenceRow
          title="写入 Apple Health"
          body="只会把你在这里记的内容同步到健康 App。"
          enabled={healthWriteEnabled}
          onChange={setHealthWriteEnabled}
        />

        <View style={styles.legalCard}>
          <Text style={styles.legalTitle}>法律信息</Text>
          <Text style={styles.legalBody}>以下是我们的法律条款，请在使用前阅读。</Text>
          <View style={styles.legalLinks}>
            {legalLinks.map((item) => (
              <Pressable key={item.label} onPress={() => Linking.openURL(item.url)} style={styles.legalLink}>
                <Text style={styles.legalLinkText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.danger}>
          <Text style={styles.dangerTitle}>账号与数据</Text>
          <Text style={styles.dangerBody}>你可以随时关掉 AI 授权或删除账号。注意：删除账号不会自动取消订阅，请先去手机设置里取消。</Text>
          <Pressable
            disabled={!user || isDeletingAccount}
            onPress={confirmDeleteAccount}
            style={[styles.deleteButton, (!user || isDeletingAccount) && styles.disabledButton]}
          >
            <Text style={styles.deleteButtonText}>{isDeletingAccount ? "删除中" : "删除账号"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function PreferenceRow({
  title,
  body,
  enabled,
  onChange
}: {
  title: string;
  body: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Switch value={enabled} onValueChange={onChange} trackColor={{ true: colors.coralSoft }} thumbColor={colors.coral} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32
  },
  authCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md
  },
  authTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  authBody: {
    ...typography.body,
    color: colors.text
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: spacing.md
  },
  authActions: {
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
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  messageText: {
    color: colors.sage,
    fontSize: 14,
    fontWeight: "800"
  },
  errorText: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: "800"
  },
  roleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md
  },
  roleTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  roleBody: {
    ...typography.body,
    color: colors.text
  },
  roleActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  roleButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md
  },
  roleButtonActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral
  },
  roleButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  roleButtonTextActive: {
    color: colors.surface
  },
  plan: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
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
    letterSpacing: 0,
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
  planPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: radius.sm,
    flex: 1,
    padding: spacing.md
  },
  planPrimaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  planSecondaryButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md
  },
  planSecondaryButtonText: {
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
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.md
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6
  },
  rowBody: {
    ...typography.body,
    color: colors.text
  },
  legalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md
  },
  legalTitle: {
    ...typography.section,
    color: colors.ink
  },
  legalBody: {
    ...typography.body,
    color: colors.text
  },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  legalLink: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8
  },
  legalLinkText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "900"
  },
  danger: {
    backgroundColor: colors.blush,
    borderRadius: radius.md,
    marginTop: spacing.md,
    padding: spacing.md
  },
  dangerTitle: {
    ...typography.section,
    color: colors.ink,
    marginBottom: 8
  },
  dangerBody: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  deleteButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  }
});
