import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { buildCoachRequest } from "@/domain/ai";
import { demoCoachContext } from "@/fixtures/demoData";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

const previewRequest = buildCoachRequest(demoCoachContext);

export default function CoachScreen() {
  return (
    <Screen title="AI 备孕教练">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>非诊断建议</Text>
          <Text style={styles.noticeBody}>
            AI 只提供记录、生活方式和就医沟通建议。任何异常疼痛、持续出血或焦虑，请咨询专业医生。
          </Text>
        </View>

        <View style={styles.chatBubbleAi}>
          <Text style={styles.chatText}>
            你现在接近易孕窗口。今天建议固定时间测 LH，继续记录基础体温，晚上留一个低压力的休息时段。
          </Text>
        </View>

        <View style={styles.chatBubbleUser}>
          <Text style={styles.chatUserText}>今天需要安排同房吗？</Text>
        </View>

        <View style={styles.suggestions}>
          {["今天怎么安排？", "LH 阳性后怎么办？", "本周期趋势怎么看？"].map((item) => (
            <View key={item} style={styles.suggestion}>
              <Text style={styles.suggestionText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.inputShell}>
          <TextInput
            placeholder="问问你的备孕教练"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={previewRequest.messages[1].content.includes("周期第 12 天") ? "" : ""}
            editable={false}
          />
          <Text style={styles.send}>发送</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32
  },
  notice: {
    backgroundColor: colors.blush,
    borderColor: colors.coralSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.md
  },
  noticeTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6
  },
  noticeBody: {
    ...typography.body,
    color: colors.text
  },
  chatBubbleAi: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    maxWidth: "88%",
    padding: spacing.md
  },
  chatBubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    maxWidth: "78%",
    padding: spacing.md
  },
  chatText: {
    ...typography.body,
    color: colors.text
  },
  chatUserText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22
  },
  suggestions: {
    gap: 10,
    marginBottom: spacing.lg
  },
  suggestion: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md
  },
  suggestionText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: 10
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 10
  },
  send: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: "900",
    paddingHorizontal: 8
  }
});
