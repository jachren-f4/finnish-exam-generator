# Staging Environment Setup Guide

This guide walks you through setting up a complete staging environment for the ExamGenie application using Vercel branch deployments and separate Supabase databases.

**Goal:** Create isolated production and staging environments where you can safely test changes before deploying to real users.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Create Staging Supabase Project](#phase-1-create-staging-supabase-project)
3. [Phase 2: Set Up Git Branch Structure](#phase-2-set-up-git-branch-structure)
4. [Phase 3: Configure Vercel Environment Variables](#phase-3-configure-vercel-environment-variables)
5. [Phase 4: Set Up Staging Domain](#phase-4-set-up-staging-domain)
6. [Phase 5: Configure GitHub Branch Protection](#phase-5-configure-github-branch-protection)
7. [Phase 6: Test the Setup](#phase-6-test-the-setup)
8. [Phase 7: Update Mobile App Configuration](#phase-7-update-mobile-app-configuration)
9. [Daily Workflow](#daily-workflow)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Access to the Vercel project dashboard
- ✅ Access to the Supabase account
- ✅ Admin access to the GitHub repository
- ✅ Gemini API key (can use existing or create separate)
- ✅ Local development environment set up

---

## Phase 1: Create Staging Supabase Project

### Step 1.1: Create New Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New project"**
3. Fill in the details:
   - **Name:** `exam-generator-staging` or `examgenie-staging`
   - **Database Password:** Generate a strong password (save it securely!)
   - **Region:** Choose same region as production (for consistency)
   - **Pricing Plan:** Free tier is fine for staging
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to initialize

### Step 1.2: Copy Staging Database Credentials

Once the project is ready:

1. Go to **Settings** → **API**
2. Copy and save these values (you'll need them later):
   ```
   Project URL: https://[your-staging-project].supabase.co
   anon/public key: eyJhbGc...
   service_role key: eyJhbGc... (click "Reveal" to see it)
   ```
3. Keep these in a secure location (password manager, encrypted file)

### Step 1.3: Apply Database Schema to Staging

You need to run all existing migrations on the staging database:

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to staging project
supabase link --project-ref [your-staging-project-ref]

# Apply all migrations
supabase db push
```

**Option B: Using SQL Editor in Supabase Dashboard**

1. Go to your staging project in Supabase
2. Navigate to **SQL Editor**
3. Run each migration file manually in order:
   - `supabase/migrations/001_examgenie_mvp_schema.sql`
   - `supabase/migrations/002_add_system_user.sql`
   - `supabase/migrations/20251002102103_rename_student_id_to_user_id.sql`
   - `supabase/migrations/20251002102104_remove_student_id_column.sql`
   - `supabase/migrations/20251003000000_fix_completed_at_timestamps.sql`
   - `supabase/migrations/20251006000000_add_generation_prompt.sql`

4. Verify all tables exist:
   - Go to **Table Editor**
   - You should see: `examgenie_exams`, `examgenie_questions`

### Step 1.4: Create Test Data (Optional)

To make staging more realistic:

1. Go to **SQL Editor** in staging project
2. Run:
   ```sql
   -- Create a test user for staging
   INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
   VALUES (
     gen_random_uuid(),
     'test@staging.com',
     crypt('staging123', gen_salt('bf')),
     NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{}'::jsonb
   );
   ```

---

## Phase 2: Set Up Git Branch Structure

### Step 2.1: Create Staging Branch

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create staging branch from main
git checkout -b staging

# Push staging branch to GitHub
git push -u origin staging
```

### Step 2.2: Set Default Branch Merge Flow

In GitHub repository:

1. Go to **Settings** → **Branches**
2. Note the default branch (should be `main`)
3. We'll protect both `main` and `staging` in Phase 5

---

## Phase 3: Configure Vercel Environment Variables

### Step 3.1: Access Vercel Project Settings

1. Go to [https://vercel.com](https://vercel.com)
2. Select your project (`exam-generator` or similar)
3. Go to **Settings** → **Environment Variables**

### Step 3.2: Update Existing Production Variables

For each existing environment variable, verify it's set to **Production** environment only:

**Current Production Variables** (check/update):
- `GEMINI_API_KEY` → Environment: **Production** only
- `NEXT_PUBLIC_SUPABASE_URL` → Environment: **Production** only
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Environment: **Production** only
- `SUPABASE_SERVICE_ROLE_KEY` → Environment: **Production** only
- `NEXT_PUBLIC_APP_URL` → Environment: **Production** only

**How to update:**
1. Click the **⋯** menu next to each variable
2. Click **Edit**
3. Under **Expose to:** make sure only **Production** is checked
4. Click **Save**

### Step 3.3: Add Staging Environment Variables

For **Preview** environment (will be used by `staging` branch):

Click **Add New** and add these variables one by one:

| Key | Value | Environment | Branch Filter |
|-----|-------|-------------|---------------|
| `GEMINI_API_KEY` | [Same as production or separate] | **Preview** | No filter (or `staging` only) |
| `NEXT_PUBLIC_SUPABASE_URL` | [Your staging Supabase URL] | **Preview** | No filter (or `staging` only) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | [Staging anon key] | **Preview** | No filter (or `staging` only) |
| `SUPABASE_SERVICE_ROLE_KEY` | [Staging service role key] | **Preview** | No filter (or `staging` only) |
| `NEXT_PUBLIC_APP_URL` | `https://exam-generator-staging.vercel.app` | **Preview** | No filter (or `staging` only) |
| `ENABLE_PROMPT_LOGGING` (optional) | `true` | **Preview** | No filter |

**Important Notes:**
- Use the credentials from your **staging Supabase project** (from Step 1.2)
- For "Branch Filter", you can either:
  - Leave empty to apply to all preview branches
  - Or set to `staging` to apply only to staging branch
- For feature branches, they'll use the same staging database (safe to test)

### Step 3.4: Verify Configuration

After adding all variables:

1. Go back to **Settings** → **Environment Variables**
2. You should see each variable listed twice:
   - Once for **Production** (main branch)
   - Once for **Preview** (staging and feature branches)

---

## Phase 4: Set Up Staging Domain

### Step 4.1: Assign Custom Domain to Staging Branch

1. In Vercel project, go to **Settings** → **Domains**
2. Current production domain should be: `exam-generator.vercel.app` → points to `main`
3. Click **Add Domain**
4. Enter: `exam-generator-staging.vercel.app`
5. Vercel will automatically verify (it's a Vercel subdomain)
6. After domain is added, click on it to configure
7. **Git Branch:** Select `staging` from the dropdown
8. Click **Save**

### Step 4.2: Verify Domain Configuration

You should now have:
- `exam-generator.vercel.app` → `main` branch (Production)
- `exam-generator-staging.vercel.app` → `staging` branch (Staging)
- `exam-generator-git-[feature-name]-[team].vercel.app` → Feature branches (auto-generated)

---

## Phase 5: Configure GitHub Branch Protection

### Step 5.1: Protect Main Branch

1. Go to your GitHub repository
2. Navigate to **Settings** → **Branches**
3. Under **Branch protection rules**, click **Add rule**
4. Branch name pattern: `main`
5. Enable these rules:
   - ✅ **Require a pull request before merging**
     - Required approvals: **1** (or more)
     - ✅ Dismiss stale reviews when new commits are pushed
   - ✅ **Require status checks to pass before merging**
     - Search and add: **Vercel** (or `vercel` build check)
     - ✅ Require branches to be up to date before merging
   - ✅ **Require conversation resolution before merging**
   - ✅ **Include administrators** (recommended)
6. Click **Create** or **Save changes**

### Step 5.2: Protect Staging Branch

1. Click **Add rule** again
2. Branch name pattern: `staging`
3. Enable these rules:
   - ✅ **Require a pull request before merging**
     - Required approvals: **1**
   - ✅ **Require status checks to pass before merging**
     - Add: **Vercel** build check
   - ✅ **Require conversation resolution before merging**
4. Click **Create**

### Step 5.3: Set Up Default Pull Request Behavior

1. In GitHub repo, go to **Settings** → **General**
2. Scroll to **Pull Requests** section
3. Recommended settings:
   - ✅ Allow merge commits
   - ✅ Allow squash merging
   - ✅ Automatically delete head branches (cleanup after merge)

---

## Phase 6: Test the Setup

### Step 6.1: Test Staging Deployment

```bash
# Switch to staging branch
git checkout staging

# Make a small test change (e.g., update README)
echo "# Staging Environment Active" >> STAGING_TEST.md

# Commit and push
git add .
git commit -m "Test staging deployment"
git push origin staging
```

**Expected Result:**
1. Vercel automatically deploys to staging
2. Check Vercel dashboard → **Deployments**
3. Look for deployment with branch: `staging`
4. Visit: `https://exam-generator-staging.vercel.app`
5. Create a test exam and verify it uses staging database

### Step 6.2: Test Feature Branch Preview

```bash
# Create a test feature branch from staging
git checkout staging
git checkout -b feature/test-preview

# Make a change
echo "# Feature test" >> FEATURE_TEST.md
git add .
git commit -m "Test feature preview deployment"
git push origin feature/test-preview
```

**Expected Result:**
1. Vercel creates preview deployment
2. URL will be: `https://exam-generator-git-feature-test-preview-[team].vercel.app`
3. This preview uses staging database (safe to test)

### Step 6.3: Test Production Protection

Try to push directly to main (should fail):

```bash
git checkout main

# Try to make a change
echo "test" >> test.txt
git add test.txt
git commit -m "Test protection"
git push origin main
```

**Expected Result:**
- GitHub rejects the push
- Message: "Branch protection rules require pull requests"

### Step 6.4: Test Full Workflow

1. Create feature branch from staging
2. Make changes, push to feature branch
3. Open PR to merge `feature/test` → `staging`
4. Review and merge to staging
5. Test on staging environment
6. Open PR to merge `staging` → `main`
7. Review and merge to production
8. Verify production deployment

---

## Phase 7: Update Mobile App Configuration

### Step 7.1: Add Build Variants to Flutter App

Your Flutter mobile app needs to know which backend to use.

**File to modify:** `lib/config/environment.dart` (or similar)

**Add environment configuration:**

```dart
enum Environment { production, staging }

class EnvironmentConfig {
  static Environment current = Environment.production;

  static String get baseUrl {
    switch (current) {
      case Environment.production:
        return 'https://exam-generator.vercel.app';
      case Environment.staging:
        return 'https://exam-generator-staging.vercel.app';
    }
  }
}
```

### Step 7.2: Create Build Flavors (Recommended)

**Android:** `android/app/build.gradle`
```gradle
flavorDimensions "environment"
productFlavors {
    production {
        dimension "environment"
        applicationIdSuffix ""
        manifestPlaceholders = [appName: "ExamGenie"]
    }
    staging {
        dimension "environment"
        applicationIdSuffix ".staging"
        manifestPlaceholders = [appName: "ExamGenie Staging"]
    }
}
```

**iOS:** Use schemes in Xcode

**Build commands:**
```bash
# Production build
flutter build apk --flavor production

# Staging build
flutter build apk --flavor staging
```

### Step 7.3: Test Mobile App with Staging

1. Build staging version of mobile app
2. Install on test device
3. Generate exam (should hit staging API)
4. Verify data appears in staging Supabase (not production)

---

## Daily Workflow

### For Developers

#### Starting New Feature

```bash
# Always branch from staging
git checkout staging
git pull origin staging

# Create feature branch
git checkout -b feature/your-feature-name

# Develop and test locally
npm run dev

# Push to GitHub (auto-creates preview)
git push origin feature/your-feature-name

# Test on preview URL provided by Vercel
```

#### Merging to Staging

```bash
# Create PR: feature/your-feature → staging
# On GitHub:
# 1. Go to Pull Requests → New Pull Request
# 2. Base: staging, Compare: feature/your-feature
# 3. Create PR, get approval, merge
```

#### Releasing to Production

```bash
# After thorough testing on staging:
# Create PR: staging → main
# On GitHub:
# 1. Go to Pull Requests → New Pull Request
# 2. Base: main, Compare: staging
# 3. Create PR, get approval, merge
# 4. Vercel auto-deploys to production
```

### For Database Migrations

#### Creating New Migration

```bash
# While on feature or staging branch
# 1. Create migration file in supabase/migrations/
# 2. Test locally first
# 3. Push to feature branch
# 4. Merge to staging (auto-applies to staging DB)
# 5. Test on staging environment
# 6. Merge staging → main (applies to production DB)
```

#### Manual Migration Application

**Staging:**
```bash
supabase link --project-ref [staging-project-ref]
supabase db push
```

**Production:**
```bash
supabase link --project-ref [production-project-ref]
supabase db push
```

---

## Troubleshooting

### Issue: Vercel Uses Wrong Environment Variables

**Symptom:** Staging deployment connects to production database

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Check that production variables are set to **Production** only
3. Check that preview variables are set to **Preview** environment
4. Redeploy the staging branch

### Issue: Cannot Push to Main Branch

**Symptom:** `rejected: Branch protection rules require pull requests`

**Solution:**
- This is expected! Always create a PR to merge to main
- Never push directly to main (that's the point of protection)

### Issue: Staging Domain Not Working

**Symptom:** `exam-generator-staging.vercel.app` shows 404

**Solution:**
1. Check Vercel → Settings → Domains
2. Make sure domain is assigned to `staging` branch
3. Check that `staging` branch has been deployed at least once
4. Redeploy if needed: Vercel → Deployments → staging → Redeploy

### Issue: Mobile App Still Hits Production

**Symptom:** Test data appears in production database

**Solution:**
1. Check mobile app environment configuration
2. Verify you built staging flavor: `flutter build apk --flavor staging`
3. Check that staging build points to staging URL
4. Uninstall old app and reinstall staging version

### Issue: Database Schema Out of Sync

**Symptom:** API errors about missing columns

**Solution:**
1. Check which migrations are applied:
   ```bash
   supabase db diff --linked
   ```
2. Apply missing migrations:
   ```bash
   supabase db push
   ```
3. Verify schema in Supabase dashboard → Table Editor

### Issue: Preview Deployments Use Production DB

**Symptom:** Feature branches modify production data

**Solution:**
1. Check Vercel environment variables
2. Make sure `NEXT_PUBLIC_SUPABASE_URL` for **Preview** uses staging URL
3. Redeploy the feature branch
4. Check build logs in Vercel for which env vars were used

---

## Rollback Procedures

### Rolling Back Code Deployment

**In Vercel:**
1. Go to **Deployments**
2. Find the last working deployment
3. Click **⋯** → **Promote to Production**
4. Instant rollback (no git operations needed)

### Rolling Back Database Migration

**Option 1: Down Migration (if you created one)**
```bash
# Create a down migration that reverses changes
supabase db push
```

**Option 2: Restore from Backup**
1. Go to Supabase → Database → Backups
2. Select backup before the migration
3. Click **Restore**
4. ⚠️ This restores entire database (data loss possible)

### Emergency Maintenance Mode

If you need to take staging/production offline:

**Option 1: Vercel Deployment Protection**
1. Vercel → Settings → Deployment Protection
2. Enable password protection temporarily

**Option 2: Environment Variable Flag**
1. Add `MAINTENANCE_MODE=true` to environment
2. Check this in your app and show maintenance page
3. Remove when ready

---

## Security Checklist

Before going live with this setup:

- ✅ Staging Supabase credentials are different from production
- ✅ Production environment variables are set to **Production** only
- ✅ Branch protection rules are enabled on `main`
- ✅ PR reviews are required for production merges
- ✅ Mobile app staging build has distinct bundle ID
- ✅ Team members understand not to push directly to main
- ✅ Test data in staging clearly marked (not real user data)
- ✅ Monitoring/alerts set up for production errors

---

## Next Steps

After completing this guide:

1. ✅ Create staging branch
2. ✅ Set up staging Supabase project
3. ✅ Configure Vercel environments
4. ✅ Protect main branch
5. ✅ Test full workflow
6. ✅ Update team documentation
7. ✅ Train team on new workflow
8. ✅ Plan first staging → production release

**Congratulations!** You now have a professional staging and production environment setup. 🎉

---

**Last Updated:** October 2025
**Maintained By:** ExamGenie Development Team
