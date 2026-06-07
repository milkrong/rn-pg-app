import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/domain/userRole";
import {
  deleteAccount,
  formatAuthError,
  getAuthSnapshot,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  subscribeToAuthChanges
} from "@/services/auth";
import { confirmRoleAtSignup, pullRoleFromCloud } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRole, setSignupRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function submitAuth(mode: "sign-in" | "sign-up") {
    if (mode === "sign-up" && !signupRole) {
      setError("注册前请先选择身份。");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "sign-in") {
        const nextUser = await signInWithEmail({ email: email.trim(), password });
        setUser(nextUser);
        await pullRoleFromCloud();
        setMessage("登录成功。");
      } else {
        const result = await signUpWithEmail({ email: email.trim(), password });
        setUser(result.user);
        if (result.user && signupRole) {
          try {
            await confirmRoleAtSignup(signupRole);
          } catch (roleError) {
            setError(roleError instanceof Error ? roleError.message : "身份保存失败，请重新登录后再试。");
            return;
          }
        }
        setMessage(result.needsEmailConfirmation ? "注册成功，请先完成邮箱确认。" : "注册并登录成功。");
        setSignupRole(null);
      }
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

  function confirmDeleteAccount() {
    if (!user) {
      return;
    }
    Alert.alert("删除账号", "删除后你的账号、备孕记录、AI 对话都会清除，而且无法恢复。", [
      { text: "取消", style: "cancel" },
      { text: "确认删除", style: "destructive", onPress: handleDeleteAccount }
    ]);
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await deleteAccount();
      setUser(null);
      setMessage("账号和云端数据已删除。");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除账号失败。");
    } finally {
      setIsDeleting(false);
    }
  }

  const displayName =
    (user?.user_metadata as { display_name?: string } | undefined)?.display_name ?? user?.email?.split("@")[0] ?? null;

  return (
    <Screen title="账号">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" color={colors.ink} size={18} />
          <Text style={styles.backText}>返回</Text>
        </Pressable>

        {!isConfigured ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>服务未就绪</Text>
            <Text selectable style={styles.cardBody}>
              后台服务还没配好，暂时无法使用。
            </Text>
          </View>
        ) : user ? (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>昵称</Text>
              <Text selectable style={styles.value}>{displayName ?? "—"}</Text>
              <View style={styles.divider} />
              <Text style={styles.label}>邮箱</Text>
              <Text selectable style={styles.value}>{user.email}</Text>
            </View>

            <Pressable
              disabled={isSubmitting}
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.secondaryButton,
                isSubmitting && styles.disabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.secondaryButtonText}>{isSubmitting ? "处理中" : "退出登录"}</Text>
            </Pressable>

            <View style={styles.dangerCard}>
              <Text style={styles.dangerTitle}>删除账号</Text>
              <Text style={styles.dangerBody}>删除后账号、备孕记录、AI 对话都会清空，无法恢复。</Text>
              <Pressable
                disabled={isDeleting}
                onPress={confirmDeleteAccount}
                style={({ pressed }) => [
                  styles.deleteButton,
                  isDeleting && styles.disabled,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.deleteButtonText}>{isDeleting ? "删除中" : "删除账号"}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>登录账号</Text>
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

            <View style={styles.roleBlock}>
              <View style={styles.roleHeaderRow}>
                <Text style={styles.roleHeading}>注册身份</Text>
                <Text style={styles.roleHint}>确认后不可修改</Text>
              </View>
              <View style={styles.roleRow}>
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => setSignupRole("female")}
                  style={[styles.roleChip, signupRole === "female" && styles.roleChipActive]}
                >
                  <Text style={[styles.roleChipText, signupRole === "female" && styles.roleChipTextActive]}>女生</Text>
                </Pressable>
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => setSignupRole("male")}
                  style={[styles.roleChip, signupRole === "male" && styles.roleChipActive]}
                >
                  <Text style={[styles.roleChipText, signupRole === "male" && styles.roleChipTextActive]}>男生</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.authActions}>
              <Pressable
                disabled={isSubmitting}
                onPress={() => submitAuth("sign-in")}
                style={({ pressed }) => [
                  styles.primaryButton,
                  isSubmitting && styles.disabled,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.primaryButtonText}>{isSubmitting ? "处理中" : "登录"}</Text>
              </Pressable>
              <Pressable
                disabled={isSubmitting || !signupRole}
                onPress={() => submitAuth("sign-up")}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (isSubmitting || !signupRole) && styles.disabled,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.secondaryButtonText}>注册</Text>
              </Pressable>
            </View>
          </View>
        )}

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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  cardBody: {
    ...typography.body,
    color: colors.text
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  value: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 4
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
  roleBlock: {
    gap: 8
  },
  roleHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  roleHeading: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  roleHint: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  roleRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  roleChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12
  },
  roleChipActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral
  },
  roleChipText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  roleChipTextActive: {
    color: colors.surface
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
  dangerCard: {
    backgroundColor: colors.blush,
    borderRadius: radius.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md
  },
  dangerTitle: {
    ...typography.section,
    color: colors.ink
  },
  dangerBody: {
    ...typography.body,
    color: colors.text
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
  disabled: {
    opacity: 0.5
  },
  pressed: {
    opacity: 0.7
  }
});
