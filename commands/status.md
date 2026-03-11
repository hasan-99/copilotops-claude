# /status — Project health check

Two modes:

## Single Project (when inside a project directory)

Show the current state of the project you're in:

1. **Project identity** — `pwd`, match to qualia-context.md, show project name + type + Supabase ref
2. **Git state** — current branch, uncommitted changes, last 3 commits, ahead/behind remote
3. **Dependencies** — `npm outdated` (quick check for critical updates)
4. **Build health** — `npx tsc --noEmit` (does it type-check clean?)
5. **Deployment** — Is this deployed? What domain? When was last deploy?

Output format — one line per check:
```
Project: sofiatesting (AI agent, LIVE)
Supabase: vceeheaxcrhmpqueudqx
Branch: feature/whatsapp-fix (+3 uncommitted)
Last commit: "fix webhook timeout" (2h ago)
TypeScript: CLEAN
Build: not checked (run /ship to verify)
Deploy: Vercel, sofiatesting.vercel.app
```

## Fleet Mode (when in ~/.claude or with --fleet flag)

Run the fleet-wide health monitor across all active/maintenance projects:

```bash
bash ~/.claude/skills/status/scripts/health-check.sh         # All projects
bash ~/.claude/skills/status/scripts/health-check.sh --quick  # HTTP only
bash ~/.claude/skills/status/scripts/health-check.sh --project vero  # Deep check
```

See the `status` skill (SKILL.md) for full documentation on the 4 checks, thresholds, and report format.
