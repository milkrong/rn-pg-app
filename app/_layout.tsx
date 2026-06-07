import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getAuthSnapshot, subscribeToAuthChanges } from "@/services/auth";
import { pullRoleFromCloud } from "@/services/userRolePreference";

export default function RootLayout() {
  useEffect(() => {
    getAuthSnapshot()
      .then((snapshot) => {
        if (snapshot.user) {
          pullRoleFromCloud();
        }
      })
      .catch(() => undefined);

    const unsubscribe = subscribeToAuthChanges((user) => {
      if (user) {
        pullRoleFromCloud();
      }
    });
    return unsubscribe;
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
