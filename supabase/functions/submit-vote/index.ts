import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";
import { isOtp, isUuid, normalizePhone } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error", message: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
  const hmacSecret = Deno.env.get("HMAC_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !accountSid || !authToken || !verifyServiceSid || !hmacSecret) {
    return jsonResponse({ status: "error", message: "Server configuration error" }, 500);
  }

  const body = await req.json().catch(() => null);
  const pollId = body?.poll_id;
  const choiceId = body?.choice_id;
  const phone = normalizePhone(body?.phone_e164);
  const otpCode = body?.otp_code;

  if (!isUuid(pollId) || !isUuid(choiceId) || !phone || !isOtp(otpCode)) {
    return jsonResponse({ status: "invalid_code" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const checkResponse = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ To: phone, Code: otpCode })
  });

  const checkPayload = await checkResponse.json().catch(() => null);
  if (!checkResponse.ok || checkPayload?.status !== "approved") {
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
