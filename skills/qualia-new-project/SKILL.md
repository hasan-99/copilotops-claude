---
name: qualia-new-project
description: "Initialize a new Qualia workflow project from scratch — questioning, research, requirements, roadmap. Use this skill whenever the user says 'new project', 'start project', 'init project', 'qualia new', or wants to begin a brand new project with the Qualia get-shit-done workflow. Also trigger when user mentions setting up .planning directory, creating a roadmap, or starting fresh on a new client project."
---

# Qualia New Project — Project Initialization

Initialize a new project with the full Qualia get-shit-done workflow: questioning → research → requirements → roadmap.

## Usage

`/qualia-new-project` — Start new project initialization
`/qualia-new-project "Build AI chatbot for client X"` — Start with initial description

## Process

### 1. Questioning Phase

Run the questioning workflow to understand the project deeply before any planning.

Reference: `~/.claude/get-shit-done/references/questioning.md`

Ask targeted questions covering:
- What is the project? Who is it for?
- What problem does it solve?
- What are the key features?
- What tech stack preferences exist?
- What are the constraints (timeline, budget, existing systems)?
- What does success look like?

### 2. Research Phase

Based on answers, conduct research on:
- Similar solutions and competitors
- Best tech stack choices for the requirements
- Potential challenges and pitfalls
- UI/brand considerations per `~/.claude/get-shit-done/references/ui-brand.md`

### 3. Create Project Structure

Create the `.planning/` directory with all required files:

```bash
mkdir -p .planning/research .planning/phases .planning/quick .planning/debug
```

#### PROJECT.md
Template from `~/.claude/get-shit-done/templates/project.md`:
- Project name, description, client
- Tech stack decisions
- Deploy target
- Key URLs and credentials references

#### config.json
```json
{
  "project": "<name>",
  "version": "1.0",
  "deploy": { "platform": "vercel", "domain": "" },
  "stack": { "framework": "next", "db": "", "auth": "" }
}
```

#### REQUIREMENTS.md
Template from `~/.claude/get-shit-done/templates/requirements.md`:
- Milestone definition (v1.0)
- Functional requirements (categorized)
- Non-functional requirements
- Definition of Done checklist

#### ROADMAP.md
- Break requirements into sequential phases
- Each phase: number, name, description, status, dependencies
- Phases should be small enough to complete in 1-2 sessions

#### STATE.md
- Current milestone, current phase
- Phase status table
- Quick tasks completed table
- Session log

### 4. Next Step

After initialization, tell the user:
> "Project initialized. Next: run `/qualia-plan-phase 1` to plan the first phase."

### Agents Used
| Agent | File | Role |
|-------|------|------|
| `qualia-project-researcher` | `~/.claude/agents/qualia-project-researcher.md` | Domain ecosystem research |
| `qualia-research-synthesizer` | `~/.claude/agents/qualia-research-synthesizer.md` | Synthesizes parallel research |
| `qualia-roadmapper` | `~/.claude/agents/qualia-roadmapper.md` | Creates ROADMAP.md |
