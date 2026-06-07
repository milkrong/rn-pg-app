import type { AppCycleLog } from "@/domain/records";
import type { UserRole } from "@/domain/userRole";

import { getCurrentUserId } from "./cloudSync";
import type { Json } from "./database.types";
import { requireSupabase } from "./supabase";

export type PartnershipStatus = "pending" | "active" | "cancelled";
export type PartnershipRole = "female" | "male";

export type Partnership = {
  id: string;
  femaleUserId: string | null;
  maleUserId: string | null;
  status: PartnershipStatus;
  inviteCode: string;
  createdBy: string;
  createdByRole: PartnershipRole;
  createdAt: string;
  acceptedAt: string | null;
};

export type PartnerProfile = {
  id: string;
  displayName: string | null;
};

type PartnershipRow = {
  id: string;
  female_user_id: string | null;
  male_user_id: string | null;
  status: PartnershipStatus;
  invite_code: string;
  created_by: string;
  created_by_role: PartnershipRole;
  created_at: string;
  accepted_at: string | null;
};

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 6;

function fromRow(row: PartnershipRow): Partnership {
  return {
    id: row.id,
    femaleUserId: row.female_user_id,
    maleUserId: row.male_user_id,
    status: row.status,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdByRole: row.created_by_role,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at
  };
}

function partnerIdOf(partnership: Partnership, myUserId: string): string | null {
  if (partnership.status !== "active") {
    return null;
  }
  if (partnership.femaleUserId === myUserId) {
    return partnership.maleUserId;
  }
  if (partnership.maleUserId === myUserId) {
    return partnership.femaleUserId;
  }
  return null;
}

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
  }
  return code;
}

export async function getMyPartnership(): Promise<Partnership | null> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("partnerships")
    .select("*")
    .or(
      `female_user_id.eq.${userId},male_user_id.eq.${userId},created_by.eq.${userId}`
    )
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const row = data?.[0] as PartnershipRow | undefined;
  return row ? fromRow(row) : null;
}

export async function createInvite(role: UserRole): Promise<Partnership> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const insert =
      role === "female"
        ? {
            female_user_id: userId,
            male_user_id: null,
            status: "pending" as const,
            invite_code: inviteCode,
            created_by: userId,
            created_by_role: "female" as const
          }
        : {
            male_user_id: userId,
            female_user_id: null,
            status: "pending" as const,
            invite_code: inviteCode,
            created_by: userId,
            created_by_role: "male" as const
          };

    const { data, error } = await supabase
      .from("partnerships")
      .insert(insert)
      .select()
      .single();

    if (!error && data) {
      return fromRow(data as PartnershipRow);
    }
    lastError = error;
    // Retry on unique-violation for invite_code; other errors fail fast.
    const code = (error as { code?: string } | null)?.code;
    if (code !== "23505") {
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("生成邀请码失败，请稍后再试。");
}

export async function acceptInvite(inviteCode: string): Promise<Partnership> {
  const supabase = requireSupabase();
  const trimmed = inviteCode.trim().toUpperCase();
  if (!trimmed) {
    throw new Error("请输入邀请码。");
  }
  const { data, error } = await supabase.rpc("accept_partner_invite", {
    p_invite_code: trimmed
  });
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("邀请码无效或已被使用。");
  }
  return fromRow(data as PartnershipRow);
}

export async function cancelPartnership(partnershipId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("partnerships")
    .update({ status: "cancelled" as const, cancelled_at: new Date().toISOString() })
    .eq("id", partnershipId);
  if (error) {
    throw error;
  }
}

export async function getPartnerProfile(partnerId: string): Promise<PartnerProfile | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", partnerId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return { id: data.id as string, displayName: (data.display_name as string | null) ?? null };
}

export async function getPartnerCycleLogs(partnership: Partnership): Promise<AppCycleLog[]> {
  const supabase = requireSupabase();
  const userId = await getCurrentUserId();
  const partnerId = partnerIdOf(partnership, userId);
  if (!partnerId) {
    return [];
  }

  const { data, error } = await supabase
    .from("cycle_logs")
    .select("*")
    .eq("user_id", partnerId)
    .order("happened_on", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row): AppCycleLog => ({
    localId: row.local_id as string,
    logType: row.log_type as AppCycleLog["logType"],
    happenedOn: row.happened_on as string,
    payload: normalizePayload(row.payload as Json),
    clientUpdatedAt: row.client_updated_at as string,
    syncStatus: "synced"
  }));
}

export function getPartnerIdForUser(partnership: Partnership, myUserId: string): string | null {
  return partnerIdOf(partnership, myUserId);
}

function normalizePayload(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
