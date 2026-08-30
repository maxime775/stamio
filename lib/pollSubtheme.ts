export const MAX_POLL_SUBTHEME_LENGTH = 60;

export function normalizePollSubtheme(value: string | null | undefined) {
  return value?.trim() || null;
}

export function validatePollSubtheme(value: string | null | undefined) {
  const normalized = normalizePollSubtheme(value);
  if (normalized && normalized.length > MAX_POLL_SUBTHEME_LENGTH) {
    return `Limitez le sous-thème à ${MAX_POLL_SUBTHEME_LENGTH} caractères.`;
  }
  return null;
}
