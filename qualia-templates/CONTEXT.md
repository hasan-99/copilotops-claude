# {{PROJECT_NAME}} — Domain Glossary

<!-- Domain glossary. Loaded by every road agent. Update via /qualia-scope. Keep entries terse (1 sentence + Avoid line). -->

## Language

### Term Name
One-sentence definition. Use the term consistently in code, comments, commits, and conversation.
**Avoid:** alternative terms that mean the same thing but aren't this one.

### {{Add terms as the project clarifies them. Examples below.}}

### User
**Avoid until disambiguated.** Currently overloaded — see "Flagged ambiguities" below.

### Phase
A unit of work inside a milestone. 2–5 tasks. Ends in a verification gate.
**Avoid:** epic, story, ticket, sprint.

### Task
A framework-internal execution unit: one commit-sized work item with one verification contract.
**Avoid:** using "task" as an ERP assignment or employee performance label unless the product domain explicitly needs it.

## Relationships
- Project holds many Milestones
- Milestone holds many Phases
- Phase holds many Tasks
- Task carries one Verification Contract
- ERP tracks project deadlines, milestone deadlines, and employee shift submissions; framework tasks stay internal.
- {{add domain-specific relationships, e.g. "Customer holds many Orders"}}

## Flagged ambiguities

### "User" → AuthUser vs Customer
- **AuthUser** = the row in `auth.users` (Supabase)
- **Customer** = the profile row owned by an AuthUser (1:1)
- {{replace with real ambiguities as they appear}}
