import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";
import { isUuid, normalizePhone } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error", message: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const verifyServiceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const hmacSecret = Deno.env.get("HMAC_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !accountSid || !authToken || !verifyServiceSid || !hmacSecret) {
    return jsonResponse({ status: "error", message: "Server configuration error" }, 500);
  }

  const body = await req.json().catch(() => null);
  const pollId = body?.poll_id;
  const choiceId = body?.choice_id;
  const platform = body?.platform === "web" ? "web" : "native";
  const phone = normalizePhone(body?.phone_e164);

  if (!isUuid(pollId) || !isUuid(choiceId) || !phone) {
    return jsonResponse({ status: "invalid_phone" }, 400);
  }

  if (platform === "web") {
    if (!turnstileSecret || typeof body?.turnstile_token !== "string") {
      return jsonResponse({ status: "turnstile_failed" }, 400);
    }
    const turnstileOk = await verifyTurnstile(turnstileSecret, body.turnstile_token, req.headers.get("cf-connecting-ip"));
    if (!turnstileOk) return jsonResponse({ status: "turnstile_failed" }, 403);
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

  const twilioResponse = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ To: phone, Channel: "sms" })
  });

  await supabase.from("vote_attempts").insert({
    poll_id: pollId,
    choice_id: choiceId,
    phone_poll_hash: phonePollHash,
    event: twilioResponse.ok ? "otp_started" : "otp_start_failed"
  });

  if (!twilioResponse.ok) return jsonResponse({ status: "error", message: "OTP delivery failed" }, 502);
  return jsonResponse({ status: "ok" });
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
