import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const expand = read("supabase/migrations/20260826120000_anonymous_vote_expand.sql");
const scrub = read("supabase/migrations/20260826160000_anonymous_vote_scrub.sql");
const authorize = read("supabase/functions/authorize-vote/index.ts");
const ballot = read("supabase/functions/submit-ballot/index.ts");
const finalize = read("supabase/functions/finalize-vote/index.ts");
const api = read("lib/api.ts");
const poll = read("app/poll/[pollId].tsx");
const votePanel = read("components/VotePanel.tsx");
const config = read("supabase/config.toml");

assert.doesNotMatch(authorize, /choice_id|choiceId|choice_label|choiceLabel/);
assert.match(authorize, /type AuthorizeVoteInput = \{ poll_id: string \}/);
assert.match(authorize, /hasOnlyKeys\(body, \["poll_id"\]\)/);
assert.doesNotMatch(authorize, /console\.(?:log|info|warn|error)/);

for (const forbidden of [
  "user_id", "auth.getUser", "profiles", "vote_authorization_bindings",
  "user_poll_participations", "vote_user_locks", "vote_phone_locks",
  "SUPABASE_SERVICE_ROLE_KEY", "VOTER_HASH_SECRET"
]) {
  assert.ok(!ballot.includes(forbidden), `submit-ballot must not contain ${forbidden}`);
}
assert.match(ballot, /req\.headers\.has\("Authorization"\)/);
assert.match(ballot, /SUPABASE_ANON_KEY/);
assert.match(ballot, /hasOnlyKeys\(body, \["poll_id", "choice_id", "permit"\]\)/);
assert.doesNotMatch(ballot, /console\.(?:log|info|warn|error)/);

const submitBallotClient = section(api, "async function submitBallot", "async function finalizeVote");
assert.match(submitBallotClient, /fetch\(`\$\{url\}\/functions\/v1\/submit-ballot`/);
assert.match(submitBallotClient, /apikey: anonKey/);
assert.doesNotMatch(submitBallotClient, /Authorization|getFunctionAuthHeaders|supabase\.functions\.invoke/);

const participationTable = sqlBlock(expand, "create table public.user_poll_participations");
assert.match(participationTable, /unique \(user_id, poll_id\)/);
assert.match(participationTable, /participated_on date/);
assert.doesNotMatch(participationTable, /choice_id|vote_id|ballot_id|receipt|permit|lock_id/);

const bindingTable = sqlBlock(expand, "create table public.vote_authorization_bindings");
assert.match(bindingTable, /user_id uuid/);
assert.match(bindingTable, /permit_digest text/);
assert.doesNotMatch(bindingTable, /choice_id|vote_id|ballot_id|receipt/);

const permitTable = sqlBlock(expand, "create table public.ballot_permits");
assert.match(permitTable, /permit_digest text primary key/);
assert.doesNotMatch(permitTable, /user_id|voter_hash|email|participation_id|choice_id|vote_id/);

const redemption = section(expand, "create or replace function public.redeem_ballot_permit", "-- Account statistics");
for (const forbidden of [
  "p_user_id", "auth.users", "profiles", "vote_authorization_bindings",
  "user_poll_participations", "vote_user_locks", "vote_phone_locks",
  "submit_authenticated_vote", "record_verified_user_answer"
]) {
  assert.ok(!redemption.includes(forbidden), `Phase B SQL must not contain ${forbidden}`);
}
assert.match(redemption, /insert into public\.votes \(poll_id, choice_id\)\s+values \(p_poll_id, p_choice_id\)/s);
assert.doesNotMatch(redemption, /insert into public\.votes[^;]*(?:permit|digest|lock_id|user_lock_id)/s);

const completion = section(expand, "create or replace function public.complete_consumed_ballot_participation", "create or replace function public.issue_ballot_authorization");
assert.doesNotMatch(completion, /choice_id|public\.votes/);
assert.match(completion, /user_reputation_events/);
assert.match(completion, /delete from public\.vote_authorization_bindings/);

const serverReconciliation = section(expand, "create or replace function public.reconcile_consumed_ballot_participations", "-- Coordinate the still-supported legacy RPC");
assert.doesNotMatch(serverReconciliation, /choice_id|public\.votes/);
assert.match(serverReconciliation, /join public\.ballot_permits/);
assert.match(serverReconciliation, /where bp\.status = 'consumed'/);
assert.match(serverReconciliation, /complete_consumed_ballot_participation/);
assert.match(serverReconciliation, /bp\.status = 'active' and bp\.expires_at <= clock_timestamp\(\)/);
assert.match(serverReconciliation, /cron\.schedule\(/);
assert.match(serverReconciliation, /'\* \* \* \* \*'/);

for (const [start, end] of [
  ["create or replace function public.issue_ballot_authorization", "create or replace function public.finalize_ballot_participation"],
  ["create or replace function public.finalize_ballot_participation", "create or replace function public.reconcile_my_ballot_participations"],
  ["create or replace function public.reconcile_my_ballot_participations", "-- Independent Phase A reconciliation"]
]) {
  assert.doesNotMatch(section(expand, start, end), /choice_id|public\.votes/);
}

assert.match(expand, /revoke all on public\.vote_authorization_bindings[\s\S]*service_role;/);
assert.match(expand, /revoke all on public\.ballot_permits[\s\S]*service_role;/);
assert.match(expand, /grant execute on function public\.redeem_ballot_permit\(text, uuid, uuid\)[\s\S]*to anon;/);
assert.match(expand, /grant execute on function public\.issue_ballot_authorization[\s\S]*to service_role;/);
assert.match(expand, /grant execute on function public\.finalize_ballot_participation[\s\S]*to service_role;/);

const latestParticipations = section(api, "export async function getLatestUserParticipations", "export async function getUserPollParticipation");
const oneParticipation = section(api, "export async function getUserPollParticipation", "export async function getMyAccountStats");
assert.doesNotMatch(latestParticipations, /choice_id|choices\(|user_poll_answers/);
assert.doesNotMatch(oneParticipation, /choice_id|choices\(|user_poll_answers/);
assert.match(latestParticipations, /reconcile_my_ballot_participations/);
assert.match(oneParticipation, /reconcile_my_ballot_participations/);
assert.doesNotMatch(poll, /getUserPollAnswer|serverAnswerChoiceId|answer\?\.choice_id/);

assert.match(votePanel, /submitVote\(\{ poll_id: pollId, choice_id: choiceId \}\)/);
assert.match(config, /\[functions\.authorize-vote\][\s\S]*verify_jwt = false/);
assert.match(config, /\[functions\.submit-ballot\][\s\S]*verify_jwt = false/);
assert.match(config, /\[functions\.finalize-vote\][\s\S]*verify_jwt = false/);
assert.doesNotMatch(config, /\[functions\.submit-vote\]/);

assert.doesNotMatch(finalize, /choice_id|choiceId|public\.votes/);
assert.doesNotMatch(finalize, /console\.(?:log|info|warn|error)/);

for (const legacy of [
  "user_poll_answers", "vote_user_locks", "vote_phone_locks", "vote_attempts",
  "record_verified_user_answer", "submit_verified_vote", "submit_authenticated_vote",
  "prepare_legacy_account_vote"
]) {
  assert.match(scrub, new RegExp(`drop (?:table|function)[^;]*${legacy}`, "i"), `SCRUB must remove ${legacy}`);
}
assert.match(scrub, /alter table public\.votes[\s\S]*drop column if exists user_lock_id[\s\S]*drop column if exists lock_id[\s\S]*drop column if exists receipt_hash/);
assert.match(scrub, /anonymous_vote_scrub_participation_mismatch/);
assert.match(scrub, /anonymous_vote_scrub_changed_vote_count/);
assert.match(scrub, /anonymous_vote_scrub_changed_editorial_cardinality/);

console.log("Anonymous voting structural separation verified.");

function sqlBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${marker}`);
  const end = source.indexOf("\n);", start);
  assert.notEqual(end, -1, `unterminated ${marker}`);
  return source.slice(start, end + 3);
}

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker}`);
  return source.slice(start, end);
}
