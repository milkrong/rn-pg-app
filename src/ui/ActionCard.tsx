import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "./tokens";

type Props = {
  title: string;
  description: string;
  tone: "primary" | "calm" | "care";
};

const toneColor = {
  primary: colors.coral,
  calm: colors.sage,
  care: colors.ink
};

export function ActionCard({ title, description, tone }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.indicator, { backgroundColor: toneColor[tone] }]} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  indicator: {
    borderRadius: 4,
    height: 42,
    marginRight: spacing.md,
    width: 6
  },
  copy: {
    flex: 1
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5
  },
  description: {
    ...typography.body,
    color: colors.text
  }
});
