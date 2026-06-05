import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "./tokens";

export function Screen({ children, title }: PropsWithChildren<{ title?: string }>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  title: {
    ...typography.screenTitle,
    color: colors.ink,
    marginBottom: spacing.lg
  }
});
