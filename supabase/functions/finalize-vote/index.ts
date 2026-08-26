import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { digestBallotPermit, isOpaqueBallotPermit } from "../_shared/ballot-permit.ts";
import { isUuid } from "../_shared/validation.ts";
import { createVotingAdmin, resolveVotingAccount } from "../_shared/voting-account.ts";

type FinalizeVoteInput = { poll_id: string; permit: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !serviceKey) return jsonResponse({ status: "error" }, 500);
  if (!token) return jsonResponse({ status: "authentication_required" }, 401);

  const body = await req.json().catch(() => null) as FinalizeVoteInput | null;
  if (!hasOnlyKeys(body, ["poll_id", "permit"]) || !isUuid(body?.poll_id) || !isOpaqueBallotPermit(body?.permit)) {
    return jsonResponse({ status: "error" }, 400);
  }

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

  const permitDigest = await digestBallotPermit(body.permit);
  const { data, error } = await admin.rpc("finalize_ballot_participation", {
    p_user_id: account.userId,
    p_poll_id: body.poll_id,
    p_permit_digest: permitDigest
  });
  if (error) return jsonResponse({ status: "error" }, 500);
  if (data === "finalized" || data === "already_participated") {
    return jsonResponse({ status: "finalized" });
  }
  if (data === "pending") return jsonResponse({ status: "pending" }, 409);
  return jsonResponse({ status: "error" }, 400);
});

function hasOnlyKeys(value: unknown, allowed: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => allowed.includes(key));
}
