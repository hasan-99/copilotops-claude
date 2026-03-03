# /status — Quick project health check

Show the current state of the project you're in.

## What to check

1. **Project identity** — `pwd`, match to deployment-map.md, show project name + type + Supabase ref
2. **Git state** — current branch, uncommitted changes, last 3 commits, ahead/behind remote
3. **Dependencies** — `npm outdated` (quick check for critical updates)
4. **Build health** — `npx tsc --noEmit` (does it type-check clean?)
5. **Deployment** — Is this deployed? What domain? When was last deploy?

## Output format

Keep it compact — one line per check:
```
Project: sofiatesting (AI agent, LIVE)
Supabase: vceeheaxcrhmpqueudqx
Branch: feature/whatsapp-fix (+3 uncommitted)
Last commit: "fix webhook timeout" (2h ago)
TypeScript: CLEAN
Build: not checked (run /ship to verify)
Deploy: Vercel, sofiatesting.vercel.app
```
