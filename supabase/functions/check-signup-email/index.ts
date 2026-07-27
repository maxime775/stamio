import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";

type EmailStatus = "available" | "existing_confirmed" | "existing_unconfirmed";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const lookupSecret = Deno.env.get("EMAIL_LOOKUP_SECRET");
  if (!url || !serviceKey || !lookupSecret) return jsonResponse({ status: "error" }, 500);

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) return jsonResponse({ status: "error" }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const keyHash = await hmacSha256Hex(lookupSecret, `signup-email:${email}`);
  const globalHash = await hmacSha256Hex(lookupSecret, "signup-email:global");
  const [perEmailRate, globalRate] = await Promise.all([
    admin.rpc("consume_rate_limit", {
      p_key_hash: keyHash,
      p_action: "signup_email_lookup",
      p_limit: 5,
      p_window_seconds: 900
    }),
    admin.rpc("consume_rate_limit", {
      p_key_hash: globalHash,
      p_action: "signup_email_lookup_global",
      p_limit: 300,
      p_window_seconds: 900
    })
  ]);
  if (perEmailRate.error || globalRate.error) return jsonResponse({ status: "error" }, 500);
  if (perEmailRate.data !== true || globalRate.data !== true) return jsonResponse({ status: "rate_limited" }, 429);

  const { data, error } = await admin.rpc("get_signup_email_status", { p_email: email });
  if (error || !isEmailStatus(data)) return jsonResponse({ status: "error" }, 500);
  return jsonResponse({ status: data });
});

function isValidEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isEmailStatus(value: unknown): value is EmailStatus {
  return value === "available" || value === "existing_confirmed" || value === "existing_unconfirmed";
}
