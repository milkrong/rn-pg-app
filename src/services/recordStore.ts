import type { AppCycleLog, RecordOption } from "@/domain/records";
import { createRecordPayload } from "@/domain/records";
import { formatDate } from "@/domain/date";

import { deleteCycleLog, listCycleLogs, upsertCycleLogs } from "./cloudSync";
import type { Json } from "./database.types";
import { loadJson, saveJson } from "./localStore";

const STORAGE_KEY = "cycle-records";
const MAX_LOCAL_RECORDS = 80;

export type NewRecordInput = {
  option: RecordOption;
  value: string;
  note: string;
  happenedOn?: string;
};

export async function loadCycleRecords(): Promise<AppCycleLog[]> {
  const localRecords = (await loadJson<AppCycleLog[]>(STORAGE_KEY)) ?? [];

  try {
    const remoteRows = await listCycleLogs();
    const remoteRecords = remoteRows.map((row): AppCycleLog => ({
      localId: row.local_id,
      logType: row.log_type,
      happenedOn: row.happened_on,
      payload: normalizePayload(row.payload),
      clientUpdatedAt: row.client_updated_at,
      syncStatus: "synced"
    }));
    const merged = mergeRecords(remoteRecords, localRecords);
    await persistRecords(merged);
    return merged;
  } catch {
    return sortRecords(localRecords);
  }
}

export async function addCycleRecord(input: NewRecordInput): Promise<AppCycleLog[]> {
  const now = new Date();
  const record: AppCycleLog = {
    localId: `local-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    logType: input.option.logType,
    happenedOn: input.happenedOn ?? formatDate(now),
    payload: createRecordPayload(input.option, input.value, input.note),
    clientUpdatedAt: now.toISOString(),
    syncStatus: "local"
  };

  const existing = await loadCycleRecords();
  const nextRecords = [record, ...existing];
  await persistRecords(nextRecords);

  try {
    await upsertCycleLogs([
      {
        localId: record.localId,
        logType: record.logType,
        happenedOn: record.happenedOn,
        payload: record.payload,
        clientUpdatedAt: record.clientUpdatedAt
      }
    ]);
    const synced = nextRecords.map((item) =>
      item.localId === record.localId ? { ...item, syncStatus: "synced" as const } : item
    );
    await persistRecords(synced);
    return synced;
  } catch {
    return sortRecords(nextRecords);
  }
}

export async function removeCycleRecord(localId: string): Promise<AppCycleLog[]> {
  const existing = await loadCycleRecords();
  const nextRecords = existing.filter((record) => record.localId !== localId);
  await persistRecords(nextRecords);

  try {
    await deleteCycleLog(localId);
  } catch {
    // Local deletion stays applied even when the user is offline or signed out.
  }

  return nextRecords;
}

function mergeRecords(primary: AppCycleLog[], secondary: AppCycleLog[]): AppCycleLog[] {
  const recordsById = new Map<string, AppCycleLog>();

  [...secondary, ...primary].forEach((record) => {
    const existing = recordsById.get(record.localId);
    if (!existing || existing.clientUpdatedAt < record.clientUpdatedAt || record.syncStatus === "synced") {
      recordsById.set(record.localId, record);
    }
  });

  return sortRecords(Array.from(recordsById.values()));
}

function sortRecords(records: AppCycleLog[]): AppCycleLog[] {
  return [...records].sort((a, b) => b.clientUpdatedAt.localeCompare(a.clientUpdatedAt));
}

async function persistRecords(records: AppCycleLog[]): Promise<void> {
  await saveJson(STORAGE_KEY, sortRecords(records).slice(0, MAX_LOCAL_RECORDS));
}

function normalizePayload(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
