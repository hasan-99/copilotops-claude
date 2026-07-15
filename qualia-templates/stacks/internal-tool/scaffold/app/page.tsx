import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role lives in app_metadata (never user_metadata).
  const role = (user?.app_metadata?.role as string | undefined) ?? "none";

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">Internal Tool</h1>
      <p className="text-lg text-neutral-600">
        {user
          ? `Signed in as ${user.email} (role: ${role}).`
          : "Staff only — invite required. Wire portal auth + role gating in Phase 1."}
      </p>
    </main>
  );
}
