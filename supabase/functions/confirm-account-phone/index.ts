import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { encryptPhoneE164, hmacSha256Hex } from "../_shared/crypto.ts";
import { checkOtpCode, getOtpConfig, type OtpConfig } from "../_shared/otp-provider.ts";
import { isOtp, normalizeFrenchMobilePhone } from "../_shared/validation.ts";

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
  if (!normalizedPhone.ok || !isOtp(body?.otp_code)) {
    return jsonResponse({ status: "invalid_code" }, 400);
  }

  const phoneLast4 = getPhoneLast4(normalizedPhone.phone);
  const phoneGlobalHash = await hmacSha256Hex(hmacSecret, `account-phone:${normalizedPhone.phone}`);
  const phoneProfile = await getPhoneProfile(supabase, user.id);
  if (!phoneProfile.ok) {
    return jsonResponse({ status: "error", message: "Phone profile could not be read" }, 500);
  }

  const nextAllowedAt = getNextAllowedPhoneChangeAt(phoneProfile.profile, phoneGlobalHash);
  if (nextAllowedAt) {
    return jsonResponse({ status: "phone_change_limited", next_allowed_at: nextAllowedAt }, 409);
  }

  const otpStatus = await checkOtpCode(otpConfig, normalizedPhone.phone, body.otp_code);
  if (otpStatus !== "approved") {
    return jsonResponse({ status: "invalid_code" }, 401);
  }

  const { count: linkedProfileCount, error: linkedProfileError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("phone_global_hash", phoneGlobalHash)
    .neq("id", user.id);
  if (linkedProfileError) {
    return jsonResponse({ status: "error", message: "Phone ownership could not be checked" }, 500);
  }
  if ((linkedProfileCount ?? 0) > 0) {
    return jsonResponse({ status: "phone_already_linked" }, 409);
  }

  let encryptedPhone;
  try {
    encryptedPhone = await encryptPhoneE164(normalizedPhone.phone);
  } catch {
    return jsonResponse({ status: "account_phone_unavailable" }, 500);
  }

  const now = new Date().toISOString();
  const phoneLastChangedAt = shouldRefreshPhoneChangeTimestamp(phoneProfile.profile, phoneGlobalHash)
    ? now
    : phoneProfile.profile?.phone_last_changed_at ?? now;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      phone_last4: phoneLast4,
      phone_global_hash: phoneGlobalHash,
      phone_ciphertext: encryptedPhone.ciphertext,
      phone_iv: encryptedPhone.iv,
      phone_encryption_version: encryptedPhone.version,
      phone_verified_at: now,
      phone_last_changed_at: phoneLastChangedAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", user.id);

  if (profileError) {
    if (profileError.code === "23505") {
      return jsonResponse({ status: "phone_already_linked" }, 409);
    }
    return jsonResponse({ status: "error", message: "Profile could not be updated" }, 500);
  }

  return jsonResponse({
    status: "phone_confirmed",
    phone_last4: phoneLast4,
    phone_verified_at: now,
    phone_last_changed_at: phoneLastChangedAt
  });
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

function shouldRefreshPhoneChangeTimestamp(profile: PhoneProfile | null, nextPhoneHash: string) {
  return !profile?.phone_last_changed_at || profile.phone_global_hash !== nextPhoneHash;
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

function getPhoneLast4(phone: string) {
  return phone.replace(/\D/g, "").slice(-4);
}

