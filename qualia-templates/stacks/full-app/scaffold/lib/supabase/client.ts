import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase adapter. Uses the publishable (anon) key only.
// NEVER import the service-role key here — RLS protects the data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
