export const SIGNUP_COMPLETION_TTL_MS = 10 * 60 * 1000;
export const PENDING_SIGNUP_TTL_MS = 24 * 60 * 60 * 1000;

export type SignupCompletionMarker = {
  version: 1;
  flow: "signup";
  completedAt: number;
  accountBinding: string;
};

export type PendingSignupMarker = {
  version: 1;
  flow: "pending-signup";
  startedAt: number;
};

export type SetupCompleteGuardState = {
  hasSession: boolean;
  userValidated: boolean;
  emailConfirmed: boolean;
  passkeyEnrolled: boolean;
  markerValid: boolean;
  pendingSignupValid: boolean;
};

export type SetupCompleteDestination =
  | "/auth/login"
  | "/auth/verify-email"
  | "/auth/passkey-enrollment?flow=signup"
  | "/account"
  | null;

export function isRecentSignupCompletionMarker(
  value: unknown,
  accountBinding: string,
  now = Date.now()
): value is SignupCompletionMarker {
  if (!value || typeof value !== "object") return false;
  const marker = value as Partial<SignupCompletionMarker>;
  if (
    marker.version !== 1
    || marker.flow !== "signup"
    || marker.accountBinding !== accountBinding
    || typeof marker.completedAt !== "number"
    || !Number.isFinite(marker.completedAt)
  ) {
    return false;
  }
  const age = now - marker.completedAt;
  return age >= 0 && age <= SIGNUP_COMPLETION_TTL_MS;
}

export function isRecentPendingSignupMarker(
  value: unknown,
  now = Date.now()
): value is PendingSignupMarker {
  if (!value || typeof value !== "object") return false;
  const marker = value as Partial<PendingSignupMarker>;
  if (
    marker.version !== 1
    || marker.flow !== "pending-signup"
    || typeof marker.startedAt !== "number"
    || !Number.isFinite(marker.startedAt)
  ) {
    return false;
  }
  const age = now - marker.startedAt;
  return age >= 0 && age <= PENDING_SIGNUP_TTL_MS;
}

export function getSetupCompleteDestination({
  hasSession,
  userValidated,
  emailConfirmed,
  passkeyEnrolled,
  markerValid,
  pendingSignupValid
}: SetupCompleteGuardState): SetupCompleteDestination {
  if (!hasSession) return pendingSignupValid ? "/auth/verify-email" : "/auth/login";
  if (!userValidated) return "/auth/login";
  if (!emailConfirmed) return "/auth/verify-email";
  if (!passkeyEnrolled) return "/auth/passkey-enrollment?flow=signup";
  if (!markerValid) return "/account";
  return null;
}
