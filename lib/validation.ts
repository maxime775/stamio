const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export function normalizePhoneInput(input: string): { ok: true; value: string } | { ok: false } {
  const compact = input.trim().replace(/[\s().-]/g, "");
  const normalized = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  if (!E164_PATTERN.test(normalized)) return { ok: false };
  return { ok: true, value: normalized };
}

export function validateOtp(input: string) {
  return /^\d{6}$/.test(input);
}
