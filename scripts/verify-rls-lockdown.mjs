import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const env = readDotEnv(resolve(process.cwd(), ".env"));
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env before running this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false }
});

const choice = await findReadableChoice();
const pollId = choice?.poll_id ?? randomUUID();
const choiceId = choice?.id ?? randomUUID();
const lockId = randomUUID();

const checks = [
  {
    table: "votes",
    row: {
      poll_id: pollId,
      choice_id: choiceId,
      lock_id: lockId,
      receipt_hash: `rls-${randomUUID()}`
    }
  },
  {
    table: "vote_phone_locks",
    row: {
      poll_id: pollId,
      phone_poll_hash: "a".repeat(64)
    }
  },
  {
    table: "vote_attempts",
    row: {
      poll_id: null,
      choice_id: null,
      phone_poll_hash: "b".repeat(64),
      event: "otp_rejected"
    },
    optionalIfMissing: true
  }
];

const failures = [];

for (const check of checks) {
  const { error } = await supabase.from(check.table).insert(check.row);

  if (!error) {
    failures.push(`${check.table}: direct insert succeeded with the public anon key`);
    continue;
  }

  if (check.optionalIfMissing && error.code === "42P01") continue;

  if (error.code !== "42501") {
    failures.push(`${check.table}: insert was blocked by ${error.code ?? "an unknown error"} instead of RLS/permission denial (${error.message})`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("RLS lockdown verified: public client cannot insert into sensitive tables.");

async function findReadableChoice() {
  const { data, error } = await supabase
    .from("choices")
    .select("id, poll_id")
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

function readDotEnv(path) {
  if (!existsSync(path)) return {};

  const values = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;

    const [, key, rawValue] = match;
    values[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}
