import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const clientDirs = ["app", "components", "lib"];
const forbiddenClientSnippets = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
  "HMAC_SECRET",
  ".from(\"votes\").insert",
  ".from('votes').insert",
  ".from(\"vote_phone_locks\").insert",
  ".from('vote_phone_locks').insert"
];

const otp = "OTP";
const forbiddenRepoPatterns = [
  new RegExp(["DEV", "SKIP", otp].join("[_-]?"), "i"),
  new RegExp(["BYPASS", otp].join("[_-]?"), "i"),
  new RegExp(["ACCEPT", "ALL", "CODES"].join("[_-]?"), "i")
];

const failures = [];

for (const file of walk(root)) {
  const rel = relative(root, file).replaceAll("\\", "/");
  if (rel.includes("node_modules/") || rel.startsWith(".git/")) continue;
  const text = readFileSync(file, "utf8");

  if (clientDirs.some((dir) => rel.startsWith(`${dir}/`))) {
    for (const snippet of forbiddenClientSnippets) {
      if (text.includes(snippet)) failures.push(`${rel}: client contains ${snippet}`);
    }
  }

  for (const pattern of forbiddenRepoPatterns) {
    if (pattern.test(text) && rel !== "scripts/static-security-check.mjs") {
      failures.push(`${rel}: forbidden OTP shortcut pattern`);
    }
  }
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
