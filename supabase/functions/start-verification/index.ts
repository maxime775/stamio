import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";
import {
  getOtpConfig,
  startOtpVerification,
  type OtpConfig
} from "../_shared/otp-provider.ts";
import { isUuid, normalizeFrenchMobilePhone } from "../_shared/validation.ts";

const VISITOR_PHONE_LIMIT = 3;
const CONNECTION_WINDOW_MS = 10 * 60 * 1000;
const CONNECTION_REQUEST_LIMIT = 10;
const CONNECTION_DISTINCT_PHONE_LIMIT = 6;

type ConnectionAttemptEntry = {
  expiresAt: number;
  requestTimestamps: number[];
  phoneHashes: Map<string, number>;
};

const visitorConnectionAttempts = new Map<string, ConnectionAttemptEntry>();

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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  const authenticatedUser = await getAuthenticatedVerifiedUser(supabase, req.headers.get("Authorization"));
  const authenticatedUserId = typeof authenticatedUser?.id === "string" ? authenticatedUser.id : null;
  const registeredPhone = authenticatedUser ? getNormalizedRegisteredPhone(authenticatedUser) : null;
  if (authenticatedUser && !registeredPhone) {
    return jsonResponse({ status: "registered_phone_required" }, 409);
  }

  const normalizedVisitorPhone = authenticatedUser
    ? null
    : normalizeFrenchMobilePhone(typeof body?.phone_e164 === "string" ? body.phone_e164 : "");
  if (!authenticatedUser && !normalizedVisitorPhone?.ok) {
    return jsonResponse({ status: "invalid_phone_type" }, 400);
  }
  const phone = registeredPhone ?? (normalizedVisitorPhone?.ok ? normalizedVisitorPhone.phone : null);
  if (!phone) {
    return jsonResponse({ status: "invalid_phone_type" }, 400);
  }

  // Turnstile bypass is only allowed for local_test in local/staging and must never apply in production.
  const canBypassTurnstile =
    otpConfig.provider === "local_test" &&
    (otpConfig.appEnv === "local" || otpConfig.appEnv === "staging");
  const turnstileRequired = !authenticatedUserId && !canBypassTurnstile;
  if (turnstileRequired) {
    if (!turnstileSecret || typeof body?.turnstile_token !== "string") {
      return jsonResponse({ status: "captcha_required" }, 400);
    }
    const turnstileOk = await verifyTurnstile(turnstileSecret, body.turnstile_token, req.headers.get("cf-connecting-ip"));
    if (!turnstileOk) return jsonResponse({ status: "captcha_required" }, 403);
  }

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
  const visitorPhoneHash = await hmacSha256Hex(hmacSecret, `visitor-phone:${phone}`);

  if (!authenticatedUserId) {
    const visitorParticipationCount = await countVisitorPhoneParticipations(supabase, visitorPhoneHash);
    if (visitorParticipationCount === null) {
      return jsonResponse({ status: "error", message: "Visitor limit check failed" }, 500);
    }

    if (visitorParticipationCount >= VISITOR_PHONE_LIMIT) {
      return jsonResponse({ status: "visitor_phone_limit_reached" }, 409);
    }

    const connectionGuardStatus = await checkVisitorConnectionGuard(req.headers, hmacSecret, visitorPhoneHash);
    if (connectionGuardStatus !== "ok") {
      return jsonResponse({ status: connectionGuardStatus }, 429);
    }
  }

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
  return jsonResponse({
    status: "verification_started",
    ...(authenticatedUserId ? { phone_last4: getPhoneLast4(phone) } : {})
  });
});

async function countVisitorPhoneParticipations(
  supabase: ReturnType<typeof createClient>,
  visitorPhoneHash: string
) {
  const { count, error } = await supabase
    .from("visitor_phone_participations")
    .select("id", { count: "exact", head: true })
    .eq("visitor_phone_hash", visitorPhoneHash);

  if (error) {
    console.error("visitor phone participation count failed", error.message);
    return null;
  }
  return count ?? 0;
}

async function getAuthenticatedVerifiedUser(
  supabase: ReturnType<typeof createClient>,
  authorization: string | null
) {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email_confirmed_at) return null;
  return data.user as { id?: unknown; phone?: unknown; email_confirmed_at?: unknown };
}

function getNormalizedRegisteredPhone(user: { phone?: unknown }) {
  const normalizedPhone = normalizeFrenchMobilePhone(typeof user.phone === "string" ? user.phone : "");
  return normalizedPhone.ok ? normalizedPhone.phone : null;
}

function getPhoneLast4(phone: string) {
  return phone.replace(/\D/g, "").slice(-4);
}

async function checkVisitorConnectionGuard(
  headers: Headers,
  hmacSecret: string,
  visitorPhoneHash: string
): Promise<"ok" | "visitor_connection_limit_reached" | "rate_limited"> {
  const ip = getClientIp(headers);
  if (!ip) return "ok";

  const connectionHash = await hmacSha256Hex(hmacSecret, `visitor-connection:${ip}`);
  return recordVisitorConnectionAttempt(connectionHash, visitorPhoneHash);
}

function recordVisitorConnectionAttempt(
  connectionHash: string,
  visitorPhoneHash: string
): "ok" | "visitor_connection_limit_reached" | "rate_limited" {
  const now = Date.now();
  cleanupConnectionAttempts(now);

  const existing = visitorConnectionAttempts.get(connectionHash);
  const entry = existing && existing.expiresAt > now
    ? existing
    : { expiresAt: now + CONNECTION_WINDOW_MS, requestTimestamps: [], phoneHashes: new Map<string, number>() };

  entry.requestTimestamps = entry.requestTimestamps.filter((timestamp) => now - timestamp < CONNECTION_WINDOW_MS);
  for (const [phoneHash, expiresAt] of entry.phoneHashes.entries()) {
    if (expiresAt <= now) entry.phoneHashes.delete(phoneHash);
  }

  if (entry.requestTimestamps.length >= CONNECTION_REQUEST_LIMIT) {
    visitorConnectionAttempts.set(connectionHash, entry);
    return "rate_limited";
  }

  if (!entry.phoneHashes.has(visitorPhoneHash) && entry.phoneHashes.size >= CONNECTION_DISTINCT_PHONE_LIMIT) {
    visitorConnectionAttempts.set(connectionHash, entry);
    return "visitor_connection_limit_reached";
  }

  entry.requestTimestamps.push(now);
  entry.phoneHashes.set(visitorPhoneHash, now + CONNECTION_WINDOW_MS);
  entry.expiresAt = now + CONNECTION_WINDOW_MS;
  visitorConnectionAttempts.set(connectionHash, entry);
  return "ok";
}

function cleanupConnectionAttempts(now: number) {
  for (const [connectionHash, entry] of visitorConnectionAttempts.entries()) {
    if (entry.expiresAt <= now) visitorConnectionAttempts.delete(connectionHash);
  }
}

function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return headers.get("cf-connecting-ip")?.trim()
    || forwardedFor
    || headers.get("x-real-ip")?.trim()
    || headers.get("fly-client-ip")?.trim()
    || null;
}

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
