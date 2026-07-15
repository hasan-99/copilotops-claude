---
name: qualia-test
description: "Generate tests, run tests, or drive a feature test-first via `--tdd` vertical-slice loop. Triggers: 'write tests', 'add tests', 'run tests', 'test coverage', 'tdd this', 'test-driven', 'red green refactor'."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# /qualia-test — Test Generator

Generate tests for client project code. Detect framework, classify targets, write tests, run them.

## Usage

- `/qualia-test` — Generate tests for recently changed files
- `/qualia-test {file}` — Generate tests for a specific file
- `/qualia-test --run` — Run existing tests and report
- `/qualia-test --coverage` — Run with coverage report
- `/qualia-test --tdd "{feature description}"` — Drive the feature test-first via vertical-slice loop

## Process

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js banner test
```

### 1. Detect Test Framework

```bash
node -e "
const p=JSON.parse(require('fs').readFileSync('package.json','utf8'));
const d={...p.dependencies,...p.devDependencies};
console.log(JSON.stringify({
  vitest: !!d.vitest,
  jest: !!d.jest,
  playwright: !!d['@playwright/test'],
  testing_library: !!d['@testing-library/react']
}))
"
```

If no test framework found, install vitest (lighter than jest for Next.js/Vite):

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vitest.config.ts` if it doesn't exist:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

### 2. Find Targets

If specific file given → use that.
If `--run` → skip to step 4.
Otherwise find recently changed untested files:

```bash
# Files changed in last 5 commits that don't have tests
git diff --name-only HEAD~5 --diff-filter=AM -- '*.ts' '*.tsx' 2>/dev/null | grep -v "test\|spec\|__test__\|\.d\.ts" | head -10
```

### 3. Generate Tests

For each target file, classify it and generate the appropriate test:

**API route** (`app/api/**/route.ts`):
- Test each exported handler (GET, POST, PUT, DELETE)
- Test with valid input → expected response
- Test with invalid input → 400 error
- Test without auth → 401 (if auth is required)

**Server action** (has `"use server"`):
- Test each exported function
- Test with valid args → expected result
- Test with invalid args → error handling

**React component** (`*.tsx` with JSX):
- Test rendering without crashing
- Test interactive elements (clicks, form submissions)
- Test loading, error, and empty states if they exist
- Test accessibility (role, aria-label presence)

**Utility function** (`lib/*.ts`, `utils/*.ts`):
- Test each exported function with normal input
- Test edge cases: empty, null, undefined, boundary values
- Test error cases: invalid input, missing data

Write test file next to the source: `{file}.test.ts` or `{file}.test.tsx`.

### 4. Run Tests

```bash
# Vitest
npx vitest run --reporter=verbose 2>&1 | tail -30

# Or Jest
npx jest --verbose 2>&1 | tail -30

# Coverage (if --coverage flag)
npx vitest run --coverage 2>&1 | tail -30
```

### 5. Report

```bash
node C:\Users\hasan\.claude/bin/qualia-ui.js divider
node C:\Users\hasan\.claude/bin/qualia-ui.js info "Files tested: {N}"
node C:\Users\hasan\.claude/bin/qualia-ui.js ok "Passing: {pass}/{total}"
node C:\Users\hasan\.claude/bin/qualia-ui.js end "TESTS DONE"
```

If any tests fail, show the failures and offer to fix them.

### 6. Commit

```bash
git add {test files}
git commit -m "test: add tests for {files}"
```

## --tdd mode (vertical-slice red→green→refactor)

When `--tdd "{feature}"` is passed, run this loop instead of the after-the-fact generator. Stops the user from accumulating untested code.

### The non-negotiable rules

1. **Vertical slices only.** ANTI-PATTERN: write all tests first, then all implementation. Correct: one test → one minimal implementation → repeat.

   ```
   WRONG (horizontal):  RED test1-5 → GREEN impl1-5
   RIGHT (vertical):    RED→GREEN test1→impl1, then test2→impl2, ...
   ```

2. **Test through the public interface only.** If the test reaches into private state, the test will die on the first refactor. Test what callers see.
3. **Only enough code to pass the current test.** No speculative features. No "while we're here." Resist scope creep — the next test will demand it if it's needed.
4. **Never refactor while red.** Green first. THEN refactor (with tests still green as the safety net).
5. **Each cycle is a commit.** `test: {behavior}` for the red, `feat: {minimal impl}` for the green. Tiny commits = revertable units.

### Loop

#### Phase 1 — Plan the slices
1. Read `.planning/CONTEXT.md` if it exists — use domain glossary terms in test names
2. Decompose `"{feature}"` into the smallest vertical slices that each deliver an observable behavior
3. Show the slice list to the user. Get approval before writing the first test.

#### Phase 2 — Tracer bullet (slice 1)
1. **RED**: write ONE test against the public interface that the feature would expose. Run it — it must fail (no implementation yet)
2. **GREEN**: write the MINIMUM code to make it pass. Run all tests — green
3. **COMMIT**: `git commit -m "test+feat({slug}): {slice 1 behavior}"`

#### Phase 3 — Incremental loop
For each remaining slice:
1. **RED**: one test, one behavior, fails
2. **GREEN**: minimal code, all tests pass
3. **REFACTOR** (only if tests still green): extract duplication, apply SOLID where the code asks for it, run tests after each step
4. **COMMIT**

#### Phase 4 — Per-cycle checklist (run on every slice)
- [ ] Test describes a behavior, not an implementation detail
- [ ] Test uses only the public interface
- [ ] Test would survive a reasonable internal refactor
- [ ] Implementation is minimal — no speculative features
- [ ] Test name reads as a sentence

#### Phase 5 — Hand off
When all slices are green, suggest: `/qualia-verify {N}` (if part of a phase) or `/qualia-optimize --deepen` (if the implementation accumulated shallow modules during the loop).

## Rules (apply to all modes)

1. **Test behavior, not implementation.** Don't test internal state — test what the user/caller sees.
2. **No snapshot tests.** They're brittle and meaningless.
3. **No mocking unless necessary.** Test real behavior. Mock only external services (APIs, databases).
4. **Each test file is self-contained.** No shared mutable state between tests.
5. **Name tests as sentences.** `it("returns 401 when user is not authenticated")` not `it("test auth")`.
