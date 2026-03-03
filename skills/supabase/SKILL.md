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
