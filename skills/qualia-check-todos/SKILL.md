---
name: qualia-check-todos
description: "List and manage pending todos with filtering and interactive routing. Use this skill whenever the user says 'check todos', 'show todos', 'what todos', 'backlog', 'pending tasks', or wants to review their captured todo items. Also trigger when user mentions 'todo list', 'what's in the backlog', or needs to pick a todo to work on."
---

# Qualia Check Todos — Todo Review & Routing

List pending todos with area filtering, interactive selection, and action routing.

## Usage

`/qualia-check-todos` — Show all pending todos
`/qualia-check-todos --area=ui` — Filter by area
`/qualia-check-todos --priority=high` — Filter by priority

## Process

### 1. Load Todos

Read all files in `.planning/todos/`. Parse frontmatter for status, area, priority, created date.

Also read `.planning/STATE.md` and `.planning/ROADMAP.md` for project context.

Reference: `~/.claude/get-shit-done/workflows/check-todos.md`

### 2. Display List

Show todos grouped by area, sorted by priority then date:

```
## UI (3 pending)
1. Add dark mode support [normal] — 2026-03-10
2. Improve mobile nav [high] — 2026-03-08
3. Loading skeleton screens [low] — 2026-03-12

## Backend (1 pending)
4. API rate limiting [high] — 2026-03-09
```

Apply filters if specified.

### 3. Interactive Selection

Ask the user which todo they want to act on (by number).

### 4. Route to Action

For the selected todo, offer actions:

- **Work now** — Execute the todo as a quick task: `/qualia-quick "{todo title}"`
- **Add to phase** — Incorporate into an upcoming phase in the roadmap
- **Brainstorm** — Discuss the todo further to flesh out details
- **Create phase** — If the todo is big enough, create a new roadmap phase for it

Load the full todo file content to provide context for whichever action is chosen.
