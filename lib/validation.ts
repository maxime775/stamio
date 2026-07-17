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
  } else if (/^33[67]\d{8}$/.test(compact)) {
    normalized = `+${compact}`;
  } else if (/^[67]\d{8}$/.test(compact)) {
    normalized = `+33${compact}`;
  } else if (/^\+330[67]\d{8}$/.test(compact)) {
    normalized = `+33${compact.slice(4)}`;
  } else if (compact.startsWith("0033")) {
    normalized = `+33${compact.slice(4)}`;
  }
  if (!/^\+33[67]\d{8}$/.test(normalized)) return { ok: false };
  return { ok: true, value: normalized };
}

export function formatFrenchMobilePhoneDisplay(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  const localDigits = digits.startsWith("0033")
    ? digits.slice(4)
    : digits.startsWith("33")
      ? digits.slice(2)
      : digits;
  const national = localDigits.startsWith("0")
    ? localDigits.slice(0, 10)
    : /^[67]/.test(localDigits)
      ? `0${localDigits.slice(0, 9)}`
      : localDigits.slice(0, 10);

  if (!national) return trimmed.startsWith("+") ? "+33 " : "";

  const groups = [
    national.slice(0, 2),
    national.slice(2, 4),
    national.slice(4, 6),
    national.slice(6, 8),
    national.slice(8, 10)
  ].filter(Boolean);

  return `+33 ${groups.join(" ")}`.trimEnd();
}

export function validateOtp(input: string) {
  return /^\d{6}$/.test(input);
}
