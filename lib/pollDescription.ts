export const MAX_POLL_DESCRIPTION_LENGTH = 20_000;

export const POLL_DESCRIPTION_TOO_LONG_MESSAGE =
  "Limitez les enjeux a 20 000 caracteres.";

export function validatePollDescription(value: string): string | null {
  if (value.trim().length > MAX_POLL_DESCRIPTION_LENGTH) {
    return POLL_DESCRIPTION_TOO_LONG_MESSAGE;
  }
  return null;
}
