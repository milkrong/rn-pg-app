import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "./tokens";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
};

export function QuickLogButton({ icon, label, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onPress}>
      <Ionicons name={icon} color={colors.coral} size={22} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
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
  buttonPressed: {
    borderColor: colors.coral,
    transform: [{ scale: 0.98 }]
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    textAlign: "center"
  }
});
