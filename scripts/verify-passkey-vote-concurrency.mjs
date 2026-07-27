import { createClient } from "@supabase/supabase-js";
import { createHash, createHmac, randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for an isolated migrated test project.");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const pollId = randomUUID();
const choiceId = randomUUID();
const testVoterSecret = randomUUID();
const { data: created, error: userError } = await admin.auth.admin.createUser({
  email: `passkey-concurrency-${randomUUID()}@example.invalid`,
  email_confirm: true,
  user_metadata: {
    username: `test_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
    sex: "homme",
    age: 30,
    profession: "Test",
    region: "Bretagne"
  }
});
if (userError || !created.user) {
  throw new Error(`test_user_creation_failed:${userError?.code ?? "unknown"}:${userError?.status ?? "unknown"}:${userError?.message || "no_message"}`);
}
const userId = created.user.id;
const credentialSessions = [
  { credential: "apple-passwords", userId },
  { credential: "windows-hello", userId }
];
const credentialHashes = credentialSessions.map(({ userId: sessionUserId }) =>
  createHmac("sha256", testVoterSecret).update(`vote-user:${pollId}:${sessionUserId}`).digest("hex")
);
if (new Set(credentialHashes).size !== 1) throw new Error("same_account_credentials_produced_different_voter_hashes");
const voterHash = credentialHashes[0];

console.log("Two credential sessions:", { sameUserId: true, sameVoterHash: true, passkeyIdentifiersUsedByVote: false });
console.log("Before concurrency:", await countsForPoll(admin, pollId, userId));
const { error: pollError } = await admin.from("polls").insert({ id: pollId, question: "Atomic passkey vote test", status: "open" });
if (pollError) throw pollError;
const { error: choiceError } = await admin.from("choices").insert({ id: choiceId, poll_id: pollId, label: "Oui", position: 1 });
if (choiceError) throw choiceError;

const responses = await Promise.all([1, 2].map((index) =>
  admin.rpc("submit_authenticated_vote", {
    p_user_id: userId,
    p_poll_id: pollId,
    p_choice_id: choiceId,
    p_voter_hash: voterHash,
    p_receipt_hash: createHash("sha256").update(`receipt:${pollId}:${index}`).digest("hex")
  })
));
const statuses = responses.map((response) => response.data?.[0]?.status).sort();
const afterConcurrency = await countsForPoll(admin, pollId, userId);
console.log("After concurrency:", { statuses, ...afterConcurrency });
if (responses.some(({ error }) => error) || statuses.join(",") !== "accepted,already_voted" ||
    afterConcurrency.votes !== 1 || afterConcurrency.answers !== 1 || afterConcurrency.locks !== 1 ||
    afterConcurrency.reputationEvents !== 1 || afterConcurrency.successLogs !== 1 || afterConcurrency.duplicateLogs !== 1) {
  throw new Error(JSON.stringify({ statuses, ...afterConcurrency, errors: responses.map(({ error }) => error?.message) }));
}
const canonicalAggregate = await admin.rpc("get_poll_results", { p_poll_id: pollId });
if (canonicalAggregate.error || !Array.isArray(canonicalAggregate.data) ||
    canonicalAggregate.data.reduce((total, row) => total + Number(row.votes ?? 0), 0) !== 1) {
  throw new Error("Canonical aggregate does not reflect the accepted vote");
}
const edgeAggregate = await admin.functions.invoke("get-results", { body: { poll_id: pollId } });
if (edgeAggregate.error || !Array.isArray(edgeAggregate.data?.results) ||
    edgeAggregate.data.results.reduce((total, row) => total + Number(row.votes ?? 0), 0) !== 1) {
  throw new Error("Public aggregate Edge Function does not reflect the accepted vote");
}
console.log("Canonical aggregates:", { rpcTotal: 1, edgeTotal: 1 });

const rollbackResult = await admin.rpc("submit_authenticated_vote", {
  p_user_id: userId,
  p_poll_id: pollId,
  p_choice_id: choiceId,
  p_voter_hash: createHash("sha256").update(`rollback:${randomUUID()}`).digest("hex"),
  p_receipt_hash: createHash("sha256").update(`rollback-receipt:${pollId}`).digest("hex")
});
if (!rollbackResult.error) throw new Error("Expected duplicate history to abort the complete transaction");
const afterRollback = await countsForPoll(admin, pollId, userId);
console.log("After forced rollback:", afterRollback);
if (JSON.stringify(afterRollback) !== JSON.stringify(afterConcurrency)) throw new Error("Partial data survived a failed history insert");

const rateHash = createHash("sha256").update(`rate:${randomUUID()}`).digest("hex");
const firstRate = await admin.rpc("consume_rate_limit", { p_key_hash: rateHash, p_action: "test_vote", p_limit: 1, p_window_seconds: 1 });
const secondRate = await admin.rpc("consume_rate_limit", { p_key_hash: rateHash, p_action: "test_vote", p_limit: 1, p_window_seconds: 1 });
await new Promise((resolve) => setTimeout(resolve, 1200));
const afterExpiryRate = await admin.rpc("consume_rate_limit", { p_key_hash: rateHash, p_action: "test_vote", p_limit: 1, p_window_seconds: 1 });
if (firstRate.error || secondRate.error || afterExpiryRate.error ||
    firstRate.data !== true || secondRate.data !== false || afterExpiryRate.data !== true) {
  throw new Error("Persistent rate limit did not reject and reset after expiry");
}
console.log("Rate limit:", { initial: firstRate.data, exceeded: secondRate.data, afterExpiry: afterExpiryRate.data });
console.log("Atomic vote verified; evidence retained in the isolated test project.");

async function countsForPoll(client, targetPollId, targetUserId) {
  const [votes, answers, locks, reputation, success, duplicate] = await Promise.all([
    client.from("votes").select("id", { count: "exact", head: true }).eq("poll_id", targetPollId),
    client.from("user_poll_answers").select("id", { count: "exact", head: true }).eq("poll_id", targetPollId).eq("user_id", targetUserId),
    client.from("vote_user_locks").select("id", { count: "exact", head: true }).eq("poll_id", targetPollId),
    client.from("user_reputation_events").select("id", { count: "exact", head: true }).eq("poll_id", targetPollId).eq("user_id", targetUserId),
    client.from("vote_attempts").select("id", { count: "exact", head: true }).eq("poll_id", targetPollId).eq("event", "vote_success"),
    client.from("vote_attempts").select("id", { count: "exact", head: true }).eq("poll_id", targetPollId).eq("event", "vote_duplicate")
  ]);
  const named = { votes, answers, locks, reputation, success, duplicate };
  for (const [name, result] of Object.entries(named)) {
    if (result.error) {
      throw new Error(`count_failed:${name}:${JSON.stringify(result.error, Object.getOwnPropertyNames(result.error))}`);
    }
  }
  return {
    votes: votes.count ?? 0,
    answers: answers.count ?? 0,
    locks: locks.count ?? 0,
    reputationEvents: reputation.count ?? 0,
    successLogs: success.count ?? 0,
    duplicateLogs: duplicate.count ?? 0
  };
}
