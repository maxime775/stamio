import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { digestBallotPermit, isOpaqueBallotPermit } from "../_shared/ballot-permit.ts";
import { isUuid } from "../_shared/validation.ts";

type SubmitBallotInput = { poll_id: string; choice_id: string; permit: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error" }, 405);
  if (req.headers.has("Authorization")) return jsonResponse({ status: "identity_header_forbidden" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return jsonResponse({ status: "error" }, 500);

  const body = await req.json().catch(() => null) as SubmitBallotInput | null;
  if (
    !hasOnlyKeys(body, ["poll_id", "choice_id", "permit"])
    || !isUuid(body?.poll_id)
    || !isUuid(body?.choice_id)
    || !isOpaqueBallotPermit(body?.permit)
  ) {
    return jsonResponse({ status: "error" }, 400);
  }

  const permitDigest = await digestBallotPermit(body.permit);
  const ballotClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await ballotClient.rpc("redeem_ballot_permit", {
    p_permit_digest: permitDigest,
    p_poll_id: body.poll_id,
    p_choice_id: body.choice_id
  });
  if (error) return jsonResponse({ status: "error" }, 500);
  if (data === "accepted" || data === "already_consumed") {
    return jsonResponse({ status: "accepted", replay: data === "already_consumed" });
  }
  if (data === "poll_closed") return jsonResponse({ status: "poll_closed" }, 409);
  if (data === "invalid_choice") return jsonResponse({ status: "error" }, 400);
  if (data === "expired" || data === "revoked" || data === "invalid_permit") {
    return jsonResponse({ status: "permit_invalid" }, 409);
  }
  return jsonResponse({ status: "error" }, 500);
});

function hasOnlyKeys(value: unknown, allowed: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => allowed.includes(key));
}
