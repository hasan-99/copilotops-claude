---
description: Quick deployment check and deploy to Vercel
---

Check deployment readiness and deploy to Vercel.

## Pre-Deploy Checks:
1. **Build**: Run `npm run build` - must pass
2. **Types**: Run `npx tsc --noEmit` - no errors
3. **Lint**: Run `npm run lint` - no errors
4. **Env Vars**: Verify all required vars are set in Vercel

## Deploy:
- Use Vercel MCP or `vercel --prod` for production
- Use `vercel` for preview

## Post-Deploy:
- Return deployment URL
- Note any warnings

$ARGUMENTS
