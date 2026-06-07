import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { User } from "@supabase/supabase-js";
import { computeCycleSummary } from "@/domain/cycle";
import { formatDate } from "@/domain/date";
import type { AppCycleLog } from "@/domain/records";
import type { UserRole } from "@/domain/userRole";
import { getRoleContent } from "@/domain/userRole";
import { demoCoachContext } from "@/fixtures/demoData";
import { getAuthSnapshot, subscribeToAuthChanges } from "@/services/auth";
import {
  askAiCoachStream,
  isCoachAbortError,
  type CoachAnswer
} from "@/services/aiCoach";
import { loadCycleSourceRecords } from "@/services/cycleSummarySource";
import { getUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { TypingDots } from "@/ui/TypingDots";
import { colors, radius, spacing, typography } from "@/ui/tokens";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  answerDetail?: CoachAnswer;
  aborted?: boolean;
};

const starterMessage: ChatMessage = {
  id: "starter",
  role: "assistant",
  content: "有关备孕的问题都可以问我～不管是身体变化、生活习惯还是什么时候该看医生，我都能帮你参考。"
};

type PromptGroup = {
  title: string;
  prompts: string[];
};

const NEAR_BOTTOM_THRESHOLD = 80;
const INPUT_MIN_HEIGHT = 24;
const INPUT_MAX_HEIGHT = 96;

export default function CoachScreen() {
  const params = useLocalSearchParams<{ prompt?: string }>();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const isNearBottomRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserMessageRef = useRef<string>("");
  const hasAutoCollapsedRef = useRef(false);

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>("female");
  const [isConfigured, setIsConfigured] = useState(true);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [answer, setAnswer] = useState<CoachAnswer | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(true);
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [records, setRecords] = useState<AppCycleLog[]>([]);

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
          setError("登录信息加载失败，请稍后再试。");
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

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadCycleSourceRecords(role, Boolean(user))
      .then((result) => {
        if (isMounted) {
          setRecords(result.records);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRecords([]);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [role, user]);

  const hasStarted = messages.length > 1;
  const quotaReached = answer ? answer.usage.messagesUsedToday >= answer.usage.dailyLimit : false;

  const quickPrompts = useMemo(() => getQuickPrompts(role), [role]);
  const computedSummary = useMemo(
    () => computeCycleSummary(records, formatDate(new Date())),
    [records]
  );

  function scrollToBottom(animated = true) {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    if (nearBottom && showScrollToBottom) {
      setShowScrollToBottom(false);
    } else if (!nearBottom && !showScrollToBottom && hasStarted) {
      setShowScrollToBottom(true);
    }
  }

  function handleContentSizeChange() {
    if (isNearBottomRef.current) {
      scrollToBottom(false);
    }
  }

  async function sendQuestion(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || isSending || quotaReached) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    setIsSending(true);
    setError(null);
    setQuestion("");
    setInputHeight(INPUT_MIN_HEIGHT);
    lastUserMessageRef.current = trimmed;

    if (!hasAutoCollapsedRef.current) {
      hasAutoCollapsedRef.current = true;
      setContextExpanded(false);
    }

    isNearBottomRef.current = true;
    setShowScrollToBottom(false);

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: trimmed },
      { id: assistantMessageId, role: "assistant", content: "" }
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const roleContent = getRoleContent(role) ?? getRoleContent("female");
      const cycleSummary = computedSummary
        ? {
            cycleDay: computedSummary.cycleDay,
            fertileWindow: computedSummary.fertileWindowLabel,
            recentSymptoms: computedSummary.recentSymptoms
          }
        : roleContent?.coachSummary ?? demoCoachContext.cycleSummary;
      let streamedText = "";
      const result = await askAiCoachStream(
        {
          question: trimmed,
          consent: demoCoachContext.consent,
          cycleSummary
        },
        {
          onDelta: (text) => {
            streamedText += text;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId ? { ...message, content: streamedText } : message
              )
            );
          }
        },
        { signal: controller.signal }
      );

      setAnswer(result);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? { ...message, content: result.answer, answerDetail: result }
            : message
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (sendError) {
      if (isCoachAbortError(sendError)) {
        setMessages((current) =>
          current.map((message) => {
            if (message.id !== assistantMessageId) {
              return message;
            }
            if (!message.content) {
              return { ...message, content: "（已停止）", aborted: true };
            }
            return { ...message, aborted: true };
          })
        );
      } else {
        setError(sendError instanceof Error ? sendError.message : "AI 助手暂时回复不了，稍后再试试。");
        setMessages((current) => current.filter((message) => message.id !== assistantMessageId));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsSending(false);
    }
  }

  function handleStop() {
    Haptics.selectionAsync().catch(() => undefined);
    abortControllerRef.current?.abort();
  }

  function handlePrimaryAction() {
    if (!user) {
      router.push("/profile");
      return;
    }
    if (isSending) {
      handleStop();
      return;
    }
    sendQuestion();
  }

  function handlePromptChip(prompt: string) {
    if (!user || isSending || quotaReached) {
      return;
    }
    Haptics.selectionAsync().catch(() => undefined);
    sendQuestion(prompt);
  }

  async function handleCopy(message: ChatMessage) {
    Haptics.selectionAsync().catch(() => undefined);
    await Clipboard.setStringAsync(message.content).catch(() => undefined);
    setCopiedMessageId(message.id);
    setTimeout(() => {
      setCopiedMessageId((current) => (current === message.id ? null : current));
    }, 1200);
  }

  function handleRegenerate(message: ChatMessage) {
    if (isSending) {
      return;
    }
    const index = messages.findIndex((item) => item.id === message.id);
    if (index <= 0) {
      return;
    }
    let userMessageIndex = -1;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") {
        userMessageIndex = i;
        break;
      }
    }
    if (userMessageIndex < 0) {
      return;
    }
    const userContent = messages[userMessageIndex].content;
    setMessages((current) => current.slice(0, userMessageIndex));
    Haptics.selectionAsync().catch(() => undefined);
    sendQuestion(userContent);
  }

  function handleRetry() {
    if (!lastUserMessageRef.current) {
      setError(null);
      return;
    }
    setError(null);
    sendQuestion(lastUserMessageRef.current);
  }

  function handleNewConversation() {
    if (!hasStarted) {
      return;
    }
    Alert.alert("开始新对话？", "之前的内容会清空。", [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        style: "destructive",
        onPress: () => {
          abortControllerRef.current?.abort();
          abortControllerRef.current = null;
          setMessages([starterMessage]);
          setAnswer(null);
          setError(null);
          setQuestion("");
          setInputHeight(INPUT_MIN_HEIGHT);
          setContextExpanded(true);
          hasAutoCollapsedRef.current = false;
          setShowScrollToBottom(false);
          isNearBottomRef.current = true;
        }
      }
    ]);
  }

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.role === "assistant" && message.id !== "starter") {
        return message.id;
      }
    }
    return null;
  }, [messages]);

  return (
    <Screen title={role === "male" ? "AI 备孕搭档" : "AI 备孕助手"}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        style={styles.page}
      >
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.topRow}>
            <View style={styles.notice}>
              <Ionicons name="shield-checkmark-outline" color={colors.coral} size={17} />
              <Text style={styles.noticeBody}>我的建议仅供参考，不能替代医生的诊断哦。</Text>
            </View>
            {hasStarted ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="开始新对话"
                onPress={handleNewConversation}
                style={({ pressed }) => [styles.newChatButton, pressed && styles.pressed]}
              >
                <Ionicons name="refresh-outline" color={colors.coral} size={15} />
                <Text style={styles.newChatText}>新对话</Text>
              </Pressable>
            ) : null}
          </View>

          {!isConfigured ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>服务未配置</Text>
              <Text style={styles.statusBody}>后台服务还没配好，暂时无法使用。</Text>
            </View>
          ) : null}

          {isConfigured && !user ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>登录后才能使用</Text>
              <Text style={styles.statusBody}>先去「我的」页面登录，就可以和 AI 助手对话了。</Text>
            </View>
          ) : null}

          {contextExpanded ? (
            <View style={styles.contextCard}>
              <View style={styles.contextTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contextKicker}>参考信息</Text>
                  <Text style={styles.contextTitle}>
                    {computedSummary?.fertileWindowLabel ??
                      getRoleContent(role)?.coachSummary.fertileWindow ??
                      "记录越多，建议越靠谱"}
                  </Text>
                </View>
                <View style={styles.contextTopActions}>
                  <View style={styles.modeBadge}>
                    <Text style={styles.modeText}>{role === "male" ? "男生" : "女生"}</Text>
                  </View>
                  {hasStarted ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="收起参考信息"
                      onPress={() => setContextExpanded(false)}
                      style={({ pressed }) => [styles.collapseToggle, pressed && styles.pressed]}
                    >
                      <Ionicons name="chevron-up" color={colors.muted} size={18} />
                    </Pressable>
                  ) : null}
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
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="展开参考信息"
              onPress={() => setContextExpanded(true)}
              style={({ pressed }) => [styles.contextPill, pressed && styles.pressed]}
            >
              <Ionicons name="sparkles-outline" color={colors.coral} size={14} />
              <Text style={styles.contextPillText} numberOfLines={1}>
                {role === "male" ? "男生" : "女生"} ·{" "}
                {computedSummary?.fertileWindowLabel ??
                  getRoleContent(role)?.coachSummary.fertileWindow ??
                  "记录中"}
              </Text>
              <Ionicons name="chevron-down" color={colors.muted} size={14} />
            </Pressable>
          )}

          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            const isLastMessage = index === messages.length - 1;
            const showTypingDots =
              isAssistant && isLastMessage && isSending && message.content === "";

            return (
              <View
                key={message.id}
                style={isAssistant ? styles.chatBubbleAi : styles.chatBubbleUser}
              >
                {showTypingDots ? (
                  <TypingDots />
                ) : (
                  <Text selectable style={isAssistant ? styles.chatText : styles.chatUserText}>
                    {message.id === "starter"
                      ? getRoleContent(role)?.coachIntro ?? message.content
                      : message.content || " "}
                    {isSending && isAssistant && isLastMessage && message.content !== "" ? (
                      <Text style={styles.cursor}> ▋</Text>
                    ) : null}
                  </Text>
                )}

                {isAssistant && message.aborted ? (
                  <Text style={styles.abortedHint}>已停止</Text>
                ) : null}

                {isAssistant && message.answerDetail ? (
                  <View style={styles.structuredContainer}>
                    <StructuredAnswerSection
                      title="今天可以这样做"
                      items={message.answerDetail.suggestions.slice(0, 2)}
                    />
                    <StructuredAnswerSection
                      title="建议记录这些"
                      items={message.answerDetail.suggestions.slice(2, 4)}
                      fallback={role === "male" ? "记一下同房安排、睡眠和喝酒情况。" : "测排卵试纸和体温，记一下身体感受。"}
                    />
                    <StructuredAnswerSection
                      title="需要注意"
                      items={message.answerDetail.suggestions.slice(4, 6)}
                      fallback="要是身体明显不舒服、一直出血或者很焦虑，建议去看医生。"
                    />
                    <View style={styles.answerBlock}>
                      <Text style={styles.answerBlockLabel}>温馨提示</Text>
                      <Text selectable style={styles.safetyNotice}>
                        {message.answerDetail.safety_notice}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {isAssistant && message.id !== "starter" && !showTypingDots && message.content !== "" ? (
                  <View style={styles.messageActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="复制内容"
                      onPress={() => handleCopy(message)}
                      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="copy-outline" color={colors.muted} size={16} />
                      <Text style={styles.actionText}>
                        {copiedMessageId === message.id ? "已复制" : "复制"}
                      </Text>
                    </Pressable>
                    {message.id === lastAssistantId && !isSending && user ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="重新生成回答"
                        onPress={() => handleRegenerate(message)}
                        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                      >
                        <Ionicons name="refresh-outline" color={colors.muted} size={16} />
                        <Text style={styles.actionText}>重新生成</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        {showScrollToBottom ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="回到最新消息"
            onPress={() => scrollToBottom(true)}
            style={({ pressed }) => [styles.scrollToBottom, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-down" color={colors.surface} size={18} />
          </Pressable>
        ) : null}

        <View style={styles.bottomBar}>
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" color={colors.coral} size={16} />
              <Text style={styles.errorBannerText} numberOfLines={2}>
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重试"
                onPress={handleRetry}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
              >
                <Text style={styles.retryButtonText}>重试</Text>
              </Pressable>
            </View>
          ) : null}

          {user ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chipRow}
            >
              {quickPrompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  disabled={isSending || quotaReached}
                  onPress={() => handlePromptChip(prompt)}
                  style={({ pressed }) => [
                    styles.chip,
                    (isSending || quotaReached) && styles.disabled,
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={styles.chipText}>{prompt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {answer ? (
            <View style={styles.quotaRow}>
              <Text style={[styles.quotaText, quotaReached && styles.quotaTextWarn]}>
                {quotaReached
                  ? "今日额度已用完，明天再来吧"
                  : `今日 ${answer.usage.messagesUsedToday}/${answer.usage.dailyLimit}`}
              </Text>
            </View>
          ) : null}

          <View style={styles.inputShell}>
            <TextInput
              placeholder={quotaReached ? "今日额度已用完" : "有什么想问的？"}
              placeholderTextColor={colors.muted}
              style={[styles.input, { height: Math.max(INPUT_MIN_HEIGHT, inputHeight) }]}
              value={question}
              editable={Boolean(user) && !isSending && !quotaReached}
              onChangeText={setQuestion}
              multiline
              textAlignVertical="top"
              onContentSizeChange={(event) => {
                const next = event.nativeEvent.contentSize.height;
                setInputHeight(Math.max(INPUT_MIN_HEIGHT, Math.min(INPUT_MAX_HEIGHT, next)));
              }}
            />
            <SendButton
              state={
                !user
                  ? "signIn"
                  : isSending
                    ? "stop"
                    : question.trim() && !quotaReached
                      ? "send"
                      : "disabled"
              }
              onPress={handlePrimaryAction}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SendButton({
  state,
  onPress
}: {
  state: "signIn" | "send" | "stop" | "disabled";
  onPress: () => void;
}) {
  const config = {
    signIn: { icon: "person-circle-outline" as const, bg: "transparent", fg: colors.coral },
    send: { icon: "arrow-up" as const, bg: colors.coral, fg: colors.surface },
    stop: { icon: "stop" as const, bg: colors.ink, fg: colors.surface },
    disabled: { icon: "arrow-up" as const, bg: colors.border, fg: colors.muted }
  }[state];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={state === "disabled"}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sendButton,
        { backgroundColor: config.bg },
        pressed && state !== "disabled" && styles.pressed
      ]}
    >
      <Ionicons name={config.icon} color={config.fg} size={20} />
    </Pressable>
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
    paddingBottom: 16
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  notice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
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
  newChatButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 42,
    paddingHorizontal: 12
  },
  newChatText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "900"
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
  abortedHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6
  },
  messageActions: {
    flexDirection: "row",
    gap: 14,
    marginTop: 10
  },
  actionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  actionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
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
  contextTopActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  collapseToggle: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28
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
  contextPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  contextPillText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 220
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
  cursor: {
    color: colors.coral,
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
  disabled: {
    opacity: 0.48
  },
  pressed: {
    opacity: 0.7
  },
  structuredContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
    width: "100%"
  },
  bottomBar: {
    gap: 8,
    paddingBottom: spacing.md,
    paddingTop: 4
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: colors.blush,
    borderColor: colors.coralSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  errorBannerText: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  retryButton: {
    backgroundColor: colors.coral,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2
  },
  chip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  chipText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  quotaRow: {
    alignItems: "flex-end"
  },
  quotaText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  quotaTextWarn: {
    color: colors.coral
  },
  inputShell: {
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: 8
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  sendButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  scrollToBottom: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.ink,
    borderRadius: 999,
    bottom: 220,
    elevation: 2,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    width: 36,
    zIndex: 5
  }
});

function getCoachContextBody(role: UserRole | null, isSignedIn: boolean): string {
  if (!isSignedIn) {
    return "登录并开始记录后，我能参考你的数据给出更准确的建议。";
  }

  if (role === "male") {
    return "我会看你的作息、运动和同房安排，帮你找到更好的配合节奏。";
  }

  return "我会看你的排卵数据、体温和身体感受，给你实用的备孕建议。";
}

function getCoachContextChips(role: UserRole | null, isSignedIn: boolean): string[] {
  if (!isSignedIn) {
    return ["身份", "登录", "记录"];
  }

  if (role === "male") {
    return ["她的窗口期", "今天的记录", "生活习惯"];
  }

  return ["周期信息", "今天的记录", "身体变化"];
}

function getPromptGroups(role: UserRole | null): PromptGroup[] {
  if (role === "male") {
    return [
      {
        title: "今天怎么做",
        prompts: ["今天怎么配合比较好？", "多久一次比较合适？"]
      },
      {
        title: "帮我看记录",
        prompts: ["我还缺什么记录？", "睡不好和喝酒有啥影响？"]
      },
      {
        title: "需要注意什么",
        prompts: ["什么情况需要去看医生？", "备孕压力大怎么办？"]
      }
    ];
  }

  return [
    {
      title: "今天怎么做",
      prompts: ["今天要做什么？", "排卵试纸阳了怎么办？"]
    },
    {
      title: "帮我看记录",
      prompts: ["最近的数据怎么样？", "还有什么没记的？"]
    },
    {
      title: "需要注意什么",
      prompts: ["什么情况需要去看医生？", "压力大怎么调节？"]
    }
  ];
}

function getQuickPrompts(role: UserRole | null): string[] {
  return getPromptGroups(role).flatMap((group) => group.prompts);
}
