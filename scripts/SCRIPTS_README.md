# Scripts Directory

Helper scripts for ExamGenie development and operations.

## Vercel Logs

**Script:** `vercel-logs.sh`
**Purpose:** Stream real-time logs from Vercel deployments

```bash
./scripts/vercel-logs.sh production    # Production logs
./scripts/vercel-logs.sh staging       # Staging logs
```

## Database Query Scripts

Similar to the Vercel logs script, these tools allow you to query staging or production databases with environment selection.

### Latest Exams (Recommended)

**Script:** `db-latest-exams.sh`
**Purpose:** View the most recent exams with readable output

```bash
# View latest 5 exams from staging (default)
./scripts/db-latest-exams.sh staging

# View latest 10 exams from staging
./scripts/db-latest-exams.sh staging 10

# View latest 5 exams from production
./scripts/db-latest-exams.sh production 5
```

**Output Example:**
```
📊 Fetching latest 5 exams from STAGING database...

✅ Found 5 records:

1. Yleinen (Grade 7)
   ID: 58c79219-4fc2-4d30-bb0b-7902d478f4dd
   Status: READY
   Created: 2025-10-16T12:50:18.269+00:00
   Audio: ✓ Yes
   Summary: Tässä luvussa syvennymme kertolaskuihin...
```

### General Database Query

**Script:** `db-query.sh`
**Purpose:** Query any table with custom limits

```bash
# List available tables
./scripts/db-query.sh staging

# Query specific tables
./scripts/db-query.sh staging examgenie_exams 10
./scripts/db-query.sh staging examgenie_questions 20
./scripts/db-query.sh production students 50

# Query other tables
./scripts/db-query.sh staging rate_limits 10
./scripts/db-query.sh staging api_request_logs 100
```

**Output:** Full table view with all columns (wide format)

## Environment Selection

All database scripts support two environments:

- **`staging`** (default) - Uses `.env.local.staging`
- **`production`** / **`prod`** - Uses `.env.local.production`

**Default Behavior:**
- Database scripts default to **staging** (safer for exploration)
- This matches Claude Code's default environment

## Direct Tool Usage

For more advanced queries, use the underlying TypeScript tools directly:

```bash
# Query with environment override
npx tsx db-query.ts --env=.env.local.staging --table examgenie_exams --limit 5

# Query with custom sorting
npx tsx db-query.ts --table exams --order created_at --asc

# Simple readable view (always uses staging)
npx tsx db-query-simple.ts
```

## Requirements

- Node.js and npm installed
- `.env.local.staging` and/or `.env.local.production` files present
- Supabase credentials configured in environment files
- Required npm packages: `@supabase/supabase-js`, `dotenv`, `tsx`

## Security Notes

- Scripts never modify data (read-only)
- Environment files contain sensitive credentials - never commit them
- Production queries should be used cautiously
- Rate limiting applies to both environments
