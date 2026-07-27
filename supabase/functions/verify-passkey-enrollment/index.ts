import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ enrolled: false }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !serviceKey || !token) return jsonResponse({ enrolled: false }, 401);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, experimental: { passkey: true } }
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData.user;
  if (authError || !user?.id || !user.email_confirmed_at) return jsonResponse({ enrolled: false }, 401);

  const { data, error } = await admin.auth.admin.passkey.listPasskeys({ userId: user.id });
  if (error) return jsonResponse({ enrolled: false }, 502);
  const enrolled = (data ?? []).length > 0;
  if (enrolled) {
    const { error: updateError } = await admin.from("profiles")
      .update({ passkey_enrolled_at: new Date().toISOString() })
      .eq("id", user.id);
    if (updateError) return jsonResponse({ enrolled: false }, 500);
  } else {
    const { error: updateError } = await admin.from("profiles").update({ passkey_enrolled_at: null }).eq("id", user.id);
    if (updateError) return jsonResponse({ enrolled: false }, 500);
  }
  return jsonResponse({ enrolled });
});
