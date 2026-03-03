# Speed Rules (MANDATORY)

**NEVER use Task(Explore) or Task(general-purpose) for simple file lookups or code searches.** Use direct tools instead:
- **Glob** for finding files by name/pattern
- **Grep** for searching code content
- **Read** for reading specific files
- Only use Task(Explore) when you genuinely need 5+ rounds of deep codebase archaeology

**NEVER spawn subagents when direct tools work.** Subagents are slow — a direct Glob or Grep returns in seconds.

**Bias toward action, not exploration.** If Fawzi asks you to fix something and you know the project structure, just do it.

**Use shortcuts:**
- `/ship` — Full deploy pipeline (quality gates → commit → deploy → verify)
- `/status` — Quick project health check
- `/audit` — Deep security + quality audit
- `/switch <project>` — Switch project context
- `/memory` — View/manage persistent rules
- `/learn` — Save a lesson from a mistake
- `/handoff` — Save context before /clear
