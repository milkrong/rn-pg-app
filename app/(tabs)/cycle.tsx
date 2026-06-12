import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { computeCycleSummary, getFemalePhaseRelevance } from "@/domain/cycle";
import { formatDate } from "@/domain/date";
import type { AppCycleLog, RecordKind } from "@/domain/records";
import { formatRecordDetail, formatRecordTitle, getRecordOption, getRecordOptions } from "@/domain/records";
import type { UserRole } from "@/domain/userRole";
import { getRoleContent } from "@/domain/userRole";
import { addCycleRecord, loadCycleRecords, removeCycleRecord } from "@/services/recordStore";
import { getUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

export default function CycleScreen() {
  const params = useLocalSearchParams<{ recordKind?: string }>();
  const [role, setRole] = useState<UserRole | null>("female");
  const [selectedKind, setSelectedKind] = useState<RecordKind>("ovulation_test");
  const [selectedValue, setSelectedValue] = useState("");
  const [note, setNote] = useState("");
  const [records, setRecords] = useState<AppCycleLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("登录后记录会自动备份到云端。");
  const content = getRoleContent(role) ?? getRoleContent("female");
  const activeRole = role ?? "female";
  const today = formatDate(new Date());
  const cycleSummary = useMemo(
    () => (activeRole === "female" ? computeCycleSummary(records, today) : null),
    [activeRole, records, today]
  );
  const phaseRelevance = useMemo(
    () => (activeRole === "female" && cycleSummary ? getFemalePhaseRelevance(cycleSummary.phase) : null),
    [activeRole, cycleSummary]
  );
  const recordOptions = useMemo(() => {
    const all = getRecordOptions(activeRole);
    if (!phaseRelevance) {
      return all;
    }
    const order = new Map(phaseRelevance.visible.map((kind, index) => [kind, index]));
    return all
      .filter((option) => order.has(option.kind))
      .sort((a, b) => (order.get(a.kind) ?? 99) - (order.get(b.kind) ?? 99));
  }, [activeRole, phaseRelevance]);
  const recommendedKind: RecordKind = phaseRelevance?.primary ?? getRecommendedKind(activeRole);
  const recommendedOption = getRecordOption(activeRole, recommendedKind);
  const selectedOption = getRecordOption(activeRole, selectedKind);
  const completedToday = recordOptions.filter((option) => getTodayRecordValue(records, option.kind, today)).length;
  const recordGroups = useMemo(
    () => groupRecordsByDate(records.length > 0 ? records : fallbackRecords(content?.cycleRecords ?? [])),
    [content?.cycleRecords, records]
  );

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
    const requestedKind = params.recordKind;
    if (typeof requestedKind === "string") {
      const option = recordOptions.find((item) => item.kind === requestedKind);
      if (option) {
        setSelectedKind(option.kind);
        setSelectedValue("");
        setNote("");
      }
    }
  }, [params.recordKind, recordOptions]);

  useEffect(() => {
    if (!recordOptions.some((option) => option.kind === selectedKind)) {
      setSelectedKind(recommendedKind);
      setSelectedValue("");
      setNote("");
    }
  }, [recommendedKind, recordOptions, selectedKind]);

  useEffect(() => {
    let isMounted = true;

    loadCycleRecords()
      .then((nextRecords) => {
        if (isMounted) {
          setRecords(nextRecords);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus("暂时只保存在手机上，登录后可以同步。");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveRecord() {
    const value = selectedValue.trim() || note.trim();
    if (!value) {
      setStatus("先选一个选项，或者写点备注。");
      return;
    }

    setIsSaving(true);
    setStatus("保存中…");

    try {
      const nextRecords = await addCycleRecord({
        option: selectedOption,
        value,
        note: selectedValue.trim() ? note : ""
      });
      setRecords(nextRecords);
      setSelectedValue("");
      setNote("");
      setStatus(nextRecords[0]?.syncStatus === "synced" ? "已保存，已同步到云端 ✓" : "已保存到手机，登录后可以同步。");
    } catch {
      setStatus("保存失败了，稍后再试试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRecord(localId: string) {
    try {
      const nextRecords = await removeCycleRecord(localId);
      setRecords(nextRecords);
      setStatus("已删除。");
    } catch {
      setStatus("删除失败了，稍后再试试。");
    }
  }

  function confirmDelete(record: AppCycleLog) {
    Alert.alert("删除记录", formatRecordTitle(record), [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => void deleteRecord(record.localId) }
    ]);
  }

  return (
    <Screen title={content?.cycleTitle}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View>
              <Text style={styles.statusKicker}>{content?.cyclePanelTitle}</Text>
              <Text style={styles.statusTitle}>{activeRole === "female" ? content?.heroLabel : content?.heroPhase}</Text>
            </View>
            <View style={styles.completionBadge}>
              <Text style={styles.completionValue}>{completedToday}/{recordOptions.length}</Text>
              <Text style={styles.completionLabel}>今日完成</Text>
            </View>
          </View>
          <Text style={styles.statusBody}>{content?.cyclePanelBody}</Text>
          <View style={styles.recommendation}>
            <Ionicons name="sparkles-outline" color={colors.coral} size={17} />
            <Text style={styles.recommendationText}>推荐先记：{recommendedOption.label}</Text>
          </View>
        </View>

        <View style={styles.trackerGrid}>
          {recordOptions.map((option) => {
            const todayValue = getTodayRecordValue(records, option.kind, today);
            const isSelected = option.kind === selectedOption.kind;
            const isComplete = Boolean(todayValue);
            return (
              <Pressable
                key={option.kind}
                style={[styles.trackerTile, isSelected && styles.trackerTileActive]}
                onPress={() => {
                  setSelectedKind(option.kind);
                  setSelectedValue("");
                  setNote("");
                }}
              >
                <View style={[styles.trackerIcon, isSelected && styles.trackerIconActive]}>
                  <Ionicons name={option.icon} color={isSelected ? colors.surface : colors.coral} size={20} />
                </View>
                <Text style={[styles.trackerLabel, isSelected && styles.trackerLabelActive]}>{option.label}</Text>
                <Text style={[styles.trackerValue, isSelected && styles.trackerValueActive]}>
                  {todayValue ?? "还没记"}
                </Text>
                {isComplete ? <View style={styles.doneDot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.form}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.panelTitle}>记录{selectedOption.label}</Text>
              <Text style={styles.formHint}>{status}</Text>
            </View>
            <View style={styles.syncBadge}>
              <Ionicons name="cloud-done-outline" color={colors.sage} size={16} />
              <Text style={styles.syncText}>已同步</Text>
            </View>
          </View>

          <View style={styles.valueRow}>
            {selectedOption.quickValues.map((value) => {
              const isSelected = selectedValue === value;
              return (
                <Pressable
                  key={value}
                  style={[styles.valueChip, isSelected && styles.valueChipActive]}
                  onPress={() => setSelectedValue(value)}
                >
                  <Text style={[styles.valueText, isSelected && styles.valueTextActive]}>{value}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            multiline
            placeholder={selectedOption.placeholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={note}
            onChangeText={setNote}
          />

          <Pressable style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} onPress={saveRecord} disabled={isSaving}>
            <Ionicons name="add-circle-outline" color={colors.surface} size={19} />
            <Text style={styles.saveText}>{isSaving ? "保存中…" : "保存"}</Text>
          </Pressable>
        </View>

        <View style={styles.recordSectionHeader}>
          <Text style={styles.sectionTitle}>最近的记录</Text>
          <Text style={styles.recordCount}>{records.length} 条</Text>
        </View>

        <View style={styles.recordList}>
          {recordGroups.map((group) => (
            <View key={group.title} style={styles.recordGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.items.map((item) => (
                <View key={item.localId} style={styles.recordRow}>
                  <View style={styles.recordCopy}>
                    <Text style={styles.recordText}>{formatRecordTitle(item)}</Text>
                    <Text style={styles.recordDetail}>{formatRecordDetail(item)}</Text>
                  </View>
                  {records.length > 0 ? (
                    <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item)}>
                      <Ionicons name="trash-outline" color={colors.muted} size={18} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
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
  statusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  statusTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  statusKicker: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 7
  },
  statusTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    maxWidth: 210
  },
  statusBody: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md
  },
  completionBadge: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 78,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  completionValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  completionLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  },
  recommendation: {
    alignItems: "center",
    backgroundColor: colors.blush,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  recommendationText: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  trackerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.lg
  },
  trackerTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 104,
    padding: spacing.sm,
    position: "relative",
    width: "31.5%"
  },
  trackerTileActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  trackerIcon: {
    alignItems: "center",
    backgroundColor: colors.blush,
    borderRadius: radius.sm,
    height: 32,
    justifyContent: "center",
    marginBottom: 9,
    width: 32
  },
  trackerIconActive: {
    backgroundColor: colors.coral
  },
  trackerLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 5
  },
  trackerLabelActive: {
    color: colors.surface
  },
  trackerValue: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
  },
  trackerValueActive: {
    color: colors.blush
  },
  doneDot: {
    backgroundColor: colors.sage,
    borderColor: colors.surface,
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    position: "absolute",
    right: 8,
    top: 8,
    width: 10
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
  form: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.md
  },
  formHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  formHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    maxWidth: 220
  },
  syncBadge: {
    alignItems: "center",
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  syncText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  valueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.md
  },
  valueChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  valueChipActive: {
    backgroundColor: colors.sageSoft,
    borderColor: colors.sage
  },
  valueText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  valueTextActive: {
    color: colors.ink
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing.md,
    minHeight: 82,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: 8,
    height: 46,
    justifyContent: "center"
  },
  saveButtonDisabled: {
    opacity: 0.55
  },
  saveText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  recordSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  sectionTitle: {
    ...typography.section,
    color: colors.ink
  },
  recordCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  recordList: {
    gap: 10
  },
  recordGroup: {
    gap: 8
  },
  groupTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4
  },
  recordRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.md
  },
  recordCopy: {
    flex: 1
  },
  recordText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 5
  },
  recordDetail: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: "center",
    width: 34
  }
});

function fallbackRecords(items: string[]): AppCycleLog[] {
  return items.map((item, index) => {
    const [label, value] = item.split("：");
    return {
      localId: `demo-${index}`,
      logType: "symptom",
      happenedOn: "示例",
      payload: { label, value: value ?? "" },
      clientUpdatedAt: `${index}`,
      syncStatus: "local"
    };
  });
}

function getRecommendedKind(role: UserRole): RecordKind {
  return role === "male" ? "intercourse" : "ovulation_test";
}

function getTodayRecordValue(records: AppCycleLog[], kind: RecordKind, today: string): string | null {
  const record = records.find((item) => item.happenedOn === today && item.payload.kind === kind);
  return typeof record?.payload.value === "string" && record.payload.value.length > 0 ? record.payload.value : null;
}

function groupRecordsByDate(records: AppCycleLog[]): Array<{ title: string; items: AppCycleLog[] }> {
  const groups = new Map<string, AppCycleLog[]>();

  records.forEach((record) => {
    const title = formatGroupTitle(record.happenedOn);
    groups.set(title, [...(groups.get(title) ?? []), record]);
  });

  return Array.from(groups.entries()).map(([title, items]) => ({ title, items }));
}

function formatGroupTitle(date: string): string {
  if (date === "示例") {
    return "示例";
  }

  const today = formatDate(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatDate(yesterdayDate);

  if (date === today) {
    return "今天";
  }

  if (date === yesterday) {
    return "昨天";
  }

  return date;
}
