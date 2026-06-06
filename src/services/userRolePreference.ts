import { loadJson, saveJson } from "./localStore";
import type { UserRole } from "@/domain/userRole";

const USER_ROLE_KEY = "user-role";
const listeners = new Set<(role: UserRole | null) => void>();

export async function getUserRole(): Promise<UserRole | null> {
  const value = await loadJson<UserRole>(USER_ROLE_KEY);
  return value === "female" || value === "male" ? value : null;
}

export async function saveUserRole(role: UserRole): Promise<void> {
  await saveJson(USER_ROLE_KEY, role);
  listeners.forEach((listener) => listener(role));
}

export function subscribeUserRole(listener: (role: UserRole | null) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
