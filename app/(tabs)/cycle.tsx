import { ScrollView, StyleSheet, Text, View } from "react-native";
import { demoCalendarDays } from "@/fixtures/demoData";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

export default function CycleScreen() {
  return (
    <Screen title="周期记录">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.calendar}>
          {demoCalendarDays.map((day) => (
            <View key={day.date} style={[styles.day, day.kind === "fertile" && styles.fertileDay, day.kind === "period" && styles.periodDay]}>
              <Text style={[styles.dayText, day.kind !== "normal" && styles.activeDayText]}>{day.label}</Text>
              <Text style={styles.dayMeta}>{day.meta}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>HealthKit 同步</Text>
          <Text style={styles.panelBody}>
            读取并写入经期、基础体温和排卵测试结果。所有同步都需要你在 iOS 权限弹窗中明确授权。
          </Text>
        </View>

        <View style={styles.recordList}>
          {["经血量：无", "LH 试纸：待记录", "基础体温：36.62°C", "症状：轻微乳房胀痛"].map((item) => (
            <View key={item} style={styles.recordRow}>
              <Text style={styles.recordText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.lg
  },
  day: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: "13.1%"
  },
  fertileDay: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage
  },
  periodDay: {
    backgroundColor: colors.blush,
    borderColor: colors.coral
  },
  dayText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  activeDayText: {
    color: colors.ink
  },
  dayMeta: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 5
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  panelTitle: {
    ...typography.section,
    color: colors.ink,
    marginBottom: 8
  },
  panelBody: {
    ...typography.body,
    color: colors.text
  },
  recordList: {
    gap: 10
  },
  recordRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  recordText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  }
});
