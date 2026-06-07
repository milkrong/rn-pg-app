import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { colors } from "@/ui/tokens";

type TabIconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: TabIconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 86,
          paddingBottom: 24,
          paddingTop: 10
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700"
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Today", tabBarIcon: tabIcon("today-outline") }}
      />
      <Tabs.Screen
        name="cycle"
        options={{ title: "Cycle", tabBarIcon: tabIcon("calendar-outline") }}
      />
      <Tabs.Screen
        name="coach"
        options={{ title: "Coach", tabBarIcon: tabIcon("sparkles-outline") }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: "Insights", tabBarIcon: tabIcon("analytics-outline") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: tabIcon("person-circle-outline") }}
      />
    </Tabs>
  );
}
