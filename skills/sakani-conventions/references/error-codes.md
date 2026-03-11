# Sakani Error Codes

All 44 error codes from SRS V1.14 (EH-6.02 through EH-6.44). Every API endpoint must use these exact codes.

## Error Response Shape

```typescript
interface ApiError {
  http_status: number;
  error_code: string;
  message_key: string;      // i18n lookup key
  request_id: string;        // UUID, always present
  details?: Record<string, unknown>;  // safe details only
}
```

## Safe-Details Rule

NEVER include in `details` or error messages:
- `building_key_v1` or `unit_key_v1` values
- National ID numbers or extracted document text
- Internal entity IDs that enable enumeration
- Stack traces or internal paths

## Error Code Table

| Code | error_code | HTTP | message_key | Context |
|------|-----------|------|-------------|---------|
| EH-6.02 | UNAUTHENTICATED | 401 | error.auth.unauthenticated | No valid token |
| EH-6.03 | TOKEN_EXPIRED | 401 | error.auth.token_expired | Access token expired |
| EH-6.04 | INSUFFICIENT_PERMISSIONS | 403 | error.auth.insufficient_permissions | Role/scope insufficient |
| EH-6.05 | BUILDING_NOT_FOUND | 404 | error.building.not_found | Building lookup 0-match |
| EH-6.06 | BUILDING_AMBIGUOUS | 409 | error.building.ambiguous | Building lookup >1-match |
| EH-6.07 | UNIT_NOT_FOUND | 404 | error.unit.not_found | Unit lookup 0-match |
| EH-6.08 | UNIT_AMBIGUOUS | 409 | error.unit.ambiguous | Unit lookup >1-match |
| EH-6.09 | UNIT_ALREADY_CLAIMED | 409 | error.unit.already_claimed | OWNER_VERIFIED exists |
| EH-6.10 | CLAIM_ALREADY_PENDING | 409 | error.claim.already_pending | Duplicate claim request |
| EH-6.11 | PERMIT_ALREADY_SUBMITTED | 409 | error.permit.already_submitted | Duplicate permit submission |
| EH-6.12 | SETUP_REQUEST_ALREADY_PENDING | 409 | error.setup.already_pending | Duplicate setup request |
| EH-6.13 | DOCUMENT_NOT_FOUND | 404 | error.document.not_found | Document ID invalid |
| EH-6.14 | DOCUMENT_ACCESS_DENIED | 403 | error.document.access_denied | Visibility check failed |
| EH-6.15 | INVALID_DOCUMENT_TYPE | 422 | error.document.invalid_type | Wrong document classification |
| EH-6.16 | DUES_CONFIG_NOT_FOUND | 404 | error.dues.config_not_found | No dues config for building |
| EH-6.17 | DUES_CYCLE_NOT_FOUND | 404 | error.dues.cycle_not_found | Invalid cycle_ym |
| EH-6.18 | OBLIGATION_NOT_FOUND | 404 | error.dues.obligation_not_found | Invalid obligation |
| EH-6.19 | INSUFFICIENT_CREDIT | 422 | error.credit.insufficient | Credit doesn't cover obligation |
| EH-6.20 | DUPLICATE_TOPUP_REQUEST | 409 | error.credit.duplicate_topup | Idempotency key collision |
| EH-6.21 | TOPUP_ALREADY_REVIEWED | 409 | error.credit.already_reviewed | Re-reviewing decided request |
| EH-6.22 | OPENING_BALANCE_EXISTS | 409 | error.ledger.opening_balance_exists | One per unit |
| EH-6.23 | OPENING_BALANCE_WINDOW_CLOSED | 422 | error.ledger.opening_balance_window | Past controlled window |
| EH-6.24 | LEDGER_IDEMPOTENCY_CONFLICT | 409 | error.ledger.idempotency_conflict | Duplicate financial write |
| EH-6.25 | SUBSCRIPTION_NOT_FOUND | 404 | error.subscription.not_found | No entitlement for building |
| EH-6.26 | SUBSCRIPTION_INACTIVE | 403 | error.subscription.inactive | Paywall gate |
| EH-6.27 | TRIAL_EXPIRED | 403 | error.subscription.trial_expired | 30-day trial over |
| EH-6.28 | QUOTE_EXPIRED | 422 | error.subscription.quote_expired | Price quote past expiry |
| EH-6.29 | QUOTE_ALREADY_CONSUMED | 409 | error.subscription.quote_consumed | Quote used in checkout |
| EH-6.30 | PROMO_CODE_INVALID | 422 | error.promo.invalid | Code not found or inactive |
| EH-6.31 | PROMO_CODE_EXHAUSTED | 422 | error.promo.exhausted | Max redemptions reached |
| EH-6.32 | PROMO_ALREADY_RESERVED | 409 | error.promo.already_reserved | Duplicate reservation |
| EH-6.33 | CHECKOUT_SESSION_INVALID | 422 | error.checkout.invalid | Bad session state |
| EH-6.34 | WEBHOOK_SIGNATURE_INVALID | 401 | error.webhook.signature_invalid | Provider signature failed |
| EH-6.35 | GUARD_INVITE_EXPIRED | 422 | error.guard.invite_expired | Past 7-day window |
| EH-6.36 | GUARD_INVITE_REVOKED | 422 | error.guard.invite_revoked | Invite was revoked |
| EH-6.37 | GUARD_ALREADY_ACTIVE | 409 | error.guard.already_active | One active guard per building |
| EH-6.38 | TICKET_NOT_FOUND | 404 | error.ticket.not_found | Invalid ticket |
| EH-6.39 | TICKET_INVALID_TRANSITION | 422 | error.ticket.invalid_transition | Status flow violated |
| EH-6.40 | TASK_NOT_FOUND | 404 | error.task.not_found | Invalid task |
| EH-6.41 | VALIDATION_ERROR | 422 | error.validation.failed | Zod/input validation |
| EH-6.42 | RATE_LIMITED | 429 | error.rate_limit.exceeded | Too many requests |
| EH-6.43 | INTERNAL_ERROR | 500 | error.internal | Unexpected server error |
| EH-6.44 | SERVICE_UNAVAILABLE | 503 | error.service.unavailable | Downstream service down |

## Usage in NestJS

```typescript
// In @sakani/shared/src/constants/errors.ts
export const SAKANI_ERRORS = {
  UNAUTHENTICATED: { code: 'UNAUTHENTICATED', status: 401, messageKey: 'error.auth.unauthenticated' },
  BUILDING_NOT_FOUND: { code: 'BUILDING_NOT_FOUND', status: 404, messageKey: 'error.building.not_found' },
  // ... all 44
} as const;

// In NestJS exception filter
throw new SakaniException(SAKANI_ERRORS.BUILDING_NOT_FOUND, { requestId });
```

## Deterministic Lookup Semantics

These error codes have precise semantic meanings for building/unit lookup:
- `BUILDING_NOT_FOUND` = exactly 0-match (not "maybe not found")
- `BUILDING_AMBIGUOUS` = exactly >1-match
- `UNIT_NOT_FOUND` = exactly 0-match
- `UNIT_AMBIGUOUS` = exactly >1-match

The lookup algorithm must be deterministic: same input always produces the same match outcome.
