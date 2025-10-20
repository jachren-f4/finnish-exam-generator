# Production Database Migration Plan

**Date:** October 2025
**Scope:** Migrate from legacy exam system to new ExamGenie schema
**Data Retention:** NOT REQUIRED (data will be wiped)
**Downtime:** ~5 minutes (during final cutover)

---

## Migration Overview

This migration aligns production database with staging's modern schema:
- ❌ **Remove:** Legacy `exams`, `grading`, `answers` tables
- ✅ **Add:** New `examgenie_grading` table, language fields to `students`
- ✅ **Verify:** All foreign keys and constraints work correctly

---

## Phase 1: Pre-Migration Checks (RUN ON PRODUCTION)

```bash
# 1. Verify you have backup/snapshot capability
# 2. Check table row counts (should be small for dev/staging data)
supabase db remote exec "SELECT tablename FROM pg_tables WHERE schemaname='public';"

# 3. List all custom types
supabase db remote exec "SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public');"

# 4. Check for any other references to old tables
supabase db remote exec "
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('exams', 'grading', 'answers');
"
```

---

## Phase 2: Execute Migration (RUN ON PRODUCTION)

**⚠️ CRITICAL:** Run the migration SQL in order. If any step fails, STOP and run rollback.

### Step 1: Add New Table `examgenie_grading`
- Replaces old `grading` table
- Foreign key to new `examgenie_exams` table
- Supports attempt tracking and new grading scales

### Step 2: Add Language Fields to `students`
- `language` (varchar, default 'en')
- `language_name` (varchar, default 'English')
- Enables multi-language student profiles

### Step 3: Drop Legacy Tables
- Drop `answers` (oldest, no dependencies)
- Drop `grading` (legacy grading system)
- Drop `exams` (legacy exam storage)
- Drop `exam_status` type (custom PostgreSQL type, if unused)

---

## Phase 3: Verification (RUN AFTER MIGRATION)

Run validation queries to confirm:
1. All tables exist with correct schemas
2. Foreign key constraints are valid
3. No orphaned references remain
4. Application can connect and query

---

## Rollback Plan

If migration fails or causes issues:
1. Stop application
2. Run `02_rollback.sql` to recreate legacy tables
3. Restart application
4. Contact dev team to diagnose issue

**Estimated rollback time:** 2-3 minutes

---

## Application Testing

After successful migration:

1. **Test exam generation:**
   ```bash
   curl -X POST https://examgenie.app/api/mobile/exam-questions \
     -F "images=@test-image.jpg" \
     -F "category=core_academics" \
     -F "grade=5" \
     -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"
   ```

2. **Test grading endpoint:** Submit answers and verify grades save correctly

3. **Check logs:** Monitor for any database connection errors

4. **Query validation:** Run `04_validation_queries.sql` and verify all returns match expectations

---

## Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Pre-checks | 5 min | Verify backup exists |
| Migration execution | 2 min | Run SQL scripts |
| Verification | 3 min | Run validation queries |
| App testing | 5 min | Basic endpoint tests |
| **Total** | **~15 min** | Can be done outside peak hours |

---

## Risks & Mitigations

| Risk | Probability | Mitigation |
|------|------------|-----------|
| FK constraint violation during drop | Low | Checked dependencies upfront |
| Application can't connect after migration | Low | Validation queries verify schema |
| Data loss (old exams) | N/A | Intentional - data not needed |
| `exam_status` type still in use | Low | Checked during pre-flight |

---

## Success Criteria

✅ All 4 main tables exist:
- `examgenie_exams`
- `examgenie_questions`
- `examgenie_grading`
- `students`

✅ No legacy tables remain:
- `exams` ❌
- `grading` ❌
- `answers` ❌

✅ `students` table has 2 new columns:
- `language`
- `language_name`

✅ All foreign keys resolve without errors

✅ Application passes basic connectivity tests

---

## Files in This Migration

1. **01_migration_plan.md** ← You are here
2. **02_main_migration.sql** - Execute this first (adds new, drops old)
3. **02_rollback.sql** - Run if migration fails
4. **04_validation_queries.sql** - Run after migration to verify success
5. **05_migration_checklist.md** - Step-by-step runbook for execution

---

## Questions Before Starting?

- Do you have production DB backup/snapshot enabled?
- Is there a maintenance window planned?
- Should we test this on staging first?
