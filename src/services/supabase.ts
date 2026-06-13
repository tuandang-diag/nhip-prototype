import { createClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabasePublishableKey, supabaseUrl } from "./config";

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export const requireSupabase = () => {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  return supabase;
};
