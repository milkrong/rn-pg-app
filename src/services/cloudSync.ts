import type { Plan } from "@/domain/entitlements";

import { requireSupabase } from "./supabase";
import type { Database, Json } from "./database.types";

type CycleLogRow = Database["public"]["Tables"]["cycle_logs"]["Row"];
type CycleLogInsert = Database["public"]["Tables"]["cycle_logs"]["Insert"];
type HealthKitCursorRow = Database["public"]["Tables"]["healthkit_sync_cursors"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type CycleLogType = CycleLogRow["log_type"];

export type CycleLogDraft = {
  localId: string;
  logType: CycleLogType;
  happenedOn: string;
  payload?: Json;
  clientUpdatedAt: string;
};

export type BackendProfile = Pick<ProfileRow, "display_name" | "locale">;

export async function getCurrentUserId(): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("A signed-in Supabase user is required.");
  }

  return data.user.id;
}

export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfile(profile: BackendProfile): Promise<ProfileRow> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...profile }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export type ProfileRole = "female" | "male";

export async function getProfileRole(): Promise<ProfileRole | null> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const role = data?.role ?? null;
  return role === "female" || role === "male" ? role : null;
}

export async function setProfileRole(role: ProfileRole): Promise<void> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, role }, { onConflict: "id" });

  if (error) {
    throw error;
  }
}

export async function listCycleLogs(fromDate?: string): Promise<CycleLogRow[]> {
  const supabase = requireSupabase();
  let query = supabase.from("cycle_logs").select("*").order("happened_on", { ascending: false });

  if (fromDate) {
    query = query.gte("happened_on", fromDate);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertCycleLogs(logs: CycleLogDraft[]): Promise<CycleLogRow[]> {
  if (logs.length === 0) {
    return [];
  }

  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const rows: CycleLogInsert[] = logs.map((log) => ({
    user_id: userId,
    local_id: log.localId,
    log_type: log.logType,
    happened_on: log.happenedOn,
    payload: log.payload ?? {},
    client_updated_at: log.clientUpdatedAt
  }));

  const { data, error } = await supabase
    .from("cycle_logs")
    .upsert(rows, { onConflict: "user_id,local_id" })
    .select();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCycleLog(localId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("cycle_logs").delete().eq("local_id", localId);

  if (error) {
    throw error;
  }
}

export async function getEntitlement(): Promise<{ plan: Plan; expiresAt: string | null }> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("entitlements")
    .select("plan, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    plan: data?.plan ?? "free",
    expiresAt: data?.expires_at ?? null
  };
}

export async function getAiUsageToday(): Promise<number> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("ai_usage")
    .select("messages_used")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.messages_used ?? 0;
}

export async function upsertHealthKitCursor(input: {
  capability: string;
  cursorValue: string;
}): Promise<HealthKitCursorRow> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("healthkit_sync_cursors")
    .upsert(
      {
        user_id: userId,
        capability: input.capability,
        cursor_value: input.cursorValue
      },
      { onConflict: "user_id,capability" }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
