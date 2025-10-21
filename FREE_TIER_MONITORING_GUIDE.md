# Free Tier Monitoring & Billing Guide

**Purpose:** Understand Gemini API free tier limits, monitor usage, and know when to enable billing.

---

## 📊 Free Tier Limits (Gemini 2.5 Flash)

### Current Limits
- **Requests per minute (RPM):** 15
- **Requests per day (RPD):** 1,500
- **Tokens per minute (TPM):** Unlimited
- **Tokens per day:** 1,000,000

### What This Means for ExamGenie

Based on average exam generation (~7,000 tokens):

| Metric | Limit | ExamGenie Capacity |
|--------|-------|-------------------|
| **Tokens/day** | 1,000,000 | ~140 exams/day |
| **Requests/day** | 1,500 | 1,500 exams/day |
| **Bottleneck** | Tokens | **~140 exams/day max** |

**Key Takeaway:** You can generate approximately **140 exams per day** before hitting the free tier token limit.

---

## 🔍 How to Monitor Usage

### Daily Monitoring Script

Run this command to check today's usage:

```bash
npx tsx check-token-usage.ts
```

**Example Output:**
```
📈 FREE TIER STATUS
   Daily limit:  1,000,000 tokens
   Used today:   45,890 tokens (4.589%)
   Status:       ✅ Well within free tier
```

**Frequency:** Run daily or after heavy testing sessions.

### Weekly Cost Verification

Run this command to see 30-day trends:

```bash
npx tsx run-cost-verification.ts
```

**Shows:**
- Total exams generated (last 30 days)
- Total tokens used
- Estimated costs (if you were paying)
- Daily breakdown (last 7 days)

**Frequency:** Run weekly or monthly for planning.

### Check All Databases

If you maintain multiple environments:

```bash
npx tsx check-all-databases.ts
```

**Shows usage across:**
- Localhost (`.env.local`)
- Staging (`.env.local.staging`)
- Production (`.env.local.production`)

---

## ⚠️ What Happens When You Exceed Free Tier

### The API Will Block You (Not Charge You)

When you hit the daily token limit (1,000,000 tokens), Gemini API returns:

```
Error: 429 Resource Exhausted
"Quota exceeded for quota metric 'Generate Content API requests per day'
and limit 'GenerateContentRequestsPerDay' of service 'generativelanguage.googleapis.com'"
```

**What This Means:**
- ❌ New exam generation requests will **fail**
- ❌ Users will see error messages
- ✅ **No charges occur** (free tier doesn't auto-upgrade)
- ✅ Quota resets at **midnight UTC**

### Your App's Behavior

The API route will return an error response:
```json
{
  "error": "Quota exceeded. Please try again later.",
  "status": 429
}
```

Users will see this in the mobile app or web interface.

---

## 📈 Usage Patterns & Warning Signs

### Green Zone (Safe)
- **0-70% of daily limit** (0-700,000 tokens)
- ~0-100 exams per day
- ✅ Normal development and testing
- ✅ Continue as usual

### Yellow Zone (Monitor Closely)
- **70-90% of daily limit** (700,000-900,000 tokens)
- ~100-130 exams per day
- ⚠️ Watch for quota errors
- ⚠️ Consider enabling billing if consistent

### Red Zone (Action Required)
- **90-100% of daily limit** (900,000-1,000,000 tokens)
- ~130-140 exams per day
- 🚨 Quota errors imminent
- 🚨 Enable billing or wait for reset

---

## 💳 When to Enable Billing

### Keep Free Tier If:
- ✅ Development/testing phase
- ✅ Low user volume (<50 exams/day)
- ✅ Predictable usage patterns
- ✅ Can tolerate occasional quota errors

### Enable Billing When:
- 🚀 **Launching to production** with real users
- 🚀 Consistent usage **>100 exams/day**
- 🚀 Need **guaranteed uptime** (no quota errors)
- 🚀 Scaling to **multiple users**

### Cost After Enabling Billing

**Gemini 2.5 Flash Pricing:**
- **Input tokens:** $0.075 per 1M tokens
- **Output tokens:** $0.30 per 1M tokens

**ExamGenie Cost per Exam:**
- Average: **$0.002** (~7,000 tokens)
- 100 exams: **$0.20**
- 1,000 exams: **$2.00**
- 10,000 exams: **$20.00**

**Monthly Projections:**

| Daily Exams | Monthly Exams | Monthly Cost |
|-------------|---------------|--------------|
| 50 | 1,500 | ~$3.00 |
| 100 | 3,000 | ~$6.00 |
| 200 | 6,000 | ~$12.00 |
| 500 | 15,000 | ~$30.00 |

---

## 🔧 How to Enable Billing

### Step 1: Set Up Billing in Google AI Studio

1. Go to **https://aistudio.google.com/**
2. Click on **"Get API key"** in bottom left
3. Click **"Enable billing"** or **"Upgrade"**
4. Add payment method (credit card)
5. Accept terms and conditions

### Step 2: Verify Billing is Active

After enabling billing:
- API calls will **continue working** even after 1M tokens/day
- Usage will appear in **Google Cloud Console → Billing → Reports**
- You'll start seeing actual charges

### Step 3: Set Budget Alerts (Recommended)

1. Go to **https://console.cloud.google.com/billing**
2. Select your billing account
3. Click **"Budgets & alerts"**
4. Create budget:
   - **Name:** "ExamGenie Monthly Budget"
   - **Amount:** $50 (or your comfort level)
   - **Alerts:** 50%, 90%, 100%
5. Add your email for notifications

---

## 📋 Monthly Monitoring Checklist

### Week 1
- [ ] Run `npx tsx check-token-usage.ts`
- [ ] Review usage trends
- [ ] Check if approaching daily limits

### Week 2
- [ ] Run `npx tsx check-token-usage.ts`
- [ ] Compare with Week 1
- [ ] Identify any usage spikes

### Week 3
- [ ] Run `npx tsx run-cost-verification.ts`
- [ ] Review 30-day totals
- [ ] Calculate estimated costs if paying

### Week 4 (End of Month)
- [ ] Run full cost verification
- [ ] Decide: Stay on free tier or enable billing?
- [ ] Document decision and reasoning

---

## 🚨 Emergency Procedures

### If You Hit Quota Limit Unexpectedly

**Immediate Actions:**
1. **Stop testing** - Avoid generating more exams
2. **Check usage:** `npx tsx check-token-usage.ts`
3. **Wait for reset** - Quota resets at midnight UTC
4. **Communicate** - If users are affected, notify them of temporary downtime

**Next Day:**
1. Review what caused the spike
2. Decide if billing should be enabled
3. Implement rate limiting if needed

### If Costs Are Higher Than Expected (After Enabling Billing)

**Investigation Steps:**
1. Run: `npx tsx run-cost-verification.ts`
2. Check daily breakdown for spikes
3. Compare database costs with Google Cloud billing
4. Look for:
   - Failed retries (retry logic consuming tokens)
   - Test scripts running in production
   - Unexpected user volume

**Mitigation:**
1. Add request rate limiting
2. Implement user quotas
3. Optimize prompts (reduce token usage)
4. Consider caching common queries

---

## 📊 Tracking Scripts Reference

### `check-token-usage.ts`
**Purpose:** Daily usage monitoring
**Shows:** Today's tokens, costs, free tier status
**Run:** `npx tsx check-token-usage.ts`

### `run-cost-verification.ts`
**Purpose:** 30-day cost analysis
**Shows:** Monthly totals, daily breakdown, cost projections
**Run:** `npx tsx run-cost-verification.ts`
**Options:**
- `.env.local` - Localhost/default database
- `.env.local.staging` - Staging database
- `.env.local.production` - Production database

**Example:**
```bash
npx tsx run-cost-verification.ts .env.local.production
```

### `check-all-databases.ts`
**Purpose:** Multi-environment overview
**Shows:** Usage across all databases
**Run:** `npx tsx check-all-databases.ts`

---

## 🎯 Recommended Strategy

### Phase 1: Development (Current)
- ✅ Stay on **free tier**
- ✅ Monitor weekly with scripts
- ✅ Keep usage <100 exams/day
- ✅ Accept occasional quota errors during heavy testing

### Phase 2: Beta Launch
- ⚠️ Monitor **daily** with scripts
- ⚠️ Set up budget alerts ($20/month)
- ⚠️ Consider enabling billing if >100 exams/day consistently
- ⚠️ Implement user rate limiting

### Phase 3: Production
- 🚀 **Enable billing** before full launch
- 🚀 Set budget alerts ($50-100/month)
- 🚀 Monitor costs weekly
- 🚀 Scale confidently without quota errors

---

## 💡 Best Practices

1. **Run monitoring scripts regularly** - Make it a habit
2. **Track trends, not just totals** - Look for usage patterns
3. **Enable billing proactively** - Don't wait for quota errors in production
4. **Set conservative budgets** - Better to get alerts early
5. **Document usage spikes** - Understand what causes high usage
6. **Keep free tier as long as possible** - It's very generous
7. **Compare database costs with Google billing** - Verify accuracy monthly

---

## 🔗 Quick Links

**Google Services:**
- [Google AI Studio](https://aistudio.google.com/)
- [Google Cloud Billing](https://console.cloud.google.com/billing)
- [Gemini Pricing](https://ai.google.dev/pricing)

**ExamGenie Scripts:**
- `check-token-usage.ts` - Daily usage
- `run-cost-verification.ts` - Monthly analysis
- `check-all-databases.ts` - Multi-environment overview

---

## 📞 Support

If you see unexpected charges or quota issues:
1. Check scripts first: `npx tsx check-token-usage.ts`
2. Review Google Cloud billing reports
3. Compare with `COST_VERIFICATION_GUIDE.md` methodology
4. Contact Google Cloud support if discrepancies persist

---

**Last Updated:** October 21, 2025
**Next Review:** November 21, 2025

**Current Status:** ✅ Free tier, 68 exams generated, well within limits
