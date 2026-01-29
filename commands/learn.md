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

4. **Propose Rule**: Draft CLAUDE.md addition
   Format:
   ```
   - [ALWAYS/NEVER] [specific action] [context/when]
   ```

5. **Confirm**: Ask user if rule should be added

## Output
Append approved rule to `~/.claude/CLAUDE.md` under "## Learned Patterns"

## Examples of Good Rules
- ALWAYS check `git status` before suggesting commits
- NEVER modify files in node_modules
- ALWAYS use feature branches, never commit to main directly
- NEVER assume API response structure without checking types
