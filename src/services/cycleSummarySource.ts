import type { AppCycleLog } from "@/domain/records";
import type { UserRole } from "@/domain/userRole";

import { getMyPartnership, getPartnerCycleLogs, type Partnership } from "./partner";
import { loadCycleRecords } from "./recordStore";

export type CycleSummarySource = "self" | "partner" | "none";

export type CycleSourceResult = {
  records: AppCycleLog[];
  source: CycleSummarySource;
  partnership: Partnership | null;
};

/**
 * For a female user we read her own records. For a male user with an active
 * partnership we read his partner's records (so his hero and coach context can
 * reflect her real cycle day). Falls back to "none" when there is nothing to
 * compute from.
 */
export async function loadCycleSourceRecords(
  role: UserRole | null,
  isSignedIn: boolean
): Promise<CycleSourceResult> {
  if (role === "female" || role == null) {
    const records = await loadCycleRecords();
    return { records, source: "self", partnership: null };
  }

  if (!isSignedIn) {
    return { records: [], source: "none", partnership: null };
  }

  let partnership: Partnership | null = null;
  try {
    partnership = await getMyPartnership();
  } catch {
    partnership = null;
  }

  if (!partnership || partnership.status !== "active") {
    return { records: [], source: "none", partnership };
  }

  try {
    const records = await getPartnerCycleLogs(partnership);
    return { records, source: "partner", partnership };
  } catch {
    return { records: [], source: "none", partnership };
  }
}
