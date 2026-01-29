---
name: full-deploy
description: End-to-end deployment pipeline - test, build, deploy to Vercel, verify, notify. Complete CI/CD workflow.
model: claude-opus-4-5-20251101
tags: [deployment, vercel, testing, ci-cd, workflow]
---

# Full Deploy

Complete deployment pipeline from code to production.

## Pipeline Stages

```
1. Pre-flight Checks
       ↓
2. Run Tests
       ↓
3. Build Application
       ↓
4. Deploy to Vercel
       ↓
5. Smoke Tests
       ↓
6. Verification
```

## Quick Start

Say: "deploy to production" or "full deploy"

I will:
1. Check git status and branch
2. Run your test suite
3. Build the application
4. Deploy to Vercel
5. Run smoke tests
6. Verify deployment

## Stage 1: Pre-flight Checks

```bash
# Verify clean working directory
git status

# Ensure on correct branch
git branch --show-current

# Pull latest changes
git pull origin main

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Warning: Uncommitted changes detected"
fi
```

## Stage 2: Run Tests

```bash
# Run test suite
npm test

# Or with coverage
npm run test:coverage

# For specific frameworks:
# - Jest: npx jest
# - Vitest: npx vitest run
# - Playwright: npx playwright test
```

**Skip conditions:**
- `--skip-tests` flag provided
- No test script in package.json
- Emergency hotfix deployment

## Stage 3: Build Application

```bash
# Build for production
npm run build

# Verify build output
ls -la .next/  # Next.js
ls -la dist/   # Vite/other

# Check build size
du -sh .next/static
```

**Common issues:**
- TypeScript errors → Fix before deploy
- Missing env vars → Check .env.production
- Build timeout → Increase memory limit

## Stage 4: Deploy to Vercel

```bash
# Deploy using Vercel CLI
vercel --prod

# Or with specific settings
vercel --prod --env NEXT_PUBLIC_API_URL=https://api.example.com

# Check deployment URL
vercel ls --limit 1
```

**Environment handling:**
- Uses Vercel project settings
- Pulls from linked environment
- Override with `--env` flags

## Stage 5: Smoke Tests

```typescript
// Quick verification tests
async function runSmokeTests(url: string) {
  const tests = [
    { name: 'Homepage loads', path: '/' },
    { name: 'API health', path: '/api/health' },
    { name: 'Auth page', path: '/auth/login' },
  ];

  for (const test of tests) {
    const response = await fetch(`${url}${test.path}`);
    if (!response.ok) {
      throw new Error(`${test.name} failed: ${response.status}`);
    }
  }
}
```

Using webapp-testing skill:
```
Test: Homepage loads
Test: API responds
Test: Auth flow works
Test: Critical features functional
```

## Stage 6: Verification

```bash
# Run post-deploy hook
~/.claude/hooks/post-deploy.sh $DEPLOYMENT_URL

# Check deployment status
vercel inspect $DEPLOYMENT_URL

# Monitor for errors (first 5 minutes)
vercel logs $DEPLOYMENT_URL --follow
```

## Rollback Procedure

If deployment fails:

```bash
# List recent deployments
vercel ls

# Rollback to previous
vercel rollback

# Or promote specific deployment
vercel promote <deployment-url>
```

## Environment Variables

Ensure these are set in Vercel:

```env
# Required for most projects
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
DATABASE_URL=xxx

# Optional
VERCEL_ENV=production
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Notifications

On successful deploy:
```typescript
// Notify via n8n workflow
await mcp__n8n-mcp__execute_workflow({
  id: 'deploy-notification',
  data: { url: deploymentUrl, project: projectName }
});

// Or direct Slack notification
await fetch(SLACK_WEBHOOK, {
  method: 'POST',
  body: JSON.stringify({
    text: `🚀 Deployed ${project} to ${deploymentUrl}`
  })
});
```

## My Process

1. **Analyze project** - Detect framework, test setup
2. **Pre-flight checks** - Git status, branch verification
3. **Run tests** - Execute test suite, fail fast
4. **Build** - Create production bundle
5. **Deploy** - Push to Vercel
6. **Verify** - Smoke tests, health checks
7. **Notify** - Success/failure notification

## Flags

- `--skip-tests` - Skip test stage (use carefully)
- `--preview` - Deploy to preview instead of production
- `--dry-run` - Show what would happen without executing
- `--force` - Deploy even with uncommitted changes

## Integration with Other Skills

- **test-runner** - For comprehensive test execution
- **vercel-deploy** - For Vercel-specific configuration
- **webapp-testing** - For E2E smoke tests
- **n8n-workflow** - For notifications

## Trigger Phrases

- "deploy to production"
- "full deploy"
- "run deployment pipeline"
- "ship it"
