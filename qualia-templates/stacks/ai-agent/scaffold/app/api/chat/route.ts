import { z } from "zod";
import { chat } from "@/lib/openrouter/client";
import { SYSTEM_PROMPT } from "@/lib/prompts/system";

// Minimal chat endpoint. Validates input (Zod), routes through OpenRouter,
// logs latency. Build streaming + persistence + guardrails in Phase 2/3.
const Body = z.object({
  message: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const started = Date.now();
  try {
    const { content, model } = await chat([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: parsed.data.message },
    ]);
    const latencyMs = Date.now() - started;
    // TODO Phase 2: persist message + cost/token usage to Supabase.
    return Response.json({ content, model, latencyMs });
  } catch (err) {
    // Graceful fallback on model failure (Phase 3 expands this).
    return Response.json(
      { error: "model unavailable", detail: String(err) },
      { status: 503 }
    );
  }
}
