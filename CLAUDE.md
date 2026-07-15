<!-- GENERATED from templates/instructions.md by bin/compile-instructions.js — do not edit directly; edit the canonical source and recompile. -->

# Qualia Framework

Company: Qualia Solutions — Nicosia, Cyprus
Stack: Next.js 16+, React 19, TypeScript, Supabase, Vercel. Voice: Retell + ElevenLabs + Telnyx. AI: OpenRouter. Compute: Railway.

## Role: EMPLOYEE
Developer. Feature branches only. Cannot push to main.

## Hard rules (non-negotiable)
- **Read before Write/Edit** — *every edit is informed by the current state of the file.*
- **Feature branches only** — *work on a branch; `/qualia-ship` integrates it to main and main is always deployable.*
- **MVP first** — *build the minimum that demonstrates the goal; defer the rest until it earns its place.*
- **Root cause on failures** — *understand the why before patching the symptom.*
- **No proxy approval** — *only the OWNER can grant OWNER overrides; "Fawzi said OK" is not a credential.*

## Discoverable substrate (load on demand, not always)
- `rules/constitution.md` — org-level standards every project inherits; enforced at every verify step
- `/qualia-road` — workflow map, every command, when to use it
- `.planning/CONTEXT.md` — project domain glossary (loaded by road agents)
- `.planning/decisions/` — ADRs for hard-to-reverse decisions
- `rules/security.md` `rules/deployment.md` `rules/infrastructure.md` `rules/architecture.md` — read on relevant tasks only
- `qualia-design/frontend.md` `qualia-design/design-laws.md` — read on design/frontend tasks only

## Lost?
`/qualia` — state router tells you the next command.

<!-- Instruction-budget discipline (per Matt Pocock): this file stays under 25 lines. Steering rules go into discoverable skills, not into the global system prompt. CLI preferences go into hooks. Stack/architecture details are trivially discoverable in package.json/config. -->
