import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { UserRole } from "@/domain/userRole";
import { getRoleContent } from "@/domain/userRole";
import { getCachedUserRole, getUserRole, subscribeUserRole } from "@/services/userRolePreference";
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
  const [role, setRole] = useState<UserRole | null>(() => getCachedUserRole() ?? "female");
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
    <Screen title="数据分析">
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
              <Text style={styles.scoreLabel}>完成度</Text>
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
          <Text style={styles.sectionTitle}>重点发现</Text>
          <Text style={styles.sectionMeta}>{content?.label}视角</Text>
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
              <Text style={styles.reportLabel}>PRO 报告</Text>
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
          <Text style={styles.coachButtonText}>让 AI 帮我分析这轮数据</Text>
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
      summaryTitle: range === "partner" ? "配合节奏不错，压力可以再放松一点" : "最近状态挺好，继续保持就行",
      summaryBody:
        range === "threeCycles"
          ? "最近睡眠、喝酒的情况记得越来越全了，下一步试试同房间隔也配合好窗口期。"
          : "最近睡眠和喝酒都挺规律，同房节奏也合适。今天继续注意别碰太烫的水就好。",
      score: range === "partner" ? "4/5" : "5/6",
      coachPrompt: "帮我看看这轮我的备孕数据，今天该注意什么？",
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
          body: "目前的节奏挺合适。提前说好安排，别临时再商量就不会有压力。",
          action: "去记录安排",
          tone: "coral"
        },
        {
          icon: "bed-outline",
          title: "生活习惯",
          value: "稳定",
          body: "最近睡觉和喝酒的记录都挺完整，继续保持就好。",
          action: "继续记录就好",
          tone: "sage"
        },
        {
          icon: "people-outline",
          title: "协作质量",
          value: range === "partner" ? "待增强" : "良好",
          body: "这里的分析是帮你俩配合得更顺畅，不是给你增加任务的。",
          action: "让 AI 帮我生成沟通建议",
          tone: "ink"
        }
      ] as InsightItem[],
      reportBody: "升级后可以看到完整的生活习惯分析，帮你俩一起复盘。",
      reportPoints: ["同房节奏分析", "生活习惯总结", "风险提醒"]
    };
  }

  return {
    summaryLabel: suffix,
    summaryTitle: range === "threeCycles" ? "记录越来越稳定了，排卵判断会更准" : "好孕窗口快到了，今天重点测排卵试纸和体温",
    summaryBody:
      range === "partner"
        ? "现在最重要的是把窗口期和安排告诉他，减少临时沟通的麻烦。"
        : "记录已经够看趋势了，不过排卵试纸今天还缺一条。找个固定时间补上就好。",
    score: range === "threeCycles" ? "82%" : "4/6",
    coachPrompt: "帮我看看这轮的排卵和体温数据，今天该注意什么？",
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
        body: "窗口快到了，不过今天还没测排卵试纸。测了之后能更准地判断排卵。",
        action: "去测排卵试纸",
        tone: "coral"
      },
      {
        icon: "pulse-outline",
        title: "体温趋势",
        value: "平稳",
        body: "体温记得挺连续的，接下来要是持续升温，就能看出排卵的变化了。",
        action: "继续每天量体温",
        tone: "sage"
      },
      {
        icon: "calendar-outline",
        title: "安排覆盖",
        value: range === "partner" ? "可同步" : "中等",
        body: "窗口期不用每天都安排，提前商量好、放轻松就好。",
        action: "让 AI 帮我安排今天",
        tone: "ink"
      }
    ] as InsightItem[],
    reportBody: "升级后可以看完整的月度分析报告，排卵规律一目了然。",
    reportPoints: ["排卵规律分析", "体温变化趋势", "改进建议"]
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
