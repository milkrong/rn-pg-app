import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { UserRole } from "@/domain/userRole";
import { getRoleContent } from "@/domain/userRole";
import { demoCalendarDays } from "@/fixtures/demoData";
import { getUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

export default function CycleScreen() {
  const [role, setRole] = useState<UserRole | null>("female");
  const content = getRoleContent(role) ?? getRoleContent("female");

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

  return (
    <Screen title={content?.cycleTitle}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {role === "female" ? (
          <View style={styles.calendar}>
            {demoCalendarDays.map((day) => (
              <View key={day.date} style={[styles.day, day.kind === "fertile" && styles.fertileDay, day.kind === "period" && styles.periodDay]}>
                <Text style={[styles.dayText, day.kind !== "normal" && styles.activeDayText]}>{day.label}</Text>
                <Text style={styles.dayMeta}>{day.meta}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.partnerPlan}>
            {["睡眠", "运动", "饮酒", "高温", "同房", "压力"].map((item, index) => (
              <View key={item} style={[styles.partnerItem, index === 4 && styles.partnerItemActive]}>
                <Text style={[styles.partnerItemText, index === 4 && styles.partnerItemTextActive]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{content?.cyclePanelTitle}</Text>
          <Text style={styles.panelBody}>{content?.cyclePanelBody}</Text>
        </View>

        <View style={styles.recordList}>
          {content?.cycleRecords.map((item) => (
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
  },
  partnerPlan: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.lg
  },
  partnerItem: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 62,
    justifyContent: "center",
    width: "31.5%"
  },
  partnerItemActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral
  },
  partnerItemText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  partnerItemTextActive: {
    color: colors.surface
  }
});
