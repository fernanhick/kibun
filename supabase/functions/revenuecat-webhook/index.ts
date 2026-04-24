import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Maps RevenueCat event types to the subscription_status values stored in profiles.
// null = no-op (subscription still active until period end; EXPIRATION fires later).
const EVENT_STATUS: Record<string, string | null> = {
  INITIAL_PURCHASE: null,   // resolved per period_type below
  RENEWAL: "active",
  TRIAL_STARTED: "trial",
  TRIAL_CONVERTED: "active",
  UNCANCELLATION: "active",
  PRODUCT_CHANGE: "active",
  EXPIRATION: "expired",
  BILLING_ISSUE: "expired",
  // Still has access until period end — wait for EXPIRATION:
  CANCELLATION: null,
  TRIAL_CANCELLED: null,
  SUBSCRIBER_ALIAS: null,
  TRANSFER: null,
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = body?.event as Record<string, unknown> | undefined;
  if (!event) {
    return new Response(JSON.stringify({ error: "missing_event" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const type = event.type as string;
  const appUserId = event.app_user_id as string;
  const periodType = event.period_type as string | undefined;

  if (!type || !appUserId) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let newStatus: string | null;
  if (type === "INITIAL_PURCHASE") {
    newStatus = periodType === "TRIAL" ? "trial" : "active";
  } else {
    newStatus = EVENT_STATUS[type] ?? null;
  }

  if (newStatus === null) {
    return new Response(JSON.stringify({ received: true, action: "skipped" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await adminClient
    .from("profiles")
    .upsert(
      { user_id: appUserId, subscription_status: newStatus },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("[revenuecat-webhook] DB update failed:", error.message, { type, appUserId });
    return new Response(JSON.stringify({ error: "db_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[revenuecat-webhook]", { type, appUserId, newStatus });

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
