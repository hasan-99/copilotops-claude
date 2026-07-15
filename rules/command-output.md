---
alwaysApply: true
---

# Command Output Contract

Every Qualia command must be transparent before, during, and after work. Users should never wonder what the command is doing, what it can change, or what the next step is.

## Required Shape

Every command should expose these seven lines or their equivalent:

```text
Command: /qualia-{name} {mode}
Scope: {files/routes/project area}
Intent: {audit|investigate|repair|build|polish|ship|report}
Mutation: none | planned | active | blocked
Evidence: {files read, commands run, sources checked}
Output: {files/reports/commits produced}
Next: {next command or done}
```

## Rules

1. Start with a `qualia-ui.js banner` whenever the command has an existing banner mode.
2. State whether the command is read-only or mutating before editing.
3. For mutating commands, name the exact files or route family before writing.
4. For audit or investigation commands, name the evidence commands and report path.
5. For design commands, name the design substrate loaded from `qualia-design/` and `.planning/DESIGN.md`.
6. End with a `qualia-ui.js end` next command. If there is no next command, say `done`.
7. If the command blocks, say why and route to the smallest useful next command.

## Anti-Pattern

Do not answer with only a prose paragraph like "Done, I fixed it." The command must tell the user what happened and where the evidence lives.
