# GitHub Actions Debug

argument-hint: [workflow-name or run-id (optional)]

Investigate and fix GitHub Actions failures.

## Process

1. **Fetch Recent Runs**
   ```bash
   gh run list --limit 5
   ```

2. **Get Failed Run Details**
   If run ID provided: `gh run view $1 --log-failed`
   Otherwise: Find most recent failed run

3. **Analyze Logs**
   - Identify the failing step
   - Find the root cause error message
   - Check if it's a flaky test vs real failure

4. **Common Issues to Check**
   - Missing environment variables
   - Dependency version mismatches
   - Test timeouts
   - Network/API failures
   - Permission issues

5. **Suggest Fix**
   - Provide specific code changes
   - Update workflow YAML if needed
   - Re-run workflow after fix

## Output
- Clear summary of what failed
- Root cause analysis
- Concrete fix to apply
