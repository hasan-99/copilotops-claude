---
description: Create a PR with auto-generated description from changes
---

Create a GitHub Pull Request for the current branch.

## Steps:

1. **Analyze Changes**
   - Run `git status` to see modified files
   - Run `git diff main...HEAD` to see all changes from main
   - Run `git log main..HEAD --oneline` to see commits

2. **Generate PR Content**
   - Create clear, concise PR title (imperative mood)
   - Write summary of what changed and why
   - List key files modified
   - Note any breaking changes or migration needs

3. **Create PR**
   ```bash
   gh pr create --title "title" --body "$(cat <<'EOF'
   ## Summary
   [What this PR does]

   ## Changes
   - [Key change 1]
   - [Key change 2]

   ## Testing
   - [ ] Tested locally
   - [ ] Tests pass

   ## Notes
   [Any additional context]
   EOF
   )"
   ```

4. **Return PR URL**

$ARGUMENTS
