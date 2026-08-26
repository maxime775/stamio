import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];
const clientDirs = ["app", "components", "lib"];
const forbiddenClient = [
  "SUPABASE_SERVICE_ROLE_KEY", "HMAC_SECRET", "IP_HASH_SECRET", "VOTER_HASH_SECRET",
  ".from(\"votes\").insert", ".from('votes').insert",
  ".from(\"vote_phone_locks\").insert", ".from('vote_phone_locks').insert",
  ".from(\"vote_user_locks\").insert", ".from('vote_user_locks').insert",
  ".from(\"user_poll_answers\").insert", ".from('user_poll_answers').insert",
  ".from(\"user_poll_participations\").insert", ".from('user_poll_participations').insert",
  ".from(\"vote_authorization_bindings\")", ".from('vote_authorization_bindings')",
  ".from(\"ballot_permits\")", ".from('ballot_permits')",
  ".from(\"user_reputation_events\").insert", ".from('user_reputation_events').insert",
  ".from(\"abuse_rate_limits\").insert", ".from('abuse_rate_limits').insert",
  "passkey_enrolled_at:"
];

for (const file of walk(root)) {
  const rel = relative(root, file).replaceAll("\\", "/");
  if (rel.includes("node_modules/") || rel.startsWith(".git/") || rel.startsWith(".expo/")) continue;
  const source = readFileSync(file, "utf8");
  if (clientDirs.some((dir) => rel.startsWith(`${dir}/`))) {
    for (const snippet of forbiddenClient) {
      if (source.includes(snippet)) failures.push(`${rel}: client contains forbidden ${snippet}`);
    }
    if (/signInWithOtp|phone_e164|otp_code/.test(source)) failures.push(`${rel}: phone/OTP flow remains in client`);
  }
}

const discussion = read("supabase/migrations/20260701090000_poll_history_and_discussion.sql");
if (!discussion.includes("v_user_id uuid := auth.uid()") || discussion.includes("p_user_id uuid")) {
  failures.push("poll discussion: write RPCs must derive identity from auth.uid()");
}
if (!discussion.includes("revoke all on public.poll_comments from anon, authenticated") ||
    !discussion.includes("grant select (id, poll_id, parent_comment_id, body, created_at, updated_at, deleted_at)")) {
  failures.push("poll discussion: public reads and protected direct writes must remain");
}
if (!discussion.includes("grant execute on function public.get_poll_results_history(uuid) to service_role")) {
  failures.push("results history: raw aggregation RPC must remain server-only");
}

const client = read("lib/supabase.ts");
if (!client.includes("experimental: { passkey: true }")) failures.push("Supabase client: passkey opt-in missing");

const verifier = read("supabase/functions/verify-passkey-enrollment/index.ts");
if (!verifier.includes("auth.getUser(token)") || !verifier.includes("admin.passkey.listPasskeys({ userId: user.id })")) {
  failures.push("passkey verifier: session-derived identity and admin verification required");
}

const deletion = read("supabase/functions/delete-passkey/index.ts");
if (!deletion.includes("auth.getUser(token)") || !deletion.includes("deletePasskey({ userId: user.id, passkeyId })") ||
    !deletion.includes("listPasskeys({ userId: user.id })")) {
  failures.push("passkey deletion: ownership, last-key recovery and server resync required");
}

const authorizeVote = read("supabase/functions/authorize-vote/index.ts");
const submitBallot = read("supabase/functions/submit-ballot/index.ts");
const finalizeVote = read("supabase/functions/finalize-vote/index.ts");
const votingAccount = read("supabase/functions/_shared/voting-account.ts");
for (const expected of ["VOTER_HASH_SECRET", "consume_rate_limit", "issue_ballot_authorization"]) {
  if (!authorizeVote.includes(expected)) failures.push(`authorize-vote: missing ${expected}`);
}
for (const expected of ["auth.getUser(token)", "passkey_required_at", "admin.passkey.listPasskeys({ userId: user.id })"]) {
  if (!votingAccount.includes(expected)) failures.push(`shared voting account verification: missing ${expected}`);
}
if (/choice_id|choiceId/.test(authorizeVote)) failures.push("authorize-vote: Phase A must never receive or process a choice");
if (!submitBallot.includes('req.headers.has("Authorization")') || !submitBallot.includes("redeem_ballot_permit")) failures.push("submit-ballot: anonymous authorization rejection or permit redemption missing");
for (const forbidden of ["user_id", "auth.getUser", "profiles", "vote_authorization_bindings", "user_poll_participations", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (submitBallot.includes(forbidden)) failures.push(`submit-ballot: Phase B contains forbidden ${forbidden}`);
}
if (/choice_id|choiceId|public\.votes/.test(finalizeVote)) failures.push("finalize-vote: Phase A finalization must not inspect a choice or ballot");
for (const [name, source] of [["authorize-vote", authorizeVote], ["submit-ballot", submitBallot], ["finalize-vote", finalizeVote]]) {
  if (/console\.(?:log|info|warn|error)/.test(source)) failures.push(`${name}: vote-path logs are forbidden`);
}

const expand = read("supabase/migrations/20260826120000_anonymous_vote_expand.sql");
const scrub = read("supabase/migrations/20260826160000_anonymous_vote_scrub.sql");
for (const expected of [
  "user_poll_participations", "vote_authorization_bindings", "ballot_permits",
  "issue_ballot_authorization", "redeem_ballot_permit", "finalize_ballot_participation",
  "reconcile_consumed_ballot_participations", "set search_path = pg_catalog, public"
]) {
  if (!expand.includes(expected)) failures.push(`anonymous vote EXPAND: missing ${expected}`);
}
if (!/grant execute on function public\.issue_ballot_authorization\([^;]+to service_role;/s.test(expand) ||
    /grant execute on function public\.issue_ballot_authorization\([^;]+to (?:anon|authenticated|public);/s.test(expand)) {
  failures.push("anonymous vote EXPAND: Phase A authorization RPC must be service_role-only");
}
if (!/grant execute on function public\.redeem_ballot_permit\(text, uuid, uuid\)[^;]+to anon;/s.test(expand)) {
  failures.push("anonymous vote EXPAND: Phase B must expose only the identity-free redemption RPC");
}
for (const legacy of ["user_poll_answers", "vote_user_locks", "vote_phone_locks", "vote_attempts", "submit_authenticated_vote", "submit_verified_vote"]) {
  if (!new RegExp(`drop (?:table|function)[^;]*${legacy}`, "i").test(scrub)) failures.push(`anonymous vote SCRUB: ${legacy} is not removed`);
}
if (!scrub.includes("drop column if exists user_lock_id") || !scrub.includes("drop column if exists lock_id") || !scrub.includes("drop column if exists receipt_hash")) failures.push("anonymous vote SCRUB: ballot identity columns remain");
if (!scrub.includes("anonymous_vote_scrub_identity_and_choice_function_remains")) failures.push("anonymous vote SCRUB: final identity-plus-choice RPC guard missing");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Static security checks passed.");

function read(path) {
  return readFileSync(join(root, ...path.split("/")), "utf8");
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx|js|mjs|sql|env|md)$/.test(entry)) yield path;
  }
}
