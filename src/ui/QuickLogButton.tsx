import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./tokens";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

export function QuickLogButton({ icon, label }: Props) {
  return (
    <View style={styles.button}>
      <Ionicons name={icon} color={colors.coral} size={22} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    height: 76,
    justifyContent: "center",
    padding: spacing.sm
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800"
  }
});
