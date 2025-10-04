# Security Guidelines

## API Key Protection

This project uses sensitive API keys that **must never be committed to git**.

### ✅ Proper Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your real API keys to `.env.local`:**
   - `GEMINI_API_KEY` - Your Google Generative AI API key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL

3. **Never commit `.env.local`** - It's already in `.gitignore`

### 🛡️ Protection Mechanisms

This repository has multiple layers of protection:

1. **`.gitignore`** - Prevents `.env.local` and `.env` files from being tracked
2. **Pre-commit hook** - Automatically blocks commits containing API key patterns
3. **Environment variable loading** - All code uses `process.env.GEMINI_API_KEY` instead of hardcoded keys

### ⚠️ What NOT to Do

❌ **Never do this:**
```javascript
const API_KEY = 'AIzaSy...';  // WRONG - hardcoded key
```

✅ **Always do this:**
```javascript
require('dotenv').config({ path: '.env.local' });
const API_KEY = process.env.GEMINI_API_KEY;  // CORRECT - from environment
```

### 🚨 If You Accidentally Commit a Key

1. **Immediately rotate the key** in Google Cloud Console / Supabase
2. Update your `.env.local` with the new key
3. Remove the key from git history using BFG Repo-Cleaner or git-filter-repo
4. Force push the cleaned history

### 🔍 Pre-commit Hook

The repository includes a pre-commit hook that prevents accidental commits of API keys.

If you see this error:
```
❌ ERROR: Found API key pattern in staged files!
```

It means you're trying to commit a file with a hardcoded API key. Remove it and use environment variables instead.

### 📋 Verifying Protection

Check if your `.env.local` is properly ignored:
```bash
git check-ignore -v .env.local
# Should output: .gitignore:28:.env*.local	.env.local
```

Check if the pre-commit hook is active:
```bash
ls -la .git/hooks/pre-commit
# Should show an executable file
```

### 🔐 Best Practices

1. **Never share your `.env.local` file** via Slack, email, or screenshots
2. **Rotate API keys regularly** (every 90 days recommended)
3. **Use different keys** for development and production
4. **Restrict API keys** in Google Cloud Console:
   - Set application restrictions (HTTP referrers, IP addresses)
   - Set API restrictions (only allow specific APIs)
5. **Monitor API usage** for unexpected spikes (could indicate key theft)

### 📞 Reporting Security Issues

If you discover a security vulnerability, please report it privately to the repository maintainer.

**DO NOT** create a public GitHub issue for security vulnerabilities.
