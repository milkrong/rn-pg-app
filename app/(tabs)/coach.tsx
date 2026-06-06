import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

export default function CoachScreen() {
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>非诊断建议</Text>
          <Text style={styles.noticeBody}>
            AI 只提供记录、生活方式和就医沟通建议。任何异常疼痛、持续出血或焦虑，请咨询专业医生。
          </Text>
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

        {messages.map((message) => (
          <View
            key={message.id}
            style={message.role === "assistant" ? styles.chatBubbleAi : styles.chatBubbleUser}
          >
            <Text selectable style={message.role === "assistant" ? styles.chatText : styles.chatUserText}>
              {message.id === "starter" ? (getRoleContent(role)?.coachIntro ?? message.content) : message.content || "我已经收到你的问题，会继续给出温和的建议。"}
            </Text>
          </View>
        ))}

        {answer?.suggestions.length ? (
          <View style={styles.answerPanel}>
            <Text style={styles.answerPanelTitle}>建议</Text>
            {answer.suggestions.map((item) => (
              <Text key={item} selectable style={styles.answerSuggestion}>
                {item}
              </Text>
            ))}
            <Text selectable style={styles.safetyNotice}>{answer.safety_notice}</Text>
          </View>
        ) : null}

        {answer ? (
          <Text style={styles.usageText}>
            今日 AI 用量 {answer.usage.messagesUsedToday}/{answer.usage.dailyLimit}
          </Text>
        ) : null}

        {error ? <Text selectable style={styles.errorText}>{error}</Text> : null}

        <View style={styles.suggestions}>
          {(getRoleContent(role)?.coachPrompts ?? ["今天怎么安排？"]).map((item) => (
            <Pressable
              key={item}
              disabled={!user || isSending}
              onPress={() => sendQuestion(item)}
              style={[styles.suggestion, (!user || isSending) && styles.disabled]}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </Pressable>
          ))}
        </View>

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
  answerPanel: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 8,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  answerPanelTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
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
  disabled: {
    opacity: 0.48
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
  ,
  sendDisabled: {
    color: colors.muted
  }
});
