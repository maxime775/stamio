import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";
import {
  getOtpConfig,
  startOtpVerification,
  type OtpConfig
} from "../_shared/otp-provider.ts";
import { isUuid, normalizeFrenchMobilePhone } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error", message: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
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

  const body = await req.json().catch(() => null);
  const pollId = body?.poll_id;
  const choiceId = body?.choice_id;

  if (!isUuid(pollId) || !isUuid(choiceId)) {
    return jsonResponse({ status: "error", message: "Invalid request" }, 400);
  }

  const normalizedPhone = normalizeFrenchMobilePhone(
    typeof body?.phone_e164 === "string" ? body.phone_e164 : ""
  );
  if (!normalizedPhone.ok) {
    return jsonResponse({ status: "invalid_phone_type" }, 400);
  }
  const phone = normalizedPhone.phone;

  // Turnstile bypass is only allowed for local_test in local/staging and must never apply in production.
  const canBypassTurnstile =
    otpConfig.provider === "local_test" &&
    (otpConfig.appEnv === "local" || otpConfig.appEnv === "staging");
  const turnstileRequired = !canBypassTurnstile;
  if (turnstileRequired) {
    if (!turnstileSecret || typeof body?.turnstile_token !== "string") {
      return jsonResponse({ status: "captcha_required" }, 400);
    }
    const turnstileOk = await verifyTurnstile(turnstileSecret, body.turnstile_token, req.headers.get("cf-connecting-ip"));
    if (!turnstileOk) return jsonResponse({ status: "captcha_required" }, 403);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: choice, error: choiceError } = await supabase
    .from("choices")
    .select("id, poll_id, polls!inner(id, status, closes_at)")
    .eq("id", choiceId)
    .eq("poll_id", pollId)
    .maybeSingle();

  const poll = choice?.polls as { status: string; closes_at: string | null } | undefined;
  if (choiceError || !choice || !poll || poll.status !== "open" || (poll.closes_at && new Date(poll.closes_at) <= new Date())) {
    return jsonResponse({ status: "poll_closed" }, 409);
  }

  const phonePollHash = await hmacSha256Hex(hmacSecret, `${pollId}:${phone}`);

  const otpStartStatus = await startOtpVerification(otpConfig, phone);

  await supabase.from("vote_attempts").insert({
    poll_id: pollId,
    choice_id: choiceId,
    phone_poll_hash: phonePollHash,
    event: otpStartStatus === "started" ? "otp_started" : "otp_start_failed"
  });

  if (otpStartStatus === "not_allowed") {
    return jsonResponse({ status: "invalid_phone_type" }, 400);
  }
  if (otpStartStatus === "error") {
    return jsonResponse({ status: "error", message: "OTP delivery failed" }, 502);
  }
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
  });
  if (!response.ok) return false;
  const payload = await response.json().catch(() => ({ success: false }));
  return payload.success === true;
}
