---
name: supabase
description: Complete Supabase operations via CLI + Management API. Full replacement for 32 MCP tools with zero context overhead. Schema, migrations, auth, RLS, edge functions, SQL execution, debugging, storage, branching.
tags: [supabase, database, auth, rls, edge-functions, postgres]
---

# Supabase (CLI-First, MCP-Free)

Full `supabase` CLI + Management API access. Every MCP tool is covered.

## Project Discovery (ALWAYS DO FIRST)

```bash
# 1. Check linked project
supabase projects list              # → MCP: list_projects
supabase status                     # → MCP: get_project (shows URL, keys, DB URL)

# 2. Link if needed
supabase link --project-ref <ref>

# 3. Get full schema (ALWAYS read before modifying)
supabase db dump --schema public    # → MCP: list_tables

# 4. Generate types
supabase gen types typescript --linked > types/supabase.ts  # → MCP: generate_typescript_types
```

## Complete MCP Tool → CLI/API Map (All 32 Tools)

### Account Tools (9)
| MCP Tool | Replacement |
|----------|-------------|
| `list_projects` | `supabase projects list` |
| `get_project` | `supabase status` or `supabase projects list` |
| `create_project` | `supabase projects create <name> --org-id <id> --db-password <pw> --region <region>` |
| `pause_project` | `curl -X POST "$SUPA_API/v1/projects/$REF/pause" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"` |
| `restore_project` | `curl -X POST "$SUPA_API/v1/projects/$REF/restore" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"` |
| `list_organizations` | `supabase orgs list` |
| `get_organization` | `supabase orgs list` |
| `get_cost` | `curl "$SUPA_API/v1/organizations/$ORG/billing/costs" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"` |
| `confirm_cost` | Not needed — MCP-specific UX flow |

### Database Tools (5)
| MCP Tool | Replacement |
|----------|-------------|
| `list_tables` | `supabase db dump --schema public` or `supabase inspect db table-stats` |
| `list_extensions` | Execute SQL: `SELECT extname, extversion FROM pg_extension` |
| `list_migrations` | `supabase migration list` |
| `apply_migration` | `supabase migration new <name>` → edit SQL → `supabase db push` |
| `execute_sql` | **See "Execute SQL" section below** |

### Development Tools (3)
| MCP Tool | Replacement |
|----------|-------------|
| `get_project_url` | `supabase status` (shows API URL) |
| `get_publishable_keys` | `supabase projects api-keys` |
| `generate_typescript_types` | `supabase gen types typescript --linked` |

### Edge Functions Tools (3)
| MCP Tool | Replacement |
|----------|-------------|
| `list_edge_functions` | `supabase functions list` |
| `get_edge_function` | `supabase functions download <name>` |
| `deploy_edge_function` | `supabase functions deploy <name>` |

### Debugging Tools (2)
| MCP Tool | Replacement |
|----------|-------------|
| `get_logs` | `supabase functions logs <name> --tail` (functions) or Management API for other services |
| `get_advisors` | `supabase inspect db` (13 commands — BETTER than MCP advisors) |

### Branching Tools (6)
| MCP Tool | Replacement |
|----------|-------------|
| `create_branch` | `supabase branches create <name>` |
| `list_branches` | `supabase branches list` |
| `delete_branch` | `supabase branches delete <name>` |
| `merge_branch` | `curl -X POST "$SUPA_API/v1/branches/$BRANCH_ID/merge" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"` |
| `reset_branch` | `curl -X POST "$SUPA_API/v1/branches/$BRANCH_ID/reset" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"` |
| `rebase_branch` | `curl -X POST "$SUPA_API/v1/branches/$BRANCH_ID/rebase" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"` |

### Storage Tools (3)
| MCP Tool | Replacement |
|----------|-------------|
| `list_storage_buckets` | Execute SQL: `SELECT * FROM storage.buckets` or `supabase storage ls` |
| `get_storage_config` | `curl "$SUPA_API/v1/projects/$REF/config/storage" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"` |
| `update_storage_config` | `curl -X PATCH "$SUPA_API/v1/projects/$REF/config/storage" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -d '{...}'` |

### Knowledge Base (1)
| MCP Tool | Replacement |
|----------|-------------|
| `search_docs` | WebSearch or `WebFetch: https://supabase.com/llms/cli.txt` — see `docs-lookup` skill |

## Execute SQL (Critical — MCP's Most Used Tool)

Three methods, in order of preference:

### Method 1: Management API (recommended for remote)
```bash
# Set once per session
SUPA_API="https://api.supabase.com"
REF="your-project-ref"  # Get from `supabase status` or `supabase projects list`

# Execute any SQL
curl -s -X POST "$SUPA_API/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users LIMIT 10"}'

# Read-only query (safer)
curl -s -X POST "$SUPA_API/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users LIMIT 10", "read_only": true}'
```

### Method 2: psql (if connection string available)
```bash
# Connection string from supabase status or .env
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  -c "SELECT * FROM users LIMIT 10"
```

### Method 3: Migration (for DDL/schema changes)
```bash
supabase migration new my_change
# Edit the SQL file, then:
supabase db push
```

## Service Logs (Beyond Edge Functions)

```bash
# Edge function logs (CLI)
supabase functions logs <name> --tail

# Other service logs (API)
curl -s "$SUPA_API/v1/projects/$REF/analytics/endpoints/logs.all?iso_timestamp_start=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

## Database Inspection (13 commands — MCP had 0)

```bash
supabase inspect db table-stats          # Row counts, sizes
supabase inspect db index-stats          # Index usage
supabase inspect db cache-hit            # Buffer cache hit rates
supabase inspect db outliers             # Slowest queries
supabase inspect db blocking             # Lock contention
supabase inspect db locks                # Exclusive locks
supabase inspect db long-running-queries # Queries > 5min
supabase inspect db bloat                # Table/index bloat
supabase inspect db vacuum-stats         # Autovacuum stats
supabase inspect db calls                # Query frequency
supabase inspect db db-stats             # Database stats
supabase inspect db replication-slots    # Replication health
supabase inspect db traffic-profile      # Read/write ratios
supabase inspect report                  # Full CSV report
```

## Environment Variable

The Management API requires `SUPABASE_ACCESS_TOKEN`. Set it:
```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."  # Personal access token from supabase.com/dashboard/account/tokens
```

Shorthand used above: `SUPA_API="https://api.supabase.com"`, `REF="project-ref"`

## Key Rules

- ALWAYS enable RLS on every table
- ALWAYS write policies checking `auth.uid()`
- Never expose `service_role` key client-side
- Use `maybeSingle()` not `single()` when row might not exist
- Validate with Zod. Use PKCE auth flow for SSR/mobile.

## References

- Code templates: read `@.claude/skills/supabase/references/templates.md`
- Latest CLI docs: `WebFetch: https://supabase.com/llms/cli.txt`
- Management API: `WebFetch: https://supabase.com/docs/reference/api/introduction`

## Trigger Phrases

- "create table" / "debug RLS" / "optimize queries" / "inspect db"
- "supabase auth" / "edge function" / "deploy function" / "migration"
- "run SQL" / "query database" / "check logs" / "storage"

---

## When Things Go Wrong

### Migration Fails

**Syntax error in SQL:**
```bash
supabase db push 2>&1               # Read the exact Postgres error
# Fix the SQL file in supabase/migrations/, then retry:
supabase db push
```

**Conflicting schema (column/table already exists):**
```bash
# Check what's actually in the remote database
supabase db dump --schema public --project-ref <ref> | grep "table_or_column_name"
# If migration is stale, mark it as applied without running:
supabase migration repair <version> --status applied
```

**RLS blocks the migration (permission denied during ALTER):**
Migrations run as the `postgres` superuser, so RLS shouldn't block DDL. If you see permission errors:
```bash
# Check if the migration is trying DML (INSERT/UPDATE) on an RLS-enabled table
# Fix: Use service_role or temporarily disable RLS in the migration:
ALTER TABLE my_table DISABLE ROW LEVEL SECURITY;
-- ... do the data migration ...
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
```

### Migration Applied But Needs Rollback

Supabase has no built-in `migrate down`. The process is manual:

```bash
# 1. Create a reverse migration
supabase migration new rollback_my_change

# 2. Write the inverse SQL
#    Added a column? → ALTER TABLE x DROP COLUMN y;
#    Created a table? → DROP TABLE x;
#    Changed a type? → ALTER TABLE x ALTER COLUMN y TYPE old_type;

# 3. Push the reverse migration
supabase db push --project-ref <ref>
```

For data-destructive rollbacks (dropped column with data):
- If you have a backup: restore from Supabase dashboard → Database → Backups
- If no backup: the data is gone. This is why you test migrations on a branch first:
```bash
supabase branches create test-migration
# Test there, then merge or delete
```

### RLS Policy Silently Blocking Queries

Symptoms: Query returns empty results, no error. The data exists but RLS filters it out.

**Step 1: Confirm it's RLS (bypass with service_role):**
```bash
# This uses service_role which bypasses RLS
curl -s "https://<ref>.supabase.co/rest/v1/my_table?select=*&limit=5" \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>"
# If this returns data but your app doesn't → it's RLS
```

**Step 2: Check existing policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'my_table';
```

**Step 3: Test the policy logic:**
```sql
-- Simulate as a specific user
SET request.jwt.claim.sub = 'user-uuid-here';
SET role authenticated;
SELECT * FROM my_table;  -- Does this return the expected rows?
RESET role;
```

**Common RLS bugs:**
- Policy uses `auth.uid()` but the user isn't authenticated (anon request)
- Policy checks a column that's NULL (NULL != NULL in Postgres, use `IS NOT DISTINCT FROM`)
- Missing policy for the specific operation (e.g., SELECT policy exists but not INSERT)
- `FOR ALL` policy doesn't cover all operations — it's actually `USING` only, add `WITH CHECK` for writes

### Edge Function Deployment Fails

**Import errors (module not found in Deno):**
```bash
supabase functions deploy my-function 2>&1
# Common fix: use full URLs for Deno imports
# Wrong:  import { z } from "zod"
# Right:  import { z } from "https://deno.land/x/zod/mod.ts"
# Or use import_map.json in supabase/functions/
```

**Missing env vars in Edge Functions:**
```bash
# List secrets
supabase secrets list
# Set missing secrets
supabase secrets set MY_VAR=my_value
# Required for most functions:
supabase secrets set SUPABASE_URL=https://<ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
```

**Cold start timeout (function takes > 10s on first call):**
- Keep functions small — large bundles = slow cold starts
- Avoid heavy imports at module level (lazy-load if possible)
- Use `supabase functions serve` locally to test performance
- For critical paths: set up a cron to warm the function every 5 min

**Deployment hangs or times out:**
```bash
# Check function size
du -sh supabase/functions/my-function/
# If > 10MB, you're importing too much. Trim dependencies.
# Retry deployment:
supabase functions deploy my-function --no-verify-jwt  # If JWT verify is blocking
```

### Connection Pool Exhausted

Symptoms: `FATAL: too many connections for role "postgres"` or queries timing out intermittently.

**Diagnose:**
```bash
# Check active connections
supabase inspect db connections       # If available
# Or via SQL:
# SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
# SELECT count(*) FROM pg_stat_activity;
```

**Fix:**
1. Use the **pooler** connection string (port 6543) instead of direct (port 5432)
2. In your app: ensure you're using a single Supabase client instance, not creating one per request
3. Close idle connections:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < NOW() - INTERVAL '5 minutes';
```
4. If on a small plan: upgrade compute or reduce max connections per service

### Type Generation Fails After Migration

Symptoms: `supabase gen types typescript` returns stale types or errors.

```bash
# Force refresh (skip cache)
supabase gen types typescript --linked > types/supabase.ts

# If it still shows old schema, the migration might not be applied:
supabase migration list --project-ref <ref>

# If migration is applied but types are stale:
supabase db push --project-ref <ref>  # Ensure remote is synced
supabase gen types typescript --project-id <ref> > types/supabase.ts

# Nuclear option: regenerate from scratch
rm types/supabase.ts
supabase gen types typescript --linked > types/supabase.ts
npx tsc --noEmit  # Verify types compile
```

### Management API Timeout or 500

The Management API (`api.supabase.com`) occasionally has issues.

**Retry strategy:**
```bash
# Simple retry with backoff
for i in 1 2 3; do
  result=$(curl -s -w "%{http_code}" -o /tmp/supa-response \
    "$SUPA_API/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "SELECT 1"}')
  if [[ "$result" == "200" ]]; then cat /tmp/supa-response; break; fi
  echo "Attempt $i failed ($result), retrying..."
  sleep $((i * 5))
done
```

**Fallback to CLI:**
```bash
# If Management API is down, use CLI directly (uses different endpoints)
supabase db execute --project-ref <ref> "SELECT 1"
# Or connect via psql if you have the connection string
psql "$DATABASE_URL" -c "SELECT 1"
```

**Check Supabase status:** https://status.supabase.com

## Multi-Role RLS Policies

Sakani-style multi-role RBAC where roles are stored in separate tables (not JWT claims). This pattern supports 8 distinct roles:

**Building-scoped roles** (in `building_role_assignment` table):
- `BM_VERIFIED` — verified building manager
- `BM_CANDIDATE` — manager in review
- `GUARD` — building security guard
- `DEV_ADMIN` — staff admin (platform level)

**Unit-scoped roles** (in `unit_membership` table):
- `OWNER_VERIFIED` — verified unit owner
- `TENANT` — active tenant

All policies check `auth.uid()` and require an active role status. **Deny by default**: no permissive policies without explicit role validation.

### Unit-Scoped Read (Owner/Tenant)

Unit members can read data for their own unit:

```sql
CREATE POLICY "unit_members_read_own" ON target_table
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM unit_membership um
    WHERE um.unit_id = target_table.unit_id
    AND um.user_id = auth.uid()
    AND um.status = 'ACTIVE'
  )
);
```

### Building-Scoped Read (Building Manager)

Building managers (verified or candidate) can read all data in their assigned building:

```sql
CREATE POLICY "bm_read_building" ON target_table
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.building_id = target_table.building_id
    AND bra.user_id = auth.uid()
    AND bra.role IN ('BM_VERIFIED', 'BM_CANDIDATE')
    AND bra.status = 'ACTIVE'
  )
);
```

### Guard-Scoped Read (Assigned Guard)

Guards can read only items explicitly assigned to them, within their building:

```sql
CREATE POLICY "guard_read_assigned" ON target_table
FOR SELECT USING (
  target_table.assigned_to = auth.uid()
  AND EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.building_id = target_table.building_id
    AND bra.user_id = auth.uid()
    AND bra.role = 'GUARD'
    AND bra.status = 'ACTIVE'
  )
);
```

### Staff Admin Global Read

Platform staff admins can read all data across all buildings:

```sql
CREATE POLICY "staff_read_all" ON target_table
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.user_id = auth.uid()
    AND bra.role = 'DEV_ADMIN'
    AND bra.status = 'ACTIVE'
  )
);
```

### Write Policies

Write operations are more restrictive. Examples:

**Owners create for their own unit:**
```sql
CREATE POLICY "owner_create_own_unit" ON target_table
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM unit_membership um
    WHERE um.unit_id = target_table.unit_id
    AND um.user_id = auth.uid()
    AND um.role = 'OWNER_VERIFIED'
    AND um.status = 'ACTIVE'
  )
);
```

**Building managers create for their building:**
```sql
CREATE POLICY "bm_create_building" ON target_table
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.building_id = target_table.building_id
    AND bra.user_id = auth.uid()
    AND bra.role IN ('BM_VERIFIED', 'BM_CANDIDATE')
    AND bra.status = 'ACTIVE'
  )
);
```

**Guards update their assigned items:**
```sql
CREATE POLICY "guard_update_assigned" ON target_table
FOR UPDATE USING (
  target_table.assigned_to = auth.uid()
  AND EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.building_id = target_table.building_id
    AND bra.user_id = auth.uid()
    AND bra.role = 'GUARD'
    AND bra.status = 'ACTIVE'
  )
) WITH CHECK (
  target_table.assigned_to = auth.uid()
);
```

### Composite Multi-Role Example

A ticket table where owners create for their unit, building managers read all in building, guards read assigned, staff reads all:

```sql
-- READ: Unit members (owners/tenants)
CREATE POLICY "ticket_unit_read" ON ticket
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM unit_membership um
    WHERE um.unit_id = ticket.unit_id
    AND um.user_id = auth.uid()
    AND um.status = 'ACTIVE'
  )
);

-- READ: Building managers
CREATE POLICY "ticket_bm_read" ON ticket
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.building_id = (
      SELECT building_id FROM unit WHERE id = ticket.unit_id
    )
    AND bra.user_id = auth.uid()
    AND bra.role IN ('BM_VERIFIED', 'BM_CANDIDATE')
    AND bra.status = 'ACTIVE'
  )
);

-- READ: Assigned guards
CREATE POLICY "ticket_guard_read" ON ticket
FOR SELECT USING (
  ticket.assigned_guard = auth.uid()
  AND EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.building_id = (
      SELECT building_id FROM unit WHERE id = ticket.unit_id
    )
    AND bra.user_id = auth.uid()
    AND bra.role = 'GUARD'
    AND bra.status = 'ACTIVE'
  )
);

-- READ: Staff admin global
CREATE POLICY "ticket_staff_read" ON ticket
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.user_id = auth.uid()
    AND bra.role = 'DEV_ADMIN'
    AND bra.status = 'ACTIVE'
  )
);

-- CREATE: Unit owners only
CREATE POLICY "ticket_owner_create" ON ticket
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM unit_membership um
    WHERE um.unit_id = ticket.unit_id
    AND um.user_id = auth.uid()
    AND um.role = 'OWNER_VERIFIED'
    AND um.status = 'ACTIVE'
  )
);

-- UPDATE: Assigned guards
CREATE POLICY "ticket_guard_update" ON ticket
FOR UPDATE USING (
  ticket.assigned_guard = auth.uid()
) WITH CHECK (
  ticket.assigned_guard = auth.uid()
);
```

## Financial Table Patterns

Append-only financial ledger tables enforce immutability at the database level, preventing accidental or malicious modifications. This pattern ensures compliance and audit integrity.

### Append-Only Table Setup

Create a financial table with NO update/delete permissions:

```sql
CREATE TABLE ledger_entry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES building(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES unit(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES account(id) ON DELETE RESTRICT,

  -- Financial data
  entry_type TEXT NOT NULL CHECK (entry_type IN ('CHARGE', 'PAYMENT', 'REVERSAL', 'ADJUSTMENT')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'JOD',
  description TEXT,

  -- Idempotency
  request_id UUID NOT NULL UNIQUE,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Indexes for RLS and queries
  CONSTRAINT positive_amount CHECK (amount > 0 OR entry_type = 'REVERSAL')
);

-- Enable RLS
ALTER TABLE ledger_entry ENABLE ROW LEVEL SECURITY;

-- Add indexes for common queries
CREATE INDEX idx_ledger_building_date ON ledger_entry(building_id, created_at DESC);
CREATE INDEX idx_ledger_account_date ON ledger_entry(account_id, created_at DESC);
CREATE INDEX idx_ledger_request_id ON ledger_entry(request_id);
```

### Prevent Mutations with Trigger

A trigger enforces append-only behavior even for the `service_role`:

```sql
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entry is append-only. Use REVERSAL entries for corrections.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_append_only
BEFORE UPDATE OR DELETE ON ledger_entry
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
```

### Idempotency Key Pattern

Use `request_id` with a UNIQUE constraint to ensure duplicate requests produce the same entry:

```sql
-- Insert with idempotency key
INSERT INTO ledger_entry (
  building_id, account_id, entry_type, amount, currency,
  description, request_id, created_by
)
VALUES (
  'bldg-123', 'acct-456', 'CHARGE', 150.00, 'JOD',
  'Monthly rent', 'req-789', auth.uid()
)
ON CONFLICT (request_id) DO NOTHING
RETURNING *;
```

If the same `request_id` is submitted again, the row is silently skipped (idempotent). Check the result count to detect duplicates.

### Standard Audit Columns

All financial tables should include:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` — exact timestamp of entry creation
- `created_by UUID NOT NULL REFERENCES auth.users(id)` — who created the entry
- `request_id UUID NOT NULL UNIQUE` — external transaction ID for idempotency

### Monetary Value Conventions

- Use `NUMERIC` (not `FLOAT`) for all amounts to avoid floating-point errors:
  ```sql
  amount NUMERIC(10,2) NOT NULL
  ```
- Always store currency explicitly (default to 'JOD' for Sakani):
  ```sql
  currency TEXT NOT NULL DEFAULT 'JOD'
  ```
- Enforce positive amounts with CHECK constraints:
  ```sql
  CONSTRAINT amount_positive CHECK (amount > 0 OR entry_type IN ('REVERSAL', 'ADJUSTMENT'))
  ```

## Audit Logging

Immutable audit logs track all critical changes for compliance and forensic analysis.

### Immutable Audit Table

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES building(id) ON DELETE RESTRICT,

  -- What changed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('INSERT', 'UPDATE', 'DELETE', 'BULK_OPERATION')),

  -- Who, when
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Change details (JSON for flexibility)
  old_values JSONB,
  new_values JSONB,
  change_summary TEXT,

  -- Context
  request_id UUID,
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS (users see only their building's logs if managers)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Prevent mutations
CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- Indexes for efficient querying
CREATE INDEX idx_audit_building_date ON audit_log(building_id, created_at DESC);
CREATE INDEX idx_audit_event_date ON audit_log(event_type, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id, created_at DESC);
```

### Trigger-Based Logging

Automatically log changes to a critical table:

```sql
CREATE OR REPLACE FUNCTION log_critical_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    building_id, table_name, record_id, event_type,
    user_id, old_values, new_values, change_summary
  )
  VALUES (
    COALESCE(NEW.building_id, OLD.building_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    TO_JSONB(OLD),
    TO_JSONB(NEW),
    CASE TG_OP
      WHEN 'DELETE' THEN 'Record deleted'
      WHEN 'UPDATE' THEN 'Record updated: ' || (
        SELECT STRING_AGG(key || ' changed', ', ')
        FROM (SELECT key FROM JSONB_EACH(TO_JSONB(NEW)) n
              WHERE NOT (TO_JSONB(OLD) -> key IS DISTINCT FROM n.value)) t
      )
      WHEN 'INSERT' THEN 'Record created'
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach to any critical table
CREATE TRIGGER audit_unit_changes
AFTER INSERT OR UPDATE OR DELETE ON unit
FOR EACH ROW EXECUTE FUNCTION log_critical_changes();
```

### Retention Policy

Financial and audit logs should be retained for **7 years** per most jurisdictions:

```sql
-- Cleanup job (run via cron)
DELETE FROM audit_log
WHERE created_at < NOW() - INTERVAL '7 years'
AND building_id IN (
  SELECT id FROM building WHERE status = 'ARCHIVED'
);
```

## Multi-Tenant Migration Patterns

Schema migrations for multi-tenant databases require careful planning to maintain data integrity and RLS security.

### Enable RLS Immediately After CREATE TABLE

Never create a table without RLS:

```sql
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES building(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IMMEDIATELY enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Then define policies
CREATE POLICY "building_read" ON my_table
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.building_id = my_table.building_id
    AND bra.user_id = auth.uid()
    AND bra.status = 'ACTIVE'
  )
);
```

### Create Enum Types Before Tables

Define enums once, before any table references them:

```sql
CREATE TYPE building_role AS ENUM (
  'BM_VERIFIED', 'BM_CANDIDATE', 'GUARD', 'DEV_ADMIN'
);

CREATE TYPE membership_status AS ENUM (
  'ACTIVE', 'INACTIVE', 'SUSPENDED'
);

-- Now create tables that use these enums
CREATE TABLE building_role_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES building(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role building_role NOT NULL,
  status membership_status NOT NULL DEFAULT 'ACTIVE',
  UNIQUE(building_id, user_id, role)
);
```

### Index FK Columns Used in RLS Policies

RLS policies with subqueries require indexes on the join columns for acceptable performance:

```sql
-- Without these indexes, every RLS check is a full table scan
CREATE INDEX idx_unit_membership_unit_user ON unit_membership(unit_id, user_id);
CREATE INDEX idx_building_role_assignment_building_user ON building_role_assignment(building_id, user_id);
CREATE INDEX idx_building_role_assignment_user ON building_role_assignment(user_id);

-- If status is checked in policies, include it in composite indexes
CREATE INDEX idx_building_role_status ON building_role_assignment(building_id, user_id, status);
```

### Complete Table Migration Example

A single migration creating a table with full RLS in one go:

```sql
-- supabase/migrations/20240306_create_ticket_system.sql

-- 1. Enums
CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- 2. Table with all constraints and defaults
CREATE TABLE ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES building(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES unit(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_guard UUID REFERENCES auth.users(id),

  title TEXT NOT NULL,
  description TEXT,
  status ticket_status NOT NULL DEFAULT 'OPEN',
  priority ticket_priority NOT NULL DEFAULT 'MEDIUM',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  CONSTRAINT title_not_empty CHECK (LENGTH(title) > 0)
);

-- 3. Indexes immediately (before RLS policies)
CREATE INDEX idx_ticket_building ON ticket(building_id);
CREATE INDEX idx_ticket_unit ON ticket(unit_id);
CREATE INDEX idx_ticket_created_by ON ticket(created_by);
CREATE INDEX idx_ticket_assigned_guard ON ticket(assigned_guard);
CREATE INDEX idx_ticket_status ON ticket(status, created_at DESC);

-- 4. Enable RLS
ALTER TABLE ticket ENABLE ROW LEVEL SECURITY;

-- 5. Define policies
CREATE POLICY "ticket_read_own_unit" ON ticket
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM unit_membership um
    WHERE um.unit_id = ticket.unit_id
    AND um.user_id = auth.uid()
    AND um.status = 'ACTIVE'
  )
);

CREATE POLICY "ticket_read_building" ON ticket
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.building_id = ticket.building_id
    AND bra.user_id = auth.uid()
    AND bra.role IN ('BM_VERIFIED', 'BM_CANDIDATE')
    AND bra.status = 'ACTIVE'
  )
);

CREATE POLICY "ticket_read_assigned" ON ticket
FOR SELECT USING (
  ticket.assigned_guard = auth.uid()
  AND EXISTS (
    SELECT 1 FROM building_role_assignment bra
    WHERE bra.building_id = ticket.building_id
    AND bra.user_id = auth.uid()
    AND bra.role = 'GUARD'
    AND bra.status = 'ACTIVE'
  )
);

CREATE POLICY "ticket_create_owner" ON ticket
FOR INSERT WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM unit_membership um
    WHERE um.unit_id = ticket.unit_id
    AND um.user_id = auth.uid()
    AND um.role = 'OWNER_VERIFIED'
    AND um.status = 'ACTIVE'
  )
);

CREATE POLICY "ticket_update_guard" ON ticket
FOR UPDATE USING (
  ticket.assigned_guard = auth.uid()
) WITH CHECK (
  ticket.assigned_guard = auth.uid()
);

-- 6. Grant default permissions
GRANT SELECT, INSERT ON ticket TO authenticated;
GRANT UPDATE ON ticket TO authenticated;
```

Then push with:
```bash
supabase db push
```

---
