---
model: claude-sonnet-4-5-20250929
---

# Vercel + Supabase Deploy Checklist

Quick pre-deploy validation for: $ARGUMENTS

## Checks:
1. **Code Quality**: TypeScript compiles (`npx tsc --noEmit`), no lint errors
2. **Tests**: All passing (`npm test`)
3. **Build**: `npm run build` succeeds locally
4. **Env Vars**: Verify all required env vars set in Vercel dashboard
5. **Supabase**: Migrations applied, RLS policies active, no exposed service keys
6. **Security**: No hardcoded keys, auth checks server-side, Zod validation on inputs

## Deploy:
```bash
git push origin main && vercel --prod
```

## Post-Deploy:
- [ ] Site loads correctly at production URL
- [ ] API endpoints respond (check /api/health if exists)
- [ ] Supabase connection working (test a data fetch)
- [ ] No console errors in browser
