import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";
import { isUuid } from "../_shared/validation.ts";

type VoteRpcResult = { status: string; receipt_hash: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const voterHashSecret = Deno.env.get("VOTER_HASH_SECRET");
  const receiptSecret = Deno.env.get("HMAC_SECRET");
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !serviceKey || !voterHashSecret || !receiptSecret) return jsonResponse({ status: "error" }, 500);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, experimental: { passkey: true } }
  });
  if (!token) {
    await logAttempt(admin, "vote_auth_failed", null, null, null);
    return jsonResponse({ status: "authentication_required" }, 401);
  }

  const body = await req.json().catch(() => null);
  const pollId = body?.poll_id;
  const choiceId = body?.choice_id;
  if (!isUuid(pollId) || !isUuid(choiceId)) return jsonResponse({ status: "error" }, 400);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user?.id || !user.email_confirmed_at) {
    await logAttempt(admin, "vote_auth_failed", pollId, choiceId, null);
    return jsonResponse({ status: "authentication_required" }, 401);
  }

  const voterHash = await hmacSha256Hex(voterHashSecret, `vote-user:${pollId}:${user.id}`);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("passkey_required_at, passkey_enrolled_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    await logAttempt(admin, "vote_server_error", pollId, choiceId, voterHash);
    return jsonResponse({ status: "error" }, 500);
  }

  if (profile.passkey_required_at && !profile.passkey_enrolled_at) {
    const { data: passkeys, error: passkeyError } = await admin.auth.admin.passkey.listPasskeys({ userId: user.id });
    if (passkeyError) {
      await logAttempt(admin, "vote_server_error", pollId, choiceId, voterHash);
      return jsonResponse({ status: "error" }, 502);
    }
    if (!passkeys?.length) {
      await logAttempt(admin, "vote_passkey_required", pollId, choiceId, voterHash);
      return jsonResponse({ status: "passkey_required" }, 403);
    }
    const { error: syncError } = await admin
      .from("profiles")
      .update({ passkey_enrolled_at: new Date().toISOString() })
      .eq("id", user.id);
    if (syncError) {
      await logAttempt(admin, "vote_server_error", pollId, choiceId, voterHash);
      return jsonResponse({ status: "error" }, 500);
    }
  }

  const { data: rateAllowed, error: rateError } = await admin.rpc("consume_rate_limit", {
    p_key_hash: voterHash,
    p_action: "vote",
    p_limit: 30,
    p_window_seconds: 600
  });
  if (rateError) {
    await logAttempt(admin, "vote_server_error", pollId, choiceId, voterHash);
    return jsonResponse({ status: "error" }, 500);
  }
  if (rateAllowed !== true) {
    await logAttempt(admin, "vote_rate_limited", pollId, choiceId, voterHash);
    return jsonResponse({ status: "rate_limited" }, 429);
  }

  const receiptHash = await hmacSha256Hex(receiptSecret, `receipt:${pollId}:${choiceId}:${user.id}:${crypto.randomUUID()}`);
  const { data, error } = await admin.rpc("submit_authenticated_vote", {
    p_user_id: user.id,
    p_poll_id: pollId,
    p_choice_id: choiceId,
    p_voter_hash: voterHash,
    p_receipt_hash: receiptHash
  });
  const result = (Array.isArray(data) ? data[0] : data) as VoteRpcResult | null;
  if (error || !result) {
    await logAttempt(admin, "vote_server_error", pollId, choiceId, voterHash);
    return jsonResponse({ status: "error" }, 500);
  }
  if (result.status === "accepted" && result.receipt_hash) {
    const { data: aggregate, error: aggregateError } = await admin.rpc("get_poll_results", { p_poll_id: pollId });
    if (aggregateError || !Array.isArray(aggregate)) {
      return jsonResponse({ status: "accepted", receipt_hash: result.receipt_hash, results_unavailable: true });
    }
    return jsonResponse({
      status: "accepted",
      receipt_hash: result.receipt_hash,
      results: aggregate.map((row: Record<string, unknown>) => ({
        choice_id: row.choice_id,
        label: row.label,
        votes: Number(row.votes ?? 0)
      }))
    });
  }
  if (result.status === "already_voted") {
    return jsonResponse({ status: "duplicate", message: "Vous avez déjà participé à cette question." }, 409);
  }
  if (result.status === "poll_closed") return jsonResponse({ status: "poll_closed" }, 409);
  if (result.status === "invalid_choice") return jsonResponse({ status: "error" }, 400);
  return jsonResponse({ status: "error" }, 500);
});

async function logAttempt(
  admin: ReturnType<typeof createClient>,
  eventType: string,
  pollId: string | null,
  choiceId: string | null,
  voterHash: string | null
) {
  const { error } = await admin.rpc("log_vote_attempt", {
    p_event: eventType,
    p_poll_id: pollId,
    p_choice_id: choiceId,
    p_voter_hash: voterHash
  });
  if (error) console.error("vote_attempt_log_failed", { eventType });
}
