# Migration Execution Checklist

**Date:** October 2025
**Environment:** Production
**Executor:** [Your name]
**Status:** [ ] NOT STARTED | [ ] IN PROGRESS | [ ] COMPLETED | [ ] ROLLED BACK

---

## PRE-FLIGHT CHECKLIST (⏰ ~5 min)

Before starting, verify these conditions:

- [ ] **Backup Verified**
  - Supabase backup is enabled and recent
  - Can restore from snapshot if needed
  - Document backup timestamp: __________________

- [ ] **Maintenance Window Scheduled**
  - Time block reserved: __________________
  - Duration needed: ~15 minutes
  - Notified stakeholders: ☐ Yes ☐ No

- [ ] **Production Access Confirmed**
  - Can connect to production database: `supabase db remote exec`
  - Have `SUPABASE_PROJECT_ID` from env vars
  - Have database credentials/API keys

- [ ] **Migration Files Ready**
  - [ ] `02_main_migration.sql`
  - [ ] `02_rollback.sql`
  - [ ] `04_validation_queries.sql`
  - All files are in `/supabase/staging_to_prod/`

- [ ] **Rollback Plan Ready**
  - [ ] Rollback SQL verified to work on test environment
  - [ ] Team knows rollback procedure
  - [ ] Estimated rollback time: ~3 minutes

---

## EXECUTION CHECKLIST (⏰ ~2 min per step)

### STEP 1: Pre-Migration Database State Check

**Purpose:** Verify database state before any changes

```bash
# Check which tables currently exist
supabase db remote exec --file /supabase/staging_to_prod/04_validation_queries.sql > before_migration.txt

# You should see:
# ✅ examgenie_exams (required)
# ✅ exams (legacy - WILL BE DROPPED)
# ✅ grading (legacy - WILL BE DROPPED)
# ✅ answers (legacy - WILL BE DROPPED)
```

**Verification:**
- [ ] `exams` table exists
- [ ] `grading` table exists
- [ ] `answers` table exists
- [ ] `examgenie_exams` table exists
- [ ] `examgenie_grading` table does NOT exist yet
- [ ] No errors in output

**If verification failed:**
- [ ] STOP - do not proceed
- [ ] Investigate why tables don't match expected state
- [ ] Contact dev team

---

### STEP 2: Run Main Migration

**Purpose:** Execute the schema changes

```bash
# Run migration script
supabase db remote exec --file /supabase/staging_to_prod/02_main_migration.sql
```

**Expected output:**
```
BEGIN
NOTICE:  Created table: examgenie_grading
NOTICE:  Added language columns to students table
NOTICE:  Dropped table: answers
NOTICE:  Dropped table: grading
NOTICE:  Dropped table: exams
NOTICE:  Dropped type: exam_status
COMMIT
```

**Verification:**
- [ ] Script completed without errors
- [ ] All NOTICE messages appeared
- [ ] No ERROR messages
- [ ] "COMMIT" appears at end (transaction successful)

**If migration failed:**
- [ ] [ ] STOP immediately
- [ ] Run Step 3b: Execute Rollback
- [ ] Investigate error message
- [ ] Contact dev team

---

### STEP 3: Post-Migration Validation

**Purpose:** Verify migration completed successfully

```bash
# Run validation queries
supabase db remote exec --file /supabase/staging_to_prod/04_validation_queries.sql > after_migration.txt
```

**Checklist - Tables Section:**
- [ ] `examgenie_exams` exists ✅
- [ ] `examgenie_questions` exists ✅
- [ ] `examgenie_grading` exists ✅ (NEW)
- [ ] `students` exists ✅
- [ ] `exams` does NOT exist ❌
- [ ] `grading` does NOT exist ❌
- [ ] `answers` does NOT exist ❌

**Checklist - examgenie_grading Columns:**
- [ ] `grading_id` (uuid)
- [ ] `exam_id` (uuid) - FK to examgenie_exams
- [ ] `grade_scale` (text, default '4-10')
- [ ] `grading_json` (jsonb)
- [ ] `final_grade` (text)
- [ ] `attempt_number` (integer, default 1)

**Checklist - students Columns:**
- [ ] `language` (varchar, default 'en')
- [ ] `language_name` (varchar, default 'English')

**Checklist - Foreign Keys:**
- [ ] `examgenie_exams` → `auth.users(id)` ✅
- [ ] `examgenie_questions` → `examgenie_exams(id)` ✅
- [ ] `examgenie_grading` → `examgenie_exams(id)` ✅
- [ ] `students` → `auth.users(id)` ✅
- [ ] No FKs reference `exams`, `grading`, or `answers` ✅

**Checklist - Type Cleanup:**
- [ ] `exam_status` type does NOT exist ❌

**If any validation failed:**
- [ ] Go to Step 3b: Execute Rollback
- [ ] Investigate failure
- [ ] Do not proceed to testing

---

### STEP 3b: ROLLBACK (Only if validation failed)

**Purpose:** Restore to pre-migration state

```bash
# Run rollback
supabase db remote exec --file /supabase/staging_to_prod/02_rollback.sql
```

**Expected output:**
```
BEGIN
NOTICE:  Created type: exam_status
NOTICE:  Restored table: exams
NOTICE:  Restored table: grading
NOTICE:  Restored table: answers
NOTICE:  Dropped table: examgenie_grading
NOTICE:  Removed language columns from students table
COMMIT
```

**Verification:**
- [ ] Script completed without errors
- [ ] All legacy tables recreated
- [ ] New table dropped
- [ ] Language columns removed

**Next:**
- [ ] Investigate root cause of failure
- [ ] Contact dev team before retrying migration

---

## POST-MIGRATION TESTING (⏰ ~5 min)

### STEP 4: Application Connectivity Test

**Purpose:** Verify app can still connect and query database

```bash
# Test endpoint from staging environment (don't use production to avoid side effects)
curl -X POST https://exam-generator-staging.vercel.app/api/test-db
```

**Expected response:**
```json
{
  "status": "connected",
  "database": "connected",
  "timestamp": "2025-10-20T..."
}
```

**Verification:**
- [ ] Response shows "connected"
- [ ] No connection errors in logs
- [ ] Database connectivity working

---

### STEP 5: Generate Test Exam

**Purpose:** Verify exam generation still works

```bash
# Generate a test exam
curl -X POST https://examgenie.app/api/mobile/exam-questions \
  -F "images=@test-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5" \
  -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"
```

**Verification:**
- [ ] Request succeeds (HTTP 200)
- [ ] Response contains 15 questions
- [ ] Questions have options, correct answers
- [ ] Data saved to database

**Checklist for response:**
- [ ] `id` (exam UUID)
- [ ] `web_url` (exam link)
- [ ] `grade_url` (grading link)
- [ ] `final_questions` (array of 15 questions)

---

### STEP 6: Test Grading

**Purpose:** Verify exam grading works with new schema

```bash
# Submit answers for grading
curl -X POST https://examgenie.app/api/exam/{exam_id}/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"questionId": "q1", "answer": "A"},
      {"questionId": "q2", "answer": "B"},
      ...
    ]
  }'
```

**Verification:**
- [ ] Request succeeds
- [ ] Grading result returned
- [ ] Grade saved to `examgenie_grading` table
- [ ] No errors in logs

---

## POST-MIGRATION MONITORING (⏰ 15 min after execution)

### STEP 7: Monitor Application Logs

Check for any errors or warnings:

```bash
# View real-time logs
vercel logs production --follow
```

**Look for:**
- [ ] No database connection errors
- [ ] No foreign key constraint violations
- [ ] No "table not found" errors
- [ ] No "column not found" errors
- [ ] All requests completing normally

**Issues to investigate:**
- If you see: "relation \"exams\" does not exist" → ✅ Expected (table dropped)
- If you see: "relation \"examgenie_grading\" does not exist" → ❌ Migration failed
- If you see: FK constraint violation → ❌ Data integrity issue

---

### STEP 8: Database Query Verification

**Purpose:** Final sanity check

```bash
# Can we query the new grading table?
supabase db remote exec "SELECT COUNT(*) FROM examgenie_grading;"

# Can we query students with language fields?
supabase db remote exec "SELECT id, language, language_name FROM students LIMIT 1;"

# Are legacy tables really gone?
supabase db remote exec "SELECT * FROM exams LIMIT 1;"
# Should error: "relation \"exams\" does not exist"
```

**Verification:**
- [ ] `examgenie_grading` query works (returns count)
- [ ] `students` query returns language fields
- [ ] Query for `exams` fails with "does not exist"

---

## COMPLETION CHECKLIST

- [ ] Pre-flight checks passed
- [ ] Main migration executed successfully
- [ ] All validation queries passed
- [ ] No rollback needed
- [ ] Application connectivity verified
- [ ] Test exam generation succeeded
- [ ] Test grading succeeded
- [ ] No errors in logs (15 min monitoring)
- [ ] Database queries verify new schema
- [ ] Team notified of successful migration

---

## SIGN-OFF

- **Executed by:** _________________ **Date:** _______
- **Verified by:** _________________ **Date:** _______
- **Status:** ☐ SUCCESS | ☐ ROLLED BACK | ☐ PARTIAL

---

## NOTES & OBSERVATIONS

```
[Space for any notes during execution]




```

---

## ROLLBACK HISTORY (if applicable)

| Date | Time | Reason | Status |
|------|------|--------|--------|
| - | - | - | - |

---

## CONTACT INFO

**Dev Team Lead:** [name/slack]
**On-Call Engineer:** [name/phone]
**Emergency Contact:** [number]

**If migration fails:**
1. Stop immediately
2. Run rollback (02_rollback.sql)
3. Contact dev team within 5 minutes
4. Do not attempt re-execution without investigation
