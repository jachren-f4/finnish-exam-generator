# Migration Quick Reference

Copy-paste these commands in order. **Stop if any fails.**

---

## 1️⃣ PRE-FLIGHT CHECK

```bash
# Navigate to project root
cd /Users/joakimachren/Desktop/gemini-ocr

# Verify you can access Supabase CLI
supabase --version

# Check current tables
supabase db remote exec --file supabase/staging_to_prod/04_validation_queries.sql > /tmp/before_migration.txt

# Inspect output - should show exams, grading, answers tables exist
cat /tmp/before_migration.txt
```

---

## 2️⃣ RUN MIGRATION

```bash
# Execute main migration
supabase db remote exec --file supabase/staging_to_prod/02_main_migration.sql

# Expected: Multiple NOTICE lines + COMMIT at end (no ERRORs)
```

---

## 3️⃣ VALIDATE MIGRATION

```bash
# Run validation queries
supabase db remote exec --file supabase/staging_to_prod/04_validation_queries.sql > /tmp/after_migration.txt

# Check results
cat /tmp/after_migration.txt

# Key verifications:
# ✅ examgenie_grading table exists
# ✅ students has language columns
# ❌ exams table NOT in list
# ❌ grading table NOT in list
# ❌ answers table NOT in list
# ✅ All FKs are valid
```

---

## 4️⃣ IF MIGRATION FAILS - ROLLBACK

```bash
# ⚠️ ONLY RUN IF MIGRATION HAD ERRORS

supabase db remote exec --file supabase/staging_to_prod/02_rollback.sql

# Then investigate error and contact dev team
```

---

## 5️⃣ TEST APPLICATION

```bash
# Test 1: Database connection
curl https://examgenie.app/api/test-db

# Test 2: Generate exam
curl -X POST https://examgenie.app/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5" \
  -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"

# Expected: HTTP 200, exam with 15 questions, saved to DB
```

---

## 6️⃣ MONITOR LOGS (15+ minutes)

```bash
# Watch production logs for errors
vercel logs production --follow

# Kill with Ctrl+C when satisfied (no new errors after 15 min)
```

---

## ✅ DONE!

If all steps succeeded without errors:
- Migration is complete
- Production schema now matches staging
- Application is working normally
- No rollback needed

---

## 🆘 EMERGENCY ROLLBACK

If production is broken after migration:

```bash
# 1. Run rollback immediately
supabase db remote exec --file supabase/staging_to_prod/02_rollback.sql

# 2. Verify rollback worked
supabase db remote exec --file supabase/staging_to_prod/04_validation_queries.sql

# 3. Screenshot everything
# 4. Contact dev team ASAP
```

---

## Files Reference

| What | File |
|------|------|
| Read before executing | `01_migration_plan.md` |
| **Run first** | `02_main_migration.sql` |
| **Run if failed** | `02_rollback.sql` |
| **Run to validate** | `04_validation_queries.sql` |
| Detailed checklist | `05_migration_checklist.md` |
| Full info | `README.md` |

---

**Remember:** All paths are relative to `/supabase/staging_to_prod/`
