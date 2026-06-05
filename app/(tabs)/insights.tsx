import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

const insights = [
  ["排卵窗口可信度", "中等", "连续记录 2-3 个周期后会更稳定"],
  ["黄体期估计", "13 天", "处于常见范围内"],
  ["记录连续性", "82%", "体温记录最稳定"]
];

export default function InsightsScreen() {
  return (
    <Screen title="趋势洞察">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {insights.map(([label, value, detail]) => (
          <View key={label} style={styles.card}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.detail}>{detail}</Text>
          </View>
        ))}

        <View style={styles.report}>
          <Text style={styles.reportTitle}>Pro 深度报告</Text>
          <Text style={styles.reportBody}>
            汇总周期长度、LH 峰值、体温升高和症状变化，生成适合复盘或就医沟通的月度备孕报告。
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8
  },
  value: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8
  },
  detail: {
    ...typography.body,
    color: colors.text
  },
  report: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.lg
  },
  reportTitle: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  reportBody: {
    ...typography.body,
    color: colors.blush
  }
});
