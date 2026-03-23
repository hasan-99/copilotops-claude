---
name: qualia-complete-milestone
description: "Archive a completed milestone — gather stats, archive files, tag release, prepare for next milestone. Use this skill whenever the user says 'complete milestone', 'finish milestone', 'archive milestone', 'milestone done', 'close milestone', or wants to wrap up a verified milestone and prepare for the next one. Also trigger when user mentions 'tag release', 'v1 done', or needs to finalize and archive milestone work."
---

# Qualia Complete Milestone — Milestone Archive & Release

Complete a verified milestone: gather stats, archive, tag release, and prepare for the next milestone.

## Usage

`/qualia-complete-milestone` — Complete current milestone

## Prerequisites

Must have a passing milestone audit (`v*-MILESTONE-AUDIT.md` with PASS status). If no audit exists or it failed, direct user to run `/qualia-audit-milestone` first.

## Process (8 Steps)

Reference: `~/.claude/get-shit-done/workflows/complete-milestone.md`

### 1. Pre-flight Audit Check

Verify the most recent `v*-MILESTONE-AUDIT.md` shows PASS. If not:
> "Milestone audit hasn't passed yet. Run `/qualia-audit-milestone` first."

### 2. Shipping Checklist Final Gate

Before archiving, run the full shipping checklist from `~/Projects/live/qualia/docs/completion-checklists.md`.

Detect project type from `.planning/PROJECT.md` and load the matching checklist:
- **website** → "Website-Specific Checklist" + "Universal Checklist"
- **agent** → "AI Agent Checklist" + "Universal Checklist"
- **voice** → "Voice Agent Checklist" + "Universal Checklist"
- **mobile** → "Mobile App Checklist" + "Universal Checklist"
- **platform** → "Platform with LLM Checklist" + "Universal Checklist"

Run automated checks for every item possible (grep, file existence, build checks). Report:
- PASS / WARN / FAIL per item
- Total: "Shipping checklist: X/Y items verified"

Any FAIL items block milestone completion. Ask user: "Fix these first, or accept risk and continue?"
Include checklist results in the milestone archive.

### 3. Verify Readiness

Confirm with user:
- All phases complete and verified
- Shipping checklist passed (or risks accepted)
- No critical tech debt blocking release
- Ready to archive and tag

### 4. Gather Stats

Collect from STATE.md and git history:
- Total phases completed
- Total commits
- Duration (first commit to now)
- Quick tasks completed
- Lines of code changed

### 4. Extract Accomplishments

From phase summaries and audit report, compile a list of what was achieved in this milestone.

### 5. Generate Changelog

After archiving, generate/update CHANGELOG.md at project root with milestone accomplishments and phase summaries. Prepend to existing file or create new.

### 6. Archive Milestone

Create milestone archive:
```bash
mkdir -p .planning/milestones
cp .planning/ROADMAP.md .planning/milestones/v{version}-ROADMAP.md
cp .planning/REQUIREMENTS.md .planning/milestones/v{version}-REQUIREMENTS.md
```

Template: `~/.claude/get-shit-done/templates/milestone-archive.md`

### 6. Archive Requirements

Delete current requirements (fresh start for next milestone):
```bash
rm .planning/REQUIREMENTS.md
```

### 7. Update PROJECT.md

Update PROJECT.md to reflect:
- Milestone v{version} completed on {date}
- Stats summary
- Key accomplishments

### 8. Commit & Tag

```bash
git add -A
git commit -m "milestone: complete v{version}"
git tag v{version}
```

### 9. Offer Next Steps

> "Milestone v{version} complete and tagged! Options:"
> - "Start next milestone: `/qualia-new-milestone`"
> - "Ship to production: `/ship`"
> - "Take a break — you earned it"
