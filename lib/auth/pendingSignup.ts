import {
  isRecentPendingSignupMarker,
  type PendingSignupMarker
} from "@/lib/auth/signupCompletionPolicy";

const STORAGE_KEY = "stamio_pending_signup_v1";

function getLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function markPendingSignup() {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    const marker: PendingSignupMarker = {
      version: 1,
      flow: "pending-signup",
      startedAt: Date.now()
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(marker));
    return true;
  } catch {
    return false;
  }
}

export function hasRecentPendingSignup() {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const marker: unknown = JSON.parse(raw);
    if (isRecentPendingSignupMarker(marker)) return true;
    storage.removeItem(STORAGE_KEY);
    return false;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return false;
  }
}

export function clearPendingSignup() {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}
