import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { encryptPhoneE164, hmacSha256Hex, sha256Hex } from "../_shared/crypto.ts";
import { checkOtpCode, getOtpConfig, type OtpConfig } from "../_shared/otp-provider.ts";
import { isOtp, normalizeFrenchMobilePhone } from "../_shared/validation.ts";

const PROOF_TTL_MS = 30 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const hmacSecret = Deno.env.get("HMAC_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !hmacSecret) {
    return jsonResponse({ status: "error" }, 500);
  }

  let otpConfig: OtpConfig;
  try {
    otpConfig = getOtpConfig();
  } catch {
    return jsonResponse({ status: "error" }, 500);
  }

  const body = await req.json().catch(() => null);
  const normalizedPhone = normalizeFrenchMobilePhone(typeof body?.phone_e164 === "string" ? body.phone_e164 : "");
  if (!normalizedPhone.ok || !isOtp(body?.otp_code)) {
    return jsonResponse({ status: "invalid_code" }, 400);
  }

  const otpStatus = await checkOtpCode(otpConfig, normalizedPhone.phone, body.otp_code);
  if (otpStatus === "expired") return jsonResponse({ status: "code_expired" }, 410);
  if (otpStatus !== "approved") return jsonResponse({ status: "invalid_code" }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  await deleteExpiredProofs(supabase);
  const phoneGlobalHash = await hmacSha256Hex(hmacSecret, `account-phone:${normalizedPhone.phone}`);
  const { count, error: ownershipError } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("phone_global_hash", phoneGlobalHash);

  if (ownershipError) return jsonResponse({ status: "error" }, 500);
  if ((count ?? 0) > 0) return jsonResponse({ status: "phone_already_linked" }, 409);

  let encryptedPhone;
  try {
    encryptedPhone = await encryptPhoneE164(normalizedPhone.phone);
  } catch {
    return jsonResponse({ status: "account_phone_unavailable" }, 500);
  }

  const verificationToken = createVerificationToken();
  const { error: proofError } = await supabase.from("signup_phone_verifications").insert({
    token_hash: await sha256Hex(verificationToken),
    phone_global_hash: phoneGlobalHash,
    phone_last4: normalizedPhone.phone.replace(/\D/g, "").slice(-4),
    phone_ciphertext: encryptedPhone.ciphertext,
    phone_iv: encryptedPhone.iv,
    phone_encryption_version: encryptedPhone.version,
    expires_at: new Date(Date.now() + PROOF_TTL_MS).toISOString()
  });
  if (proofError) return jsonResponse({ status: "error" }, 500);

  return jsonResponse({ status: "phone_confirmed", verification_token: verificationToken });
});

async function deleteExpiredProofs(supabase: ReturnType<typeof createClient>) {
  const { error } = await supabase
    .from("signup_phone_verifications")
    .delete()
    .lte("expires_at", new Date().toISOString());
  if (error) console.error("expired signup verification cleanup failed");
}

function createVerificationToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
