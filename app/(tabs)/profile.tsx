import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/domain/userRole";
import { ROLE_CONTENT } from "@/domain/userRole";
import { getAuthSnapshot, subscribeToAuthChanges } from "@/services/auth";
import { getUserRole, saveUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

const legalLinks = [
  { label: "隐私政策", url: "https://example.com/nurture/privacy" },
  { label: "服务条款", url: "https://example.com/nurture/terms" },
  { label: "订阅条款", url: "https://example.com/nurture/subscription-terms" }
];

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  async function chooseRole(nextRole: UserRole) {
    setRole(nextRole);
    await saveUserRole(nextRole);
  }

  return (
    <Screen title="我的">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!isConfigured ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>服务未就绪</Text>
            <Text selectable style={styles.statusBody}>后台服务还没配好，暂时无法使用。</Text>
          </View>
        ) : null}

        <View style={styles.entryGroup}>
          <EntryRow
            title="账号"
            subtitle={user ? user.email ?? "已登录" : "未登录"}
            onPress={() => router.push("/profile/login")}
          />
          <View style={styles.divider} />
          <EntryRow
            title="搭档绑定"
            subtitle={user ? "邀请对方一起看周期" : "登录后才能绑定"}
            onPress={() => router.push("/profile/partner")}
          />
          <View style={styles.divider} />
          <EntryRow
            title="我的套餐"
            subtitle="升级或管理订阅"
            onPress={() => router.push("/profile/subscription")}
          />
        </View>

        <View style={styles.roleCard}>
          <View style={styles.roleHeader}>
            <Text style={styles.roleTitle}>我的模式</Text>
            <View style={styles.roleSegment}>
              <Pressable
                onPress={() => chooseRole("female")}
                style={[styles.roleSegmentItem, role === "female" && styles.roleSegmentItemActive]}
              >
                <Text style={[styles.roleSegmentText, role === "female" && styles.roleSegmentTextActive]}>女生</Text>
              </Pressable>
              <Pressable
                onPress={() => chooseRole("male")}
                style={[styles.roleSegmentItem, role === "male" && styles.roleSegmentItemActive]}
              >
                <Text style={[styles.roleSegmentText, role === "male" && styles.roleSegmentTextActive]}>男生</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.roleBody}>
            {role ? `当前是${ROLE_CONTENT[role].label}模式，切换后页面内容会跟着变。` : "选择身份，页面会跟着变。"}
          </Text>
        </View>

        <View style={styles.settingsGroup}>
          <PreferenceRow
            title="云同步"
            body="记录会备份到云端"
            enabled={cloudSyncEnabled}
            onChange={setCloudSyncEnabled}
          />
          <View style={styles.divider} />
          <PreferenceRow
            title="AI 使用健康上下文"
            body="只看你允许它看的数据"
            enabled={aiContextEnabled}
            onChange={setAiContextEnabled}
          />
          <View style={styles.divider} />
          <PreferenceRow
            title="写入 Apple Health"
            body="把这里的记录同步到健康 App"
            enabled={healthWriteEnabled}
            onChange={setHealthWriteEnabled}
          />
        </View>

        <View style={styles.legalCard}>
          <Text style={styles.legalTitle}>法律信息</Text>
          <View style={styles.legalLinks}>
            {legalLinks.map((item) => (
              <Pressable key={item.label} onPress={() => Linking.openURL(item.url)} style={styles.legalLink}>
                <Text style={styles.legalLinkText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <Text selectable style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function EntryRow({
  title,
  subtitle,
  onPress
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.entryRow, pressed && styles.pressed]}
    >
      <View style={styles.entryText}>
        <Text style={styles.entryTitle}>{title}</Text>
        {subtitle ? <Text style={styles.entrySubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" color={colors.muted} size={18} />
    </Pressable>
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
        <Text style={styles.rowBody} numberOfLines={1}>{body}</Text>
      </View>
      <Switch value={enabled} onValueChange={onChange} trackColor={{ true: colors.coralSoft }} thumbColor={colors.coral} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  statusTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  statusBody: {
    ...typography.body,
    color: colors.text
  },
  entryGroup: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: "hidden"
  },
  entryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12
  },
  entryText: {
    flex: 1,
    paddingRight: spacing.sm
  },
  entryTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 2
  },
  entrySubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  roleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 6,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12
  },
  roleHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  roleTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  roleBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  roleSegment: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    padding: 2
  },
  roleSegmentItem: {
    alignItems: "center",
    borderRadius: 999,
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  roleSegmentItemActive: {
    backgroundColor: colors.coral
  },
  roleSegmentText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900"
  },
  roleSegmentTextActive: {
    color: colors.surface
  },
  settingsGroup: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: "hidden"
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginLeft: spacing.md
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.sm
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 2
  },
  rowBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  legalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  legalTitle: {
    ...typography.section,
    color: colors.ink
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
  errorText: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.md
  },
  pressed: {
    opacity: 0.6
  }
});
