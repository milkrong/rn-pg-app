import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { UserRole } from "@/domain/userRole";
import { getRoleContent } from "@/domain/userRole";
import { getUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

type InsightRange = "cycle" | "threeCycles" | "partner";

type InsightItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  body: string;
  action: string;
  tone: "coral" | "sage" | "ink";
};

const ranges: Array<{ key: InsightRange; label: string }> = [
  { key: "cycle", label: "本周期" },
  { key: "threeCycles", label: "近3周期" },
  { key: "partner", label: "伴侣协作" }
];

export default function InsightsScreen() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>("female");
  const [range, setRange] = useState<InsightRange>("cycle");
  const content = getRoleContent(role) ?? getRoleContent("female");
  const model = useMemo(() => getInsightModel(role ?? "female", range), [role, range]);

  useEffect(() => {
    let isMounted = true;

    getUserRole().then((storedRole) => {
      if (isMounted && storedRole) {
        setRole(storedRole);
      }
    });

    const unsubscribe = subscribeUserRole((nextRole) => {
      if (nextRole) {
        setRole(nextRole);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  function askCoach() {
    router.push({
      pathname: "/coach",
      params: { prompt: model.coachPrompt }
    });
  }

  return (
    <Screen title="趋势洞察">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.segmented}>
          {ranges.map((item) => {
            const isActive = range === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setRange(item.key)}
                style={[styles.segment, isActive && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryLabel}>{model.summaryLabel}</Text>
              <Text style={styles.summaryTitle}>{model.summaryTitle}</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreValue}>{model.score}</Text>
              <Text style={styles.scoreLabel}>完整度</Text>
            </View>
          </View>
          <Text style={styles.summaryBody}>{model.summaryBody}</Text>
          <View style={styles.timeline}>
            {model.timeline.map((step) => (
              <View key={step.label} style={styles.timelineItem}>
                <View style={[styles.timelineDot, step.active && styles.timelineDotActive]} />
                <Text style={[styles.timelineText, step.active && styles.timelineTextActive]}>{step.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>关键洞察</Text>
          <Text style={styles.sectionMeta}>{content?.label}入口</Text>
        </View>

        {model.items.map((item) => (
          <View key={item.title} style={styles.insightCard}>
            <View style={[styles.iconBox, styles[`${item.tone}Icon`]]}>
              <Ionicons name={item.icon} size={19} color={getToneColor(item.tone)} />
            </View>
            <View style={styles.insightBody}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightTitle}>{item.title}</Text>
                <Text style={[styles.insightValue, styles[`${item.tone}Text`]]}>{item.value}</Text>
              </View>
              <Text style={styles.insightText}>{item.body}</Text>
              <Text style={styles.insightAction}>{item.action}</Text>
            </View>
          </View>
        ))}

        <View style={styles.report}>
          <View style={styles.reportHeader}>
            <View>
              <Text style={styles.reportLabel}>PRO REPORT</Text>
              <Text style={styles.reportTitle}>{content?.reportTitle}</Text>
            </View>
            <Ionicons name="lock-closed-outline" size={20} color={colors.surface} />
          </View>
          <Text style={styles.reportBody}>{model.reportBody}</Text>
          <View style={styles.reportPreview}>
            {model.reportPoints.map((point) => (
              <View key={point} style={styles.reportPoint}>
                <Ionicons name="checkmark-circle" size={16} color={colors.coralSoft} />
                <Text style={styles.reportPointText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={askCoach} style={styles.coachButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.surface} />
          <Text style={styles.coachButtonText}>问 AI Coach 分析本周期</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function getInsightModel(role: UserRole, range: InsightRange) {
  const isMale = role === "male";
  const suffix =
    range === "cycle" ? "本周期" : range === "threeCycles" ? "近 3 个周期" : "伴侣协作";

  if (isMale) {
    return {
      summaryLabel: suffix,
      summaryTitle: range === "partner" ? "配合窗口稳定，压力负担可再降低" : "生活习惯稳定，适合继续配合窗口",
      summaryBody:
        range === "threeCycles"
          ? "睡眠、饮酒和高温暴露记录逐渐连续，下一步可以把同房间隔和伴侣窗口对齐。"
          : "近几天睡眠和饮酒记录比较稳定，同房节奏适合当前窗口。建议今天继续减少高温暴露。",
      score: range === "partner" ? "4/5" : "5/6",
      coachPrompt: "帮我分析本周期男生备孕支持记录，给出今天的配合建议。",
      timeline: [
        { label: "睡眠", active: true },
        { label: "饮酒", active: true },
        { label: "高温", active: true },
        { label: "同房", active: range !== "threeCycles" }
      ],
      items: [
        {
          icon: "heart-outline",
          title: "安排覆盖",
          value: "合适",
          body: "当前间隔适合配合易孕窗口，重点是提前沟通，避免临时变成压力。",
          action: "去记录同房或同步安排",
          tone: "coral"
        },
        {
          icon: "bed-outline",
          title: "生活习惯",
          value: "稳定",
          body: "睡眠和饮酒记录比较连续；高温暴露保持低水平，对备孕支持更友好。",
          action: "继续记录睡眠、饮酒、高温",
          tone: "sage"
        },
        {
          icon: "people-outline",
          title: "协作质量",
          value: range === "partner" ? "待增强" : "良好",
          body: "男生侧的洞察应该服务两个人的节奏，而不是单独制造任务感。",
          action: "把关键结论发给 Coach 生成沟通建议",
          tone: "ink"
        }
      ] as InsightItem[],
      reportBody: "解锁后汇总睡眠、运动、饮酒、高温暴露、压力和同房节奏，形成伴侣协作复盘。",
      reportPoints: ["同房节奏覆盖率", "生活习惯连续性", "高温与饮酒风险提醒"]
    };
  }

  return {
    summaryLabel: suffix,
    summaryTitle: range === "threeCycles" ? "记录稳定性提升，排卵判断会更可靠" : "易孕窗口临近，LH 和体温是今天重点",
    summaryBody:
      range === "partner"
        ? "当前最有价值的是把易孕窗口、同房安排和身体感受同步给伴侣，减少临时沟通成本。"
        : "记录完整度已经足够给出方向，但 LH 试纸还缺今天的数据。建议固定时间补一次记录。",
    score: range === "threeCycles" ? "82%" : "4/6",
    coachPrompt: "帮我分析本周期 LH、体温、症状和同房覆盖，给出今天的备孕建议。",
    timeline: [
      { label: "经期", active: true },
      { label: "LH", active: range !== "partner" },
      { label: "体温", active: true },
      { label: "同房", active: range === "partner" }
    ],
    items: [
      {
        icon: "flask-outline",
        title: "排卵信号",
        value: "待确认",
        body: "预测窗口已接近，但今天 LH 尚未记录。补足后可以更准确判断峰值。",
        action: "去记录 LH 试纸",
        tone: "coral"
      },
      {
        icon: "pulse-outline",
        title: "体温趋势",
        value: "平稳",
        body: "基础体温连续性不错，后续如果出现持续升温，可用于回看排卵后变化。",
        action: "继续晨起测温",
        tone: "sage"
      },
      {
        icon: "calendar-outline",
        title: "安排覆盖",
        value: range === "partner" ? "可同步" : "中等",
        body: "窗口期建议把安排提前摊开，不用追求每天打卡，重点是低压力覆盖。",
        action: "问 Coach 生成今天安排",
        tone: "ink"
      }
    ] as InsightItem[],
    reportBody: "解锁后汇总周期长度、LH 峰值、体温升高、症状和同房覆盖，生成可复盘的月度报告。",
    reportPoints: ["LH 峰值与窗口预测", "体温双相趋势", "记录缺口和下一步建议"]
  };
}

function getToneColor(tone: InsightItem["tone"]) {
  if (tone === "sage") {
    return colors.sage;
  }

  if (tone === "ink") {
    return colors.ink;
  }

  return colors.coral;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32
  },
  segmented: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.xs
  },
  segment: {
    alignItems: "center",
    borderRadius: radius.sm,
    flex: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  segmentActive: {
    backgroundColor: colors.ink
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: colors.surface
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg
  },
  summaryHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  summaryLabel: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6
  },
  summaryTitle: {
    color: colors.ink,
    flexShrink: 1,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30
  },
  scoreBadge: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderRadius: radius.sm,
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  scoreValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  scoreLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  summaryBody: {
    ...typography.body,
    color: colors.text
  },
  timeline: {
    flexDirection: "row",
    gap: spacing.sm
  },
  timelineItem: {
    alignItems: "center",
    flex: 1,
    gap: 6
  },
  timelineDot: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 8,
    width: "100%"
  },
  timelineDotActive: {
    backgroundColor: colors.coral
  },
  timelineText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  timelineTextActive: {
    color: colors.ink
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  sectionTitle: {
    ...typography.section,
    color: colors.ink
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  insightCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  iconBox: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  coralIcon: {
    backgroundColor: colors.blush
  },
  sageIcon: {
    backgroundColor: colors.sageSoft
  },
  inkIcon: {
    backgroundColor: colors.background
  },
  insightBody: {
    flex: 1,
    gap: 8
  },
  insightHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  insightTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "900"
  },
  insightValue: {
    fontSize: 14,
    fontWeight: "900"
  },
  coralText: {
    color: colors.coral
  },
  sageText: {
    color: colors.sage
  },
  inkText: {
    color: colors.ink
  },
  insightText: {
    ...typography.body,
    color: colors.text
  },
  insightAction: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: "900"
  },
  report: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.lg
  },
  reportHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  reportLabel: {
    color: colors.coralSoft,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6
  },
  reportTitle: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "900"
  },
  reportBody: {
    ...typography.body,
    color: colors.blush
  },
  reportPreview: {
    gap: spacing.sm
  },
  reportPoint: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  reportPointText: {
    color: colors.surface,
    flex: 1,
    fontSize: 14,
    fontWeight: "800"
  },
  coachButton: {
    alignItems: "center",
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 52,
    padding: spacing.md
  },
  coachButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  }
});
