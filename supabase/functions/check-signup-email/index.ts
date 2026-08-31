import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hmacSha256Hex, sha256Hex } from "../_shared/crypto.ts";

type EmailStatus = "available" | "existing_confirmed" | "existing_unconfirmed";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const lookupSecret = Deno.env.get("EMAIL_LOOKUP_SECRET");
  if (!url || !serviceKey || !lookupSecret) return jsonResponse({ status: "error" }, 500);

  const body = await req.json().catch(() => null);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const resumeToken = typeof body?.resume_token === "string" ? body.resume_token : "";
  if (resumeToken) {
    const parsed = parseResumeToken(resumeToken);
    if (!parsed) return jsonResponse({ status: "invalid" });

    const keyHash = await hmacSha256Hex(lookupSecret, `signup-confirmation:${resumeToken}`);
    const globalHash = await hmacSha256Hex(lookupSecret, "signup-confirmation:global");
    const [perTokenRate, globalRate] = await Promise.all([
      admin.rpc("consume_rate_limit", {
        p_key_hash: keyHash,
        p_action: "signup_confirmation_resume",
        p_limit: 300,
        p_window_seconds: 900
      }),
      admin.rpc("consume_rate_limit", {
        p_key_hash: globalHash,
        p_action: "signup_confirmation_resume_global",
        p_limit: 6000,
        p_window_seconds: 900
      })
    ]);
    if (perTokenRate.error || globalRate.error) return jsonResponse({ status: "error" }, 500);
    if (perTokenRate.data !== true || globalRate.data !== true) return jsonResponse({ status: "rate_limited" }, 429);

    const { data, error } = await admin.auth.admin.getUserById(parsed.userId);
    if (error || !data.user) return jsonResponse({ status: "invalid" });
    const expectedHash = typeof data.user.user_metadata?.signup_resume_secret_hash === "string"
      ? data.user.user_metadata.signup_resume_secret_hash
      : "";
    const presentedHash = await sha256Hex(parsed.secret);
    if (!constantTimeEqual(expectedHash, presentedHash)) return jsonResponse({ status: "invalid" });

    const metadataExpiry = Date.parse(String(data.user.user_metadata?.signup_resume_expires_at ?? ""));
    const createdAt = Date.parse(data.user.created_at);
    const serverExpiry = createdAt + 24 * 60 * 60 * 1000;
    if (!Number.isFinite(metadataExpiry) || !Number.isFinite(createdAt) || Date.now() > Math.min(metadataExpiry, serverExpiry)) {
      return jsonResponse({ status: "expired" });
    }
    return jsonResponse({ status: data.user.email_confirmed_at ? "confirmed" : "pending" });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) return jsonResponse({ status: "error" }, 400);

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

function parseResumeToken(value: string) {
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([a-f0-9]{64})$/i.exec(value);
  return match ? { userId: match[1], secret: match[2].toLowerCase() } : null;
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length || left.length === 0) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
