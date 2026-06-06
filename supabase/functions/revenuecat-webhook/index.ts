import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

type RevenueCatWebhook = {
  api_version?: string;
  event?: {
    id?: string;
    type?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    aliases?: string[];
    product_id?: string;
    entitlement_id?: string | null;
    entitlement_ids?: string[] | null;
    expiration_at_ms?: number | null;
  };
};

const proEventTypes = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "TEMPORARY_ENTITLEMENT_GRANT",
  "PRODUCT_CHANGE"
]);

const freeEventTypes = new Set([
  "EXPIRATION",
  "SUBSCRIPTION_PAUSED",
  "TRANSFER"
]);

const statusEventTypes = new Set([
  "BILLING_ISSUE",
  "CANCELLATION"
]);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expectedAuthorization = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!expectedAuthorization) {
    return json({ error: "Missing RevenueCat webhook secret" }, 500);
  }

  const authorization = req.headers.get("authorization");
  if (authorization !== expectedAuthorization && authorization !== `Bearer ${expectedAuthorization}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: RevenueCatWebhook;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const event = body.event;
  const eventId = event?.id;
  const eventType = event?.type;
  const revenueCatCustomerId = event?.app_user_id ?? event?.original_app_user_id;

  if (!eventId || !eventType || !revenueCatCustomerId) {
    return json({ error: "Missing required RevenueCat event fields" }, 400);
  }

  const userId = getUserId(event);
  const entitlementIds = getEntitlementIds(event);
  const plan = getPlanForEvent(eventType, entitlementIds, event?.expiration_at_ms ?? null);
  const expiresAt = event?.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { error: eventError } = await supabase.from("subscription_events").insert({
    id: eventId,
    user_id: userId,
    event_type: eventType,
    revenuecat_customer_id: revenueCatCustomerId,
    product_id: event?.product_id ?? null,
    entitlement_ids: entitlementIds,
    payload: body
  });

  if (eventError) {
    if (eventError.code === "23505") {
      return json({ ok: true, duplicate: true });
    }

    return json({ error: eventError.message }, 500);
  }

  if (!userId || !plan) {
    return json({ ok: true, ignored: true });
  }

  const { error: entitlementError } = await supabase.from("entitlements").upsert(
    {
      user_id: userId,
      plan,
      expires_at: plan === "pro" ? expiresAt : null,
      revenuecat_customer_id: revenueCatCustomerId
    },
    { onConflict: "user_id" }
  );

  if (entitlementError) {
    return json({ error: entitlementError.message }, 500);
  }

  return json({ ok: true, plan });
});

function getUserId(event: NonNullable<RevenueCatWebhook["event"]>): string | null {
  const ids = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])].filter(Boolean);
  return ids.find((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id ?? "")) ?? null;
}

function getEntitlementIds(event: NonNullable<RevenueCatWebhook["event"]>): string[] {
  return event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : []);
}

function getPlanForEvent(eventType: string, entitlementIds: string[], expirationAtMs: number | null): "free" | "pro" | null {
  if (!entitlementIds.includes("pro")) {
    return null;
  }

  if (proEventTypes.has(eventType)) {
    return expirationAtMs && expirationAtMs < Date.now() ? "free" : "pro";
  }

  if (freeEventTypes.has(eventType)) {
    return "free";
  }

  if (statusEventTypes.has(eventType)) {
    return expirationAtMs && expirationAtMs > Date.now() ? "pro" : "free";
  }

  return null;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status
  });
}
