import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const clientDirs = ["app", "components", "lib"];
const explicitFiles = ["app.json", ".env.example", "README.md", "AGENTS.md"];
const serverSecretNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_VERIFY_SERVICE_SID",
  "HMAC_SECRET",
  "PHONE_ENCRYPTION_KEY",
  "TURNSTILE_SECRET_KEY",
  "OTP_TEST_PHONE_ALLOWLIST",
  "OTP_TEST_CODE"
];
const serverOnlyNames = [...serverSecretNames, "APP_ENV", "OTP_PROVIDER"];

const failures = [];

for (const file of filesToScan()) {
  const rel = relative(root, file).replaceAll("\\", "/");
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const isClient = clientDirs.some((dir) => rel.startsWith(`${dir}/`));
  const isDocumentation = rel === "README.md" || rel === "AGENTS.md" || rel === ".env.example";

  if (isClient) {
    for (const secretName of serverOnlyNames) {
      if (text.includes(secretName)) failures.push(`${rel}: client references ${secretName}`);
    }
    if (text.includes("sb_secret_")) failures.push(`${rel}: client contains sb_secret_`);
    if (text.includes("service_role")) failures.push(`${rel}: client references service_role`);
    if (text.includes("Deno.env.get")) failures.push(`${rel}: client uses Deno.env.get`);
    continue;
  }

  if (text.includes("sb_secret_")) failures.push(`${rel}: contains a Supabase secret-key prefix`);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;

    for (const secretName of serverSecretNames) {
      if (!line.includes(secretName)) continue;

      if (isDocumentation && isDocumentaryMention(line, secretName)) continue;

      failures.push(`${rel}:${lineNumber}: unsafe ${secretName} mention or value`);
    }

    if (hasRealTwilioSid(line, "TWILIO_ACCOUNT_SID", "AC")) {
      failures.push(`${rel}:${lineNumber}: contains a real-looking Twilio account SID`);
    }
    if (hasRealTwilioSid(line, "TWILIO_VERIFY_SERVICE_SID", "VA")) {
      failures.push(`${rel}:${lineNumber}: contains a real-looking Twilio Verify service SID`);
    }
    if (hasRealAssignedValue(line, "TWILIO_AUTH_TOKEN")) {
      failures.push(`${rel}:${lineNumber}: contains a real-looking Twilio auth token`);
    }
    if (hasRealAssignedValue(line, "HMAC_SECRET")) {
      failures.push(`${rel}:${lineNumber}: contains a real-looking HMAC secret`);
    }
    if (hasRealAssignedValue(line, "TURNSTILE_SECRET_KEY")) {
      failures.push(`${rel}:${lineNumber}: contains a real-looking Turnstile secret`);
    }
    if (hasRealAssignedValue(line, "SUPABASE_SERVICE_ROLE_KEY")) {
      failures.push(`${rel}:${lineNumber}: contains a real-looking Supabase service role key`);
    }
    if (hasFixedOtpCode(line, "OTP_TEST_CODE")) {
      failures.push(`${rel}:${lineNumber}: contains a fixed local-test OTP code`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Client secret scan passed.");

function filesToScan() {
  const files = [];
  for (const dir of clientDirs) {
    const absolute = resolve(root, dir);
    if (existsSync(absolute)) files.push(...walk(absolute));
  }

  for (const file of explicitFiles) {
    const absolute = resolve(root, file);
    if (existsSync(absolute)) files.push(absolute);
  }

  return files;
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx|js|jsx|mjs|json|md|env)$/.test(entry)) yield path;
  }
}

function isDocumentaryMention(line, secretName) {
  const value = assignedValue(line, secretName);
  if (value === null) return true;
  return isPlaceholder(value);
}

function hasRealTwilioSid(line, key, prefix) {
  const value = assignedValue(line, key);
  if (value === null || isPlaceholder(value)) return false;
  return new RegExp(`^${prefix}[0-9a-fA-F]{32}$`).test(value);
}

function hasRealAssignedValue(line, key) {
  const value = assignedValue(line, key);
  if (value === null || isPlaceholder(value)) return false;

  if (key === "SUPABASE_SERVICE_ROLE_KEY") {
    return value.startsWith("eyJ") || value.startsWith("sb_secret_") || value.length >= 40;
  }

  return value.length >= 20;
}

function hasFixedOtpCode(line, key) {
  const value = assignedValue(line, key);
  return value !== null && !isPlaceholder(value) && /^\d{6}$/.test(value);
}

function assignedValue(line, key) {
  const patterns = [
    new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`),
    new RegExp(`\\b${key}\\s*=\\s*([^\\s]+)`)
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(line);
    if (match) return normalizeValue(match[1]);
  }

  return null;
}

function normalizeValue(value) {
  return value.trim().replace(/^['"`]+|['"`;,]+$/g, "");
}

function isPlaceholder(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "..." || normalized === "<secret>") return true;
  return [
    "replace",
    "placeholder",
    "example",
    "your-",
    "xxxx",
    "todo",
    "changeme"
  ].some((marker) => normalized.includes(marker));
}
