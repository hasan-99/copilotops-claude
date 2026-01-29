---
name: audit-fix
description: Execute fixes from exploration/audit findings with full plan → fix → test → deploy cycle
model: claude-opus-4-5-20251101
tags: [audit, fix, deployment, workflow]
---

Execute fixes from exploration/audit findings with full plan → fix → test → deploy cycle.

## Usage

```
/audit-fix <paste findings or describe issues>
```

## Examples

```bash
# After brownfield-explore
/audit-fix "No git repo, nested directory structure, Knowledge Base not versioned"

# After production-audit
/audit-fix "Missing RLS on users table, no rate limiting on /api/upload, exposed API keys in client"

# After code-review
/audit-fix "Inconsistent error handling in API routes, missing TypeScript types, dead code in utils/"
```

## Instructions

You are executing fixes from an audit/exploration. Follow this exact sequence:

### Phase 1: Plan (REQUIRED)

1. Parse the findings provided by the user
2. Categorize each issue:
   - **CRITICAL** - Security, data loss, breaking bugs
   - **HIGH** - Performance, reliability, code quality
   - **MEDIUM** - Structure, patterns, maintainability
   - **LOW** - Style, documentation, nice-to-have

3. Use TodoWrite to create actionable fix list, ordered by priority:
```
Example:
- [CRITICAL] Add RLS policy to users table
- [HIGH] Initialize git repository
- [HIGH] Fix nested directory structure
- [MEDIUM] Add .gitignore for Knowledge Base
- [LOW] Clean up unused dependencies
```

4. Show the plan to user and confirm before proceeding

### Phase 2: Fix

For each todo item, select the right approach:

| Issue Type | Agent/Approach |
|------------|----------------|
| Security (RLS, auth, secrets) | Use Supabase MCP or direct SQL migrations |
| Database schema | `mcp__supabase__apply_migration` |
| Code bugs/refactoring | Edit tool directly or Task with backend-agent |
| Frontend issues | Task with frontend-agent |
| Git/repo structure | Bash commands |
| Config/env issues | Edit + Bash |
| Test gaps | Task with test-agent |

Work through todos one at a time:
1. Mark todo as `in_progress`
2. Execute the fix
3. Verify the fix works
4. Mark todo as `completed`
5. Move to next

### Phase 3: Test

After all fixes complete:

1. Check what test infrastructure exists:
   ```bash
   ls package.json && cat package.json | grep -A5 '"scripts"'
   ```

2. Run appropriate tests:
   - If Playwright: `npx playwright test`
   - If Jest/Vitest: `npm test` or `pnpm test`
   - If no tests: Run build to catch type errors: `npm run build`

3. If tests fail, add new todos for failures and fix them

### Phase 4: Commit & Deploy

1. Stage and commit changes:
   ```bash
   git add -A
   git status
   ```

2. Create descriptive commit:
   ```bash
   git commit -m "fix: [summary of fixes from audit]

   - [list each major fix]

   Co-Authored-By: Claude Code <noreply@anthropic.com>"
   ```

3. Deploy based on project type:

   | Stack | Deploy Command |
   |-------|----------------|
   | Vercel (Next.js) | `vercel --prod` or `git push` (if Vercel Git integration) |
   | Supabase Edge Functions | `supabase functions deploy <function-name>` |
   | Supabase DB migrations | Already applied via MCP |
   | Static/other | `git push origin main` |

4. Verify deployment succeeded

### Phase 5: Summary

Output a summary:
```
## Audit Fix Complete

### Fixed
- [x] Issue 1 - how it was fixed
- [x] Issue 2 - how it was fixed

### Tests
- ✅ All tests passing / ✅ Build successful

### Deployed
- Commit: abc123
- Deployed to: [platform]

### Remaining (if any)
- [ ] Issue that couldn't be fixed - reason
```

## Important

- **Never skip the plan phase** - always show todos before fixing
- **One fix at a time** - don't batch, verify each fix works
- **Ask if unclear** - if a fix approach is ambiguous, ask user
- **Don't over-fix** - only fix what was in the findings, don't scope creep
- **Rollback ready** - if something breaks badly, `git stash` or `git reset --hard HEAD~1`
