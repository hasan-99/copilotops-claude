---
title: Qualia Constitution
scope: org-level — inherited by every Qualia project
updated: 2026-05-29
---

# Qualia Constitution

> The top of the standards hierarchy. **Every Qualia project inherits these standards**, and they are **enforced at every increment's verify step** (`qualia-verify`, milestone close). Archetype Definitions of Done in `references/archetypes/*.md` *extend* this file — they add archetype-specific bars, never relax these. A senior should be able to read this in two minutes.

## Supabase security (non-negotiable)

- [ ] **RLS on every table**, with explicit policies. Verify by querying the table as two different users — each must see only their own rows.
- [ ] **Authorize on `app_metadata`, never `user_metadata`.** `user_metadata` is user-editable and must never gate access.
- [ ] **`service_role` key is server-only.** Never prefixed `NEXT_PUBLIC_`, never imported into a client component.
- [ ] **Postgres views set `security_invoker = true`** — otherwise the view runs as its owner and bypasses the caller's RLS.
- [ ] **Every `UPDATE` policy has a matching `SELECT` policy.** Without it, updates fail silently.
- [ ] **Storage upsert needs `INSERT` + `SELECT` + `UPDATE`** policies on the bucket.
- [ ] **Revoke a user's sessions before deleting the user** — deletion alone leaves issued JWTs valid until expiry.

## Schema flow

- [ ] **Local container → staging branch → production.** No manual schema edits on remote DBs.
- [ ] **All schema changes are migrations** in `supabase/migrations/`, applied through CI — never hand-applied to a remote.

## Gates over prompts

Dangerous-command and architectural rules are enforced as **deterministic hooks**, not prose the model may forget. The framework already ships:

- [ ] **`migration-guard`** — blocks schema edits that bypass `supabase/migrations/`.
- [ ] **`supabase-destructive-guard`** — blocks destructive operations on remote DBs.
- [ ] **`branch-guard`** — enforces feature-branch-only; main stays deployable.

A rule worth enforcing is worth a hook. Add one rather than relying on instructions alone.

## Context grounding

- [ ] **Bundled, version-matched docs are the source of truth for stack APIs** — over model memory. When in doubt about a Supabase / Next.js / vendor API, read the pinned docs, don't recall from weights.

---

*This file contains only verified org standards. Archetype DoDs extend it; they do not override it.*
