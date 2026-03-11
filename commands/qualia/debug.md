---
name: qualia:debug
description: Systematic debugging with persistent state across context resets
argument-hint: "[--error-analysis] [issue description]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
---

<objective>
Debug issues using scientific method with subagent isolation.

**Orchestrator role:** Gather symptoms, spawn qualia-debugger agent, handle checkpoints, spawn continuations.

**Why subagent:** Investigation burns context fast (reading files, forming hypotheses, testing). Fresh 200k context per investigation. Main context stays lean for user interaction.

**Modes:**
- **Default** — Interactive debugging with symptom gathering, hypothesis testing, and subagent isolation.
- `--error-analysis` — Deep error analysis and resolution. Skips interactive symptom gathering and runs a comprehensive 7-phase analysis directly:
  1. **Error Pattern Analysis**: Categorize error types, identify root causes, trace error propagation, analyze frequency, correlate with system events
  2. **Debugging Strategy**: Stack trace analysis, variable state inspection, execution flow tracing, memory dump analysis, race condition detection
  3. **Error Handling Improvements**: Custom exception classes, error boundary implementation, retry logic with backoff, circuit breaker patterns, graceful degradation
  4. **Logging Enhancement**: Structured logging setup, correlation ID implementation, log aggregation strategy, debug vs production logging, sensitive data masking
  5. **Monitoring Integration**: Sentry/Rollbar setup, error alerting rules, error dashboards, trend analysis, SLA impact assessment
  6. **Recovery Mechanisms**: Automatic recovery procedures, data consistency checks, rollback strategies, state recovery, compensation logic
  7. **Prevention Strategies**: Input validation, type safety improvements, contract testing, defensive programming, code review checklist
  Provides specific fixes, preventive measures, long-term reliability improvements, and test cases for each error scenario.
</objective>

<context>
User's issue: $ARGUMENTS

Check for active sessions:
```bash
ls .planning/debug/*.md 2>/dev/null | grep -v resolved | head -5
```
</context>

<process>

## 0. Initialize Context

```bash
INIT=$(node /home/qualia/.claude/get-shit-done/bin/gsd-tools.js state load 2>&1)
if [ $? -ne 0 ] || echo "$INIT" | grep -q '"error"'; then
  echo "ERROR: Failed to load state: $INIT"
  exit 1
fi
```

Extract `commit_docs` from init JSON. Resolve debugger model:
```bash
DEBUGGER_MODEL=$(node /home/qualia/.claude/get-shit-done/bin/gsd-tools.js resolve-model qualia-debugger --raw 2>&1)
if [ $? -ne 0 ] || [ -z "$DEBUGGER_MODEL" ]; then
  echo "ERROR: Failed to resolve debugger model: $DEBUGGER_MODEL"
  exit 1
fi
```

## 1. Check Active Sessions

If active sessions exist AND no $ARGUMENTS:
- List sessions with status, hypothesis, next action
- User picks number to resume OR describes new issue

If $ARGUMENTS provided OR user describes new issue:
- Continue to symptom gathering

## 2. Gather Symptoms (if new issue)

Use AskUserQuestion for each:

1. **Expected behavior** - What should happen?
2. **Actual behavior** - What happens instead?
3. **Error messages** - Any errors? (paste or describe)
4. **Timeline** - When did this start? Ever worked?
5. **Reproduction** - How do you trigger it?

After all gathered, confirm ready to investigate.

## 3. Spawn qualia-debugger Agent

Fill prompt and spawn:

```markdown
<objective>
Investigate issue: {slug}

**Summary:** {trigger}
</objective>

<symptoms>
expected: {expected}
actual: {actual}
errors: {errors}
reproduction: {reproduction}
timeline: {timeline}
</symptoms>

<mode>
symptoms_prefilled: true
goal: find_and_fix
</mode>

<debug_file>
Create: .planning/debug/{slug}.md
</debug_file>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="qualia-debugger",
  model="{debugger_model}",
  description="Debug {slug}"
)
```

## 4. Handle Agent Return

**If `## ROOT CAUSE FOUND`:**
- Display root cause and evidence summary
- Offer options:
  - "Fix now" - spawn fix subagent
  - "Plan fix" - suggest /qualia:plan-phase --gaps
  - "Manual fix" - done

**If `## CHECKPOINT REACHED`:**
- Present checkpoint details to user
- Get user response
- Spawn continuation agent (see step 5)

**If `## INVESTIGATION INCONCLUSIVE`:**
- Show what was checked and eliminated
- Offer options:
  - "Continue investigating" - spawn new agent with additional context
  - "Manual investigation" - done
  - "Add more context" - gather more symptoms, spawn again

## 5. Spawn Continuation Agent (After Checkpoint)

When user responds to checkpoint, spawn fresh agent:

```markdown
<objective>
Continue debugging {slug}. Evidence is in the debug file.
</objective>

<prior_state>
Debug file: @.planning/debug/{slug}.md
</prior_state>

<checkpoint_response>
**Type:** {checkpoint_type}
**Response:** {user_response}
</checkpoint_response>

<mode>
goal: find_and_fix
</mode>
```

```
Task(
  prompt=continuation_prompt,
  subagent_type="qualia-debugger",
  model="{debugger_model}",
  description="Continue debug {slug}"
)
```

</process>

<success_criteria>
- [ ] Active sessions checked
- [ ] Symptoms gathered (if new)
- [ ] qualia-debugger spawned with context
- [ ] Checkpoints handled correctly
- [ ] Root cause confirmed before fixing
</success_criteria>
