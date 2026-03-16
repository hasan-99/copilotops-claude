---
name: qualia-help
description: "Display the complete Qualia command reference — all available skills and their usage. Use this skill whenever the user says 'help', 'qualia help', 'what commands', 'what can you do', 'show commands', or wants to see all available Qualia workflow commands. Also trigger when user seems lost or unsure which command to use next."
---

# Qualia Help — Command Reference

Display the complete reference of all available Qualia workflow skills.

## Usage

`/qualia-help` — Show all commands

## Output

Reference: `~/.claude/get-shit-done/workflows/help.md`

Display the command reference. Output only — no analysis, no suggestions, just the reference.

### Project Lifecycle
| Skill | Description |
|-------|-------------|
| `qualia-new-project` | Initialize a new project (questioning → research → requirements → roadmap) |
| `qualia-new-milestone` | Start a new milestone on existing project |
| `qualia-complete-milestone` | Archive milestone, tag release, prepare for next |

### Phase Workflow
| Skill | Description |
|-------|-------------|
| `qualia-discuss-phase` | Clarify phase decisions before planning |
| `qualia-list-phase-assumptions` | Surface assumptions before planning |
| `qualia-research-phase` | Conduct technical research for a phase |
| `qualia-plan-phase` | Create detailed execution plans |
| `qualia-execute-phase` | Wave-based parallel execution of plans |
| `qualia-verify-work` | Conversational UAT testing |

### Navigation & Status
| Skill | Description |
|-------|-------------|
| `qualia-status` | Quick project status check |
| `qualia-progress` | Progress summary with routing |
| `qualia-resume-work` | Restore context from previous session |
| `qualia-pause-work` | Save session context for handoff |

### Quick Actions
| Skill | Description |
|-------|-------------|
| `qualia-quick` | Quick tasks with quality guarantees |
| `qualia-debug` | Structured debugging |
| `qualia-add-todo` | Capture ideas and tasks |
| `qualia-check-todos` | Review and act on todos |

### Quality & Deployment
| Skill | Description |
|-------|-------------|
| `qualia-audit-milestone` | Verify milestone definition of done |
| `qualia-plan-milestone-gaps` | Create fix phases from audit gaps |
| `ship` | Full production deployment pipeline |
| `team` | Agent team orchestration |
