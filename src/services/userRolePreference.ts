import type { UserRole } from "@/domain/userRole";

import { getProfileRole, setProfileRole } from "./cloudSync";
import { loadJson, saveJson } from "./localStore";

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

/**
 * Called from the signup flow. Writes the role both locally and to the
 * profile so it becomes immutable on the server.
 */
export async function confirmRoleAtSignup(role: UserRole): Promise<void> {
  await setProfileRole(role);
  await saveUserRole(role);
}

/**
 * Pulls the role from the server profile and caches it locally. If the
 * server has no role yet but a local one exists (legacy users from before
 * server-side enforcement), pushes the local role up as a one-time
 * migration.
 */
export async function pullRoleFromCloud(): Promise<UserRole | null> {
  try {
    const remote = await getProfileRole();
    if (remote) {
      await saveUserRole(remote);
      return remote;
    }
    const local = await getUserRole();
    if (local) {
      try {
        await setProfileRole(local);
      } catch {
        // Server may already have a role set by a parallel session — pull again.
        const recheck = await getProfileRole();
        if (recheck) {
          await saveUserRole(recheck);
          return recheck;
        }
      }
      return local;
    }
    return null;
  } catch {
    return null;
  }
}
