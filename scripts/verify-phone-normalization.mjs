import { normalizeFrenchMobilePhone } from "../supabase/functions/_shared/validation.ts";

const accepted = new Map([
  ["0612345678", "+33612345678"],
  ["0712345678", "+33712345678"],
  ["+33612345678", "+33612345678"],
  ["+33712345678", "+33712345678"],
  ["0033612345678", "+33612345678"],
  ["0033712345678", "+33712345678"]
]);

const refused = [
  "0112345678",
  "0212345678",
  "0312345678",
  "0412345678",
  "0512345678",
  "0812345678",
  "0912345678",
  "12345",
  "+33123456789",
  "+33812345678",
  "+33912345678",
  "+447700900123"
];

const failures = [];
for (const [input, expected] of accepted) {
  const result = normalizeFrenchMobilePhone(input);
  if (!result.ok || result.phone !== expected) failures.push(`${input}: expected ${expected}`);
}
for (const input of refused) {
  const result = normalizeFrenchMobilePhone(input);
  if (result.ok) failures.push(`${input}: expected refusal, got ${result.phone}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("French mobile normalization checks passed.");
