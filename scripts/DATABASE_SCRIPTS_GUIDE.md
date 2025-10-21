# Database Scripts Guide

## Overview

The database scripts allow you to query and modify Supabase databases (staging and production) from the command line using the service role key for full read/write access.

## Problem Solved

Previously, the shell scripts (`scripts/db-query.sh`, `scripts/db-latest-exams.sh`) were calling a non-existent `db-query.ts` file, which prevented any database operations from working.

**Root Cause:** The `db-query.ts` script was referenced but never created.

**Solution:** Created a comprehensive `db-query.ts` TypeScript script that supports all CRUD operations (SELECT, INSERT, UPDATE, DELETE) with proper environment management and service role key authentication.

## Key Features

- **Full CRUD Support:** SELECT, INSERT, UPDATE, DELETE, and COUNT operations
- **Multi-Environment:** Separate configurations for staging and production
- **Service Role Key:** Uses `SUPABASE_SERVICE_ROLE_KEY` for write permissions
- **Environment Isolation:** `.env.local.staging` vs `.env.local.production`
- **Error Handling:** Detailed error messages with codes, hints, and details
- **Pretty Output:** Human-readable formatting for query results
- **JSON Parameters:** Filter and data parameters use JSON for flexibility

## Available Commands

### 1. View Latest Exams (Shell Script)

```bash
./scripts/db-latest-exams.sh staging 5     # Latest 5 exams from staging
./scripts/db-latest-exams.sh production 10 # Latest 10 from production
```

### 2. Query Any Table (Shell Script)

```bash
./scripts/db-query.sh staging examgenie_exams 5        # Latest 5 exams
./scripts/db-query.sh production examgenie_questions 10 # Questions
./scripts/db-query.sh staging                          # Show available tables
```

### 3. Direct TypeScript Commands

#### SELECT Operation
```bash
npx tsx db-query.ts --env=".env.local.staging" --table=examgenie_exams --limit=5
```

#### INSERT Operation
```bash
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=insert \
  --table=students \
  --data='{"name":"Test Student","grade":5}'
```

#### UPDATE Operation
```bash
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=update \
  --table=examgenie_exams \
  --filter='{"id":"abc-123"}' \
  --data='{"status":"READY"}'
```

#### DELETE Operation
```bash
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=delete \
  --table=examgenie_exams \
  --filter='{"id":"abc-123"}'
```

#### COUNT Operation
```bash
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=count \
  --table=examgenie_exams

# With filter
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=count \
  --table=examgenie_exams \
  --filter='{"status":"READY"}'
```

## Available Tables

- `examgenie_exams` - Main exams table
- `examgenie_questions` - Question bank
- `examgenie_grading` - Grading results
- `students` - Student records
- `rate_limits` - API rate limiting data
- `api_request_logs` - Request logging
- `exam_results` - Legacy exam results
- `exams` - Legacy exams table
- `grading` - Legacy grading table

## Environment Configuration

### Staging (.env.local.staging)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://tdrtybjaeugxhtcagluy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Production (.env.local.production)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-production-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
```

## Important Security Notes

1. **Service Role Key Required:** Write operations (INSERT, UPDATE, DELETE) require the `SUPABASE_SERVICE_ROLE_KEY`
2. **Environment Separation:** Always verify you're using the correct environment file
3. **Production Safety:** Be extra careful with production database operations
4. **Key Protection:** Never commit service role keys to version control

## Common Use Cases

### 1. Check Latest Exam Status
```bash
./scripts/db-latest-exams.sh staging 1
```

### 2. Update Exam Completion Timestamp
```bash
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=update \
  --table=examgenie_exams \
  --filter='{"id":"YOUR_EXAM_ID"}' \
  --data='{"completed_at":"2025-10-17T12:00:00.000Z"}'
```

### 3. Find Exams by User
```bash
# Count user's exams
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=count \
  --table=examgenie_exams \
  --filter='{"user_id":"fc495b10-c771-4bd1-8bb4-b2c5003b9613"}'
```

### 4. Clear Test Data
```bash
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=delete \
  --table=examgenie_exams \
  --filter='{"share_id":"test123"}'
```

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY not found"
**Solution:** Ensure the environment file (`.env.local.staging` or `.env.local.production`) contains the service role key.

### Error: "table parameter is required"
**Solution:** Provide the `--table` parameter:
```bash
npx tsx db-query.ts --env=".env.local.staging" --table=examgenie_exams
```

### Error: "Invalid JSON in --data parameter"
**Solution:** Ensure JSON is properly formatted and quoted:
```bash
--data='{"key":"value"}'  # Correct
--data={key:value}        # Incorrect
```

### Row Level Security (RLS) Errors
**Symptom:** Operations work in scripts but fail in application

**Cause:** Service role key bypasses RLS, but anon key enforces it

**Solution:**
- For scripts: Use service role key (already configured)
- For application: Ensure RLS policies allow the operation

## Performance Tips

1. **Use Limits:** Always specify `--limit` for SELECT operations to avoid fetching too much data
2. **Specific Filters:** Use precise filters in UPDATE/DELETE to avoid affecting unintended rows
3. **Count Before Delete:** Use COUNT with same filter before DELETE to verify what will be removed

## Migration Support

While the `db-query.ts` script supports manual database operations, for schema migrations use:

```bash
supabase db push                              # Apply migrations
supabase migration new migration_name         # Create new migration
```

## Shell Script Wrappers

The shell scripts provide convenient wrappers:

**`scripts/db-query.sh`:**
- Handles environment selection (staging/production)
- Defaults to staging for safety
- Shows usage examples

**`scripts/db-latest-exams.sh`:**
- Quick access to recent exams
- Formatted output for readability
- Configurable limit

## Testing Write Operations

To verify write operations work:

```bash
# 1. Test UPDATE (safe - update then revert)
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=update \
  --table=examgenie_exams \
  --filter='{"id":"EXISTING_ID"}' \
  --data='{"updated_at":"2025-10-17T00:00:00.000Z"}'

# 2. Verify the change
./scripts/db-latest-exams.sh staging 1

# 3. Revert if needed (optional)
```

## Architecture

```
scripts/db-query.sh (shell wrapper)
    ↓
db-query.ts (TypeScript)
    ↓
@supabase/supabase-js (client library)
    ↓
Supabase API (PostgreSQL)
```

**Key Components:**
1. **Shell Scripts:** User-friendly wrappers with environment selection
2. **db-query.ts:** Core TypeScript implementation with CRUD operations
3. **Environment Files:** Separate configs for staging/production
4. **Service Role Key:** Grants full database access bypassing RLS

## Future Enhancements

Potential improvements for the database scripts:

1. **Backup Before Delete:** Automatic backup of records before deletion
2. **Batch Operations:** Support for bulk inserts/updates from JSON files
3. **Schema Inspection:** Commands to view table schemas and relationships
4. **Query Builder:** Interactive mode for building complex queries
5. **Result Export:** Export query results to CSV/JSON files
6. **Audit Logging:** Track who ran what queries when

## Related Documentation

- **Application DB Access:** `src/lib/utils/database-manager.ts`
- **Supabase Client:** `src/lib/supabase.ts`
- **Migration Files:** `supabase/migrations/`
- **Shell Scripts README:** `scripts/README.md`

---

**Last Updated:** October 2025
**Maintainer:** Database Team
