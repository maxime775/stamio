import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("isolated_test_credentials_required");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: poll } = await admin.from("polls").select("id, choices(id)").eq("status", "open").limit(1).single();
if (!poll?.id || !poll.choices?.[0]?.id) throw new Error("test_poll_unavailable");

const historical = await createTestUser("historical");
const required = await createTestUser("required");
const enrolled = await createTestUser("enrolled");
await expectOk(admin.from("profiles").update({ passkey_required_at: null, passkey_enrolled_at: null }).eq("id", historical.user.id), "historical_profile_setup");
await expectOk(admin.from("profiles").update({ passkey_required_at: new Date().toISOString(), passkey_enrolled_at: null }).eq("id", required.user.id), "required_profile_setup");
await expectOk(admin.from("profiles").update({ passkey_required_at: new Date().toISOString(), passkey_enrolled_at: new Date().toISOString() }).eq("id", enrolled.user.id), "enrolled_profile_setup");

await verifyAuthenticatedLockdown(required.client, required.user.id, poll.id, poll.choices[0].id);

const historicalComment = await historical.client.rpc("create_poll_comment", {
  p_poll_id: poll.id,
  p_parent_comment_id: null,
  p_body: "Preuve profil historique"
});
await expectOk(historicalComment, "historical_comment");

const blockedComment = await required.client.rpc("create_poll_comment", {
  p_poll_id: poll.id,
  p_parent_comment_id: null,
  p_body: "Cette écriture doit être bloquée"
});
expectDenied(blockedComment, "required_comment");

const enrolledComment = await enrolled.client.rpc("create_poll_comment", {
  p_poll_id: poll.id,
  p_parent_comment_id: null,
  p_body: "Preuve profil enrôlé"
});
await expectOk(enrolledComment, "enrolled_comment");
const enrolledCommentId = Array.isArray(enrolledComment.data) ? enrolledComment.data[0]?.id : enrolledComment.data?.id ?? enrolledComment.data;
if (!enrolledCommentId) throw new Error("enrolled_comment_id_missing");

expectDenied(await required.client.rpc("toggle_poll_comment_like", { p_comment_id: enrolledCommentId }), "required_like");
await expectOk(enrolled.client.rpc("toggle_poll_comment_like", { p_comment_id: enrolledCommentId }), "enrolled_like");

const adminComment = await admin.from("poll_comments").insert({
  poll_id: poll.id,
  user_id: historical.user.id,
  body: "Preuve écriture administrative"
});
await expectOk(adminComment, "service_role_comment");

console.log({
  authenticatedSensitiveWritesBlocked: true,
  serverRpcsBlockedForAuthenticated: true,
  historicalProfileAllowed: true,
  requiredProfileBlocked: true,
  enrolledProfileAllowed: true,
  requiredLikeBlocked: true,
  enrolledLikeAllowed: true,
  serviceRoleAdministrativeWriteAllowed: true,
  publicReadsPreserved: await publicReadWorks()
});

async function createTestUser(label) {
  const password = `T-${randomUUID()}-aA9!`;
  const { data, error } = await admin.auth.admin.createUser({
    email: `passkey-security-${label}-${randomUUID()}@example.invalid`,
    password,
    email_confirm: true,
    user_metadata: {
      username: `t_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
      sex: "femme",
      age: 31,
      profession: "Test",
      region: "Bretagne"
    }
  });
  if (error || !data.user) throw new Error(`create_${label}_failed:${error?.code ?? "unknown"}`);
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const signedIn = await client.auth.signInWithPassword({ email: data.user.email, password });
  if (signedIn.error) throw new Error(`signin_${label}_failed:${signedIn.error.code ?? "unknown"}`);
  return { user: data.user, client };
}

async function verifyAuthenticatedLockdown(client, userId, pollId, choiceId) {
  expectDenied(await client.from("profiles").update({ passkey_enrolled_at: new Date().toISOString() }).eq("id", userId), "authenticated_enrolled_update");
  expectDenied(await client.from("profiles").update({ passkey_required_at: null }).eq("id", userId), "authenticated_required_update");
  expectDenied(await client.from("votes").insert({ poll_id: pollId, choice_id: choiceId, receipt_hash: randomUUID() }), "authenticated_vote_insert");
  expectDenied(await client.from("vote_user_locks").insert({ poll_id: pollId, voter_hash: "a".repeat(64) }), "authenticated_lock_insert");
  expectDenied(await client.from("abuse_rate_limits").insert({
    key_hash: "b".repeat(64), action: "probe", window_started_at: new Date().toISOString(),
    request_count: 1, expires_at: new Date(Date.now() + 60_000).toISOString()
  }), "authenticated_rate_insert");
  expectDenied(await client.rpc("submit_authenticated_vote", {
    p_user_id: userId, p_poll_id: pollId, p_choice_id: choiceId,
    p_voter_hash: "c".repeat(64), p_receipt_hash: "d".repeat(64)
  }), "authenticated_vote_rpc");
  expectDenied(await client.rpc("consume_rate_limit", {
    p_key_hash: "e".repeat(64), p_action: "probe", p_limit: 1, p_window_seconds: 60
  }), "authenticated_rate_rpc");
}

function expectDenied(result, label) {
  if (!result.error) throw new Error(`${label}_unexpectedly_allowed`);
}

async function expectOk(resultPromise, label) {
  const result = await resultPromise;
  if (result.error) throw new Error(`${label}_failed:${result.error.code ?? "unknown"}:${result.error.message}`);
  return result;
}

async function publicReadWorks() {
  const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await publicClient.from("polls").select("id").limit(1);
  return !error && Array.isArray(data) && data.length > 0;
}
