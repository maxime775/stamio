const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export type FrenchMobileNormalizationResult =
  | { ok: true; phone: string }
  | { ok: false; reason: string };

export function normalizeFrenchMobilePhone(input: string): FrenchMobileNormalizationResult {
  if (typeof input !== "string") {
    return { ok: false, reason: "Phone number must be a string" };
  }

  const compact = input.trim().replace(/[\s().-]/g, "");
  let normalized = compact;

  if (/^0[67]\d{8}$/.test(compact)) {
    normalized = `+33${compact.slice(1)}`;
  } else if (compact.startsWith("0033")) {
    normalized = `+33${compact.slice(4)}`;
  }

  if (!/^\+33[67]\d{8}$/.test(normalized)) {
    return { ok: false, reason: "Only French mobile phone numbers starting with 06 or 07 are accepted" };
  }

  return { ok: true, phone: normalized };
}

export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const compact = input.trim().replace(/[\s().-]/g, "");
  const normalized = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  return E164_PATTERN.test(normalized) ? normalized : null;
}

export function isUuid(input: unknown): input is string {
  return typeof input === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
}

export function isOtp(input: unknown): input is string {
  return typeof input === "string" && /^\d{6}$/.test(input);
}
