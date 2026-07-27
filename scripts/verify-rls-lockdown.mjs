import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const env = readDotEnv(resolve(process.cwd(), ".env"));
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
    table: "vote_user_locks",
    row: {
      poll_id: pollId,
      voter_hash: "f".repeat(64)
    }
  },
  {
    table: "abuse_rate_limits",
    row: {
      key_hash: "a".repeat(64),
      action: "rls_probe",
      window_started_at: new Date().toISOString(),
      request_count: 1,
      expires_at: new Date(Date.now() + 60_000).toISOString()
    }
  },
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
    table: "user_poll_answers",
    row: { user_id: randomUUID(), poll_id: pollId, choice_id: choiceId },
    optionalIfMissing: true
  },
  {
    table: "user_reputation_events",
    row: { user_id: randomUUID(), poll_id: pollId, event_type: "client_write_probe", points: 999 },
    optionalIfMissing: true
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
  },
  {
    table: "visitor_phone_participations",
    row: {
      visitor_phone_hash: "c".repeat(64),
      poll_id: pollId
    },
    optionalIfMissing: true
  },
  {
    table: "signup_phone_verifications",
    row: {
      token_hash: "d".repeat(64),
      phone_global_hash: "e".repeat(64),
      phone_last4: "1234",
      phone_ciphertext: "not-readable",
      phone_iv: "not-readable",
      phone_encryption_version: 1,
      expires_at: new Date(Date.now() + 60_000).toISOString()
    },
    optionalIfMissing: true,
    verifyReadBlocked: true
  }
];

const failures = [];

const encryptedProfileProbe = await supabase
  .from("profiles")
  .select("phone_global_hash, phone_ciphertext, phone_iv, phone_encryption_version")
  .limit(1);
if (!encryptedProfileProbe.error) {
  failures.push("profiles: authenticated-sensitive phone identity columns remain exposed to the public anon key");
} else if (!["42501", "42703", "PGRST204"].includes(encryptedProfileProbe.error.code)) {
  failures.push(`profiles: encrypted phone column probe failed unexpectedly (${encryptedProfileProbe.error.code ?? "unknown"}: ${encryptedProfileProbe.error.message})`);
}

for (const check of checks) {
  const { error } = await supabase.from(check.table).insert(check.row);

  if (!error) {
    failures.push(`${check.table}: direct insert succeeded with the public anon key`);
    continue;
  }

  if (check.optionalIfMissing && (error.code === "42P01" || error.code === "PGRST205")) continue;

  if (error.code !== "42501") {
    failures.push(`${check.table}: insert was blocked by ${error.code ?? "an unknown error"} instead of RLS/permission denial (${error.message})`);
  }

  if (check.verifyReadBlocked) {
    const { data, error: readError } = await supabase.from(check.table).select("*").limit(1);
    if (!readError && Array.isArray(data) && data.length > 0) {
      failures.push(`${check.table}: public anon key could read sensitive rows`);
    } else if (readError && !(check.optionalIfMissing && (readError.code === "42P01" || readError.code === "PGRST205")) && readError.code !== "42501") {
      failures.push(`${check.table}: read was blocked by ${readError.code ?? "an unknown error"} instead of RLS/permission denial (${readError.message})`);
    }
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
