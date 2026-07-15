---
project_type: {demo or full}
discovered_at: {YYYY-MM-DD}
discovery_mode: project
---

# Project Discovery, {Project Name}

The non-technical kickoff interview output. `/qualia-scope` writes this in PROJECT MODE before `/qualia-new` generates JOURNEY.md. Captures intent, audience, brand, constraints — and, for full projects, the **complete capability set that defines the project as DONE** so the roadmap can span the whole arc, not a v1 slice.

Demo path: §1–§8 (8 questions). Full-project path: §1–§15 (adds the completeness pass + delivery questions).

## 1. The one-line pitch

> {What is this thing, in one sentence a stranger would understand?}

## 2. Who is it for

> {Name three real humans who will use this. Not personas, real names plus their scenario.}

## 3. The "remember 24 hours later" sentence

> {What does someone remember 24 hours after first using this?}

## 4. Three anti-references

> {Three sites or apps this should NOT look like, with one-line reasons each.}

## 5. Brand voice

> {Three adjectives, then one paragraph of voice in motion — an error message, a confirmation, an empty state.}

## 6. Success criterion

> {How does the client know this worked? One observable outcome.}

## 7. Hard constraints

> {Anything non-negotiable: stack, deadline, compliance, integrations, budget.}

## 8. Out of scope (explicitly deferred)

> {What is intentionally NOT in this project — work the client has consciously deferred, even if obvious to add. This is the ONLY place work leaves the arc; anything not listed here is in-scope and must land in a milestone.}

---

The remaining questions only run for `project_type: full`. Demo mode stops here.

## 9. Capability inventory — the WHOLE project

> {List EVERY capability this project must have to be considered finished — not a v1 slice, the whole thing. One bullet per capability, plain language. Push for completeness: "what else does it need before you'd call it done?" Keep asking until the client says "that's everything." This list becomes the REQ-IDs and milestones — anything missing here is what the team is later forced to improvise, so it is the most important answer in the interview.}

## 10. Definition of done — for the entire project

> {Describe the end state where there is no more agreed work. What is true when the project is finished and the team stops? This anchors the final milestone (Handoff for client projects) and tells the roadmapper how far the arc must reach.}

## 11. Shipping order

> {Roughly what order should the capabilities in §9 ship in? Group them into chapters if natural. We shape milestones from this — as many as the scope needs, no artificial cap. For client projects the last chapter is Handoff; for an internal or ongoing product it may have no Handoff.}

## 12. Compliance and legal

> {Anything regulated: payments, medical, legal, finance, accessibility commitments, data residency.}

## 13. Integrations

> {Third-party systems this must talk to, in priority order.}

## 14. Content and copy

> {Who writes the copy and where does it live, today and after handoff?}

## 15. Ownership, team, and delivery shape

> {Who maintains this after we ship — what can they do, what can't they? And: fixed deadline, fixed scope, or fixed budget? Pick one — the other two flex.}

---

## How this feeds `/qualia-new`

- §1–§5 seed PROJECT.md (one-line pitch, what we're building) and PRODUCT.md (users, register, voice, anti-references).
- §6 becomes the first row of the success-criteria table in ROADMAP.md.
- §7 populates PROJECT.md's constraints section.
- §8 populates PROJECT.md's "Out of Scope" — the explicit, client-agreed deferrals (the roadmapper must NOT defer anything else here).
- **§9 (full only) is the capability inventory → every item becomes a REQ-ID in REQUIREMENTS.md, assigned to exactly one milestone. The roadmapper must cover ALL of §9 across the arc — no overflow into an unplanned "v2".**
- **§10 (full only) defines the arc's endpoint → the roadmapper builds milestones until the whole capability set reaches this done-state.**
- §11 (full only) seeds JOURNEY.md milestone order + "why now" lines (no milestone cap — the arc is as long as §9 requires).
- §12–§15 (full only) feed research scoping, integrations, and the Handoff milestone checklist.

Demo projects skip §9–§15 because they ARE one milestone — the journey is just that milestone plus an implicit "client signs, we extend" branch handled by `/qualia-milestone`.
