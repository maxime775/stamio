import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const clientDirs = ["app", "components", "lib"];
const forbiddenClientSnippets = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
  "HMAC_SECRET",
  "APP_ENV",
  "OTP_PROVIDER",
  "OTP_TEST_PHONE_ALLOWLIST",
  "OTP_TEST_CODE",
  ".from(\"votes\").insert",
  ".from('votes').insert",
  ".from(\"vote_phone_locks\").insert",
  ".from('vote_phone_locks').insert",
  ".from(\"user_poll_answers\").insert",
  ".from('user_poll_answers').insert",
  ".from(\"user_reputation_events\").insert",
  ".from('user_reputation_events').insert"
];

const otp = "OTP";
const forbiddenRepoPatterns = [
  new RegExp(["DEV", "SKIP", otp].join("[_-]?"), "i"),
  new RegExp(["BYPASS", otp].join("[_-]?"), "i"),
  new RegExp(["ACCEPT", "ALL", "CODES"].join("[_-]?"), "i")
];

const failures = [];
const fixedOtpPattern = /["'`]\d{6}["'`]/;

for (const file of walk(root)) {
  const rel = relative(root, file).replaceAll("\\", "/");
  if (rel.includes("node_modules/") || rel.startsWith(".git/")) continue;
  const text = readFileSync(file, "utf8");

  if (clientDirs.some((dir) => rel.startsWith(`${dir}/`))) {
    for (const snippet of forbiddenClientSnippets) {
      if (text.includes(snippet)) failures.push(`${rel}: client contains ${snippet}`);
    }
    if (fixedOtpPattern.test(text)) failures.push(`${rel}: client contains a hardcoded six-digit OTP`);
  }

  for (const pattern of forbiddenRepoPatterns) {
    if (pattern.test(text) && rel !== "scripts/static-security-check.mjs") {
      failures.push(`${rel}: forbidden OTP shortcut pattern`);
    }
  }
}

const otpProviderSource = readFileSync(join(root, "supabase", "functions", "_shared", "otp-provider.ts"), "utf8");
if (!otpProviderSource.includes('appEnv === "production" && provider !== "twilio"')) {
  failures.push("otp-provider.ts: missing strict production provider guard");
}
if (!otpProviderSource.includes('appEnv !== "local" && appEnv !== "staging"')) {
  failures.push("otp-provider.ts: local_test is not restricted to local/staging");
}
if (!otpProviderSource.includes('config.provider === "local_test" && (config.appEnv === "local" || config.appEnv === "staging")')) {
  failures.push("otp-provider.ts: Turnstile bypass is not restricted to local_test in local/staging");
}

const startVerificationSource = readFileSync(join(root, "supabase", "functions", "start-verification", "index.ts"), "utf8");
if (!startVerificationSource.includes("Turnstile bypass is only allowed for local_test in local/staging and must never apply in production.")) {
  failures.push("start-verification: missing explicit Turnstile bypass safety comment");
}
if (/\bplatform\b/.test(startVerificationSource)) {
  failures.push("start-verification: client-provided platform must not affect Turnstile");
}
if (!startVerificationSource.includes('otpConfig.provider === "local_test" &&') ||
    !startVerificationSource.includes('(otpConfig.appEnv === "local" || otpConfig.appEnv === "staging")')) {
  failures.push("start-verification: Turnstile bypass is not restricted to local_test in local/staging");
}
if (!startVerificationSource.includes("const turnstileRequired = !canBypassTurnstile;") ||
    !startVerificationSource.includes("if (turnstileRequired)")) {
  failures.push("start-verification: Turnstile is not required from the server-only bypass decision");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Static security checks passed.");

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx|js|mjs|sql|env|md)$/.test(entry)) yield path;
  }
}
