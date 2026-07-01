import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";
import { checkOtpCode, getOtpConfig, type OtpConfig } from "../_shared/otp-provider.ts";
import { isOtp, isUuid, normalizeFrenchMobilePhone } from "../_shared/validation.ts";

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

  const body = await req.json().catch(() => null);
  const pollId = body?.poll_id;
  const choiceId = body?.choice_id;
  const otpCode = body?.otp_code;

  if (!isUuid(pollId) || !isUuid(choiceId) || !isOtp(otpCode)) {
    return jsonResponse({ status: "invalid_code" }, 400);
  }

  const normalizedPhone = normalizeFrenchMobilePhone(
    typeof body?.phone_e164 === "string" ? body.phone_e164 : ""
  );
  if (!normalizedPhone.ok) {
    return jsonResponse({ status: "invalid_phone_type" }, 400);
  }
  const phone = normalizedPhone.phone;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  const authenticatedUserId = await getAuthenticatedVerifiedUserId(supabase, req.headers.get("Authorization"));

  const otpStatus = await checkOtpCode(otpConfig, phone, otpCode);
  if (otpStatus !== "approved") {
    await supabase.from("vote_attempts").insert({
      poll_id: isUuid(pollId) ? pollId : null,
      choice_id: isUuid(choiceId) ? choiceId : null,
      event: "otp_rejected"
    });
    return jsonResponse({ status: "invalid_code" }, 401);
  }

  const phonePollHash = await hmacSha256Hex(hmacSecret, `${pollId}:${phone}`);
  const receiptHash = await hmacSha256Hex(hmacSecret, `receipt:${pollId}:${choiceId}:${phonePollHash}:${crypto.randomUUID()}`);

  const { data, error } = await supabase.rpc("submit_verified_vote", {
    p_poll_id: pollId,
    p_choice_id: choiceId,
    p_phone_poll_hash: phonePollHash,
    p_receipt_hash: receiptHash
  });

  if (error || !data?.[0]) {
    await supabase.from("vote_attempts").insert({
      poll_id: pollId,
      choice_id: choiceId,
      phone_poll_hash: phonePollHash,
      event: "vote_error"
    });
    return jsonResponse({ status: "error", message: "Vote could not be recorded" }, 500);
  }

  const result = data[0] as { status: string; receipt_hash: string | null };
  await supabase.from("vote_attempts").insert({
    poll_id: pollId,
    choice_id: choiceId,
    phone_poll_hash: phonePollHash,
    event: result.status === "accepted" ? "vote_accepted" : result.status === "duplicate" ? "vote_duplicate" : "vote_error"
  });

  if (result.status === "accepted" && result.receipt_hash) {
    if (authenticatedUserId) {
      const { error: answerError } = await supabase.rpc("record_verified_user_answer", {
        p_user_id: authenticatedUserId,
        p_poll_id: pollId,
        p_choice_id: choiceId
      });
      if (answerError) console.error("record_verified_user_answer failed", answerError.message);
    }
    return jsonResponse({ status: "accepted", receipt_hash: result.receipt_hash });
  }
  if (result.status === "duplicate") {
    return jsonResponse({ status: "duplicate", message: "Ce numéro a déjà été utilisé pour cette question." }, 409);
  }
  if (result.status === "poll_closed") {
    return jsonResponse({ status: "poll_closed" }, 409);
  }
  return jsonResponse({ status: "error" }, 500);
});

async function getAuthenticatedVerifiedUserId(
  supabase: ReturnType<typeof createClient>,
  authorization: string | null
) {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email_confirmed_at) return null;
  return data.user.id;
}
