import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceRoleKey || !anonKey) {
  throw new Error("Isolated test project URL, service role and anon key are required.");
}

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const confirmedEmail = `confirmed-${suffix}@example.invalid`;
const unconfirmedEmail = `unconfirmed-${suffix}@example.invalid`;
const availableEmail = `available-${suffix}@example.invalid`;

for (const [email, emailConfirm] of [[confirmedEmail, true], [unconfirmedEmail, false]]) {
  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: emailConfirm,
    password: `Test-${randomUUID()}-Aa1!`,
    user_metadata: {
      username: `mail_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
      sex: "homme",
      age: 30,
      profession: "Test",
      region: "Bretagne"
    }
  });
  if (error) throw new Error(`email_fixture_failed:${error.code ?? "unknown"}`);
}

const statuses = {};
for (const [label, email] of [["available", availableEmail], ["confirmed", confirmedEmail], ["unconfirmed", unconfirmedEmail]]) {
  const { data, error } = await publicClient.functions.invoke("check-signup-email", { body: { email } });
  if (error || typeof data?.status !== "string") throw new Error(`email_lookup_failed:${label}`);
  statuses[label] = data.status;
}
if (statuses.available !== "available" ||
    statuses.confirmed !== "existing_confirmed" ||
    statuses.unconfirmed !== "existing_unconfirmed") {
  throw new Error(`unexpected_email_states:${JSON.stringify(statuses)}`);
}
console.log("Signup email states verified:", statuses);

const repeated = [];
for (let index = 0; index < 6; index += 1) {
  const { data, error } = await publicClient.functions.invoke("check-signup-email", { body: { email: availableEmail } });
  let status = data?.status;
  if (!status && error?.context && typeof error.context.json === "function") {
    status = (await error.context.json().catch(() => null))?.status;
  }
  repeated.push(status ?? "transport_error");
}
if (repeated.at(-1) !== "rate_limited") throw new Error("email_lookup_rate_limit_not_enforced");
console.log("Signup email persistent rate limit verified:", { finalStatus: repeated.at(-1) });
