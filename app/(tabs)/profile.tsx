import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { getPlanLimits } from "@/domain/entitlements";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

const proLimits = getPlanLimits("pro");

export default function ProfileScreen() {
  return (
    <Screen title="隐私与订阅">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.plan}>
          <Text style={styles.planTitle}>Nurture Pro</Text>
          <Text style={styles.planBody}>
            每日 {proLimits.dailyAiMessages} 次 AI 问答、云同步、深度趋势报告和完整 HealthKit 同步。
          </Text>
          <Text style={styles.planAction}>管理订阅 / 恢复购买</Text>
        </View>

        {[
          ["云同步", "开启后才上传授权的健康结构化数据。", true],
          ["AI 使用健康上下文", "每次调用都只发送你授权的数据摘要。", true],
          ["写入 Apple Health", "只写入你在 Nurture 中明确记录的项目。", false]
        ].map(([title, body, enabled]) => (
          <View key={String(title)} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowBody}>{body}</Text>
            </View>
            <Switch value={Boolean(enabled)} disabled trackColor={{ true: colors.coralSoft }} thumbColor={colors.coral} />
          </View>
        ))}

        <View style={styles.danger}>
          <Text style={styles.dangerTitle}>数据控制</Text>
          <Text style={styles.dangerBody}>支持导出本地数据、删除云端资料、关闭 AI 授权。</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32
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
