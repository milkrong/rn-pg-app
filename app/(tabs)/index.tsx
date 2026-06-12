import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";
import { computeCycleSummary, getFemaleRecordVisibility, type ComputedCycleSummary, type CyclePhase } from "@/domain/cycle";
import { formatDate } from "@/domain/date";
import type { AppCycleLog, RecordKind, RecordOption } from "@/domain/records";
import { getRecordOption, getRecordOptions } from "@/domain/records";
import type { UserRole } from "@/domain/userRole";
import { getRoleContent } from "@/domain/userRole";
import { getAuthSnapshot, subscribeToAuthChanges } from "@/services/auth";
import { loadCycleSourceRecords, type CycleSummarySource } from "@/services/cycleSummarySource";
import { getUserRole, saveUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { QuickLogButton } from "@/ui/QuickLogButton";
import { RoleGate } from "@/ui/RoleGate";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

export default function TodayScreen() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [records, setRecords] = useState<AppCycleLog[]>([]);
  const [summarySource, setSummarySource] = useState<CycleSummarySource>("self");
  const [user, setUser] = useState<User | null>(null);
  const content = getRoleContent(role);

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

    loadCycleSourceRecords(role, Boolean(user))
      .then((result) => {
        if (isMounted) {
          setRecords(result.records);
          setSummarySource(result.source);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRecords([]);
          setSummarySource("none");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [role, user]);

  async function selectRole(nextRole: UserRole) {
    setRole(nextRole);
    await saveUserRole(nextRole);
  }

  const today = formatDate(new Date());
  const cycleSummary = useMemo(() => computeCycleSummary(records, today), [records, today]);

  if (!content) {
    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <RoleGate onSelect={selectRole} />
        </ScrollView>
      </Screen>
    );
  }

  const homeModel = getHomeModel(content.role);
  const phaseKinds =
    content.role === "female" && cycleSummary
      ? getFemaleRecordVisibility(cycleSummary).visible
      : null;
  const effectiveQuickKinds = phaseKinds ? phaseKinds.slice(0, 4) : homeModel.quickKinds;
  const primaryKind = phaseKinds?.[0] ?? homeModel.primaryKind;
  const secondaryKind = phaseKinds?.[1] ?? homeModel.secondaryKind;
  const quickOptions = effectiveQuickKinds.map((kind) => getRecordOption(content.role, kind));
  const completedCount = quickOptions.filter((option) => getTodayRecordValue(records, option.kind, today)).length;
  const primaryAction = phaseKinds ? `记录${getRecordOption(content.role, primaryKind).label}` : homeModel.primaryAction;
  const secondaryAction = phaseKinds ? `记录${getRecordOption(content.role, secondaryKind).label}` : homeModel.secondaryAction;
  const heroCopy = buildHeroCopy(content.role, cycleSummary, summarySource, {
    fallbackLabel: content.heroLabel,
    fallbackPhase: content.heroPhase
  });

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{content.subtitle}</Text>
            <Text style={styles.title}>{content.title}</Text>
          </View>
          <View style={styles.proBadge}>
            <Text style={styles.proText}>{content.label}</Text>
          </View>
        </View>

        <LinearGradient colors={[colors.blush, colors.surface]} style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>{heroCopy.label}</Text>
            <Text style={styles.heroPhase}>{heroCopy.phase}</Text>
          </View>
          <Text style={styles.heroTitle}>{homeModel.title}</Text>
          <Text style={styles.heroBody}>{homeModel.body}</Text>
          <View style={styles.heroActions}>
            <Pressable
              style={styles.primaryAction}
              onPress={() => router.push({ pathname: "/cycle", params: { recordKind: primaryKind } })}
            >
              <Ionicons name="add-circle-outline" color={colors.surface} size={19} />
              <Text style={styles.primaryActionText}>{primaryAction}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryAction}
              onPress={() => router.push({ pathname: "/cycle", params: { recordKind: secondaryKind } })}
            >
              <Text style={styles.secondaryActionText}>{secondaryAction}</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressTitle}>今天完成 {completedCount}/{quickOptions.length}</Text>
            <Text style={styles.progressHint}>偶尔漏掉也没关系</Text>
          </View>
          <View style={styles.progressDots}>
            {quickOptions.map((option) => {
              const isDone = Boolean(getTodayRecordValue(records, option.kind, today));
              return (
                <View key={option.kind} style={styles.progressItem}>
                  <View style={[styles.progressDot, isDone && styles.progressDotDone]} />
                  <Text style={styles.progressLabel}>{option.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>随手记一笔</Text>
        <View style={styles.quickGrid}>
          {quickOptions.map((item) => (
            <QuickLogButton
              key={item.kind}
              icon={item.icon}
              label={getQuickLabel(item, records, today)}
              onPress={() => {
                router.push({ pathname: "/cycle", params: { recordKind: item.kind } });
              }}
            />
          ))}
        </View>

        <View style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <View>
              <Text style={styles.coachTitle}>{content.role === "male" ? "AI 备孕搭档" : "AI 备孕助手"}</Text>
              <Text style={styles.coachBody}>聊聊今天要注意的，或者帮你回顾最近的记录。</Text>
            </View>
            <Ionicons name="chatbubble-ellipses-outline" color={colors.sage} size={24} />
          </View>
          <View style={styles.promptList}>
            {homeModel.prompts.map((prompt) => (
              <Pressable
                key={prompt}
                style={styles.promptButton}
                onPress={() => router.push({ pathname: "/coach", params: { prompt } })}
              >
                <Text style={styles.promptText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg
  },
  kicker: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6
  },
  title: {
    ...typography.h1,
    color: colors.ink
  },
  proBadge: {
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  proText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800"
  },
  hero: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  heroLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  heroPhase: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "800"
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    marginBottom: 10
  },
  heroBody: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.lg
  },
  heroActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: 7,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  secondaryActionText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.md
  },
  progressTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  progressTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  progressHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  progressDots: {
    flexDirection: "row",
    gap: 10
  },
  progressItem: {
    alignItems: "center",
    flex: 1,
    gap: 6
  },
  progressDot: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 7,
    borderWidth: 1,
    height: 14,
    width: 14
  },
  progressDotDone: {
    backgroundColor: colors.sage,
    borderColor: colors.sage
  },
  progressLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center"
  },
  sectionTitle: {
    ...typography.section,
    color: colors.ink,
    marginBottom: spacing.sm,
    marginTop: spacing.sm
  },
  quickGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  coachCard: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md
  },
  coachHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  coachTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8
  },
  coachBody: {
    ...typography.body,
    color: colors.text,
    maxWidth: 260
  },
  promptList: {
    gap: 8
  },
  promptButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10
  },
  promptText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  }
});

type HomeModel = {
  title: string;
  body: string;
  primaryKind: RecordKind;
  secondaryKind: RecordKind;
  primaryAction: string;
  secondaryAction: string;
  quickKinds: RecordKind[];
  prompts: string[];
};

function getHomeModel(role: UserRole): HomeModel {
  if (role === "male") {
    return {
      title: "先跟她对好安排，再注意自己的状态",
      body: "关键期间保持沟通、好好睡觉、少碰高温就够了，比事后补救有用。",
      primaryKind: "intercourse",
      secondaryKind: "sleep",
      primaryAction: "记录安排",
      secondaryAction: "记录睡眠",
      quickKinds: ["intercourse", "sleep", "alcohol", "heat"],
      prompts: ["今天怎么做比较好？", "为什么不能泡热水澡？", "帮我看看最近的情况"]
    };
  }

  return {
    title: "先测排卵试纸，再量个体温",
    body: "好孕窗口快到了，坚持每天测一下排卵试纸和体温，判断会更准。",
    primaryKind: "ovulation_test",
    secondaryKind: "temperature",
    primaryAction: "测排卵试纸",
    secondaryAction: "记录体温",
    quickKinds: ["ovulation_test", "temperature", "symptom", "period"],
    prompts: ["为什么今天要测排卵试纸？", "今天怎么安排比较好？", "帮我看看最近的记录"]
  };
}

function getTodayRecordValue(records: AppCycleLog[], kind: RecordKind, today: string): string | null {
  const record = records.find((item) => item.happenedOn === today && item.payload.kind === kind);
  return typeof record?.payload.value === "string" && record.payload.value.length > 0 ? record.payload.value : null;
}

function buildHeroCopy(
  role: UserRole,
  summary: ComputedCycleSummary | null,
  source: CycleSummarySource,
  fallback: { fallbackLabel: string; fallbackPhase: string }
): { label: string; phase: string } {
  if (!summary) {
    if (role === "female") {
      return { label: "还没记录经期", phase: "记一次经期，开始计算 🌱" };
    }
    if (source === "none") {
      return { label: "还没绑定搭档", phase: "去「我的 → 搭档绑定」连她的记录" };
    }
    return { label: fallback.fallbackLabel, phase: fallback.fallbackPhase };
  }

  const label = role === "male" ? `她周期第 ${summary.cycleDay} 天` : `周期第 ${summary.cycleDay} 天`;
  return { label, phase: describePhase(summary.phase, role) };
}

function describePhase(phase: CyclePhase, role: UserRole): string {
  const map: Record<CyclePhase, string> = {
    period: role === "male" ? "她在经期 · 多关心" : "经期 · 多休息",
    follicular: "卵泡期 · 状态在回升",
    "fertile-soon": "好孕窗口快到了 🌸",
    fertile: "好孕窗口 ✨",
    luteal: role === "male" ? "黄体期 · 留心情绪" : "黄体期 · 留意感受"
  };
  return map[phase];
}

function getQuickLabel(option: RecordOption, records: AppCycleLog[], today: string): string {
  const value = getTodayRecordValue(records, option.kind, today);
  return value ? `${option.label}\n${value}` : option.label;
}
