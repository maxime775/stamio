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

const vote = read("supabase/functions/submit-vote/index.ts");
const votingAccount = read("supabase/functions/_shared/voting-account.ts");
for (const expected of ["auth.getUser(token)", "VOTER_HASH_SECRET", "consume_rate_limit", "submit_authenticated_vote", "passkey_required_at"]) {
  if (!vote.includes(expected)) failures.push(`submit-vote: missing ${expected}`);
}
for (const expected of ["auth.getUser(token)", "passkey_required_at", "admin.passkey.listPasskeys({ userId: user.id })"]) {
  if (!votingAccount.includes(expected)) failures.push(`shared voting account verification: missing ${expected}`);
}
if (/\bnew Map\s*</.test(vote) || vote.includes("voteWindows")) failures.push("submit-vote: in-memory rate limit is forbidden");
if (vote.includes("record_verified_user_answer") || vote.includes("submit_verified_vote")) failures.push("submit-vote: split or phone-based vote RPC remains");
if (/body\?\.(?:user_id|userId)/.test(vote)) failures.push("submit-vote: user identity must not come from request body");
if (/console\.(?:log|info|warn|error)\([^)]*(?:token|credential|user\.id|email|rawIp)/i.test(vote)) failures.push("submit-vote: sensitive material may be logged");

const migration = read("supabase/migrations/20260727120000_passkey_auth.sql");
const serviceRoleGrants = read("supabase/migrations/20260727183000_passkey_service_role_grants.sql");
for (const expected of [
  "passkey_required_at", "passkey_enrolled_at", "vote_user_locks", "abuse_rate_limits",
  "submit_authenticated_vote", "consume_rate_limit", "set search_path = pg_catalog, public",
  "revoke all on function public.submit_authenticated_vote", "grant execute on function public.submit_authenticated_vote",
  "insert into public.vote_user_locks", "insert into public.votes", "insert into public.user_poll_answers"
]) {
  if (!migration.includes(expected)) failures.push(`passkey migration: missing ${expected}`);
}
if (!/grant execute on function public\.submit_authenticated_vote\([^;]+to service_role;/s.test(migration) ||
    /grant execute on function public\.submit_authenticated_vote\([^;]+to (?:anon|authenticated|public);/s.test(migration)) {
  failures.push("passkey migration: sensitive RPC execution must be service_role-only");
}
if (!migration.includes("passkey_required_at is not null") || !migration.includes("passkey_enrolled_at is null")) {
  failures.push("passkey migration: progressive account gating missing");
}
if (/phone_poll_hash\s*=\s*p_voter_hash/.test(migration)) failures.push("passkey migration: voter hash must not reuse phone_poll_hash");
if (!serviceRoleGrants.includes("to service_role") ||
    /to (?:anon|authenticated)/.test(serviceRoleGrants)) {
  failures.push("passkey service-role grants: backend tables must remain restricted to service_role");
}

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
