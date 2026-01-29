---
name: git-flow
description: Automate git workflows for Qualia Solutions - smart commits, PR creation, branch management, and deployment with descriptive messages
---

# Git Workflow Automation Skill

Handles all git operations intelligently.

## Smart Commit

When you say "commit changes", I:
1. Check what changed (`git status`)
2. Group related changes
3. Create descriptive commit message
4. Commit with conventional format

### Commit Message Format
```bash
# Automatic message generation
feat: Add user authentication system
- Implement JWT tokens
- Add social login support
- Create auth middleware

fix: Resolve database connection timeout
- Increase pool size
- Add retry logic
- Improve error handling
```

## Branch Management

### Create Feature Branch
```bash
# Automatic branch naming
git checkout -b feature/user-auth-system
git checkout -b fix/database-timeout
git checkout -b refactor/api-structure
```

### Branch Workflow
When you say "start new feature X", I:
1. Create branch from main
2. Set upstream
3. Push empty commit
4. Create draft PR

## Pull Request Creation

### Auto PR
```bash
# Generate PR with context
gh pr create \
  --title "feat: Add user authentication" \
  --body "$(generate_pr_body)" \
  --assignee @me \
  --label enhancement
```

### PR Template
```markdown
## Summary
[Auto-generated based on commits]

## Changes
- ✨ New features
- 🐛 Bug fixes
- 📝 Documentation

## Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing complete

## Screenshots
[If UI changes detected]
```

## Deployment Flow

When you say "deploy to production", I:

```bash
# 1. Ensure on main
git checkout main
git pull origin main

# 2. Run tests
npm test

# 3. Build
npm run build

# 4. Tag release
git tag -a v1.0.0 -m "Release version 1.0.0"

# 5. Push
git push origin main --tags

# 6. Deploy
vercel --prod
```

## Common Commands

### Quick Actions
- "commit" → Smart commit with generated message
- "new PR" → Create PR with description
- "merge and deploy" → Complete deployment flow
- "sync branches" → Update all branches

### Cleanup
```bash
# Remove merged branches
git branch --merged | grep -v main | xargs -n 1 git branch -d

# Prune remote branches
git remote prune origin
```

## Conflict Resolution

When conflicts occur, I:
1. Show conflicting files
2. Suggest resolution strategy
3. Help merge changes
4. Test after resolution

## Git Aliases

Automatically sets up:
```bash
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
```