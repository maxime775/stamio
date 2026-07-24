import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getOtpConfig, startOtpVerification, type OtpConfig } from "../_shared/otp-provider.ts";
import { normalizeFrenchMobilePhone } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error" }, 405);

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ status: "error" }, 500);
  let otpConfig: OtpConfig;
  try {
    otpConfig = getOtpConfig();
  } catch {
    return jsonResponse({ status: "error" }, 500);
  }

  const body = await req.json().catch(() => null);
  const normalizedPhone = normalizeFrenchMobilePhone(typeof body?.phone_e164 === "string" ? body.phone_e164 : "");
  if (!normalizedPhone.ok) return jsonResponse({ status: "invalid_phone_type" }, 400);

  // The only allowed bypass is the shared local/staging test provider; production always verifies Turnstile.
  const canBypassTurnstile =
    otpConfig.provider === "local_test" &&
    (otpConfig.appEnv === "local" || otpConfig.appEnv === "staging");
  if (!canBypassTurnstile) {
    if (!turnstileSecret || typeof body?.turnstile_token !== "string") {
      return jsonResponse({ status: "captcha_required" }, 400);
    }
    const turnstileOk = await verifyTurnstile(
      turnstileSecret,
      body.turnstile_token,
      req.headers.get("cf-connecting-ip")
    );
    if (!turnstileOk) return jsonResponse({ status: "captcha_required" }, 403);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { error: cleanupError } = await supabase
    .from("signup_phone_verifications")
    .delete()
    .lte("expires_at", new Date().toISOString());
  if (cleanupError) console.error("expired signup verification cleanup failed");

  const otpStatus = await startOtpVerification(otpConfig, normalizedPhone.phone);
  if (otpStatus === "not_allowed") return jsonResponse({ status: "invalid_phone_type" }, 400);
  if (otpStatus === "error") return jsonResponse({ status: "error" }, 502);

  // Do not inspect account ownership here: pre-OTP responses must remain non-enumerable.
  return jsonResponse({ status: "verification_started" });
});

async function verifyTurnstile(secret: string, token: string, ip: string | null) {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret,
      response: token,
      ...(ip ? { remoteip: ip } : {})
    })
  }).catch(() => null);
  if (!response?.ok) return false;
  const payload = await response.json().catch(() => ({ success: false }));
  return payload.success === true;
}
