---
name: qualia-debug
description: "Structured debugging with symptom gathering and deep error analysis. Use this skill whenever the user says 'debug', 'find bug', 'fix error', 'something is broken', 'error analysis', or needs help diagnosing and fixing a bug. Also trigger when user mentions 'stack trace', 'not working', 'weird behavior', or wants systematic debugging rather than quick guessing. Supports interactive mode and deep error-analysis mode."
---

# Qualia Debug — Structured Debugging

Systematic debugging with two modes: interactive symptom-based debugging and deep error analysis.

## Usage

`/qualia-debug` — Interactive debugging (gather symptoms, diagnose, fix)
`/qualia-debug --error-analysis` — Deep 7-phase error analysis

## Interactive Mode (Default)

### 1. Initialize

Load state with `gsd-tools.js`:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js phase-op current
```

Check for existing debug sessions in `.planning/debug/`.

### 2. Check Active Sessions

If there's an in-progress debug session, offer to continue it or start fresh.

### 3. Gather Symptoms

Ask targeted questions:
- What's happening? (exact error message or behavior)
- What should happen instead?
- When did it start? (after what change?)
- Is it consistent or intermittent?
- What have you already tried?

### 4. Spawn Debugger

Spawn the `qualia-debugger` agent with symptoms and project context.

Reference: `~/.claude/agents/qualia-debugger.md`

Model resolution:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js resolve-model qualia-debugger
```

The debugger follows a systematic approach:
1. Reproduce the issue
2. Isolate the cause
3. Identify root cause
4. Implement minimal fix
5. Verify fix
6. Check for related issues

### 5. Save Debug Record

Write findings to `.planning/debug/{slug}.md`:
- Symptoms
- Root cause
- Fix applied
- Lessons learned

## Error Analysis Mode (`--error-analysis`)

Deep 7-phase analysis for complex or recurring error patterns:

### Phase 1: Error Pattern Analysis
Categorize all errors by type, frequency, and trigger conditions.

### Phase 2: Debugging Strategy
Design a systematic investigation plan based on patterns found.

### Phase 3: Error Handling Improvements
Identify where error handling is missing or inadequate.

### Phase 4: Logging Enhancement
Recommend logging improvements to make future debugging easier.

### Phase 5: Monitoring Integration
Suggest monitoring and alerting for error conditions.

### Phase 6: Recovery Mechanisms
Design graceful degradation and recovery patterns.

### Phase 7: Prevention Strategies
Identify systemic changes to prevent error classes from recurring.

Output saved to `.planning/debug/error-analysis-{timestamp}.md`.
