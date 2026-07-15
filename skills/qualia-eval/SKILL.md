---
name: qualia-eval
description: "Evaluate an AI feature (chat / RAG / voice / agent) against a layered eval suite — deterministic assertions first, then llm-rubric judges — and gate on the result. Qualia gates UI and code; this is the equivalent gate for the AI artifacts a project builds. Triggers: 'eval this agent', 'test the chatbot', 'evaluate the AI feature', 'rag eval', 'does the assistant answer correctly', 'judge the model output', 'qualia-eval'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
---

# /qualia-eval — Evaluate an AI Feature

`contract-runner` proves the code exists; `verify-panel` proves the code is correct. Neither can tell you whether the **chatbot actually answers the refund question**. This lane closes that gap with a layered eval suite — cheap deterministic checks first, model judgment only where a model is required — mirroring the contract-runner evidence model.

## Usage
`/qualia-eval {suite.json}` — run an eval suite for one AI feature
`/qualia-eval {N}` — run every `.planning/evals/*-suite.json` for phase N (verify-step gate)

## The suite (JSON)

One suite per AI feature. Each case carries a captured `output` (or `output_file`) plus optional `latency_ms` / `cost_usd`, and a list of assertions:

```json
{
  "feature": "support-chat",
  "cases": [
    { "name": "refund window", "input": "what's your refund policy?",
      "output": "We refund within 30 days of purchase.",
      "latency_ms": 1200, "cost_usd": 0.008,
      "assert": [
        { "type": "contains", "value": "30 days" },
        { "type": "not_contains", "value": "I cannot help" },
        { "type": "max_latency_ms", "value": 2000 },
        { "type": "llm_rubric", "rubric": "answer is grounded in the policy, no hallucinated terms" }
      ] } ]
}
```

Deterministic assertion types (settled with no model): `contains`, `not_contains`, `equals`, `regex`, `not_regex`, `min_length`, `max_length`, `json_valid`, `json_path` (`equals`/`contains`), `max_latency_ms`, `max_cost_usd`. The model-only type is `llm_rubric`.

## Process

### 1. Capture outputs

For each case, run the AI feature on `input` and record the real `output` (+ `latency_ms`/`cost_usd` if measurable) back into the suite. Use the project's own entrypoint — an API route, a script, or the agent SDK. If outputs are already captured (replay fixtures), skip to step 2.

### 2. Judge the rubrics (one judge per llm_rubric, fresh context)

Deterministic assertions need no model — `eval-runner.js` settles them. For each `llm_rubric` assertion, spawn a judge to return a verdict, then write `"verdict": "pass"|"fail"` onto that assertion in the suite. This mirrors how `verify-panel` consumes skeptic votes: the model judges, the runner aggregates.

```
Agent(prompt="
Role: @C:\Users\hasan\.claude/agents/verifier.md

JUDGE one rubric against one output. No code to grep — judge the text only.
Rubric: {rubric}
Input: {input}
Output to judge: {output}

Return exactly one line: PASS — {reason}  OR  FAIL — {reason}. Default FAIL if the output does not clearly satisfy the rubric.
", subagent_type="qualia-verifier", description="Judge rubric — {case name}")
```

An `llm_rubric` with no verdict is PENDING and **fails** the suite — never silently pass an unjudged rubric.

### 3. Run the deterministic verdict

```bash
node C:\Users\hasan\.claude/bin/eval-runner.js {suite.json} --write
```

`eval-runner.js` runs every deterministic assertion itself, folds in the rubric verdicts, and exits **0 = all cases pass / 1 = any failure or unjudged rubric**. Artifact: `.planning/evals/eval-{feature}.json`.

### 4. Gate

Exit 0 → the AI feature meets its bar; report PASS with the per-case summary. Exit 1 → list the failing cases + assertions and route to `/qualia-fix` (behavior wrong) or back to the prompt/RAG config. When run as a phase verify-step gate (`/qualia-eval {N}`), a FAIL is a phase FAIL — same standing as a failing contract.

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js end "EVAL COMPLETE" "/qualia-verify {N}"
```
