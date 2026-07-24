import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { decryptPhoneE164, hmacSha256Hex } from "../_shared/crypto.ts";
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
  const authenticatedUserResult = await getAuthenticatedVerifiedUser(supabase, req.headers.get("Authorization"));
  if (authenticatedUserResult.status === "error") {
    return jsonResponse({ status: "error", message: "Account could not be verified" }, 500);
  }
  const authenticatedUser = authenticatedUserResult.user;
  const authenticatedUserId = typeof authenticatedUser?.id === "string" ? authenticatedUser.id : null;
  let phone: string;
  let registeredPhoneLast4: string | null = null;
  if (authenticatedUserId) {
    const phoneProfile = await getVerifiedPhoneProfile(supabase, authenticatedUserId);
    if (phoneProfile.status === "error") {
      return jsonResponse({ status: "error", message: "Account phone could not be verified" }, 500);
    }
    if (!phoneProfile.phone_global_hash
      || !phoneProfile.phone_last4
      || !phoneProfile.phone_ciphertext
      || !phoneProfile.phone_iv
      || phoneProfile.phone_encryption_version !== 1) {
      return jsonResponse({ status: "registered_phone_required" }, 409);
    }
    try {
      phone = await decryptPhoneE164(
        phoneProfile.phone_ciphertext,
        phoneProfile.phone_iv,
        phoneProfile.phone_encryption_version
      );
    } catch {
      return jsonResponse({ status: "account_phone_unavailable" }, 500);
    }
    const normalizedStoredPhone = normalizeFrenchMobilePhone(phone);
    if (!normalizedStoredPhone.ok) return jsonResponse({ status: "account_phone_unavailable" }, 500);
    phone = normalizedStoredPhone.phone;
    const storedPhoneHash = await hmacSha256Hex(hmacSecret, `account-phone:${phone}`);
    if (storedPhoneHash !== phoneProfile.phone_global_hash) {
      return jsonResponse({ status: "account_phone_unavailable" }, 500);
    }
    registeredPhoneLast4 = phoneProfile.phone_last4;
  } else {
    const normalizedVisitorPhone = normalizeFrenchMobilePhone(typeof body?.phone_e164 === "string" ? body.phone_e164 : "");
    if (!normalizedVisitorPhone.ok) return jsonResponse({ status: "invalid_phone_type" }, 400);
    phone = normalizedVisitorPhone.phone;
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
    ...(authenticatedUserId ? { phone_last4: registeredPhoneLast4 ?? getPhoneLast4(phone) } : {})
  });
});

async function getVerifiedPhoneProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{
  status: "ok";
  phone_global_hash: string | null;
  phone_last4: string | null;
  phone_ciphertext: string | null;
  phone_iv: string | null;
  phone_encryption_version: number | null;
} | {
  status: "error";
  phone_global_hash: null;
  phone_last4: null;
  phone_ciphertext: null;
  phone_iv: null;
  phone_encryption_version: null;
}> {
  const { data, error } = await supabase
    .from("profiles")
    .select("phone_global_hash, phone_last4, phone_ciphertext, phone_iv, phone_encryption_version")
    .eq("id", userId)
    .maybeSingle();
  if (error) return {
    status: "error",
    phone_global_hash: null,
    phone_last4: null,
    phone_ciphertext: null,
    phone_iv: null,
    phone_encryption_version: null
  };
  return {
    status: "ok",
    phone_global_hash: typeof data?.phone_global_hash === "string" ? data.phone_global_hash : null,
    phone_last4: typeof data?.phone_last4 === "string" ? data.phone_last4 : null,
    phone_ciphertext: typeof data?.phone_ciphertext === "string" ? data.phone_ciphertext : null,
    phone_iv: typeof data?.phone_iv === "string" ? data.phone_iv : null,
    phone_encryption_version: typeof data?.phone_encryption_version === "number" ? data.phone_encryption_version : null
  };
}

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
): Promise<
  | { status: "authenticated"; user: { id?: unknown; phone?: unknown; email_confirmed_at?: unknown } }
  | { status: "none"; user: null }
  | { status: "error"; user: null }
> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { status: "none", user: null };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email_confirmed_at) {
    return { status: "none", user: null };
  }

  const { data: adminData, error: adminError } = await supabase.auth.admin.getUserById(data.user.id);
  if (adminError || !adminData.user?.email_confirmed_at) {
    console.error("authenticated user refresh failed", adminError?.message ?? "missing user");
    return { status: "error", user: null };
  }
  return {
    status: "authenticated",
    user: adminData.user as { id?: unknown; phone?: unknown; email_confirmed_at?: unknown }
  };
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
