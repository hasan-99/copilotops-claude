// OpenRouter adapter — the ONLY seam that talks to the LLM provider.
// Never call OpenAI/Anthropic SDKs directly from feature code; route here so
// the model + fallback chain is one swap away. System prompts live in source,
// not inline at call sites.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatOptions = {
  // Quality vs cost tier. Override per task; fallback handles model outages.
  models?: string[];
  temperature?: number;
};

const DEFAULT_MODELS = [
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4o-mini", // fallback
];

export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<{ content: string; model: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      models: opts.models ?? DEFAULT_MODELS,
      messages,
      temperature: opts.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? "unknown",
  };
}
