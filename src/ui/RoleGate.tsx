import { Pressable, StyleSheet, Text, View } from "react-native";
import type { UserRole } from "@/domain/userRole";
import { ROLE_CONTENT } from "@/domain/userRole";
import { colors, radius, spacing, typography } from "./tokens";

type Props = {
  onSelect: (role: UserRole) => void;
};

export function RoleGate({ onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>Nurture</Text>
      <Text style={styles.title}>选择你的备孕入口</Text>
      <Text style={styles.body}>
        不同性别看到的记录重点会不同。你可以之后在 Profile 里随时切换。
      </Text>

      <View style={styles.options}>
        <RoleOption
          role="female"
          title="女生入口"
          body="周期、经期、LH、基础体温、症状和排卵窗口。"
          onSelect={onSelect}
        />
        <RoleOption
          role="male"
          title="男生入口"
          body="精子健康习惯、同房计划、睡眠运动和伴侣支持。"
          onSelect={onSelect}
        />
      </View>
    </View>
  );
}

function RoleOption({
  role,
  title,
  body,
  onSelect
}: {
  role: UserRole;
  title: string;
  body: string;
  onSelect: (role: UserRole) => void;
}) {
  return (
    <Pressable onPress={() => onSelect(role)} style={styles.option}>
      <Text style={styles.optionLabel}>{ROLE_CONTENT[role].label}</Text>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionBody}>{body}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingTop: spacing.xl
  },
  kicker: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "900"
  },
  title: {
    ...typography.h1,
    color: colors.ink
  },
  body: {
    ...typography.body,
    color: colors.text
  },
  options: {
    gap: spacing.md,
    marginTop: spacing.sm
  },
  option: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg
  },
  optionLabel: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8
  },
  optionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8
  },
  optionBody: {
    ...typography.body,
    color: colors.text
  }
});
