import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { estimateCycle, formatCycleDayLabel, getTodayTasks } from "@/domain/cycle";
import { demoCycleInput, demoLogs } from "@/fixtures/demoData";
import { ActionCard } from "@/ui/ActionCard";
import { MetricCard } from "@/ui/MetricCard";
import { QuickLogButton } from "@/ui/QuickLogButton";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

const estimate = estimateCycle(demoCycleInput);
const tasks = getTodayTasks(demoCycleInput);

export default function TodayScreen() {
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Nurture</Text>
            <Text style={styles.title}>今天慢慢来，也有方向</Text>
          </View>
          <View style={styles.proBadge}>
            <Text style={styles.proText}>Pro</Text>
          </View>
        </View>

        <LinearGradient colors={[colors.blush, colors.surface]} style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>{formatCycleDayLabel(estimate.cycleDay)}</Text>
            <Text style={styles.heroPhase}>易孕期临近</Text>
          </View>
          <Text style={styles.heroTitle}>预测排卵峰值在 6月10日</Text>
          <Text style={styles.heroBody}>
            你的易孕窗口预计为 6月6日-6月11日。今天适合开始固定记录 LH 试纸和基础体温。
          </Text>
          <View style={styles.timeline}>
            {["5", "6", "7", "8", "9", "10", "11"].map((day) => (
              <View key={day} style={[styles.timelineDot, day === "10" && styles.timelinePeak]}>
                <Text style={[styles.timelineText, day === "10" && styles.timelinePeakText]}>{day}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.metrics}>
          <MetricCard label="LH 记录" value={demoLogs.lh} detail="今日待测" tone="coral" />
          <MetricCard label="基础体温" value={demoLogs.temperature} detail="较昨日 +0.1" tone="sage" />
        </View>

        <Text style={styles.sectionTitle}>快速记录</Text>
        <View style={styles.quickGrid}>
          <QuickLogButton icon="water-outline" label="经期" />
          <QuickLogButton icon="thermometer-outline" label="体温" />
          <QuickLogButton icon="flask-outline" label="LH 试纸" />
          <QuickLogButton icon="leaf-outline" label="症状" />
        </View>

        <Text style={styles.sectionTitle}>今日备孕任务</Text>
        {tasks.map((task) => (
          <ActionCard key={task.id} title={task.title} description={task.description} tone={task.tone} />
        ))}

        <View style={styles.coachCard}>
          <Text style={styles.coachTitle}>AI 备孕教练</Text>
          <Text style={styles.coachBody}>
            今天的重点不是做更多，而是让数据连续：LH 试纸、体温和睡眠记录会让本周期回看更可靠。
          </Text>
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
