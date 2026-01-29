# Session Handoff

Create a handoff document before clearing context or ending session.

## Output Location
Save to: `~/.claude/thoughts/handoff-$(date +%Y%m%d-%H%M).md`

## Document Structure

```markdown
# Handoff: [Project/Task Name]
Date: [Current date/time]

## What We Accomplished
- [Bullet points of completed work]

## Current State
- Files modified: [list key files]
- Tests passing: [yes/no/partial]
- Build status: [working/broken/unknown]

## In Progress
- [What was being worked on when session ended]
- [Any partial implementations]

## Next Steps
1. [Immediate next action]
2. [Following actions]

## Key Decisions Made
- [Important decisions and their rationale]

## Blockers/Issues
- [Any problems encountered]
- [Things to watch out for]

## Commands to Resume
\`\`\`bash
# Run these to get back to where we were
[relevant commands]
\`\`\`
```

## Instructions
1. Summarize the session comprehensively
2. Be specific about file paths and line numbers
3. Include any error messages that were being debugged
4. Make it easy for a fresh Claude session to continue
