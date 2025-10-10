# Database Migration Instructions

## Create `api_request_logs` Table

The request logging functionality requires a database table. The migration SQL is ready at:
```
supabase/migrations/20251008_create_api_request_logs.sql
```

## How to Run the Migration

### Option 1: Supabase Dashboard (Easiest - Recommended)

1. **Go to SQL Editor**:
   - Navigate to: https://app.supabase.com/project/YOUR_PROJECT/sql
   - Or: Supabase Dashboard → SQL Editor

2. **Create New Query**:
   - Click "+ New query"

3. **Copy Migration SQL**:
   - Open: `supabase/migrations/20251008_create_api_request_logs.sql`
   - Copy all contents (88 lines)

4. **Paste and Run**:
   - Paste into SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

5. **Verify**:
   - Check "Table Editor" for new `api_request_logs` table
   - Should see table with proper indexes and RLS policies

### Option 2: Supabase CLI

If you prefer command-line tools:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migration
supabase db push
```

### Option 3: Direct PostgreSQL Access

If you have direct database connection string:

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f supabase/migrations/20251008_create_api_request_logs.sql
```

## What the Migration Creates

1. **Table**: `api_request_logs`
   - Tracks all API requests with metadata
   - Stores: user_id, endpoint, IP, JWT status, rate limits, processing time

2. **Indexes** (for query performance):
   - `idx_api_logs_user_id`
   - `idx_api_logs_created_at`
   - `idx_api_logs_endpoint`
   - `idx_api_logs_has_jwt`
   - `idx_api_logs_response_status`
   - `idx_api_logs_rate_limit_status`
   - `idx_api_logs_user_endpoint_date` (composite)

3. **Row Level Security (RLS)**:
   - Enabled on table
   - Only service role can SELECT logs
   - Anyone can INSERT logs (for logging from API)

4. **Cleanup Function**:
   - `delete_old_api_logs()` - Deletes logs older than 30 days
   - Can be scheduled with pg_cron if available

## After Migration

Once the table is created:

1. **Test request logging**:
   ```bash
   curl -X POST http://localhost:3000/api/mobile/exam-questions \
     -F "images=@assets/images/physics_hires/fyssa2_hires.jpg" \
     -F "user_id=550e8400-e29b-41d4-a716-446655440000" \
     -F "category=core_academics" \
     -F "grade=9"
   ```

2. **Check logs in Supabase**:
   - Go to Table Editor → `api_request_logs`
   - Should see logged requests

3. **Query logs programmatically**:
   ```typescript
   import { getRequestLogger } from '@/lib/services/request-logger'

   const logger = getRequestLogger()
   const stats = await logger.getJwtAdoptionStats(7) // Last 7 days
   ```

## Troubleshooting

### Error: "relation already exists"
- Table already created - safe to ignore
- Run: `DROP TABLE IF EXISTS api_request_logs CASCADE;` first if you want to recreate

### Error: "permission denied"
- Use service role key, not anon key
- Check: `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

### Error: "function auth.jwt() does not exist"
- RLS policy needs Supabase auth extension
- Should be enabled by default - contact Supabase support if missing

## Need Help?

Check:
- Supabase docs: https://supabase.com/docs/guides/database/migrations
- Migration file: `supabase/migrations/20251008_create_api_request_logs.sql`
- Request logger: `src/lib/services/request-logger.ts`
