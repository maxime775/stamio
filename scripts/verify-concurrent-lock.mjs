import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hmacSecret = process.env.HMAC_SECRET;

if (!url || !serviceRoleKey || !hmacSecret) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and HMAC_SECRET before running this script.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false }
});

const pollId = randomUUID();
const choiceId = randomUUID();
const phone = `+1555${Math.floor(1000000 + Math.random() * 8999999)}`;
const phonePollHash = hmac(`${pollId}:${phone}`);

const { error: pollError } = await supabase.from("polls").insert({
  id: pollId,
  question: "Concurrent lock verification",
  status: "open"
});
if (pollError) throw pollError;

const { error: choiceError } = await supabase.from("choices").insert({
  id: choiceId,
  poll_id: pollId,
  label: "Yes",
  position: 1
});
if (choiceError) throw choiceError;

const calls = [1, 2].map((index) =>
  supabase.rpc("submit_verified_vote", {
    p_poll_id: pollId,
    p_choice_id: choiceId,
    p_phone_poll_hash: phonePollHash,
    p_receipt_hash: hmac(`receipt:${pollId}:${choiceId}:${phonePollHash}:${index}`)
  })
);

const responses = await Promise.all(calls);
const statuses = responses.map((response) => response.data?.[0]?.status).sort();

const { count, error: countError } = await supabase
  .from("votes")
  .select("id", { count: "exact", head: true })
  .eq("poll_id", pollId);
if (countError) throw countError;

await supabase.from("polls").delete().eq("id", pollId);

if (responses.some((response) => response.error) || statuses.join(",") !== "accepted,duplicate" || count !== 1) {
  console.error({ statuses, count, errors: responses.map((response) => response.error) });
  process.exit(1);
}

console.log("Concurrent lock verified: one accepted vote and one duplicate for the same poll-scoped phone hash.");

function hmac(message) {
  return createHmac("sha256", hmacSecret).update(message).digest("hex");
}
