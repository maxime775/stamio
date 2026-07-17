import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";
import { getOtpConfig, startOtpVerification, type OtpConfig } from "../_shared/otp-provider.ts";
import { normalizeFrenchMobilePhone } from "../_shared/validation.ts";

type PhoneProfile = {
  phone_global_hash: string | null;
  phone_last_changed_at: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error", message: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const hmacSecret = Deno.env.get("HMAC_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !hmacSecret) {
    return jsonResponse({ status: "error", message: "Server configuration error" }, 500);
  }

  let otpConfig: OtpConfig;
  try {
    otpConfig = getOtpConfig();
  } catch {
    return jsonResponse({ status: "error", message: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  const user = await getAuthenticatedUser(supabase, req.headers.get("Authorization"));
  if (!user) return jsonResponse({ status: "authentication_required" }, 401);

  const body = await req.json().catch(() => null);
  const normalizedPhone = normalizeFrenchMobilePhone(typeof body?.phone_e164 === "string" ? body.phone_e164 : "");
  if (!normalizedPhone.ok) {
    return jsonResponse({ status: "invalid_phone_type" }, 400);
  }

  const phoneGlobalHash = await hmacSha256Hex(hmacSecret, `account-phone:${normalizedPhone.phone}`);
  const phoneProfile = await getPhoneProfile(supabase, user.id);
  if (!phoneProfile.ok) {
    return jsonResponse({ status: "error", message: "Phone profile could not be read" }, 500);
  }

  const nextAllowedAt = getNextAllowedPhoneChangeAt(phoneProfile.profile, phoneGlobalHash);
  if (nextAllowedAt) {
    return jsonResponse({ status: "phone_change_limited", next_allowed_at: nextAllowedAt }, 409);
  }

  const otpStartStatus = await startOtpVerification(otpConfig, normalizedPhone.phone);
  if (otpStartStatus === "not_allowed") {
    return jsonResponse({ status: "invalid_phone_type" }, 400);
  }
  if (otpStartStatus === "error") {
    return jsonResponse({ status: "error", message: "OTP delivery failed" }, 502);
  }

  return jsonResponse({ status: "verification_started" });
});

async function getPhoneProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ ok: true; profile: PhoneProfile | null } | { ok: false }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("phone_global_hash, phone_last_changed_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("account phone profile read failed", error.message);
    return { ok: false };
  }
  return { ok: true, profile: data as PhoneProfile | null };
}

function getNextAllowedPhoneChangeAt(profile: PhoneProfile | null, nextPhoneHash: string) {
  if (!profile?.phone_last_changed_at || profile.phone_global_hash === nextPhoneHash) return null;

  const lastChangedAt = new Date(profile.phone_last_changed_at);
  if (Number.isNaN(lastChangedAt.getTime())) return null;

  const nextAllowedAt = new Date(lastChangedAt);
  nextAllowedAt.setMonth(nextAllowedAt.getMonth() + 1);
  return Date.now() < nextAllowedAt.getTime() ? nextAllowedAt.toISOString() : null;
}

async function getAuthenticatedUser(
  supabase: ReturnType<typeof createClient>,
  authorization: string | null
) {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email_confirmed_at) return null;
  return data.user;
}

