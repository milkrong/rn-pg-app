import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { UserRole } from "@/domain/userRole";
import { getRoleContent, ROLE_CONTENT } from "@/domain/userRole";
import { getUserRole, saveUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { ActionCard } from "@/ui/ActionCard";
import { MetricCard } from "@/ui/MetricCard";
import { QuickLogButton } from "@/ui/QuickLogButton";
import { RoleGate } from "@/ui/RoleGate";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

export default function TodayScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
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

  async function selectRole(nextRole: UserRole) {
    setRole(nextRole);
    await saveUserRole(nextRole);
  }

  if (!content) {
    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <RoleGate onSelect={selectRole} />
        </ScrollView>
      </Screen>
    );
  }

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
            <Text style={styles.heroLabel}>{content.heroLabel}</Text>
            <Text style={styles.heroPhase}>{content.heroPhase}</Text>
          </View>
          <Text style={styles.heroTitle}>{content.heroTitle}</Text>
          <Text style={styles.heroBody}>{content.heroBody}</Text>
          <View style={styles.timeline}>
            {content.timeline.map((item) => (
              <View key={item.label} style={[styles.timelineDot, item.isPeak && styles.timelinePeak]}>
                <Text style={[styles.timelineText, item.isPeak && styles.timelinePeakText]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.metrics}>
          {content.metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
              tone={metric.tone}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>快速记录</Text>
        <View style={styles.quickGrid}>
          {content.quickLogs.map((item) => (
            <QuickLogButton key={item.label} icon={item.icon} label={item.label} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>{content.todayTitle}</Text>
        {content.tasks.map((task) => (
          <ActionCard key={task.id} title={task.title} description={task.description} tone={task.tone} />
        ))}

        <View style={styles.coachCard}>
          <Text style={styles.coachTitle}>AI 备孕教练</Text>
          <Text style={styles.coachBody}>{content.coachIntro}</Text>
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
    color: colors.text
  },
  timeline: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.lg
  },
  timelineDot: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    height: 42,
    justifyContent: "center"
  },
  timelinePeak: {
    backgroundColor: colors.coral,
    borderColor: colors.coral
  },
  timelineText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  timelinePeakText: {
    color: colors.surface
  },
  metrics: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg
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
  coachTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8
  },
  coachBody: {
    ...typography.body,
    color: colors.text
  }
});
