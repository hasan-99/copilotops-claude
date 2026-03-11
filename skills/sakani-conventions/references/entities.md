# Sakani Entity Reference

Complete entity definitions from SRS V1.14. This is the source of truth for schema design, API contracts, and type generation.

## Conventions

- All IDs are UUIDs
- All tables have `id`, `created_at` (timestamptz, UTC), `updated_at` (timestamptz, UTC)
- Monetary fields: `{ amount: numeric, currency: text }` (ISO 4217)
- All timestamps stored UTC, presented Asia/Amman
- `request_id` correlation on every write operation

---

## Identity Domain

### building
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_key_v1 | text | Canonical key for deterministic matching. UNIQUE. Never expose. |
| name_ar | text | Arabic building name |
| name_en | text | English building name |
| building_type | enum | RESIDENTIAL, COMMERCIAL, MIXED |
| address | jsonb | Structured address object |
| unit_count | integer | Number of units |
| subscription_status | enum | TRIAL, ACTIVE, INACTIVE |
| trial_expires_at | timestamptz | 30-day trial expiry |

### building_contact
| Field | Type | Notes |
|-------|------|-------|
| building_id | uuid | FK → building |
| contact_type | enum | PHONE, EMAIL, ADDRESS |
| value | text | |

### building_setup_request
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| requested_by | uuid | FK → auth.users |
| status | enum | PENDING, APPROVED, REJECTED, RETURNED_FOR_FIX |
| building_data | jsonb | Submitted building details |
| occupation_permit_document_id | uuid | FK → document |
| reviewed_by | uuid | FK → auth.users (staff) |
| review_notes | text | |
| rejection_reason_code | text | Stable identifier |

### unit
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| unit_key_v1 | text | Canonical key. UNIQUE per building. Never expose. |
| unit_number | text | Display number |
| floor | integer | |
| unit_type | enum | APARTMENT, OFFICE, SHOP, OTHER |
| status | enum | DRAFT, ACTIVE |

### unit_claim_request
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| unit_id | uuid | FK → unit |
| claimed_by | uuid | FK → auth.users |
| status | enum | PENDING, APPROVED, REJECTED, RETURNED_FOR_FIX |
| goshan_document_id | uuid | FK → document |
| match_outcome | enum | ZERO_MATCH, ONE_MATCH, MULTI_MATCH |
| reviewed_by | uuid | FK → auth.users (staff) |

### unit_membership
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| unit_id | uuid | FK → unit |
| user_id | uuid | FK → auth.users |
| role | enum | OWNER_VERIFIED, TENANT |
| status | enum | ACTIVE, INACTIVE |
| invited_by | uuid | FK → auth.users |

One OWNER_VERIFIED per unit (no co-ownership in Phase 1).

### building_role_assignment
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| user_id | uuid | FK → auth.users |
| role | enum | BM_CANDIDATE, BM_VERIFIED, GUARD, DEV_ADMIN |
| status | enum | ACTIVE, INACTIVE |
| assigned_by | uuid | FK → auth.users |

### document
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| owner_entity_type | enum | BUILDING, UNIT, USER, TICKET, CREDIT_TOPUP_REQUEST, CONTRACT, NOTICE, TASK_TEMPLATE, TASK_INSTANCE |
| owner_entity_id | uuid | Polymorphic FK |
| document_type | text | Classification |
| storage_path | text | Object storage path |
| signed_url_ttl | integer | Seconds |
| uploaded_by | uuid | FK → auth.users |
| approval_status | enum | PENDING, APPROVED, REJECTED |
| visibility | enum | PUBLIC, BUILDING_MEMBERS, UNIT_MEMBERS, PRIVATE |

---

## Finance Domain

### dues_config
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| amount | numeric | Monthly amount |
| currency | text | ISO 4217 (JOD) |
| collection_day | integer | Day of month (1-28 recommended) |
| effective_from | date | |

### dues_cycle
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| cycle_ym | text | Format: YYYY-MM |
| status | enum | OPEN, CLOSED |

### dues_obligation
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| cycle_id | uuid | FK → dues_cycle |
| unit_id | uuid | FK → unit |
| amount | numeric | |
| currency | text | JOD |
| status | enum | UNPAID, PAID, LATE |
| due_date | date | |

UNPAID → LATE at cycle boundary. UNPAID/LATE → PAID via settlement.

### ledger_entry
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| unit_id | uuid | FK → unit (nullable for building-level) |
| entry_type | enum | CREDIT_TOPUP, MANUAL_UNIT_INCOME, OPENING_BALANCE, EXPENSE, SUBSCRIPTION_FEE, AUTOSETTLEMENT_APPLIED, REVERSAL |
| amount | numeric | Positive = credit, negative = debit |
| currency | text | JOD |
| reference_id | uuid | FK to source entity |
| reference_type | text | Source entity type |
| idempotency_key | text | UNIQUE. Prevents duplicate writes. |
| request_id | uuid | Audit correlation |
| created_by | uuid | FK → auth.users |

**APPEND-ONLY.** Never UPDATE or DELETE. Corrections via REVERSAL entries only.

### credit_topup_request
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| unit_id | uuid | FK → unit |
| requested_by | uuid | FK → auth.users (owner only) |
| amount | numeric | |
| currency | text | JOD |
| evidence_document_id | uuid | FK → document (CliQ/bank screenshot) |
| status | enum | PENDING, APPROVED, REJECTED |
| reviewed_by | uuid | FK → auth.users (BM) |
| idempotency_key | text | UNIQUE |

### settlement_entry
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| obligation_id | uuid | FK → dues_obligation |
| ledger_entry_id | uuid | FK → ledger_entry |
| amount | numeric | |
| settled_at | timestamptz | |

FIFO: oldest obligation settled first. No partial settlement.

### expense
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| amount | numeric | |
| currency | text | JOD |
| description | text | |
| category | text | |
| evidence_document_id | uuid | FK → document |
| recorded_by | uuid | FK → auth.users (BM) |
| approval_status | enum | PENDING, APPROVED |

---

## Subscription Domain

### subscription_entitlement
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building. ONE per building. |
| status | enum | TRIAL, ACTIVE, INACTIVE |
| current_period_start | timestamptz | |
| current_period_end | timestamptz | |
| provider | text | stripe, hyperpay |
| provider_subscription_id | text | External ID |

### subscription_plan
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | |
| building_type | enum | RESIDENTIAL, COMMERCIAL, MIXED |
| unit_count_min | integer | |
| unit_count_max | integer | |
| price | numeric | |
| currency | text | JOD |
| billing_interval | text | monthly, yearly |

### subscription_price_quote
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| plan_id | uuid | FK → subscription_plan |
| quoted_price | numeric | Snapshot at quote time |
| inputs_snapshot | jsonb | building_type, unit_count at quote time |
| expires_at | timestamptz | Quote expiry |
| status | enum | ACTIVE, EXPIRED, CONSUMED |

### subscription_checkout_session
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| quote_id | uuid | FK → subscription_price_quote |
| provider | text | stripe, hyperpay |
| provider_session_id | text | |
| status | enum | PENDING, COMPLETED, FAILED |
| promo_redemption_id | uuid | FK → promo_redemption (nullable) |

### subscription_event
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| provider | text | |
| provider_event_id | text | UNIQUE (idempotency) |
| canonical_event_type | text | Normalized event type |
| raw_payload | jsonb | |
| processed_at | timestamptz | |
| signature_valid | boolean | |

### promo_code
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| code | text | UNIQUE |
| discount_type | enum | PERCENTAGE, FIXED |
| discount_value | numeric | |
| max_redemptions | integer | |
| current_redemptions | integer | |
| valid_from | timestamptz | |
| valid_until | timestamptz | |
| status | enum | ACTIVE, EXHAUSTED, EXPIRED |

### promo_redemption
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| promo_code_id | uuid | FK → promo_code |
| building_id | uuid | FK → building |
| status | enum | RESERVED, CONSUMED |

RESERVED on checkout start, CONSUMED on payment success. Atomic.

### reimbursement_obligation
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| checkout_session_id | uuid | FK → subscription_checkout_session |
| amount | numeric | |
| currency | text | JOD |
| settlement_method | enum | DUES_OFFSET, MANUAL |
| status | enum | PENDING, SETTLED |
| idempotency_key | text | UNIQUE |

---

## Operations Domain

### guard_invite
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| invited_by | uuid | FK → auth.users (BM) |
| phone_number | text | |
| status | enum | PENDING, ACCEPTED, EXPIRED, REVOKED |
| expires_at | timestamptz | 7-day expiry |
| token | text | Single-use invite token |

One ACTIVE guard per building.

### guard_task
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| template_id | uuid | FK → task_template (nullable) |
| assigned_to | uuid | FK → auth.users (guard) |
| title | text | |
| description | text | |
| scheduled_at | timestamptz | |
| reminder_at | timestamptz | T-15m before scheduled_at |
| status | enum | PENDING, IN_PROGRESS, COMPLETED, MISSED |
| visibility | enum | BUILDING_PUBLIC, UNIT_PRIVATE |

BUILDING_PUBLIC: all building members see details. UNIT_PRIVATE: others see "Busy/Private" only.

### ticket
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| unit_id | uuid | FK → unit (nullable) |
| reported_by | uuid | FK → auth.users |
| assigned_to | uuid | FK → auth.users (guard, nullable) |
| title | text | |
| description | text | |
| category | text | Optional |
| status | enum | NEW, IN_PROGRESS, DONE, CLOSED, CANCELLED |
| priority | enum | LOW, MEDIUM, HIGH |

Status flow: NEW → IN_PROGRESS → DONE → CLOSED. Optional CANCELLED from any state.

---

## Audit Domain

### audit_log
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| event_type | text | e.g., permit_submitted, credit_topup_approved |
| actor_user_id | uuid | FK → auth.users |
| building_id | uuid | Nullable |
| unit_id | uuid | Nullable |
| request_id | uuid | Correlation |
| payload | jsonb | Event-specific data (no PII) |
| created_at | timestamptz | |

**IMMUTABLE.** 7-year retention. Filterable by building_id, unit_id, actor_user_id, event_type, date range.

### statement_version
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| building_id | uuid | FK → building |
| cycle_ym | text | |
| version_token | text | UNIQUE |
| pdf_storage_path | text | |
| hash | text | Immutable content hash |
| generated_at | timestamptz | |
