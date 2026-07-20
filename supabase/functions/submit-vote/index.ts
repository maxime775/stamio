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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  const authenticatedUserResult = await getAuthenticatedVerifiedUser(supabase, req.headers.get("Authorization"));
  if (authenticatedUserResult.status === "error") {
    return jsonResponse({ status: "error", message: "Account could not be verified" }, 500);
  }
  const authenticatedUser = authenticatedUserResult.user;
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

  const otpStatus = await checkOtpCode(otpConfig, phone, otpCode);
  if (otpStatus !== "approved") {
    await supabase.from("vote_attempts").insert({
      poll_id: isUuid(pollId) ? pollId : null,
      choice_id: isUuid(choiceId) ? choiceId : null,
      event: "otp_rejected"
    });
    return jsonResponse({ status: "invalid_code" }, 401);
  }

  if (!authenticatedUserId) {
    const phoneAccountHash = await hmacSha256Hex(hmacSecret, `account-phone:${phone}`);
    const linkedAccountStatus = await hasLinkedAccountPhone(supabase, phoneAccountHash);
    if (linkedAccountStatus === "error") {
      return jsonResponse({ status: "error", message: "Vote could not be recorded" }, 500);
    }
    if (linkedAccountStatus === "linked") {
      return jsonResponse({ status: "account_login_required" }, 409);
    }
  }

  const phonePollHash = await hmacSha256Hex(hmacSecret, `${pollId}:${phone}`);
  const visitorPhoneHash = authenticatedUserId ? null : await hmacSha256Hex(hmacSecret, `visitor-phone:${phone}`);
  const receiptHash = await hmacSha256Hex(hmacSecret, `receipt:${pollId}:${choiceId}:${phonePollHash}:${crypto.randomUUID()}`);

  const { data, error } = await supabase.rpc("submit_verified_vote", {
    p_poll_id: pollId,
    p_choice_id: choiceId,
    p_phone_poll_hash: phonePollHash,
    p_receipt_hash: receiptHash,
    p_visitor_phone_hash: visitorPhoneHash
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

function getNormalizedRegisteredPhone(user: { phone?: unknown }) {
  const normalizedPhone = normalizeFrenchMobilePhone(typeof user.phone === "string" ? user.phone : "");
  return normalizedPhone.ok ? normalizedPhone.phone : null;
}

async function hasLinkedAccountPhone(
  supabase: ReturnType<typeof createClient>,
  phoneAccountHash: string
): Promise<"linked" | "none" | "error"> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("phone_global_hash", phoneAccountHash)
    .limit(1);

  if (error) {
    console.error("account phone lookup failed", error.message);
    return "error";
  }
  return (count ?? 0) > 0 ? "linked" : "none";
}
