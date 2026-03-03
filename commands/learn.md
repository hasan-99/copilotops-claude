# Learn from Mistake

Trigger the self-improvement loop when I make an error.

## Process

1. **Reflect**: What exactly went wrong?
   - What did I do?
   - What should I have done?
   - Why did I make this mistake?

2. **Abstract**: What's the general pattern?
   - Not: "Don't forget semicolons in file X"
   - But: "ALWAYS run linter before committing TypeScript"

3. **Generalize**: Does this apply elsewhere?
   - Other similar situations
   - Related edge cases

4. **Classify**: Which category does this rule belong to?
   - **Always Rules** — things to always do
   - **Never Rules** — things to never do
   - **Project-Specific Gotchas** — quirks of a specific project

5. **Propose Rule**: Draft rule in this format:
   ```
   - [ALWAYS/NEVER] [specific action] [context/when]
   ```

6. **Confirm**: Ask user if rule should be added

## Output
Append approved rule to `~/.claude/knowledge/learned-patterns.md` under the appropriate category section.

IMPORTANT: Also add the rule to `~/.claude/CLAUDE.md` under "## Learned Patterns" for immediate loading in every session.

## Examples of Good Rules
- ALWAYS check `git status` before suggesting commits
- NEVER modify files in node_modules
- ALWAYS use feature branches, never commit to main directly
- NEVER assume API response structure without checking types
- ALWAYS check if a Supabase table has RLS before inserting data
- NEVER hardcode VAPI assistant IDs — use env vars
