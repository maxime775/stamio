import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";

export type VotingAdminClient = ReturnType<typeof createClient>;

export type VotingAccountResult =
  | { status: "ok"; userId: string }
  | { status: "authentication_required"; httpStatus: 401 }
  | { status: "passkey_required"; httpStatus: 403; userId: string }
  | { status: "error"; httpStatus: 500 | 502; userId?: string };

export function createVotingAdmin(url: string, serviceKey: string) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, experimental: { passkey: true } }
  });
}

export async function resolveVotingAccount(
  admin: VotingAdminClient,
  token: string
): Promise<VotingAccountResult> {
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user?.id || !user.email_confirmed_at) {
    return { status: "authentication_required", httpStatus: 401 };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("passkey_required_at, passkey_enrolled_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return { status: "error", httpStatus: 500, userId: user.id };
  }

  if (profile.passkey_required_at && !profile.passkey_enrolled_at) {
    const { data: passkeys, error: passkeyError } = await admin.auth.admin.passkey.listPasskeys({ userId: user.id });
    if (passkeyError) {
      return { status: "error", httpStatus: 502, userId: user.id };
    }
    if (!passkeys?.length) {
      return { status: "passkey_required", httpStatus: 403, userId: user.id };
    }
    const { error: syncError } = await admin
      .from("profiles")
      .update({ passkey_enrolled_at: new Date().toISOString() })
      .eq("id", user.id);
    if (syncError) {
      return { status: "error", httpStatus: 500, userId: user.id };
    }
  }

  return { status: "ok", userId: user.id };
}
