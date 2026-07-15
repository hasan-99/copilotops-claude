# Vault Access (security-critical)

Governs every read of the `~/qualia-memory/` vault — by `/qualia-recall`, by any
skill or agent that greps the vault, and by direct `Read`/`Grep`/`Bash` calls.
The single source of truth for *which* paths are sensitive is the vault's own
manifest at `~/qualia-memory/wiki/_meta/access.md`. This rule says how to honor it.

## The rule

Role is read from `C:\Users\hasan\.claude/.qualia-config.json` (`role` field). When
`role != OWNER`, paths the manifest lists as **OWNER_ONLY** or **CONDITIONAL**
MUST NOT be read, grepped, listed, or summarized:

- `Finances/` — live invoicing, VAT, outstanding balances
- `Clients/*.md` — rates, contacts, Zoho IDs, billing addresses
- `Team/*.md` — compensation / performance context
- `raw/sessions/` — verbatim session logs (commercial + internal decisions)
- `memory/` — personal AI context layer
- `wiki/_meta/access.md` — the manifest itself (prevents trivial bypass)
- CONDITIONAL (DEFAULT DENY for non-OWNER): `Projects/*.md`, `wiki/sessions/qa/`

**ALL_ROLES** paths (`wiki/concepts/`, `wiki/entities/`, `wiki/analysis/`,
`Research/`, navigational pages, etc.) are open to every authenticated user.

When following `[[wikilinks]]` out of ALL_ROLES content INTO an OWNER_ONLY path,
**stop at the boundary** — do not follow the link.

On refusal, say plainly: *"That path is OWNER-only. Ask Fawzi if you need this."*

## Deterministic enforcement (don't rely on this prose alone)

`C:\Users\hasan\.claude/bin/recall.js` enforces the manifest in code: it parses
`wiki/_meta/access.md`, resolves the role, and filters OWNER_ONLY / CONDITIONAL
vault hits for non-OWNER callers (fail-closed on unknown role). **Prefer
`/qualia-recall` (or `recall.js`) over hand-rolled `grep ~/qualia-memory`** — the
tool can't forget the policy the way a prompt can. "A rule worth enforcing is
worth a gate" (constitution).

## When this rule applies

Always-on for any session that may touch `~/qualia-memory/`. If the vault does not
exist on the machine, this rule is inert. OWNER role ⇒ full access (no filtering).
