import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const enforceRateLimit = async (
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowMinutes: number
) => {
  const now = new Date();
  const { data } = await admin.from("rate_limits").select("*").eq("key", key).maybeSingle();
  const expired =
    !data ||
    now.getTime() - new Date(data.window_started_at).getTime() > windowMinutes * 60_000;
  if (expired) {
    await admin.from("rate_limits").upsert({
      key,
      window_started_at: now.toISOString(),
      request_count: 1
    });
    return;
  }
  if (data.request_count >= limit) throw new Error("rate_limited");
  await admin
    .from("rate_limits")
    .update({ request_count: data.request_count + 1 })
    .eq("key", key);
};
