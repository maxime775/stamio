import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { isUuid } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ status: "error", message: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ status: "error", message: "Server configuration error" }, 500);
  }

  const body = await req.json().catch(() => null);
  if (!isUuid(body?.poll_id)) return jsonResponse({ status: "error", message: "Invalid poll id" }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data, error } = await supabase.rpc("get_poll_results", { p_poll_id: body.poll_id });
  if (error) return jsonResponse({ status: "error", message: "Results unavailable" }, 500);
  return jsonResponse({ results: data ?? [] });
});
