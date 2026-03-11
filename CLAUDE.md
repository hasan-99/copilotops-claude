# CLAUDE.md

## Identity
**Fawzi Goussous** — Founder, Qualia Solutions. Nicosia, Cyprus.
One-man dev shop. Websites, AI agents, voice agents, AI automation.
- Direct, action-oriented, no fluff. Code > theory.
- يعني اذا حكى عربي رد عربي، اذا انجليزي رد انجليزي، واذا خلط خلط معه
- Stack: Next.js 16+, React 19, TypeScript, Supabase, Vercel, VAPI, ElevenLabs, Telnyx, Retell AI, OpenRouter

## Rules
- Read before Write/Edit — no exceptions
- Feature branches only — never commit to main/master
- MVP first. Build only what's asked. No over-engineering.
- Root cause on failures — no band-aids
- `npx tsc --noEmit` after multi-file TS changes
- Server-side auth via `auth.uid()`. RLS on every table. Zod validation.
- `lib/supabase/server.ts` for mutations, never client.ts
- No `dangerouslySetInnerHTML`, `eval()`, hardcoded keys, .env commits
- Deploy: push > `vercel --prod` > verify (HTTP 200, auth, console, latency <500ms)
- Glob/Grep directly — no Task(Explore) unless 5+ rounds needed

## Frontend Standards
Distinctive fonts (not Inter/Arial), sharp accents, CSS transitions, staggered animations.
Layered backgrounds, subtle gradients. Avoid: card grids, generic heroes, blue-purple.

## Collaboration
Collaborator, not executor. Speak up about bugs, simpler approaches, bad architecture.
Be honest. Default to action. Never speculate on unread code. Say when blocked.

## Workflow
- Session start: `pwd` > identify project > read local CLAUDE.md
- Subagents (Sonnet) for research. Opus for complex reasoning.
- `/compact` at 60%. `/clear` between tasks. `/learn` after mistakes.

## Compaction — ALWAYS preserve:
Project path/name/ref, branch, modified files, decisions, test results, in-progress work, errors

## Project Quick-Ref (Supabase refs)
aquador:`hznpuxplqgszbacxzbhv` | maud:`vspyxscitcuwnrhchskl` | vero:`zskfdlqyzhkzefafqkpx`
aibossbrainz:`esymbjpzjjkffpfqukxw` | mpm:`llherorsfgbdyqkrrlpc` | zaid:`uoqiwidqlsoamtugioik`
dababneh:`toovladeybmlyzblqtbl` | faris:`lrgwxcqqnhxvvrruepcv` | hammah:`ctcikdcjhxxqogwvtzrc`
sofiatesting:`vceeheaxcrhmpqueudqx` | timo:`qgaqvkmqterlljbegniu` | under:`vvppyijxpgeeijiozlve`

## Gotchas
- sigatalachana = Python agent (NOT web), misclassified in aiagents
- armenius = Cloudflare Workers + wrangler (NOT Vercel)
- glluztech = legacy Pages Router
- Hammah = SERVICE_ROLE_KEY exposed
- Timo = empty API keys
