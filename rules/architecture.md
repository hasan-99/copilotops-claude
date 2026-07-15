# Architecture Rules

How Qualia code stays navigable for future agents (human and AI). Read on architectural-judgment tasks: refactors, new module decisions, deep-module work, `/qualia-optimize --deepen`.

## 1. Deep modules over shallow ones (Ousterhout)

A **deep module** hides significant complexity behind a small, stable interface. A **shallow module** exposes most of its internals — every caller has to know how it works to use it.

| | Deep | Shallow |
|---|---|---|
| Interface size (params, exports) | Small | Wide |
| Internal logic | Substantial | Trivial |
| Cost to change implementation | Low (callers don't notice) | High (every caller breaks) |
| Cost to read a caller | Low | High (must know module internals) |

Deep modules are the primary defense against AI-generated entropy. AI is excellent at generating implementation; humans (and AI under guidance) must defend the **interface**.

### Smell — shallow code

If you spot any of these, the module is shallow and is a refactor candidate:

- A wrapper function that does only argument shuffling and a single inner call.
- A type-only file that re-exports types from elsewhere.
- A "service" that has 8 public methods and one private one.
- A util module where every export is used in exactly one place.
- A class whose every method is a one-liner pass-through.

`/qualia-optimize --deepen` is the skill that scouts for these and proposes interface consolidations.

## 2. Locality over cleverness

Code that changes together should live together. The cost of a "DRY" abstraction is paid every time a future caller has to mentally fork to the abstraction's definition. Three similar lines beats a premature `extractCommon()` that everyone has to read twice.

Apply DRY only when:
- The duplication is exact (not just similar shape).
- The thing duplicated is unlikely to diverge.
- The caller doesn't need to know "the rule" to read the call site.

If any of those three is uncertain, leave the duplication. Pocock's rule of thumb: **three is the threshold, but only if all three would change in lock-step.**

## 3. Adapters at seams

Wherever the system meets an external dependency (database, third-party API, AI provider, payment gateway), introduce an adapter. The adapter:

- Owns the dependency's specific shape (auth headers, response envelopes, error formats).
- Translates to a project-internal type that the rest of the code uses.
- Is the only file that needs to change when the dependency is swapped or upgraded.

This is the seam where tests inject fakes and where future migrations live. A codebase without adapters is a codebase that fights every dependency upgrade.

**Example seams** in a typical Qualia project:
- `lib/supabase/server.ts` — adapter over `@supabase/supabase-js`.
- `lib/openrouter/client.ts` — adapter over OpenRouter REST API.
- `lib/retell/agent.ts` — adapter over Retell AI SDK.
- `lib/zoho/contacts.ts` — adapter over Zoho Books API.

Direct calls to vendor SDKs from feature code are a smell. Move them through an adapter.

## 4. Progressive disclosure of complexity

A reader entering the codebase from a fresh clone should be able to follow this path:

```
README.md  →  app/ or src/index  →  one feature folder  →  one route  →  one component  →  one util
```

At each step the depth increases. The top is breadth (what does this app do?), the bottom is depth (how does this specific util compute X?). Skipping levels is a smell:

- An entry point that imports 30 modules from across the tree → the tree is shallow.
- A route handler that calls a database directly → no service layer; logic and IO are entangled.
- A component that owns its own data fetching, mutation logic, error handling, and rendering → no hook abstraction; the component will be impossible to test or replace.

The pattern that tells a fresh reader where to go next is **layered service boundaries**:
1. **Routes / pages** — wiring only. No business logic.
2. **Features / use cases** — business logic. Calls services.
3. **Services** — orchestration. Calls adapters.
4. **Adapters** — IO. The only layer that talks to vendors.
5. **Domain types** — pure. No imports of the above.

Inversions of this order (domain types importing adapters, services calling components) are bugs in shape.

## 5. Interface stability beats internal elegance

Once an interface has callers, changing it is expensive. Internal refactors are cheap. **Optimize for the cost of change.**

When in doubt:
- A new public function: write it conservatively. Defaults are a liability — every default is a future migration.
- An internal function: write it expressively. Internal callers can be fixed in one sweep.

Pocock's heuristic from de-slop: *the interface is the thing the AI shouldn't change without you. The implementation is the thing the AI can rewrite at will.*

## 6. Test the seam, not the function

Unit tests that pin internal function signatures rot fast — every refactor breaks them. Tests against the **adapter** or **service interface** survive refactors.

Order of test value (high → low):
1. **End-to-end / user-flow** — tests at the route level. Survive everything except feature changes.
2. **Service-level** — tests at the use-case boundary. Survive most refactors.
3. **Adapter-level** — tests with the vendor mocked. Survive vendor swaps.
4. **Unit / function-level** — tests against a single internal function. Last resort. Only for genuinely tricky algorithms.

The pyramid in older textbooks (lots of unit, few e2e) inverted in the AI era. AI generates internal functions cheaply; the seam tests are the ones that survive AI-driven refactors.

## 7. The codebase IS the documentation

Per Pocock's *"Never run /init"*: static documentation rots within weeks. The agents and humans should be able to **explore** to discover, not **memorize** to recall.

Practical rules:
- README.md: orientation only — what is this app, how do I run it, where is the source of truth for the rest. Not API docs, not architecture diagrams that will lie within a sprint.
- `.planning/CONTEXT.md`: domain glossary, append-only as terms emerge. Discovered, not maintained.
- ADRs in `.planning/decisions/`: hard-to-reverse calls, dated, immutable. Future archaeology, not current spec.
- Anything else: it lives in code or it doesn't exist. If you need a diagram, generate it from the code at read-time.

A skill or agent that needs context should `Read` the relevant code, not a synopsis of it written six months ago.

## 8. When to apply this rule file

Read this file (auto-load via skill or `@rules/architecture.md`) when:

- Planning a new module or feature with multiple components.
- The user requests `/qualia-optimize --deepen` or `--alignment`.
- A verifier is scoring "Container depth & nesting" (per `qualia-design/design-rubric.md` dimension 8).
- An ADR is being drafted for an architectural fork.

Do **not** auto-load this on quick fixes, copy edits, single-component touch-ups — that wastes instruction budget. Use judgment.
