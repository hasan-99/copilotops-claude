---
name: qualia-add-todo
description: "Capture ideas and tasks as structured todos in the .planning system. Use this skill whenever the user says 'add todo', 'remember this', 'note this down', 'add task', 'todo', or wants to capture an idea or task for later without acting on it now. Also trigger when user mentions 'backlog item', 'future task', or needs to save something for later in a structured way."
---

# Qualia Add Todo — Structured Task Capture

Capture ideas and tasks as structured todo files in the `.planning/todos/` directory.

## Usage

`/qualia-add-todo "Add dark mode support"` — Capture a new todo
`/qualia-add-todo "Optimize image loading" --area=performance` — With explicit area

## Process

### 1. Setup

Ensure the todos directory exists:
```bash
mkdir -p .planning/todos
```

Reference: `~/.claude/get-shit-done/workflows/add-todo.md`

### 2. Extract Content

Parse the user's input to determine:
- **Title** — Short description of the task
- **Details** — Any additional context provided
- **Area** — Infer from content if not specified (e.g., "dark mode" → `ui`, "API rate limiting" → `backend`, "fix typo" → `content`)

### 3. Check for Duplicates

Scan existing todos in `.planning/todos/` for similar items. If a near-duplicate exists, tell the user and ask if they want to update the existing one or create a new one.

### 4. Create Todo File

Write to `.planning/todos/{slug}.md`:

```markdown
---
title: "{title}"
area: "{area}"
priority: normal
status: pending
created: {YYYY-MM-DD}
---

# {title}

{details and context}
```

### 5. Update STATE.md

Add entry to the todos section of `.planning/STATE.md` (create section if it doesn't exist).

### 6. Commit

```bash
git add .planning/todos/{slug}.md .planning/STATE.md
git commit -m "todo: add {title}"
```

### 7. Confirm

> "Todo captured: {title}. Run `/qualia-check-todos` to review your backlog."
