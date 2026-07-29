import {
  isRecentSignupCompletionMarker,
  type SignupCompletionMarker
} from "@/lib/auth/signupCompletionPolicy";

const STORAGE_KEY = "stamio_signup_completion_v1";

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

async function createAccountBinding(userId: string) {
  if (!globalThis.crypto?.subtle || typeof TextEncoder === "undefined") return null;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`stamio:signup-complete:${userId}`)
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function markSignupEnrollmentComplete(userId: string) {
  const storage = getSessionStorage();
  if (!storage) return false;
  try {
    const accountBinding = await createAccountBinding(userId);
    if (!accountBinding) return false;
    const marker: SignupCompletionMarker = {
      version: 1,
      flow: "signup",
      completedAt: Date.now(),
      accountBinding
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(marker));
    return true;
  } catch {
    return false;
  }
}

export async function hasRecentSignupEnrollmentCompletion(userId: string) {
  const storage = getSessionStorage();
  if (!storage) return false;
  try {
    const accountBinding = await createAccountBinding(userId);
    if (!accountBinding) return false;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const marker: unknown = JSON.parse(raw);
    if (isRecentSignupCompletionMarker(marker, accountBinding)) return true;
    storage.removeItem(STORAGE_KEY);
    return false;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return false;
  }
}

export function clearSignupEnrollmentCompletion() {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage can be unavailable in restricted browser contexts.
  }
}
