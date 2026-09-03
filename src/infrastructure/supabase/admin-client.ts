import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig } from "./server-config";

/**
 * Privileged Supabase Auth/Data client for trusted server code only.
 * Never import this module into a Client Component.
 */
export function createSupabaseAdminClient() {
  const config = getSupabaseServerConfig();

  return createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
