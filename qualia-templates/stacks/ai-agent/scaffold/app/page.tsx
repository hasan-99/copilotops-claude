export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">AI Agent</h1>
      <p className="text-lg text-neutral-600">
        The chat endpoint lives at <code>POST /api/chat</code>. Build the
        streaming UI in Phase 2, then the eval gate in Phase 3 — no ship before
        evals are green.
      </p>
    </main>
  );
}
