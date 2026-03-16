---
name: quick-pr
description: "Create a GitHub Pull Request with auto-generated title and description from current branch changes. Use this skill whenever the user mentions PR, pull request, wants to submit code for review, or says things like 'open a PR', 'create PR', 'submit for review', 'push and PR', or 'quick-pr'. Also trigger when user has finished work on a branch and wants to share it."
---

# Quick PR — Auto-Generate Pull Requests

Create a GitHub Pull Request for the current branch with an intelligently generated title and description based on actual code changes.

## Process

### 1. Analyze Changes

Gather all the context needed to write a good PR description:

```bash
git status
git diff main...HEAD
git log main..HEAD --oneline
```

If the base branch isn't `main`, check for `master` or ask the user.

### 2. Generate PR Content

From the diff and commit history, produce:

- **Title**: Clear, imperative mood, under 72 chars (e.g., "Add user authentication with JWT tokens")
- **Summary**: What this PR does and why — 1-3 sentences
- **Key changes**: Bullet list of the most important modifications
- **Breaking changes**: Flag anything that could break existing functionality
- **Migration notes**: If schema, config, or API changes need action

### 3. Create the PR

```bash
gh pr create --title "title" --body "$(cat <<'EOF'
## Summary
[What this PR does and why]

## Changes
- [Key change 1]
- [Key change 2]

## Testing
- [ ] Tested locally
- [ ] Tests pass

## Notes
[Any additional context, breaking changes, migration needs]
EOF
)"
```

### 4. Return the PR URL

After creation, display the PR URL so the user can share it or continue working.

## Arguments

If the user provides arguments (e.g., a target branch, reviewers, labels), incorporate them into the `gh pr create` command:

- `--base <branch>` for target branch
- `--reviewer <user>` for reviewers
- `--label <label>` for labels
- `--draft` for draft PRs
