export const SIGNUP_CONFIRMATION_POLL_INTERVAL_MS = 4_000;
export const SIGNUP_CONFIRMATION_ACTIVE_WINDOW_MS = 15 * 60 * 1000;
export const SIGNUP_RESUME_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type SignupResumeChallenge = {
  secret: string;
  secretHash: string;
  expiresAt: number;
};

type VolatileSignupCredentials = {
  email: string;
  password: string;
  expiresAt: number;
};

let volatileSignupCredentials: VolatileSignupCredentials | null = null;
let credentialExpiryTimer: ReturnType<typeof setTimeout> | null = null;

export async function createSignupResumeChallenge(): Promise<SignupResumeChallenge | null> {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle || typeof TextEncoder === "undefined") return null;
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const secret = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const secretHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    secret,
    secretHash,
    expiresAt: Date.now() + SIGNUP_RESUME_TOKEN_TTL_MS
  };
}

export function createSignupResumeToken(userId: string, secret: string) {
  if (!isUuid(userId) || !/^[a-f0-9]{64}$/.test(secret)) return null;
  return `${userId}.${secret}`;
}

export function readSignupResumeUserId(token: string | null | undefined) {
  if (!token) return null;
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([a-f0-9]{64})$/i.exec(token);
  return match?.[1]?.toLowerCase() ?? null;
}

export function rememberSignupCredentials(email: string, password: string) {
  clearSignupCredentials();
  volatileSignupCredentials = {
    email: email.trim().toLowerCase(),
    password,
    expiresAt: Date.now() + SIGNUP_CONFIRMATION_ACTIVE_WINDOW_MS
  };
  credentialExpiryTimer = setTimeout(clearSignupCredentials, SIGNUP_CONFIRMATION_ACTIVE_WINDOW_MS);
}

export function getSignupCredentials(email?: string | null) {
  if (!volatileSignupCredentials) return null;
  if (volatileSignupCredentials.expiresAt <= Date.now()) {
    clearSignupCredentials();
    return null;
  }
  if (email && volatileSignupCredentials.email !== email.trim().toLowerCase()) return null;
  return volatileSignupCredentials;
}

export function clearSignupCredentials() {
  if (credentialExpiryTimer) clearTimeout(credentialExpiryTimer);
  credentialExpiryTimer = null;
  if (volatileSignupCredentials) volatileSignupCredentials.password = "";
  volatileSignupCredentials = null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
