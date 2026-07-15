import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // Server Component reading the session through the RLS-aware adapter.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">Full App</h1>
      <p className="text-lg text-neutral-600">
        {user
          ? `Signed in as ${user.email}.`
          : "Not signed in. Wire the auth flow in Phase 1, then build your core capability."}
      </p>
    </main>
  );
}
