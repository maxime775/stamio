import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ deleted: false }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !serviceKey || !token) return jsonResponse({ deleted: false }, 401);
  const body = await req.json().catch(() => null);
  const passkeyId = typeof body?.passkey_id === "string" ? body.passkey_id : "";
  if (!passkeyId || passkeyId.length > 256) return jsonResponse({ deleted: false }, 400);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, experimental: { passkey: true } }
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData.user;
  if (authError || !user?.id) return jsonResponse({ deleted: false }, 401);
  const { data: passkeys, error: listError } = await admin.auth.admin.passkey.listPasskeys({ userId: user.id });
  if (listError) return jsonResponse({ deleted: false }, 502);
  if (!(passkeys ?? []).some((passkey) => passkey.id === passkeyId)) return jsonResponse({ deleted: false }, 404);
  if ((passkeys ?? []).length <= 1 && !(user.email && user.email_confirmed_at)) {
    return jsonResponse({ deleted: false, reason: "last_passkey" }, 409);
  }
  const { error: deleteError } = await admin.auth.admin.passkey.deletePasskey({ userId: user.id, passkeyId });
  if (deleteError) return jsonResponse({ deleted: false }, 502);
  const { data: remaining, error: relistError } = await admin.auth.admin.passkey.listPasskeys({ userId: user.id });
  if (relistError) return jsonResponse({ deleted: false }, 502);
  const enrolledAt = (remaining ?? []).length > 0 ? new Date().toISOString() : null;
  const { error: updateError } = await admin.from("profiles").update({ passkey_enrolled_at: enrolledAt }).eq("id", user.id);
  if (updateError) return jsonResponse({ deleted: false }, 500);
  return jsonResponse({ deleted: true, enrolled: enrolledAt !== null });
});
