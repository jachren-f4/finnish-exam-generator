# Cost Verification Guide

**Purpose:** Verify that ExamGenie's tracked costs match Google's actual billing for Gemini API and Cloud TTS.

---

## 📊 Step 1: Query Database Costs

### Option A: Using Supabase Dashboard (Recommended)

**1. Gemini API Costs (Exam Creation)**

```sql
-- Total Gemini costs for exam generation (last 30 days)
SELECT
  COUNT(*) as exam_count,
  SUM((creation_gemini_usage->>'estimatedCost')::numeric) as total_gemini_cost,
  AVG((creation_gemini_usage->>'estimatedCost')::numeric) as avg_cost_per_exam,
  SUM((creation_gemini_usage->>'totalTokenCount')::integer) as total_tokens
FROM examgenie_exams
WHERE created_at > NOW() - INTERVAL '30 days'
  AND creation_gemini_usage IS NOT NULL;
```

**2. Audio Generation Costs (Google Cloud TTS)**

```sql
-- Total TTS costs (last 30 days)
SELECT
  COUNT(*) as audio_count,
  SUM(audio_generation_cost) as total_tts_cost,
  AVG(audio_generation_cost) as avg_cost_per_audio
FROM examgenie_exams
WHERE created_at > NOW() - INTERVAL '30 days'
  AND audio_generation_cost IS NOT NULL
  AND audio_generation_cost > 0;
```

**3. Breakdown by Category**

```sql
-- Gemini costs by exam category/subject
SELECT
  COALESCE(subject, 'Unknown') as category,
  COUNT(*) as exam_count,
  SUM((creation_gemini_usage->>'estimatedCost')::numeric) as total_cost,
  AVG((creation_gemini_usage->>'estimatedCost')::numeric) as avg_cost
FROM examgenie_exams
WHERE created_at > NOW() - INTERVAL '30 days'
  AND creation_gemini_usage IS NOT NULL
GROUP BY subject
ORDER BY total_cost DESC;
```

**4. Daily Cost Trend**

```sql
-- Daily costs for the last 30 days
SELECT
  DATE(created_at) as date,
  COUNT(*) as exams,
  SUM((creation_gemini_usage->>'estimatedCost')::numeric) as gemini_cost,
  SUM(COALESCE(audio_generation_cost, 0)) as tts_cost,
  SUM((creation_gemini_usage->>'estimatedCost')::numeric) +
    SUM(COALESCE(audio_generation_cost, 0)) as total_cost
FROM examgenie_exams
WHERE created_at > NOW() - INTERVAL '30 days'
  AND creation_gemini_usage IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Option B: Using db-query.ts Script

```bash
# Query staging database
npx tsx db-query.ts \
  --env=".env.local.staging" \
  --operation=select \
  --table=examgenie_exams \
  --limit=1000 \
  --order-by="created_at" \
  --order-direction="desc"
```

---

## 🔍 Step 2: Check Google Cloud Billing

### Gemini API Costs (Google AI Studio)

**Access Billing:**
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click on your profile → **Billing**
3. Or visit: [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing)

**Filter by Service:**
- Service: **Gemini API** or **Generative Language API**
- Time range: Last 30 days
- SKU: `gemini-2.5-flash-lite`

**Expected Costs:**
- **Input tokens:** $0.000075 per 1K tokens
- **Output tokens:** $0.00030 per 1K tokens

**What to Look For:**
- Total spend on Gemini API
- Number of requests
- Token usage breakdown

---

### Google Cloud TTS Costs

**Access Billing:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Billing** → **Reports**
3. Or direct link: [https://console.cloud.google.com/billing/reports](https://console.cloud.google.com/billing/reports)

**Filter by Service:**
- Service: **Cloud Text-to-Speech API**
- Time range: Last 30 days
- SKU: `Standard (non-WaveNet) voices`

**Expected Costs:**
- **Standard voices:** $4.00 per 1 million characters
- **WaveNet voices:** $16.00 per 1 million characters (if used)

**What to Look For:**
- Total spend on TTS
- Number of characters synthesized
- Voice type used

---

## 📈 Step 3: Compare and Validate

### Expected Calculations

**Gemini API (per exam with 3 images):**
```
Input tokens:  ~2,000 tokens × $0.000075 = $0.00015
Output tokens: ~5,000 tokens × $0.00030  = $0.00150
Total per exam: ~$0.00165
```

**TTS (per audio summary):**
```
Average summary: ~1,000 characters
Cost: 1,000 chars × ($4.00 / 1,000,000) = $0.004
Total per audio: ~$0.004
```

**Combined per exam:** ~$0.00565

### Validation Checklist

#### ✅ Gemini API
- [ ] Database total matches Google billing ±5%
- [ ] Token counts are reasonable (2K-7K per exam)
- [ ] Cost per exam is ~$0.001-$0.004

#### ✅ Google Cloud TTS
- [ ] Database total matches Google billing ±5%
- [ ] Character counts match expected summaries
- [ ] Cost per audio is ~$0.003-$0.005

#### ⚠️ Common Discrepancies
- **Database shows higher costs:** May include failed attempts or retries
- **Google shows higher costs:** May include non-ExamGenie usage (other projects)
- **Missing costs in database:** Check for NULL values in cost columns
- **Time zone differences:** Google billing uses UTC, database may use local time

---

## 🛠️ Troubleshooting

### Database Costs Are Zero

**Check for NULL values:**
```sql
SELECT
  COUNT(*) as total_exams,
  COUNT(creation_gemini_usage) as with_gemini_data,
  COUNT(audio_generation_cost) as with_audio_cost
FROM examgenie_exams
WHERE created_at > NOW() - INTERVAL '30 days';
```

**If creation_gemini_usage is NULL:**
- Check if `createUsageMetadata()` is being called in mobile-api-service.ts
- Verify Gemini API responses include `usageMetadata`

**If audio_generation_cost is NULL:**
- Audio generation may be failing silently
- Check logs: `[Audio Generation]` or `[Math Audio]`
- Verify Google Cloud credentials are valid

### Google Costs Are Much Higher

**Possible causes:**
1. **Multiple projects:** Check if you have other Google Cloud projects using same billing
2. **Non-ExamGenie usage:** Personal/test queries in AI Studio
3. **Failed retries:** Gemini may charge for failed attempts
4. **WaveNet voices:** Accidentally using expensive voices ($16 vs $4 per 1M chars)

**To isolate ExamGenie costs:**
- Filter by specific date range when only ExamGenie was running
- Check project-level billing in Google Cloud Console
- Compare request counts between database and Google metrics

### Math Doesn't Add Up

**Verify pricing tiers:**
- Gemini pricing changed in 2024-2025, check current rates
- TTS pricing varies by voice type (Standard vs WaveNet vs Neural2)

**Check for batch operations:**
- Database query may be missing some exams (RLS policies)
- Use `supabaseAdmin` queries to bypass RLS

---

## 📝 Monthly Cost Report Template

```markdown
## ExamGenie Cost Report - October 2025

### Database Tracked Costs
- Exam creation (Gemini): $X.XX
- Audio generation (TTS): $X.XX
- Total tracked: $X.XX

### Google Cloud Billing
- Gemini API (AI Studio): $X.XX
- Cloud TTS: $X.XX
- Total billed: $X.XX

### Variance
- Difference: $X.XX (X.X%)
- Status: ✅ Within acceptable range (<5%) / ⚠️ Needs investigation

### Statistics
- Total exams generated: XXX
- Average cost per exam: $X.XX
- Total tokens processed: XXX,XXX
- Total characters synthesized: XXX,XXX

### Notes
- [Any anomalies or explanations]
```

---

## 🔗 Quick Links

**Google Cloud:**
- [AI Studio Billing](https://aistudio.google.com/)
- [Cloud Console Billing](https://console.cloud.google.com/billing)
- [Gemini Pricing](https://ai.google.dev/pricing)
- [TTS Pricing](https://cloud.google.com/text-to-speech/pricing)

**Supabase:**
- [Staging Dashboard](https://app.supabase.com) → Select project → SQL Editor
- [Production Dashboard](https://app.supabase.com) → Select project → SQL Editor

**Database Scripts:**
```bash
# Query staging
./scripts/db-query.sh staging examgenie_exams 100

# Query production
./scripts/db-query.sh production examgenie_exams 100
```

---

## 💡 Best Practices

1. **Run verification monthly** - Set a calendar reminder
2. **Track trends** - Look for cost increases over time
3. **Monitor anomalies** - Investigate sudden spikes
4. **Document discrepancies** - Keep notes on why costs don't match exactly
5. **Test cost tracking** - Generate a test exam and verify cost is recorded

---

## 🚨 Alert Thresholds

Set up alerts if:
- Daily cost exceeds $10
- Cost per exam exceeds $0.01
- Database/Google variance exceeds 10%
- Total monthly cost exceeds $100

---

**Last Updated:** October 21, 2025
**Next Review:** November 21, 2025
