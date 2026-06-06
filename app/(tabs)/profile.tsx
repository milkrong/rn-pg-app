import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { User } from "@supabase/supabase-js";
import { getPlanLimits } from "@/domain/entitlements";
import type { UserRole } from "@/domain/userRole";
import { ROLE_CONTENT } from "@/domain/userRole";
import { formatAuthError, getAuthSnapshot, signInWithEmail, signOut, signUpWithEmail, subscribeToAuthChanges } from "@/services/auth";
import { getAiUsageToday, getEntitlement } from "@/services/cloudSync";
import { getUserRole, saveUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

const proLimits = getPlanLimits("pro");

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
      return;
    }

    let isMounted = true;

    Promise.all([getEntitlement(), getAiUsageToday()])
      .then(([entitlement, usage]) => {
        if (!isMounted) {
          return;
        }

        setPlan(entitlement.plan);
        setAiUsage(usage);
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

  return (
    <Screen title="隐私与订阅">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!isConfigured ? (
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Supabase 未配置</Text>
            <Text selectable style={styles.authBody}>
              请设置 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_KEY。
            </Text>
          </View>
        ) : null}

        {isConfigured ? (
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>{user ? "已登录" : "登录云端账户"}</Text>
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
          <Text style={styles.planTitle}>{plan === "pro" ? "Nurture Pro" : "Nurture Free"}</Text>
          <Text style={styles.planBody}>
            当前每日 AI 用量 {aiUsage}/{getPlanLimits(plan).dailyAiMessages}。Pro 支持每日 {proLimits.dailyAiMessages} 次 AI 问答、云同步、深度趋势报告和完整 HealthKit 同步。
          </Text>
          <Text style={styles.planAction}>管理订阅 / 恢复购买</Text>
        </View>

        <View style={styles.roleCard}>
          <Text style={styles.roleTitle}>我的入口</Text>
          <Text style={styles.roleBody}>当前：{role ? ROLE_CONTENT[role].label : "未选择"}。切换后，首页、记录、洞察和 AI 教练都会按身份调整。</Text>
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
          body="开启后才上传授权的健康结构化数据。"
          enabled={cloudSyncEnabled}
          onChange={setCloudSyncEnabled}
        />
        <PreferenceRow
          title="AI 使用健康上下文"
          body="每次调用都只发送你授权的数据摘要。"
          enabled={aiContextEnabled}
          onChange={setAiContextEnabled}
        />
        <PreferenceRow
          title="写入 Apple Health"
          body="只写入你在 Nurture 中明确记录的项目。"
          enabled={healthWriteEnabled}
          onChange={setHealthWriteEnabled}
        />

        <View style={styles.danger}>
          <Text style={styles.dangerTitle}>数据控制</Text>
          <Text style={styles.dangerBody}>支持导出本地数据、删除云端资料、关闭 AI 授权。</Text>
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
    marginBottom: spacing.lg,
    padding: spacing.lg
  },
  planTitle: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10
  },
  planBody: {
    ...typography.body,
    color: colors.blush,
    marginBottom: spacing.md
  },
  planAction: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
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
    color: colors.text
  }
});
