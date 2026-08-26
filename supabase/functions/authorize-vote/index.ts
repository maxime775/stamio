import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createOpaqueBallotPermit, digestBallotPermit } from "../_shared/ballot-permit.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";
import { isUuid } from "../_shared/validation.ts";
import { createVotingAdmin, resolveVotingAccount } from "../_shared/voting-account.ts";

const PERMIT_TTL_MS = 5 * 60 * 1000;

type AuthorizeVoteInput = { poll_id: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const voterHashSecret = Deno.env.get("VOTER_HASH_SECRET");
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !serviceKey || !voterHashSecret) return jsonResponse({ status: "error" }, 500);
  if (!token) return jsonResponse({ status: "authentication_required" }, 401);

  const body = await req.json().catch(() => null) as AuthorizeVoteInput | null;
  if (!hasOnlyKeys(body, ["poll_id"]) || !isUuid(body?.poll_id)) {
    return jsonResponse({ status: "error" }, 400);
  }
  const pollId = body.poll_id;

  const admin = createVotingAdmin(url, serviceKey);
  const account = await resolveVotingAccount(admin, token);
  if (account.status === "authentication_required") {
    return jsonResponse({ status: "authentication_required" }, 401);
  }
  if (account.status === "passkey_required") {
    return jsonResponse({ status: "passkey_required" }, 403);
  }
  if (account.status === "error") {
    return jsonResponse({ status: "error" }, account.httpStatus);
  }

  const accountRateHash = await hmacSha256Hex(
    voterHashSecret,
    `vote-user:${pollId}:${account.userId}`
  );
  const { data: rateAllowed, error: rateError } = await admin.rpc("consume_rate_limit", {
    p_key_hash: accountRateHash,
    p_action: "authorize_vote",
    p_limit: 30,
    p_window_seconds: 600
  });
  if (rateError) return jsonResponse({ status: "error" }, 500);
  if (rateAllowed !== true) return jsonResponse({ status: "rate_limited" }, 429);

  const permit = createOpaqueBallotPermit();
  const permitDigest = await digestBallotPermit(permit);
  const expiresAt = new Date(Date.now() + PERMIT_TTL_MS).toISOString();
  const { data, error } = await admin.rpc("issue_ballot_authorization", {
    p_user_id: account.userId,
    p_poll_id: pollId,
    p_permit_digest: permitDigest,
    p_expires_at: expiresAt
  });
  if (error) return jsonResponse({ status: "error" }, 500);
  if (data === "authorized") return jsonResponse({ status: "authorized", permit, expires_at: expiresAt });
  if (data === "already_participated") {
    return jsonResponse({ status: "duplicate", message: "Vous avez déjà participé à cette question." }, 409);
  }
  if (data === "poll_closed") return jsonResponse({ status: "poll_closed" }, 409);
  return jsonResponse({ status: "error" }, 500);
});

function hasOnlyKeys(value: unknown, allowed: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => allowed.includes(key));
}
