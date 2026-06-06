import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/domain/userRole";
import { getRoleContent } from "@/domain/userRole";
import { demoCoachContext } from "@/fixtures/demoData";
import { getAuthSnapshot, subscribeToAuthChanges } from "@/services/auth";
import { askAiCoach, type CoachAnswer } from "@/services/aiCoach";
import { getUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const starterMessage: ChatMessage = {
  id: "starter",
  role: "assistant",
  content: "你现在可以把周期、症状和备孕安排的问题交给我。我会给出记录、生活方式和就医沟通建议。"
};

type PromptGroup = {
  title: string;
  prompts: string[];
};

export default function CoachScreen() {
  const params = useLocalSearchParams<{ prompt?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>("female");
  const [isConfigured, setIsConfigured] = useState(true);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [answer, setAnswer] = useState<CoachAnswer | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (typeof params.prompt === "string") {
      setQuestion(params.prompt);
    }
  }, [params.prompt]);

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

  async function sendQuestion(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);
    setQuestion("");
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: trimmed }
    ]);

    try {
      const roleContent = getRoleContent(role) ?? getRoleContent("female");
      const result = await askAiCoach({
        question: trimmed,
        consent: demoCoachContext.consent,
        cycleSummary: roleContent?.coachSummary ?? demoCoachContext.cycleSummary
      });

      setAnswer(result);
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: "assistant", content: result.answer }
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "AI 教练暂时无法回复。");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Screen title={role === "male" ? "AI 伴侣教练" : "AI 备孕教练"}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        style={styles.page}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" color={colors.coral} size={17} />
            <Text style={styles.noticeBody}>AI 提供记录、生活方式和就医沟通建议，不替代医生。</Text>
          </View>

          {!isConfigured ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>Supabase 未配置</Text>
              <Text style={styles.statusBody}>请设置 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_KEY。</Text>
            </View>
          ) : null}

          {isConfigured && !user ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>需要先登录</Text>
              <Text style={styles.statusBody}>请到 Profile 使用邮箱登录后，再调用 AI 备孕教练。</Text>
            </View>
          ) : null}

          <View style={styles.contextCard}>
            <View style={styles.contextTop}>
              <View>
                <Text style={styles.contextKicker}>{role === "male" ? "伴侣支持上下文" : "周期上下文"}</Text>
                <Text style={styles.contextTitle}>{getRoleContent(role)?.coachSummary.fertileWindow ?? "记录越完整，建议越贴近你"}</Text>
              </View>
              <View style={styles.modeBadge}>
                <Text style={styles.modeText}>{role === "male" ? "男生" : "女生"}</Text>
              </View>
            </View>
            <Text style={styles.contextBody}>{getCoachContextBody(role, Boolean(user))}</Text>
            <View style={styles.contextChips}>
              {getCoachContextChips(role, Boolean(user)).map((chip) => (
                <View key={chip} style={styles.contextChip}>
                  <Ionicons name="checkmark-circle-outline" color={colors.sage} size={15} />
                  <Text style={styles.contextChipText}>{chip}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.promptGroups}>
            {getPromptGroups(role).map((group) => (
              <View key={group.title} style={styles.promptGroup}>
                <Text style={styles.promptGroupTitle}>{group.title}</Text>
                <View style={styles.promptList}>
                  {group.prompts.map((item) => (
                    <Pressable
                      key={item}
                      disabled={!user || isSending}
                      onPress={() => sendQuestion(item)}
                      style={[styles.promptButton, (!user || isSending) && styles.disabled]}
                    >
                      <Text style={styles.promptText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {answer ? (
            <View style={styles.answerPanel}>
              <Text style={styles.answerPanelTitle}>教练建议</Text>
              <View style={styles.answerBlock}>
                <Text style={styles.answerBlockLabel}>一句结论</Text>
                <Text selectable style={styles.answerMain}>{answer.answer}</Text>
              </View>
              <StructuredAnswerSection title="今天可以做" items={answer.suggestions.slice(0, 2)} />
              <StructuredAnswerSection title="建议记录" items={answer.suggestions.slice(2, 4)} fallback={role === "male" ? "记录同房、睡眠、饮酒和高温暴露。" : "记录 LH、基础体温、症状和同房安排。"} />
              <StructuredAnswerSection title="需要留意" items={answer.suggestions.slice(4, 6)} fallback="如果出现明显不适、持续出血、强烈疼痛或焦虑，请咨询专业医生。" />
              <View style={styles.answerBlock}>
                <Text style={styles.answerBlockLabel}>安全提醒</Text>
                <Text selectable style={styles.safetyNotice}>{answer.safety_notice}</Text>
              </View>
            </View>
          ) : null}

          {answer ? (
            <Text style={styles.usageText}>
              今日 AI 用量 {answer.usage.messagesUsedToday}/{answer.usage.dailyLimit}
            </Text>
          ) : null}

          {error ? <Text selectable style={styles.errorText}>{error}</Text> : null}

          <View style={styles.threadCard}>
            <Text style={styles.threadTitle}>对话记录</Text>
            {messages.slice(-4).map((message) => (
              <View
                key={message.id}
                style={message.role === "assistant" ? styles.chatBubbleAi : styles.chatBubbleUser}
              >
                <Text selectable style={message.role === "assistant" ? styles.chatText : styles.chatUserText}>
                  {message.id === "starter" ? (getRoleContent(role)?.coachIntro ?? message.content) : message.content || "我已经收到你的问题，会继续给出温和的建议。"}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.inputShell}>
          <TextInput
            placeholder="问问你的备孕教练"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={question}
            editable={Boolean(user) && !isSending}
            onChangeText={setQuestion}
            returnKeyType="send"
            onSubmitEditing={() => sendQuestion()}
          />
          <Pressable disabled={!user || isSending || !question.trim()} onPress={() => sendQuestion()}>
            <Text style={[styles.send, (!user || isSending || !question.trim()) && styles.sendDisabled]}>
              {isSending ? "发送中" : "发送"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function StructuredAnswerSection({
  title,
  items,
  fallback
}: {
  title: string;
  items: string[];
  fallback?: string;
}) {
  const displayItems = items.length > 0 ? items : fallback ? [fallback] : [];

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.answerBlock}>
      <Text style={styles.answerBlockLabel}>{title}</Text>
      {displayItems.map((item) => (
        <Text key={item} selectable style={styles.answerSuggestion}>
          {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  content: {
    paddingBottom: 112
  },
  notice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.md,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: 9
  },
  noticeBody: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
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
  statusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  statusTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6
  },
  statusBody: {
    ...typography.body,
    color: colors.text
  },
  contextCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg
  },
  contextTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  contextKicker: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 7
  },
  contextTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
    maxWidth: 230
  },
  modeBadge: {
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  modeText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  },
  contextBody: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md
  },
  contextChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  contextChip: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7
  },
  contextChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800"
  },
  promptGroups: {
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  promptGroup: {
    gap: 8
  },
  promptGroupTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  promptList: {
    gap: 8
  },
  promptButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10
  },
  promptText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20
  },
  answerPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  answerPanelTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  answerBlock: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 6,
    padding: spacing.md
  },
  answerBlockLabel: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: "900"
  },
  answerMain: {
    ...typography.body,
    color: colors.ink
  },
  answerSuggestion: {
    ...typography.body,
    color: colors.text
  },
  safetyNotice: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  usageText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: spacing.md,
    textAlign: "right"
  },
  errorText: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: spacing.md
  },
  disabled: {
    opacity: 0.48
  },
  threadCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.md
  },
  threadTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: spacing.sm
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  },
  sendDisabled: {
    color: colors.muted
  }
});

function getCoachContextBody(role: UserRole | null, isSignedIn: boolean): string {
  if (!isSignedIn) {
    return "登录并记录后，我会结合你的周期摘要、今日记录和最近身体信号给出更贴近的建议。";
  }

  if (role === "male") {
    return "我会参考同房节奏、睡眠、饮酒、高温暴露和压力状态，给出伴侣协作和生活方式建议。";
  }

  return "我会参考周期阶段、LH、基础体温、症状和同房安排，给出记录、生活方式和就医沟通建议。";
}

function getCoachContextChips(role: UserRole | null, isSignedIn: boolean): string[] {
  if (!isSignedIn) {
    return ["身份模式", "登录状态", "可用记录"];
  }

  if (role === "male") {
    return ["伴侣窗口", "今日记录", "生活习惯"];
  }

  return ["周期摘要", "今日记录", "最近症状"];
}

function getPromptGroups(role: UserRole | null): PromptGroup[] {
  if (role === "male") {
    return [
      {
        title: "今天怎么做",
        prompts: ["今天怎么配合更轻松？", "同房节奏怎么安排？"]
      },
      {
        title: "帮我看记录",
        prompts: ["最近哪些记录还缺？", "睡眠和饮酒会影响什么？"]
      },
      {
        title: "需要注意什么",
        prompts: ["什么情况该咨询医生？", "怎么降低备孕压力？"]
      }
    ];
  }

  return [
    {
      title: "今天怎么做",
      prompts: ["今天怎么安排？", "LH 阳性后怎么办？"]
    },
    {
      title: "帮我看记录",
      prompts: ["最近趋势怎么看？", "哪些记录还缺？"]
    },
    {
      title: "需要注意什么",
      prompts: ["什么情况该咨询医生？", "怎么降低压力？"]
    }
  ];
}
