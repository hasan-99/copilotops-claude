# Full-Stack Team

> Frontend + Backend in parallel, then tests verify everything works together.

## Agents

- **frontend-agent**
  - subagent_type: frontend-agent
  - role: UI components, pages, layouts, styling, animations
  - skill: ~/.claude/skills/frontend-master/SKILL.md
  - scope: Everything in `src/components/`, `src/app/` (pages/layouts), `public/`, CSS/Tailwind

- **backend-agent**
  - subagent_type: backend-agent
  - role: Supabase schema, RLS policies, edge functions, API routes, server actions
  - skill: ~/.claude/skills/supabase/SKILL.md
  - scope: Everything in `lib/`, `supabase/`, `src/app/api/`, server actions, migrations

- **test-agent**
  - subagent_type: test-agent
  - role: Integration tests, E2E tests with Playwright, unit tests for critical paths
  - scope: Everything in `tests/`, `__tests__/`, `*.test.ts`, `*.spec.ts`, playwright config

## Pattern

fan-out → fan-in → pipeline

Wave 1 (parallel): frontend-agent + backend-agent
Wave 2 (sequential): test-agent (after wave 1 completes — needs both UI and API to exist)

## Shared Context

- .planning/STATE.md — current project state, decisions, position
- .planning/ROADMAP.md — phase being executed (relevant section only)
- Phase PLAN.md — specific plan being implemented
- ~/.claude/rules/frontend.md — Fawzi's aesthetic standards
- ~/.claude/rules/security.md — security requirements

## Coordination Rules

- frontend-agent owns `src/components/` and page files — backend-agent must not touch these
- backend-agent owns `lib/`, `supabase/`, API routes — frontend-agent must not touch these
- Shared files (e.g., `types.ts`, `lib/utils.ts`) — backend-agent creates types, frontend-agent consumes them
- test-agent reads both domains but creates files only in test directories

## Output

TEAM-SUMMARY.md in the phase plan directory alongside SUMMARY.md
