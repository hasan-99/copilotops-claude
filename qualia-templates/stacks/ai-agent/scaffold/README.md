# AI Agent

LLM / chat / agent — Next.js 16 + Supabase + OpenRouter (+ optional Retell/ElevenLabs/Telnyx voice).

## Run

```bash
npm install
cp .env.example .env.local   # fill Supabase keys + OPENROUTER_API_KEY (ask Fawzi)
npx supabase db push
npm run dev                  # http://localhost:3000
curl -X POST localhost:3000/api/chat -H 'content-type: application/json' \
  -d '{"message":"hello"}'
```

## Where things live

- `app/api/chat/route.ts` — the agent endpoint (input validation + routing).
- `lib/openrouter/client.ts` — the ONLY seam that talks to the LLM. Model + fallback chain here.
- `lib/prompts/system.ts` — system prompt in source control, never inline.
- `lib/supabase/server.ts` — server adapter (mutations, RLS).
- `supabase/migrations/` — conversations + messages, RLS from the first migration.
- `evals/cases.json` — **the ship gate**. No ship before the suite is green (Phase 3).

## Non-negotiables

- All LLM calls through OpenRouter — never hardcode a provider.
- Evals are the finish line, not "it replied".
- `service_role` + `OPENROUTER_API_KEY` server-only, never logged.

This is an MVP skeleton. Build the streaming loop, persistence, and evals per `.planning/ROADMAP.md`.
