---
name: learn
description: "Capture lessons from mistakes and save them as persistent rules. Use this skill whenever the user says 'learn', 'learn from this', 'remember this mistake', 'don't do that again', 'save this lesson', or when Claude makes an error and wants to prevent repeating it. Also trigger when user mentions improving Claude's behavior across sessions or adding rules to memory."
---

# Learn from Mistake

Trigger the self-improvement loop when an error occurs. This converts a specific mistake into a general, reusable rule that persists across sessions.

## Process

### 1. Reflect
What exactly went wrong?
- What did I do?
- What should I have done?
- Why did I make this mistake?

### 2. Abstract
Extract the general pattern — not the specific instance.
- Bad: "Don't forget semicolons in file X"
- Good: "ALWAYS run linter before committing TypeScript"

### 3. Generalize
Does this apply beyond the immediate case?
- Other similar situations where this could happen
- Related edge cases to watch for

### 4. Classify
Which category fits best?
- **Always Rules** — things to always do
- **Never Rules** — things to never do
- **Project-Specific Gotchas** — quirks of a specific project

### 5. Propose Rule
Draft rule in this format:
```
- [ALWAYS/NEVER] [specific action] [context/when]
```

### 6. Confirm
Ask the user if the rule should be added. Do not save without confirmation.

## Output

After user approval, save the rule to **both** locations:

1. Append to `~/.claude/knowledge/learned-patterns.md` under the appropriate category section
2. Add to `~/.claude/CLAUDE.md` under "## Learned Patterns" for immediate loading in every session

### 7. Staleness Scan (automatic)

When /learn is invoked, before adding new rules, scan existing patterns:
- Parse `[verified: YYYY-MM]` annotations
- Flag entries older than 90 days as stale
- Report: "N patterns haven't been verified in 90+ days"
- Offer: "Want to review stale patterns? (yes/no)"

### Additional Modes

`/learn --verify` — Mark all patterns as verified with today's date
`/learn --verify "partial text"` — Mark matching pattern as verified
`/learn --remove "partial text"` — Remove a pattern (with confirmation)

## Examples of Good Rules

- ALWAYS check `git status` before suggesting commits
- NEVER modify files in node_modules
- ALWAYS use feature branches, never commit to main directly
- NEVER assume API response structure without checking types
- ALWAYS check if a Supabase table has RLS before inserting data
- NEVER hardcode VAPI assistant IDs — use env vars
