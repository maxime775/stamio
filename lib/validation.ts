const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export function normalizePhoneInput(input: string): { ok: true; value: string } | { ok: false } {
  const compact = input.trim().replace(/[\s().-]/g, "");
  const normalized = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  if (!E164_PATTERN.test(normalized)) return { ok: false };
  return { ok: true, value: normalized };
}

export function normalizeFrenchMobilePhoneInput(input: string): { ok: true; value: string } | { ok: false } {
  const compact = input.trim().replace(/[\s().-]/g, "");
  let normalized = compact;
  if (/^0[67]\d{8}$/.test(compact)) {
    normalized = `+33${compact.slice(1)}`;
  } else if (compact.startsWith("0033")) {
    normalized = `+33${compact.slice(4)}`;
  }
  if (!/^\+33[67]\d{8}$/.test(normalized)) return { ok: false };
  return { ok: true, value: normalized };
}

export function validateOtp(input: string) {
  return /^\d{6}$/.test(input);
}
