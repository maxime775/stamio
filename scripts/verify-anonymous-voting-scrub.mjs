import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const scrub = read("supabase/migrations/20260826160000_anonymous_vote_scrub.sql");
const expand = read("supabase/migrations/20260826120000_anonymous_vote_expand.sql");
const api = read("lib/api.ts");
const config = read("supabase/config.toml");

assert.match(scrub, /^-- DESTRUCTIVE SCRUB:/);
const validationPosition = scrub.indexOf("anonymous_vote_scrub_participation_mismatch");
const firstDestructivePosition = scrub.indexOf("alter table public.votes drop constraint");
assert.ok(validationPosition >= 0 && firstDestructivePosition > validationPosition, "preflight validation must precede destructive SQL");

for (const table of [
  "user_poll_answers", "vote_attempts", "vote_user_locks", "vote_phone_locks",
  "visitor_phone_participations", "signup_phone_verifications"
]) {
  assert.match(scrub, new RegExp(`drop table public\\.${table}\\s*;`, "i"), `${table} must be dropped without CASCADE`);
}
assert.doesNotMatch(scrub, /drop table[^;]+cascade/i);

for (const column of ["user_lock_id", "lock_id", "receipt_hash"]) {
  assert.match(scrub, new RegExp(`drop column if exists ${column}`), `votes.${column} must be removed`);
}
for (const forbidden of [
  "'user_id'", "'permit_id'", "'permit_digest'", "'participation_id'", "'voter_hash'", "'phone_poll_hash'"
]) {
  assert.match(scrub, new RegExp(forbidden), `final votes validation must reject ${forbidden}`);
}

for (const fn of [
  "record_verified_user_answer", "submit_verified_vote", "submit_authenticated_vote",
  "prepare_legacy_account_vote", "log_vote_attempt"
]) {
  assert.match(scrub, new RegExp(`drop function if exists public\\.${fn}\\(`), `${fn} must be removed`);
  assert.match(scrub, new RegExp(`to_regprocedure\\('public\\.${fn}\\(`), `${fn} must be verified absent`);
}

for (const required of [
  "user_poll_participations", "ballot_permits", "vote_authorization_bindings",
  "issue_ballot_authorization", "redeem_ballot_permit", "finalize_ballot_participation",
  "reconcile_consumed_ballot_participations"
]) {
  assert.ok(expand.includes(required), `EXPAND object missing: ${required}`);
  assert.ok(scrub.includes(required), `SCRUB preservation validation missing: ${required}`);
}
assert.match(expand, /cron\.schedule\([\s\S]*stamio-reconcile-consumed-ballot-participations/);
assert.match(scrub, /from cron\.job[\s\S]*stamio-reconcile-consumed-ballot-participations/);

const participationDefinition = sqlBlock(expand, "create table public.user_poll_participations");
assert.match(participationDefinition, /unique \(user_id, poll_id\)/);
assert.doesNotMatch(participationDefinition, /choice_id|vote_id|ballot_id|permit|receipt|lock_id/);

const historyStart = api.indexOf("export async function getLatestUserParticipations");
const historyEnd = api.indexOf("export async function getMyAccountStats", historyStart);
assert.ok(historyStart >= 0 && historyEnd > historyStart);
assert.doesNotMatch(api.slice(historyStart, historyEnd), /choice_id|user_poll_answers|choices\(/);

assert.ok(!existsSync(join(root, "supabase/functions/submit-vote/index.ts")), "legacy submit-vote must be deleted locally");
assert.doesNotMatch(config, /\[functions\.submit-vote\]/);
for (const edgeFunction of ["authorize-vote", "submit-ballot", "finalize-vote"]) {
  assert.ok(existsSync(join(root, `supabase/functions/${edgeFunction}/index.ts`)), `${edgeFunction} must remain`);
}

assert.match(scrub, /anonymous_vote_scrub_changed_vote_count/);
assert.match(scrub, /anonymous_vote_scrub_changed_editorial_cardinality/);
assert.match(scrub, /identity_and_choice_function_remains/);
assert.doesNotMatch(scrub, /drop (?:table|function)[^;]+(?:issue_ballot_authorization|redeem_ballot_permit|finalize_ballot_participation|reconcile_consumed_ballot_participations)/i);

console.log("Anonymous voting final SCRUB structure verified.");

function sqlBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${marker}`);
  const end = source.indexOf("\n);", start);
  assert.notEqual(end, -1, `unterminated ${marker}`);
  return source.slice(start, end + 3);
}
