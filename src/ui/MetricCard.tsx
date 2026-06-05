import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./tokens";

type Props = {
  label: string;
  value: string;
  detail: string;
  tone: "coral" | "sage";
};

export function MetricCard({ label, value, detail, tone }: Props) {
  const accent = tone === "coral" ? colors.coral : colors.sage;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8
  },
  value: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4
  },
  detail: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  }
});
