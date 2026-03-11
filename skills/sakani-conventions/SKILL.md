---
name: sakani-conventions
description: "Sakani project conventions — monorepo structure, shared types, error codes, entity naming, role definitions, and domain rules from SRS V1.14. Use this skill whenever working on the Sakani project, including backend, mobile, admin console, or any shared code. Trigger on: sakani, building management, property management, tenant, owner, guard, building manager, dues, ledger, or any reference to the Sakani codebase."
tags: [sakani, conventions, domain, property-management]
---

# Sakani Project Conventions

Sakani is a property management platform for Jordan. Native iOS/Android app (React Native Expo) + NestJS backend + Next.js staff admin console + Supabase (Postgres). This skill defines project-wide conventions that all other skills reference.

## Monorepo Structure

```
sakani/
├── apps/
│   ├── mobile/              # React Native Expo (iOS + Android)
│   ├── api/                 # NestJS backend
│   └── admin/               # Next.js staff admin console
├── packages/
│   ├── shared/              # Shared types, constants, validation
│   │   ├── src/
│   │   │   ├── types/       # Domain entity types
│   │   │   ├── constants/   # Error codes, role definitions, enums
│   │   │   ├── validation/  # Zod schemas shared across apps
│   │   │   └── utils/       # Pure utility functions
│   │   └── package.json
│   └── config/              # Shared ESLint, TS configs
├── supabase/
│   ├── migrations/          # SQL migrations (source of truth)
│   └── functions/           # Edge Functions (background jobs)
├── docs/                    # Reference docs (gitignored)
├── turbo.json
├── package.json
└── .gitignore
```

Import convention: `@sakani/shared` resolves to `packages/shared`. All apps import domain types and validation from here — never duplicate type definitions across apps.

## User Roles

8 roles with RBAC+ABAC hybrid. Deny-by-default — every action requires explicit grant.

| Role | Code | Scope | Description |
|------|------|-------|-------------|
| Staff Admin | `STAFF_ADMIN` | Global | Verification governance, audited overrides |
| BM Candidate | `BM_CANDIDATE` | Building | Initial building manager, pre-verification |
| BM Verified | `BM_VERIFIED` | Building | Verified building manager, full ops access |
| Owner Unverified | `OWNER_UNVERIFIED` | Unit | Pending ownership verification |
| Owner Verified | `OWNER_VERIFIED` | Unit | Verified owner (one per unit) |
| Tenant | `TENANT` | Unit | Invite-only, unit-scoped, cannot browse |
| Guard | `GUARD` | Building | Building ops, timed tasks, calendar |
| Dev Admin | `DEV_ADMIN` | Building | Pre-handover only, identity doc access |

Scopes: `S` (self), `U` (unit), `B` (building), `G` (global). Server-side predicates enforce all scope rules — UI conventions are display-only, never security boundaries.

## Entity Naming

All entities use `snake_case` in the database and API. TypeScript types use `PascalCase`. Properties use `camelCase` in TypeScript, `snake_case` in API responses.

### Core Entities

Read `references/entities.md` for the full entity list with field definitions. Key entities:

**Identity:** `building`, `unit`, `unit_claim_request`, `building_setup_request`, `unit_membership`, `building_role_assignment`, `document`

**Finance:** `dues_cycle`, `dues_config`, `dues_obligation`, `ledger_entry`, `credit_topup_request`, `settlement_entry`, `expense`

**Subscription:** `subscription_entitlement`, `subscription_plan`, `subscription_pricing_tier`, `subscription_price_quote`, `subscription_checkout_session`, `promo_code`, `promo_redemption`, `reimbursement_obligation`

**Operations:** `guard_invite`, `guard_assignment`, `guard_task`, `task_template`, `task_instance`, `ticket`

**Audit:** `audit_log`, `statement_version`

## Error Contract

All API errors follow a standardized shape. 44 error codes defined in V1.14 (EH-6.02 through EH-6.44).

```typescript
interface ApiError {
  http_status: number;
  error_code: string;       // e.g., "BUILDING_NOT_FOUND"
  message_key: string;      // i18n key, e.g., "error.building.not_found"
  request_id: string;       // UUID correlation
  details?: Record<string, unknown>; // safe details only
}
```

**Safe-details rule:** Never include `building_key_v1`, `unit_key_v1`, identity values, or extracted document text in error responses. This prevents entity enumeration.

Read `references/error-codes.md` for the full mapping of all 44 error codes with HTTP status codes.

## Financial Rules

These are non-negotiable domain rules that every piece of code touching money must follow:

- **Append-only ledger.** Never update or delete a `ledger_entry`. Corrections use `REVERSAL` entries only.
- **Idempotency keys** on every financial write operation. Duplicate requests with same idempotency key return the original result.
- **FIFO credit settlement.** No partial settlement — credit either covers the full obligation or doesn't apply.
- **7 entry types only:** `CREDIT_TOPUP`, `MANUAL_UNIT_INCOME`, `OPENING_BALANCE`, `EXPENSE`, `SUBSCRIPTION_FEE`, `AUTOSETTLEMENT_APPLIED`, `REVERSAL`.
- **Monetary values** always stored as `{ amount: number, currency: string }` with ISO 4217 currency code (JOD for Jordan).
- **Daily auto-settlement** at 07:00 Asia/Amman — atomically applies credit to cover obligations.

## Timestamps & Localization

- All timestamps stored in UTC. Presented in `Asia/Amman` for Jordan buildings.
- Numerals display as `0-9` (Western Arabic), not `٠-٩`.
- Arabic (RTL) + English. Every user-facing string uses a `message_key` — no hardcoded labels in backend responses.
- All `reason_code` values are stable identifiers, not display text.

## Database Conventions

- Every table has `id` (UUID), `created_at` (timestamptz), `updated_at` (timestamptz).
- Every request carries a `request_id` (UUID) for audit correlation.
- RLS policies on every table — no exceptions.
- `building_key_v1` and `unit_key_v1` are opaque canonical keys for deterministic matching. Never expose in API responses or logs.

## Authentication

OTP-based login via SMS. Access/refresh token rotation with server-side session enforcement. No password-based auth.

## Subscription States

Per-building subscription: `TRIAL` (30 days) → `ACTIVE` → `INACTIVE`. Paywall gates most features when `INACTIVE`, but identity documents remain accessible.

## Commit Convention

All commits within Sakani follow: `{type}({phase}-{plan}): {description}` during Qualia execution, or `{type}(sakani): {description}` for standalone changes.

## When to Read References

| You're working on... | Read |
|---|---|
| Any entity CRUD, schema design | `references/entities.md` |
| Error handling, API responses | `references/error-codes.md` |
| Permission checks, role guards | This file (Roles table above) |
| Financial logic, ledger ops | This file (Financial Rules above) |
