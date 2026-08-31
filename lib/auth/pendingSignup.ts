import {
  isRecentPendingSignupMarker,
  type PendingSignupMarker
} from "@/lib/auth/signupCompletionPolicy";
import { readSignupResumeUserId } from "@/lib/auth/signupResume";

const STORAGE_KEY = "stamio_pending_signup_v1";

function getLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function markPendingSignup(resumeToken?: string | null) {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    const marker: PendingSignupMarker = {
      version: 1,
      flow: "pending-signup",
      startedAt: Date.now(),
      ...(resumeToken ? { resumeToken } : {})
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(marker));
    return true;
  } catch {
    return false;
  }
}

export function getPendingSignupResumeToken() {
  const marker = readPendingSignupMarker();
  return marker?.resumeToken && readSignupResumeUserId(marker.resumeToken) ? marker.resumeToken : null;
}

export function getPendingSignupStartedAt() {
  return readPendingSignupMarker()?.startedAt ?? null;
}

export function hasPendingSignupForUser(userId: string) {
  const token = getPendingSignupResumeToken();
  return Boolean(token && readSignupResumeUserId(token) === userId.toLowerCase());
}

export function restartPendingSignupWindow() {
  const storage = getLocalStorage();
  const marker = readPendingSignupMarker();
  if (!storage || !marker) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...marker, startedAt: Date.now() } satisfies PendingSignupMarker));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingSignupResumeToken() {
  const storage = getLocalStorage();
  const marker = readPendingSignupMarker();
  if (!storage || !marker?.resumeToken) return;
  try {
    const { resumeToken: _resumeToken, ...remaining } = marker;
    storage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
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

function readPendingSignupMarker() {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const marker: unknown = JSON.parse(raw);
    if (isRecentPendingSignupMarker(marker)) return marker;
    storage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}
