export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabasePublishableKey = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const assertProductionConfig = () => {
  if (!isDemoMode && !hasSupabaseConfig) {
    throw new Error(
      "Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY. " +
        "Đặt VITE_DEMO_MODE=true nếu chỉ muốn chạy bản demo."
    );
  }
};
