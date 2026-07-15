import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase adapter. Use this for all mutations and any
// RLS-protected read that needs the caller's session. The only seam that
// touches @supabase/ssr on the server.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // refreshes the session.
          }
        },
      },
    }
  );
}
