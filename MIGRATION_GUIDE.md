# Database Migration Guide

## Key Concepts Migration (20251021000000)

### Status
⚠️ **Action Required:** Manual migration needed

### Migration File
`/supabase/migrations/20251021000000_add_key_concepts.sql`

### How to Apply

#### Option 1: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of `/supabase/migrations/20251021000000_add_key_concepts.sql`
6. Paste into the SQL editor
7. Click **Run** (or Cmd/Ctrl + Enter)
8. Verify success message

#### Option 2: Supabase CLI (If Installed)
```bash
# Install CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

#### Option 3: Direct psql (Advanced)
If you have the PostgreSQL connection string:
```bash
psql "postgresql://..." < supabase/migrations/20251021000000_add_key_concepts.sql
```

### Verification

After running the migration, verify it worked:

```sql
-- Check columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'examgenie_exams'
  AND column_name IN ('key_concepts', 'gamification');

-- Should return:
-- key_concepts  | jsonb
-- gamification  | jsonb
```

### What This Migration Does

1. **Adds `key_concepts` column** (JSONB)
   - Stores array of learning concepts (imageCount × 3)
   - Structure: `[{ concept_name, definition, difficulty, category, related_question_ids, badge_title, mini_game_hint }]`
   - GIN index for fast queries

2. **Adds `gamification` column** (JSONB)
   - Stores completion rewards and boss questions
   - Structure: `{ completion_message, boss_question_open, boss_question_multiple_choice, reward_text }`
   - GIN index for fast queries

### Rollback (If Needed)

If you need to undo this migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_examgenie_exams_key_concepts;
DROP INDEX IF EXISTS idx_examgenie_exams_gamification;

-- Remove columns
ALTER TABLE examgenie_exams DROP COLUMN IF EXISTS key_concepts;
ALTER TABLE examgenie_exams DROP COLUMN IF EXISTS gamification;
```

### Notes

- ✅ Migration is idempotent (uses `IF NOT EXISTS` / `IF EXISTS`)
- ✅ Safe to run multiple times
- ✅ Existing exams will have `NULL` for these columns (backward compatible)
- ✅ New exams will populate these columns automatically
- ⚠️ Code changes are already deployed and will start using these columns once migration runs

### Testing

After migration, test with a new exam:

```bash
# Generate a test exam (physics)
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5"

# Query the exam to verify key_concepts
# Use db-query.ts or Supabase dashboard to check the exam record
```

### Timeline

- **Phase 1 Code Changes:** ✅ Complete (config.ts, math-exam-service.ts, mobile-api-service.ts)
- **Phase 2 Migration:** ⚠️ Waiting for manual execution
- **Phase 3 API Routes:** 🔄 In Progress
- **Phase 4 Frontend:** ⏳ Pending

---

**Related Files:**
- `/KEY_CONCEPTS_INTEGRATION_PLAN.md` - Overall project plan
- `/PHASE_1_IMPLEMENTATION_SUMMARY.md` - Phase 1 completion details
- `/supabase/migrations/20251021000000_add_key_concepts.sql` - Migration SQL
