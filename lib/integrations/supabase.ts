import { createClient } from "@supabase/supabase-js";

import { serverEnv } from "@/lib/config/env";

export function getSupabaseBrowserClient() {
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseAnonKey) {
    return null;
  }

  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey);
}

export function getSupabaseServerClient() {
  if (!serverEnv.supabaseUrl || !serverEnv.supabaseServiceRoleKey) {
    return null;
  }

  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
