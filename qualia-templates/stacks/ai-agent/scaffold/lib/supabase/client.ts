import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase adapter — publishable key only. RLS protects data.
// The Phase 2 streaming chat UI reads the session through this.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
