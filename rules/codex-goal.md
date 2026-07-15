# Work-unit goal (both runtimes)

When a skill begins a defined **unit of work** (a phase build, a feature, a milestone, a fix), set an explicit goal — an objective + a token budget — so the session tracks burn-vs-budget and stays anchored to one outcome. Both runtimes get this; the *surface* differs.

The objective + budget come from one shared helper, regardless of runtime:

```bash
node C:\Users\hasan\.claude/bin/codex-goal.js {scope}    # scope ∈ phase · task · feature · quick
```

It prints two lines from `.planning/STATE.md` + `ROADMAP.md`:

```
/goal {objective text}
# token_budget suggestion: {N}
```

## Runtime detection

```bash
test -f ~/.codex/AGENTS.md && [ ! -d ~/.claude ] && echo codex || echo claude
```

## Codex — native `/goal`

Codex has a first-class goal surface (`thread_goals`: objective, token_budget, tokens_used, status).

1. **If the `update_goal` tool is available** (Codex exposes it as a model-callable tool), call it with `objective` = the text after `/goal ` and `token_budget` = the integer suggestion.
2. **Otherwise** surface the `/goal` line for the user to paste. Don't silently skip — it's a one-second set and the only way Codex's budget telemetry knows what to track.

## Claude Code — equivalent via the harness work-list + budget

Claude Code has no `/goal` table, but it has a native equivalent: the **session task-list** (the model's todo/task tool) and the turn **token budget**. Use them so the work unit is just as anchored and visible:

1. **Create a tracked task** for the unit with the objective as its title (e.g. *"Phase 3 — checkout + Stripe webhook"*). Mark it `in_progress` at start, `completed` at end. This is the Claude-side "active goal" — it shows in the UI and survives compaction.
2. **Treat `token_budget` as the unit's context budget.** State it in the opening line (banner) — *"Goal: {objective} · budget ~{N} tok"* — so the operator and the model both see how much room the unit has. If a `+Nk` turn directive is set, prefer that.
3. For a multi-wave phase, the per-task `.agent-status/` entries (see `/qualia-build`) are the sub-goals under this one.

Either way the rule is the same: **one named objective + one budget per work unit, surfaced, not silent.**

## When NOT to set a goal

- A goal/task is already active for this unit (don't double-set; Codex rejects `update_goal` when one exists — check first).
- Open-ended exploration with no defined scope (`/qualia`, `/qualia-scope` PROJECT MODE, `/qualia-idk`). Goals are for *executing* a defined scope, not discovering one.

## Why

A named objective + budget keeps a unit of work from sprawling: the model stays self-aware of how much context remains, the operator sees burn-vs-budget, and the unit has a single definition of done. On Codex this rides `thread_goals`; on Claude Code it rides the task-list + turn budget. Same discipline, native surface on each.
