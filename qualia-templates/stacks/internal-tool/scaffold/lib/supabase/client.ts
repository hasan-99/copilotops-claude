import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase adapter — publishable key only. RLS protects data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
