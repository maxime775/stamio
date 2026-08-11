import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export type PasskeyRecord = {
  id: string;
  friendlyName: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function isPasskeySupported() {
  return Platform.OS === "web"
    && typeof window !== "undefined"
    && typeof window.PublicKeyCredential !== "undefined"
    && typeof navigator?.credentials?.create === "function";
}

export async function registerPasskey(signal?: AbortSignal) {
  if (!isPasskeySupported()) throw new Error("passkey_unsupported");
  const { data, error } = await supabase.auth.registerPasskey({ options: { signal } });
  if (error) throw error;
  if (!data?.id) throw new Error("webauthn_verification_failed");
  return data;
}

export async function signInWithPasskey(signal?: AbortSignal) {
  if (!isPasskeySupported()) throw new Error("passkey_unsupported");
  const { data, error } = await supabase.auth.signInWithPasskey({ options: { signal } });
  if (error) throw error;
  if (!data.session || !data.user) throw new Error("session_missing");
  return data;
}

export async function listPasskeys(): Promise<PasskeyRecord[]> {
  const { data, error } = await supabase.auth.passkey.list();
  if (error) throw error;
  return (data ?? []).map((item) => ({
    id: item.id,
    friendlyName: item.friendly_name || "Clé d’accès",
    createdAt: item.created_at,
    lastUsedAt: item.last_used_at ?? null
  }));
}

export async function renamePasskey(passkeyId: string, friendlyName: string) {
  const name = friendlyName.trim();
  if (!name || name.length > 120) throw new Error("invalid_friendly_name");
  const { error } = await supabase.auth.passkey.update({ passkeyId, friendlyName: name });
  if (error) throw error;
}

export async function deletePasskey(passkeyId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("session_missing");
  const { data, error } = await supabase.functions.invoke<{ deleted: boolean; reason?: string }>("delete-passkey", {
    body: { passkey_id: passkeyId },
    headers: { Authorization: `Bearer ${token}` }
  });
  if (error || !data?.deleted) throw new Error(data?.reason || "passkey_delete_failed");
}

export function getPasskeyErrorMessage(error: unknown, action: "create" | "signin" | "manage" = "create") {
  const value = error as { code?: string; name?: string; message?: string; cause?: unknown };
  const code = value?.code || value?.message || value?.name || "";
  const browserErrorName = getBrowserErrorName(error);
  if (code === "passkey_unsupported") return "Ce navigateur ne prend pas en charge les clés d’accès. Utilisez un navigateur récent ou poursuivez depuis un autre appareil.";
  if (browserErrorName === "AbortError" || browserErrorName === "NotAllowedError" || code === "ERROR_CEREMONY_ABORTED" || /cancel|abort|notallowed/i.test(code)) return action === "signin"
    ? "La connexion avec la clé d’accès a été annulée. Vous pouvez réessayer."
    : "La création de la clé d’accès a été annulée. Vous pouvez réessayer.";
  if (code === "passkey_disabled") return "Les clés d’accès ne sont pas encore disponibles. Réessayez plus tard.";
  if (code === "too_many_passkeys") return "Le nombre maximal de clés d’accès est atteint.";
  if (code === "webauthn_credential_exists" || browserErrorName === "InvalidStateError") return "Cette clé d’accès est déjà enregistrée.";
  if (code === "webauthn_credential_not_found") return "Aucune clé d’accès compatible n’a été trouvée.";
  if (code === "webauthn_challenge_not_found" || code === "webauthn_challenge_expired") return "La demande a expiré. Réessayez.";
  if (/network|failed to fetch|fetch failed/i.test(code) || value?.name === "AuthRetryableFetchError") return "La connexion réseau a été interrompue. Vérifiez votre connexion puis réessayez.";
  if (code === "webauthn_verification_failed") return action === "signin"
    ? "La clé d’accès n’a pas pu être vérifiée. Réessayez."
    : "La clé d’accès n’a pas pu être enregistrée. Réessayez.";
  if (code === "email_not_confirmed") return "Confirmez votre adresse email avant de créer une clé d’accès.";
  if (code === "user_banned") return "Ce compte ne peut pas se connecter.";
  if (code === "session_missing") return "Votre session a expiré. Reconnectez-vous.";
  if (code === "last_passkey") return "La dernière clé d’accès ne peut pas être supprimée sans récupération email confirmée.";
  return action === "signin"
    ? "Impossible de vous connecter avec une clé d’accès pour le moment."
    : action === "manage"
      ? "Impossible de gérer cette clé d’accès pour le moment."
      : "Impossible de créer la clé d’accès pour le moment. Réessayez dans quelques instants.";
}

function getBrowserErrorName(error: unknown) {
  let current = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const value = current as { name?: unknown; cause?: unknown };
    if (typeof value.name === "string" && WEB_AUTHN_BROWSER_ERRORS.has(value.name)) return value.name;
    current = value.cause;
  }
  return "";
}

const WEB_AUTHN_BROWSER_ERRORS = new Set([
  "NotAllowedError",
  "AbortError",
  "InvalidStateError",
  "SecurityError",
  "ConstraintError",
  "TypeError",
  "UnknownError"
]);
