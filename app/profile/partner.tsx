import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/domain/userRole";
import { getAuthSnapshot, subscribeToAuthChanges } from "@/services/auth";
import {
  acceptInvite,
  cancelPartnership,
  createInvite,
  getMyPartnership,
  getPartnerIdForUser,
  getPartnerProfile,
  type Partnership
} from "@/services/partner";
import { getUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

export default function PartnerScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [copied, setCopied] = useState(false);
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
    let isMounted = true;
    getUserRole().then((nextRole) => {
      if (isMounted) {
        setRole(nextRole);
      }
    });
    const unsubscribe = subscribeUserRole(setRole);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setPartnership(null);
      setPartnerName(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getMyPartnership()
      .then(async (result) => {
        if (!isMounted) {
          return;
        }
        setPartnership(result);
        if (result && result.status === "active") {
          const partnerId = getPartnerIdForUser(result, user.id);
          if (partnerId) {
            const profile = await getPartnerProfile(partnerId).catch(() => null);
            if (isMounted) {
              setPartnerName(profile?.displayName ?? null);
            }
          }
        } else {
          setPartnerName(null);
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "搭档信息加载失败。");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleCreateInvite() {
    if (!user || !role) {
      return;
    }
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = await createInvite(role);
      setPartnership(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "生成邀请码失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCopyCode() {
    if (!partnership) {
      return;
    }
    await Clipboard.setStringAsync(partnership.inviteCode).catch(() => undefined);
    Haptics.selectionAsync().catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function handleAccept() {
    if (!user) {
      return;
    }
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = await acceptInvite(code);
      setPartnership(next);
      setCode("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setMessage("已成功绑定搭档。");
      const partnerId = getPartnerIdForUser(next, user.id);
      if (partnerId) {
        const profile = await getPartnerProfile(partnerId).catch(() => null);
        setPartnerName(profile?.displayName ?? null);
      }
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "兑换邀请码失败。");
    } finally {
      setIsBusy(false);
    }
  }

  function confirmCancel() {
    if (!partnership) {
      return;
    }
    const title = partnership.status === "active" ? "解除绑定？" : "撤销邀请？";
    const body =
      partnership.status === "active"
        ? "解除后双方不再共享周期记录。"
        : "撤销后这个邀请码不能再用。";
    Alert.alert(title, body, [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        style: "destructive",
        onPress: async () => {
          setIsBusy(true);
          setError(null);
          setMessage(null);
          try {
            await cancelPartnership(partnership.id);
            setPartnership(null);
            setPartnerName(null);
          } catch (cancelError) {
            setError(cancelError instanceof Error ? cancelError.message : "操作失败。");
          } finally {
            setIsBusy(false);
          }
        }
      }
    ]);
  }

  return (
    <Screen title="搭档绑定">
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>需要登录</Text>
            <Text style={styles.cardBody}>先登录账号，才能跟搭档绑定。</Text>
            <Pressable
              onPress={() => router.push("/profile/login")}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>去登录</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View style={styles.card}>
            <Text style={styles.cardBody}>加载中…</Text>
          </View>
        ) : partnership && partnership.status === "active" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>已绑定</Text>
            <Text style={styles.cardBody}>
              {partnerName ? `跟「${partnerName}」` : "跟搭档"}
              绑定中。双方都能看到对方的周期记录用于 AI 教练参考。
            </Text>
            <Pressable
              disabled={isBusy}
              onPress={confirmCancel}
              style={({ pressed }) => [
                styles.dangerButton,
                isBusy && styles.disabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.dangerButtonText}>{isBusy ? "处理中…" : "解除绑定"}</Text>
            </Pressable>
          </View>
        ) : partnership && partnership.status === "pending" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>等待对方兑换</Text>
            <Text style={styles.cardBody}>把下面的邀请码发给搭档，对方在「搭档绑定」页面输入即可。</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} selectable>{partnership.inviteCode}</Text>
              <Pressable
                onPress={handleCopyCode}
                style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
              >
                <Ionicons name="copy-outline" color={colors.coral} size={16} />
                <Text style={styles.copyText}>{copied ? "已复制" : "复制"}</Text>
              </Pressable>
            </View>
            <Pressable
              disabled={isBusy}
              onPress={confirmCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                isBusy && styles.disabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.secondaryButtonText}>{isBusy ? "处理中…" : "撤销邀请"}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>生成邀请码</Text>
              <Text style={styles.cardBody}>把邀请码发给{role === "male" ? "她" : "他"}，对方兑换后即可互相看到记录。</Text>
              <Pressable
                disabled={isBusy || !role}
                onPress={handleCreateInvite}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (isBusy || !role) && styles.disabled,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.primaryButtonText}>{isBusy ? "生成中…" : "生成我的邀请码"}</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>输入对方邀请码</Text>
              <Text style={styles.cardBody}>如果对方发了邀请码给你，在下面输入并确认。</Text>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={(value) => setCode(value.replace(/\s/g, "").toUpperCase())}
                placeholder="6 位邀请码"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={code}
                maxLength={6}
              />
              <Pressable
                disabled={isBusy || code.trim().length === 0}
                onPress={handleAccept}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (isBusy || code.trim().length === 0) && styles.disabled,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.primaryButtonText}>{isBusy ? "处理中…" : "兑换邀请码"}</Text>
              </Pressable>
            </View>
          </>
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
    fontSize: 16,
    fontWeight: "900"
  },
  cardBody: {
    ...typography.body,
    color: colors.text
  },
  codeBox: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14
  },
  codeText: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 4
  },
  copyButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  copyText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "900"
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    textAlign: "center"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: radius.sm,
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
    padding: spacing.md
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  dangerButtonText: {
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
    opacity: 0.48
  },
  pressed: {
    opacity: 0.7
  }
});
