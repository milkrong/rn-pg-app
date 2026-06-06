import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { UserRole } from "@/domain/userRole";
import { getRoleContent } from "@/domain/userRole";
import { getUserRole, subscribeUserRole } from "@/services/userRolePreference";
import { Screen } from "@/ui/Screen";
import { colors, radius, spacing, typography } from "@/ui/tokens";

export default function InsightsScreen() {
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
    <Screen title="趋势洞察">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {content?.insights.map(([label, value, detail]) => (
          <View key={label} style={styles.card}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.detail}>{detail}</Text>
          </View>
        ))}

        <View style={styles.report}>
          <Text style={styles.reportTitle}>{content?.reportTitle}</Text>
          <Text style={styles.reportBody}>{content?.reportBody}</Text>
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
