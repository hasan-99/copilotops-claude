---
name: financial-ledger
description: "Financial ledger and accounting patterns — append-only ledgers, idempotent financial writes, FIFO credit settlement, auto-settlement jobs, statement generation, audit trails, and monetary value handling. Use whenever implementing financial tracking, payment recording, dues/billing systems, credit management, settlement logic, or any code that touches money. This is critical for correctness — financial code has zero tolerance for bugs. Triggers on: ledger, financial, dues, billing, settlement, credit, payment recording, monetary, accounting, audit trail, statement, invoice, FIFO, idempotency."
tags: [finance, ledger, accounting, payments]
---

# Financial Ledger Patterns

This skill covers production-grade financial ledger and accounting patterns. The patterns here are specialized for property management but the core principles (append-only ledger, idempotency, FIFO settlement) are universally reusable across any fintech application.

## Core Principle: Append-Only Ledger

The ledger is **never modified after creation**. No UPDATE, no DELETE. Period.

This is the foundational principle of financial accounting. Banks use it. Accounting standards mandate it. Your ledger must too.

- **Corrections use REVERSAL entries** that negate the original, creating a clear audit trail
- **Every entry has**:
  - `timestamp` — when the entry was created
  - `actor_user_id` — who created it
  - `request_id` — idempotency key to prevent duplicates
  - `status` — PENDING, COMPLETED, FAILED (for async operations)
- **Queries construct current state** by summing entries, never by querying a "current balance" field
- **Immutability is guaranteed** by database constraints and application logic

### Why Append-Only?

1. **Audit trail is automatic** — no need to reconstruct "what happened"
2. **Regulatory compliance** — many jurisdictions require immutable financial records
3. **Bug safety** — if you accidentally record the wrong amount, you can reverse it with full visibility
4. **Debugging** — "why is the balance wrong?" becomes a simple query of ledger entries
5. **Concurrency safety** — append operations are naturally conflict-free

## Ledger Entry Types (Property Management Example)

Define entry types for your domain. This example uses property management, but adapt the types to your context:

| Type | Who Creates | Validation | Side Effects |
|------|-------------|-----------|---------------|
| `OPENING_BALANCE` | System/Admin | One per unit, only at account creation | Sets initial balance, immutable |
| `CREDIT_TOPUP` | Resident/Admin | Amount > 0, linked to payment method | Increases unit credit balance |
| `MANUAL_UNIT_INCOME` | Building Manager | Amount > 0, requires description | Income source recorded for audit |
| `EXPENSE` | Building Manager | Amount > 0, category, description | Building operating cost, splits across units |
| `SUBSCRIPTION_FEE` | System | Fixed amount, per building, monthly | Platform revenue, creates obligation |
| `AUTOSETTLEMENT_APPLIED` | Settlement job | System-generated, never manual | Links credit to obligations, triggers FIFO logic |
| `REVERSAL` | Admin (rare) | References original entry_id, same amount | Negates previous entry, visible in audit |

### Entry Validation Rules

```typescript
interface LedgerEntry {
  id: string;
  unit_id: string;
  building_id: string;
  type: 'OPENING_BALANCE' | 'CREDIT_TOPUP' | 'MANUAL_UNIT_INCOME' | 'EXPENSE' | 'SUBSCRIPTION_FEE' | 'AUTOSETTLEMENT_APPLIED' | 'REVERSAL';
  amount: number; // Integer cents in production
  currency: string; // ISO 4217 (e.g., 'JOD')
  description: string;
  actor_user_id: string;
  created_at: string; // ISO timestamp
  request_id: string; // Idempotency key (UUID v4)
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  metadata: Record<string, any>; // Type-specific details
}
```

**Validation per type:**
- `OPENING_BALANCE`: Exactly one per unit in entire history
- `CREDIT_TOPUP`: amount > 0, currency matches building
- `MANUAL_UNIT_INCOME`: amount > 0, description required, BM authorization
- `EXPENSE`: amount > 0, category in valid list, affects shared obligation pool
- `SUBSCRIPTION_FEE`: amount matches subscription plan, deterministic billing date
- `AUTOSETTLEMENT_APPLIED`: system-generated only, amount <= available credit
- `REVERSAL`: references valid entry_id, same amount and currency, created within 30 days of original

## Monetary Values

Never, ever, store money as a floating-point number. This is non-negotiable.

```typescript
interface Money {
  amount: number; // Integer cents in production (e.g., 1000 = $10.00 or 1000 fils)
  currency: string; // ISO 4217 code (e.g., 'USD', 'JOD', 'EUR')
}

// DO NOT:
const balance = 100.50; // ❌ Floating point is imprecise
const balance = 100; // ❌ Missing currency

// DO:
const balance: Money = { amount: 10050, currency: 'USD' }; // ✓ Integer cents
const balance: Money = { amount: 100, currency: 'JOD' }; // ✓ Fils (smallest unit)
```

### Money Handling Rules

1. **Store as integer cents** (or smallest currency unit)
   - 1 USD = 100 cents
   - 1 JOD = 1000 fils
   - Always use the smallest unit to avoid floating-point errors

2. **Always include currency alongside amount**
   - You cannot compare JOD with USD without exchange rates
   - Store and query together: `WHERE amount > 0 AND currency = 'JOD'`

3. **Never compare money with `===`**
   ```typescript
   // ❌ Wrong:
   if (balance === 10050) { }

   // ✓ Correct:
   function moneyEqual(a: Money, b: Money): boolean {
     return a.amount === b.amount && a.currency === b.currency;
   }
   ```

4. **Round only at display boundaries**
   - All calculations use integers (cents/fils)
   - Only format to decimals when printing or displaying to users
   - Never round mid-calculation

5. **Use Decimal library for complex calculations** (if needed)
   ```typescript
   import Decimal from 'decimal.js';

   const tax = new Decimal('100').times('0.16'); // ✓ Precise
   const cents = tax.toNumber(); // Convert to integer cents only at boundary
   ```

6. **Validate on input**
   ```typescript
   function validateMoney(m: Money): boolean {
     // amount must be integer
     if (!Number.isInteger(m.amount)) return false;
     // amount must be >= 0 for most operations
     if (m.amount < 0) return false;
     // currency must be valid ISO code
     if (!isValidCurrency(m.currency)) return false;
     return true;
   }
   ```

## Idempotency Pattern

Every financial write **must be idempotent**. This prevents double-charges, double-credits, and double-settlements.

### The Pattern

```typescript
interface CreateLedgerEntryDto {
  unitId: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  idempotencyKey: string; // UUID v4, generated by client
}

async createLedgerEntry(entry: CreateLedgerEntryDto) {
  // Step 1: Check for existing entry with same idempotency key
  const existing = await this.supabase
    .from('ledger_entry')
    .select('*')
    .eq('request_id', entry.idempotencyKey)
    .eq('unit_id', entry.unitId)
    .single();

  if (existing.data) {
    // Return the original — do not create duplicate
    return { data: existing.data, isDuplicate: true };
  }

  // Step 2: Create new entry with idempotency key stored
  const created = await this.supabase
    .from('ledger_entry')
    .insert({
      unit_id: entry.unitId,
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency,
      description: entry.description,
      request_id: entry.idempotencyKey,
      actor_user_id: this.currentUser.id,
      created_at: new Date().toISOString(),
      status: 'COMPLETED',
    })
    .select()
    .single();

  // Step 3: Return created entry
  return { data: created.data, isDuplicate: false };
}
```

### Idempotency Key Rules

- **Client generates it** (UUID v4)
- **Server stores it** as `request_id` with UNIQUE constraint
- **Duplicate request** → return original result (HTTP 200, not 409)
- **Retry-safe** — network timeout? Retry safely without side effects
- **Long retention** — keep for at least 24 hours (longer for critical operations like settlements)

### Client Usage

```typescript
async function topupCredit(unitId: string, amount: number, currency: string) {
  const idempotencyKey = uuidv4(); // Generate once, reuse on retry

  try {
    const response = await api.post('/ledger/create', {
      unitId,
      type: 'CREDIT_TOPUP',
      amount,
      currency,
      idempotencyKey,
    }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data;
  } catch (error) {
    if (isNetworkError(error)) {
      // Safe to retry with same idempotencyKey
      return topupCredit(unitId, amount, currency);
    }
    throw error;
  }
}
```

## FIFO Credit Settlement

When a unit has available credit and unpaid obligations, apply credit using **First-In-First-Out (FIFO)** logic.

### The Algorithm

```typescript
async settleObligations(
  unitId: string,
  availableCredit: number,
  currency: string
): Promise<Settlement[]> {
  // Step 1: Get unpaid obligations, sorted by due date (oldest first)
  const obligations = await this.supabase
    .from('dues_obligation')
    .select('*')
    .eq('unit_id', unitId)
    .eq('status', 'UNPAID')
    .order('due_date', { ascending: true });

  let remainingCredit = availableCredit;
  const settlements: Settlement[] = [];

  // Step 2: For each obligation (oldest first), apply credit
  for (const obligation of obligations.data) {
    // All-or-nothing: settle fully or skip entirely
    if (remainingCredit >= obligation.amount) {
      remainingCredit -= obligation.amount;
      settlements.push({
        obligationId: obligation.id,
        amount: obligation.amount,
        currency,
        settledAt: new Date().toISOString(),
      });
    }
    // If credit < obligation amount, skip (no partial settlement)
  }

  // Step 3: Execute all settlements atomically (single transaction)
  return await this.executeSettlements(unitId, settlements);
}

async executeSettlements(
  unitId: string,
  settlements: Settlement[]
): Promise<Settlement[]> {
  // Wrap in transaction to ensure atomicity
  const { data, error } = await this.supabase.rpc('settle_obligations', {
    unit_id: unitId,
    settlements_json: JSON.stringify(settlements),
  });

  if (error) throw error;

  // Create ledger entries for each settlement
  for (const settlement of settlements) {
    await this.createLedgerEntry({
      unitId,
      type: 'AUTOSETTLEMENT_APPLIED',
      amount: settlement.amount,
      currency: settlement.currency,
      description: `Settled obligation ${settlement.obligationId}`,
      idempotencyKey: `settlement-${settlement.obligationId}-${new Date().toISOString()}`,
    });
  }

  return settlements;
}
```

### FIFO Rules

1. **Sort by due_date ASC** — oldest obligations first
2. **All-or-nothing** — settle obligation fully or not at all
3. **No partial settlement** — if credit < obligation amount, skip that obligation entirely
4. **Atomic execution** — all settlements succeed or all fail (no partial state)
5. **One pass** — process each obligation once per settlement run

### Why FIFO?

- **Fair** — obligations are settled in order they became due
- **Predictable** — behavior is deterministic and auditable
- **Legal** — matches accounting standards (payment application rules)
- **Simple** — no complex allocation logic

## Auto-Settlement Job

Run settlement logic automatically on a schedule.

### Job Specification

```typescript
interface SettlementJob {
  jobId: string;
  scheduledAt: string; // ISO timestamp
  completedAt?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  buildingId: string;
  unitsProcessed: number;
  settlementsApplied: number;
  errors: Array<{ unitId: string; error: string }>;
  idempotencyKey: string; // Prevent duplicate runs
}
```

### Implementation Pattern

```typescript
async function runAutoSettlementJob(jobIdempotencyKey: string) {
  // Check if job already ran (idempotency)
  const existing = await db.settlementJob.findUnique({
    where: { idempotencyKey: jobIdempotencyKey },
  });
  if (existing) return existing;

  // Create job record
  const job = await db.settlementJob.create({
    data: {
      idempotencyKey: jobIdempotencyKey,
      status: 'RUNNING',
      scheduledAt: new Date(),
      unitsProcessed: 0,
      settlementsApplied: 0,
      errors: [],
    },
  });

  // Get all buildings with active subscription
  const buildings = await db.building.findMany({
    where: { subscriptionStatus: 'ACTIVE' },
  });

  let settled = 0;
  const errors = [];

  for (const building of buildings) {
    try {
      // Get all units in building with available credit
      const units = await db.unit.findMany({
        where: { buildingId: building.id },
        include: { creditBalance: true },
      });

      for (const unit of units) {
        const credit = unit.creditBalance.amount;
        if (credit > 0) {
          const settlements = await settleObligations(
            unit.id,
            credit,
            building.currency
          );
          settled += settlements.length;
        }
      }
    } catch (error) {
      errors.push({
        buildingId: building.id,
        error: error.message,
      });
    }
  }

  // Update job record
  return await db.settlementJob.update({
    where: { id: job.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      unitsProcessed: buildings.length,
      settlementsApplied: settled,
      errors,
    },
  });
}
```

### Schedule Configuration

- **Frequency**: Daily
- **Time**: 07:00 Asia/Amman (UTC+3)
- **Idempotency**: Use date as key (`settlement-${YYYY-MM-DD}`) to prevent duplicate runs
- **Observability**: Log every settlement, track job status, alert on failures
- **Timeout**: 5 minutes max (prevent long-running processes)

### Cron Expression

```
0 7 * * * # Daily at 07:00 (UTC+3)
```

### Implementation (Supabase Edge Function)

```typescript
// Run as Supabase scheduled function
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';

serve(async (req) => {
  const today = new Date().toISOString().split('T')[0];
  const idempotencyKey = `settlement-${today}`;

  try {
    const result = await runAutoSettlementJob(idempotencyKey);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error('Settlement job failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

## Late Payment Tracking

Track when obligations become late.

### Status Transitions

- **UNPAID** → **LATE**: Transition occurs at **cycle boundary** (when new dues cycle starts)
- **LATE** → **SETTLED**: When credit is applied via FIFO settlement
- **UNPAID** → **SETTLED**: Direct settlement (no LATE status)

### Cycle Boundary Logic

```typescript
async function markLateObligations() {
  // Get the current billing cycle
  const cycle = await db.billingCycle.findFirst({
    where: { status: 'ACTIVE' },
  });

  // Mark obligations from previous cycles as LATE
  await db.obligation.updateMany({
    where: {
      dueCycleId: { not: cycle.id },
      status: 'UNPAID',
    },
    data: { status: 'LATE' },
  });
}
```

### Batch Job Schedule

- Runs at cycle boundary (e.g., 1st of each month at 01:00)
- Idempotent: safe to re-run
- Creates audit log entries for each status change

### Queries

```typescript
// Get unpaid obligations (includes LATE)
const unpaid = await db.obligation.findMany({
  where: { status: { in: ['UNPAID', 'LATE'] } },
});

// Get only LATE obligations
const late = await db.obligation.findMany({
  where: { status: 'LATE' },
});
```

## Statement Generation

Generate monthly financial statements per building.

### Statement Structure

```typescript
interface BuildingStatement {
  statementId: string;
  buildingId: string;
  month: string; // YYYY-MM
  generatedAt: string;
  version: number;
  versionToken: string; // For cache invalidation

  // Summary
  openingBalance: Money;
  closingBalance: Money;
  totalIncome: Money;
  totalExpenses: Money;

  // Details
  ledgerEntries: LedgerEntry[];
  settlementDetails: Settlement[];
  outstandingObligations: Obligation[];

  // Audit
  hash: string; // SHA-256 of statement content
  signedAt?: string;
}
```

### Generation Process

```typescript
async function generateStatement(
  buildingId: string,
  month: string // 'YYYY-MM'
): Promise<BuildingStatement> {
  // Check cache first
  const cached = await cache.get(`statement-${buildingId}-${month}`);
  if (cached) return cached;

  // Fetch ledger entries for the month
  const [startDate, endDate] = getMonthRange(month);
  const ledgerEntries = await db.ledgerEntry.findMany({
    where: {
      buildingId,
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Calculate opening balance (end of previous month)
  const openingBalance = await getClosingBalance(
    buildingId,
    new Date(startDate.getTime() - 1000)
  );

  // Calculate closing balance (end of current month)
  const closingBalance = await getClosingBalance(buildingId, endDate);

  // Build statement
  const statement: BuildingStatement = {
    statementId: uuidv4(),
    buildingId,
    month,
    generatedAt: new Date().toISOString(),
    version: 1,
    versionToken: uuidv4(),
    openingBalance,
    closingBalance,
    totalIncome: sumByType(ledgerEntries, ['CREDIT_TOPUP', 'MANUAL_UNIT_INCOME']),
    totalExpenses: sumByType(ledgerEntries, ['EXPENSE', 'SUBSCRIPTION_FEE']),
    ledgerEntries,
    settlementDetails: await getSettlementsForPeriod(buildingId, startDate, endDate),
    outstandingObligations: await getOutstandingAt(buildingId, endDate),
    hash: hashStatement(statement),
  };

  // Cache for 7 days
  await cache.set(`statement-${buildingId}-${month}`, statement, 7 * 24 * 60 * 60);

  return statement;
}
```

### Versioning

```typescript
interface StatementVersion {
  statementId: string;
  version: number;
  versionToken: string; // UUID for cache busting
  hash: string; // Immutability check
  createdAt: string;
  pdfUrl?: string; // Pre-generated PDF
}

// Generate new version if content changes
async function getOrGenerateStatementPDF(
  buildingId: string,
  month: string
): Promise<{ url: string; version: number }> {
  const statement = await generateStatement(buildingId, month);

  // Check if PDF already generated for this version
  let pdfVersion = await db.statementPdf.findFirst({
    where: {
      statementId: statement.statementId,
      version: statement.version,
    },
  });

  if (!pdfVersion) {
    // Generate PDF (background job)
    const pdfUrl = await generateStatementPDF(statement);
    pdfVersion = await db.statementPdf.create({
      data: {
        statementId: statement.statementId,
        version: statement.version,
        versionToken: statement.versionToken,
        pdfUrl,
      },
    });
  }

  return { url: pdfVersion.pdfUrl, version: pdfVersion.version };
}
```

## Audit Trail

Maintain an immutable audit log of all financial operations.

### Audit Log Schema

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  eventType: string; // LEDGER_CREATED, SETTLEMENT_APPLIED, STATEMENT_GENERATED, etc.
  actorUserId: string;
  buildingId: string;
  unitId?: string;
  requestId: string; // Idempotency key

  // Sanitized payload (no PII)
  payload: {
    ledgerEntryId?: string;
    entryType?: string;
    amount?: number;
    currency?: string;
    settlementId?: string;
    obligationIds?: string[];
    // No personal documents, IDs, or sensitive data
  };

  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}
```

### Recording

```typescript
async function auditLog(entry: AuditLogEntry) {
  // Always append, never modify
  await db.auditLog.create({ data: entry });

  // For critical events, also log to external system (e.g., Sentry, CloudWatch)
  if (['SETTLEMENT_APPLIED', 'REVERSAL_CREATED'].includes(entry.eventType)) {
    logger.critical('Financial operation', entry);
  }
}
```

### Retention

- **Minimum**: 7 years (regulatory requirement in many jurisdictions)
- **Immutable**: No DELETE or UPDATE
- **Queryable**: Indexed by building, unit, actor, event_type, timestamp
- **PII-free**: No document content, national IDs, or sensitive personal data

### Queries

```typescript
// Find all operations by a user in a time range
const userActions = await db.auditLog.findMany({
  where: {
    actorUserId,
    timestamp: { gte: startDate, lte: endDate },
  },
  orderBy: { timestamp: 'desc' },
});

// Find all settlements in a building
const settlements = await db.auditLog.findMany({
  where: {
    buildingId,
    eventType: 'SETTLEMENT_APPLIED',
  },
});

// Compliance: Get all audit logs for a 7-year period
const complianceData = await db.auditLog.findMany({
  where: {
    timestamp: { gte: sevenYearsAgo },
  },
});
```

## Testing Financial Logic

Financial code has zero tolerance for bugs. Testing is mandatory, not optional.

### Unit Tests

```typescript
describe('FIFO Settlement', () => {
  it('settles oldest obligation first', async () => {
    // Arrange
    const unit = await createTestUnit();
    const oldObligation = await createObligation(unit.id, 100, daysAgo(30));
    const newObligation = await createObligation(unit.id, 50, daysAgo(1));
    const credit = 100;

    // Act
    const settlements = await settleObligations(unit.id, credit, 'JOD');

    // Assert
    expect(settlements).toHaveLength(1);
    expect(settlements[0].obligationId).toBe(oldObligation.id);
    expect(settlements[0].amount).toBe(100);
  });

  it('skips if credit is insufficient for full settlement', async () => {
    const unit = await createTestUnit();
    const obligation = await createObligation(unit.id, 100, daysAgo(30));
    const credit = 50; // Less than obligation

    const settlements = await settleObligations(unit.id, credit, 'JOD');

    expect(settlements).toHaveLength(0); // No partial settlement
  });

  it('settles multiple obligations atomically', async () => {
    const unit = await createTestUnit();
    await createObligation(unit.id, 50, daysAgo(30));
    await createObligation(unit.id, 50, daysAgo(15));
    const credit = 100;

    const settlements = await settleObligations(unit.id, credit, 'JOD');

    expect(settlements).toHaveLength(2);
    expect(settlements[0].amount).toBe(50);
    expect(settlements[1].amount).toBe(50);
  });
});

describe('Idempotency', () => {
  it('returns same result on duplicate request', async () => {
    const key = uuidv4();

    const first = await createLedgerEntry({
      unitId: 'unit-1',
      type: 'CREDIT_TOPUP',
      amount: 1000,
      currency: 'JOD',
      idempotencyKey: key,
    });

    const duplicate = await createLedgerEntry({
      unitId: 'unit-1',
      type: 'CREDIT_TOPUP',
      amount: 1000,
      currency: 'JOD',
      idempotencyKey: key,
    });

    expect(duplicate.id).toBe(first.id);
    expect(duplicate.createdAt).toBe(first.createdAt);
  });
});

describe('Money Handling', () => {
  it('compares money correctly', () => {
    const a = { amount: 10050, currency: 'USD' };
    const b = { amount: 10050, currency: 'USD' };

    expect(moneyEqual(a, b)).toBe(true);
  });

  it('rejects different currencies', () => {
    const a = { amount: 10050, currency: 'USD' };
    const b = { amount: 10050, currency: 'JOD' };

    expect(moneyEqual(a, b)).toBe(false);
  });
});

describe('Reversal', () => {
  it('negates original entry', async () => {
    const original = await createLedgerEntry({
      unitId: 'unit-1',
      type: 'CREDIT_TOPUP',
      amount: 1000,
      currency: 'JOD',
      idempotencyKey: uuidv4(),
    });

    const reversal = await createReversal(original.id);

    const balance = await getUnitBalance('unit-1');
    expect(balance).toBe(0);
  });
});
```

### Integration Tests

```typescript
describe('Auto-Settlement Job', () => {
  it('settles all units with available credit', async () => {
    const building = await createTestBuilding();
    const [unit1, unit2] = await createTestUnits(building.id, 2);

    // Unit 1: has credit and obligations
    await createLedgerEntry({
      unitId: unit1.id,
      type: 'CREDIT_TOPUP',
      amount: 200,
      currency: 'JOD',
      idempotencyKey: uuidv4(),
    });
    await createObligation(unit1.id, 100, daysAgo(30));

    // Unit 2: no credit
    await createObligation(unit2.id, 100, daysAgo(30));

    const result = await runAutoSettlementJob(`settlement-${today()}`);

    expect(result.status).toBe('COMPLETED');
    expect(result.settlementsApplied).toBe(1);
  });
});
```

### Test Data Cleanup

```typescript
afterEach(async () => {
  // Clean up in reverse order of creation (foreign keys)
  await db.settlement.deleteMany({ where: { unitId: testUnitId } });
  await db.obligation.deleteMany({ where: { unitId: testUnitId } });
  await db.ledgerEntry.deleteMany({ where: { unitId: testUnitId } });
  await db.unit.delete({ where: { id: testUnitId } });
});
```

## Common Mistakes (and How to Avoid Them)

### ❌ Mistake 1: UPDATE on Ledger Entries

```typescript
// WRONG:
await db.ledgerEntry.update({
  where: { id: 'entry-123' },
  data: { amount: 1050 }, // Oops, typo fixed
});
```

**Why it's wrong**: Destroys audit trail, hides the original error, violates accounting standards.

**Solution**: Create a REVERSAL entry.

```typescript
// RIGHT:
await createLedgerEntry({
  unitId: entry.unitId,
  type: 'REVERSAL',
  amount: entry.amount,
  currency: entry.currency,
  description: `Reversal of entry ${entry.id} (typo)`,
  metadata: { reversalOf: entry.id },
  idempotencyKey: uuidv4(),
});

// Then create the correct entry:
await createLedgerEntry({
  unitId: entry.unitId,
  type: entry.type,
  amount: 1050, // Corrected
  currency: entry.currency,
  description: `Corrected amount for ${entry.description}`,
  idempotencyKey: uuidv4(),
});
```

### ❌ Mistake 2: Missing Idempotency Key

```typescript
// WRONG:
async function topupCredit(unitId: string, amount: number) {
  // No idempotency key! Network retry = double charge
  return await db.ledgerEntry.create({
    unitId,
    type: 'CREDIT_TOPUP',
    amount,
  });
}
```

**Solution**: Always generate and store idempotency key.

```typescript
// RIGHT:
async function topupCredit(
  unitId: string,
  amount: number,
  idempotencyKey: string // Required parameter
) {
  const existing = await db.ledgerEntry.findFirst({
    where: { requestId: idempotencyKey },
  });
  if (existing) return existing;

  return await db.ledgerEntry.create({
    unitId,
    type: 'CREDIT_TOPUP',
    amount,
    requestId: idempotencyKey,
  });
}
```

### ❌ Mistake 3: Partial Settlement

```typescript
// WRONG:
let remaining = availableCredit;
for (const obligation of obligations) {
  const settled = Math.min(remaining, obligation.amount);
  settlements.push(settled); // Partial settlement!
  remaining -= settled;
}
```

**Why it's wrong**: FIFO rule is all-or-nothing. Partial settlement breaks the principle and creates confusion.

**Solution**: Skip if not enough.

```typescript
// RIGHT:
for (const obligation of obligations) {
  if (remainingCredit >= obligation.amount) {
    settlements.push(obligation.amount);
    remainingCredit -= obligation.amount;
  }
  // If not enough, skip entirely
}
```

### ❌ Mistake 4: Storing Amount Without Currency

```typescript
// WRONG:
const balance = 10050;
const newBalance = balance + 500;
// Is this JOD? USD? What's the unit?
```

**Solution**: Always pair amount with currency.

```typescript
// RIGHT:
const balance: Money = { amount: 10050, currency: 'JOD' };
const addition: Money = { amount: 500, currency: 'JOD' };
const newBalance = addMoney(balance, addition);

function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add ${a.currency} and ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}
```

### ❌ Mistake 5: Using JavaScript Floating Point

```typescript
// WRONG:
const amount = 10.05; // JavaScript floating point ❌
const result = amount + 0.01; // Might be 10.060000000000001
if (result === 10.06) { } // Fails due to precision
```

**Solution**: Use integer cents/fils.

```typescript
// RIGHT:
const amount = 1005; // 10.05 JOD in fils
const result = amount + 1; // Always precise
if (result === 1006) { } // ✓ Works
```

### ❌ Mistake 6: Missing Transaction Wrapping

```typescript
// WRONG:
const settlements = [];
for (const obligation of obligations) {
  // If this fails halfway through, some are settled, some aren't
  await settleObligation(obligation);
  settlements.push(obligation);
}
```

**Solution**: Wrap in a transaction.

```typescript
// RIGHT:
await db.$transaction(async (tx) => {
  for (const obligation of obligations) {
    await tx.settlement.create({
      obligationId: obligation.id,
      settledAt: new Date(),
    });
  }
  // All succeed or all fail
});
```

---

## Summary

Financial code is special. It requires:

1. **Append-only ledgers** — immutability, full audit trail
2. **Idempotent writes** — prevent duplicates and double-charges
3. **Integer money** — never floating point
4. **FIFO settlement** — deterministic, fair, auditable
5. **Comprehensive testing** — edge cases, idempotency, reversals
6. **Immutable audit logs** — 7+ year retention
7. **Transactions** — atomic multi-step operations

Every principle here comes from real banking failures. Follow them rigorously.
