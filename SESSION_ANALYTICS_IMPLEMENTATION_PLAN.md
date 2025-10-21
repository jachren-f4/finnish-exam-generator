# Session Analytics Implementation Plan

**Goal:** Track Daily Active Users (DAU), user retention, and basic engagement metrics using a simple heartbeat system + admin dashboard.

**Timeline:** 3-4 hours implementation
**Cost:** $0 (uses existing Supabase infrastructure)

**Architecture:** Uses `auth.users` directly (students table is unused/empty)

---

## Phase 1: Database Schema

### New Table: `user_sessions`

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users.id (not students table)
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  platform TEXT, -- 'ios' | 'android' | 'web'
  app_version TEXT,
  device_info JSONB, -- Optional: device model, OS version, etc.
  is_new_user BOOLEAN DEFAULT FALSE, -- True if this is user's first session ever
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_start ON user_sessions(session_start);
CREATE INDEX idx_user_sessions_last_heartbeat ON user_sessions(last_heartbeat);
CREATE INDEX idx_user_sessions_is_new_user ON user_sessions(is_new_user);

-- RLS Policies (optional, since this is server-side only)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role has full access" ON user_sessions
  FOR ALL USING (true);
```

**Key Changes from Original Plan:**
- ✅ Uses `user_id` (references `auth.users.id`) instead of `student_id`
- ✅ Added `is_new_user` boolean flag for easy new user tracking
- ✅ No dependency on `students` table (which is empty)

**Location:** `/supabase/migrations/YYYYMMDD_create_user_sessions.sql`

---

## Phase 2: Backend API Endpoint

### Endpoint: `POST /api/session/heartbeat`

**File:** `/src/app/api/session/heartbeat/route.ts`

**Request Body:**
```json
{
  "user_id": "uuid (required - from auth.users)",
  "platform": "ios | android | web (required)",
  "app_version": "1.2.3 (optional)",
  "device_info": {
    "model": "iPhone 14 (optional)",
    "os_version": "iOS 17.1 (optional)"
  }
}
```

**Note:** Mobile app currently sends `student_id` parameter, but it's actually the `auth.users.id`. The endpoint should accept both `user_id` and `student_id` for backward compatibility.

**Response:**
```json
{
  "success": true,
  "session_id": "uuid",
  "is_new_user": false
}
```

**Logic:**
```typescript
1. Extract user_id (accept both 'user_id' and 'student_id' params)
2. Check if user has ANY previous sessions in user_sessions table
   - If no previous sessions: is_new_user = true
   - If has previous sessions: is_new_user = false
3. Check if active session exists (within last 30 minutes)
   - If yes: Update last_heartbeat timestamp
   - If no: Create new session record with is_new_user flag
4. Return session_id and is_new_user flag
5. Handle errors gracefully (don't fail Flutter app if logging fails)
```

**Session Definition:**
- New session = no heartbeat in last 30 minutes
- Same session = heartbeat within 30 minutes (just update `last_heartbeat`)

**Pseudocode:**
```typescript
const userId = body.user_id || body.student_id; // Backward compatibility

// Check if this is user's first session ever
const { data: existingSessions } = await supabase
  .from('user_sessions')
  .select('id')
  .eq('user_id', userId)
  .limit(1);

const isNewUser = !existingSessions?.length;

// Check for active session (within 30 minutes)
const { data: activeSession } = await supabase
  .from('user_sessions')
  .select('id')
  .eq('user_id', userId)
  .gte('last_heartbeat', new Date(Date.now() - 30 * 60 * 1000))
  .single();

if (activeSession) {
  // Update existing session
  await supabase
    .from('user_sessions')
    .update({ last_heartbeat: new Date() })
    .eq('id', activeSession.id);
} else {
  // Create new session
  await supabase.from('user_sessions').insert({
    user_id: userId,
    is_new_user: isNewUser,
    platform,
    app_version,
    device_info
  });
}
```

---

## Phase 3: Admin Authentication

### Simple Basic HTTP Auth (Recommended)

**File:** `/src/lib/auth/admin-auth.ts`

**Environment Variables:**
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here_minimum_20_chars
```

**Implementation:**
```typescript
export function checkBasicAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  const [username, password] = decoded.split(':');

  return username === process.env.ADMIN_USERNAME &&
         password === process.env.ADMIN_PASSWORD;
}

export function requireAuth(request: Request) {
  if (!checkBasicAuth(request)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Dashboard"'
      }
    });
  }
  return null; // Auth passed
}
```

**Security:**
- Username + password in `.env.local` (NOT committed)
- Browser handles auth UI automatically (built-in dialog)
- HTTPS only in production (Vercel handles this)
- No session management needed

---

## Phase 4: Admin Analytics Dashboard

### Page: `/src/app/admin/analytics/page.tsx`

**Authentication:** Protected by Basic HTTP Auth

**Metrics to Display:**

#### 1. Daily Active Users (DAU)
- Chart: Line graph showing DAU for last 30 days
- Today's DAU as headline number
- % change vs yesterday

#### 2. New Users
- Chart: Line graph showing new users for last 30 days
- New users today
- % change vs yesterday
- Total users (all time from auth.users)

#### 3. User Retention (Cohort-Based) ⭐ NEW
- **Retention Curve Chart**: Line graph showing Day 1, Day 3, Day 7, Day 14, Day 30 retention
- **Cohort Table**: Shows retention by signup date cohort

**Retention Calculation:**
```
Day 0 = User signup date (from auth.users.created_at)
Day 1 Retention = (Users who had session on Day 1) / (Total users who signed up on Day 0)
Day 3 Retention = (Users who had session on Day 3) / (Total users who signed up on Day 0)
Day 7 Retention = (Users who had session on Day 7) / (Total users who signed up on Day 0)
```

**Example:**
- Oct 1: 100 users signed up (Day 0)
- Oct 2: 60 of those users came back (Day 1 retention = 60%)
- Oct 4: 50 of those users came back (Day 3 retention = 50%)
- Oct 8: 40 of those users came back (Day 7 retention = 40%)

#### 3b. Session Length Analytics ⭐ NEW
- **Average Session Duration**: Headline metric (in minutes)
- **Session Length Distribution**: Histogram showing how long users stay
- **Session Length Over Time**: Line chart showing average session duration trend

**Session Length Calculation:**
```
Session Length (minutes) = CEIL((last_heartbeat - session_start) / 60 seconds)
```

**Distribution Buckets:**
- 0-1 min: Brief visits
- 1-3 min: Quick sessions
- 3-5 min: Medium sessions
- 5-10 min: Engaged sessions
- 10+ min: Deep engagement

#### 4. Exams Generated
- Chart: Bar chart showing exams/day for last 30 days
- Total exams generated (all time)
- Exams today

#### 5. User Engagement
- Average sessions per user
- Average session duration
- DAU/MAU ratio (stickiness)

#### 6. Platform Breakdown
- Pie chart: iOS vs Android vs Web
- Table: Sessions by platform

#### 7. Top Subjects/Categories
- Table: Most popular exam subjects
- Table: Most popular exam categories
- Based on `examgenie_exams` data

---

## Phase 5: Analytics API Endpoint

### Endpoint: `GET /api/admin/analytics`

**File:** `/src/app/api/admin/analytics/route.ts`

**Authentication:** Requires Basic HTTP Auth

**Response:**
```json
{
  "dau": {
    "today": 45,
    "yesterday": 38,
    "change_percent": 18.4,
    "last_30_days": [
      { "date": "2025-10-20", "users": 45 },
      { "date": "2025-10-19", "users": 38 }
    ]
  },
  "new_users": {
    "today": 12,
    "yesterday": 8,
    "change_percent": 50.0,
    "last_30_days": [
      { "date": "2025-10-20", "count": 12 },
      { "date": "2025-10-19", "count": 8 }
    ]
  },
  "retention": {
    "overall": {
      "day_1": 65.5,
      "day_3": 52.0,
      "day_7": 42.3,
      "day_14": 28.7,
      "day_30": 18.2
    },
    "cohorts": [
      {
        "signup_date": "2025-10-15",
        "users": 25,
        "day_1": 68.0,
        "day_3": 56.0,
        "day_7": 44.0,
        "day_14": null,
        "day_30": null
      },
      {
        "signup_date": "2025-10-01",
        "users": 42,
        "day_1": 64.3,
        "day_3": 50.0,
        "day_7": 45.2,
        "day_14": 31.0,
        "day_30": 19.0
      }
    ]
  },
  "session_length": {
    "average_minutes": 6.8,
    "median_minutes": 5.0,
    "distribution": [
      { "bucket": "0-1 min", "count": 120, "percentage": 15 },
      { "bucket": "1-3 min", "count": 200, "percentage": 25 },
      { "bucket": "3-5 min", "count": 240, "percentage": 30 },
      { "bucket": "5-10 min", "count": 160, "percentage": 20 },
      { "bucket": "10+ min", "count": 80, "percentage": 10 }
    ],
    "trend_last_30_days": [
      { "date": "2025-10-20", "avg_minutes": 7.2 },
      { "date": "2025-10-19", "avg_minutes": 6.5 }
    ]
  },
  "exams": {
    "today": 12,
    "total": 132,
    "last_30_days": [
      { "date": "2025-10-20", "count": 12 }
    ]
  },
  "users": {
    "total": 87,
    "active_7d": 34,
    "active_30d": 65,
    "avg_sessions_per_user": 3.2,
    "avg_session_duration_minutes": 8.5,
    "stickiness": 51.9
  },
  "platforms": {
    "ios": { "sessions": 450, "percentage": 65 },
    "android": { "sessions": 200, "percentage": 29 },
    "web": { "sessions": 42, "percentage": 6 }
  },
  "top_subjects": [
    { "subject": "Historia", "count": 45 },
    { "subject": "Matematiikka", "count": 32 }
  ],
  "top_categories": [
    { "category": "core_academics", "count": 89 },
    { "category": "mathematics", "count": 43 }
  ]
}
```

---

## SQL Queries for Analytics

### DAU Queries
```sql
-- DAU for today
SELECT COUNT(DISTINCT user_id) as dau
FROM user_sessions
WHERE DATE(session_start) = CURRENT_DATE;

-- DAU for last 30 days
SELECT
  DATE(session_start) as date,
  COUNT(DISTINCT user_id) as users
FROM user_sessions
WHERE session_start >= NOW() - INTERVAL '30 days'
GROUP BY DATE(session_start)
ORDER BY date DESC;
```

### New Users Queries
```sql
-- New users today
SELECT COUNT(*) as new_users
FROM user_sessions
WHERE DATE(session_start) = CURRENT_DATE
  AND is_new_user = TRUE;

-- New users last 30 days
SELECT
  DATE(session_start) as date,
  COUNT(*) as count
FROM user_sessions
WHERE session_start >= NOW() - INTERVAL '30 days'
  AND is_new_user = TRUE
GROUP BY DATE(session_start)
ORDER BY date DESC;

-- Total users (from auth.users)
SELECT COUNT(*) as total_users
FROM auth.users;
```

### User Retention Queries ⭐ NEW

**Overall Retention (all cohorts combined):**
```sql
-- Day 1 Retention
WITH new_users AS (
  SELECT
    user_id,
    DATE(MIN(session_start)) as signup_date
  FROM user_sessions
  WHERE is_new_user = TRUE
  GROUP BY user_id
),
day_1_returns AS (
  SELECT DISTINCT nu.user_id
  FROM new_users nu
  JOIN user_sessions us ON nu.user_id = us.user_id
  WHERE DATE(us.session_start) = nu.signup_date + INTERVAL '1 day'
),
day_3_returns AS (
  SELECT DISTINCT nu.user_id
  FROM new_users nu
  JOIN user_sessions us ON nu.user_id = us.user_id
  WHERE DATE(us.session_start) = nu.signup_date + INTERVAL '3 days'
)
SELECT
  COUNT(DISTINCT nu.user_id) as total_users,
  COUNT(DISTINCT d1.user_id) as returned_day_1,
  ROUND((COUNT(DISTINCT d1.user_id)::FLOAT / COUNT(DISTINCT nu.user_id)) * 100, 2) as day_1_retention,
  COUNT(DISTINCT d3.user_id) as returned_day_3,
  ROUND((COUNT(DISTINCT d3.user_id)::FLOAT / COUNT(DISTINCT nu.user_id)) * 100, 2) as day_3_retention
FROM new_users nu
LEFT JOIN day_1_returns d1 ON nu.user_id = d1.user_id
LEFT JOIN day_3_returns d3 ON nu.user_id = d3.user_id;

-- Similar queries for Day 7, Day 14, Day 30 (just add more CTEs)
```

**Cohort-Based Retention (by signup date):**
```sql
WITH signup_cohorts AS (
  SELECT
    user_id,
    DATE(MIN(session_start)) as signup_date
  FROM user_sessions
  WHERE is_new_user = TRUE
  GROUP BY user_id
),
cohort_activity AS (
  SELECT
    sc.signup_date,
    sc.user_id,
    DATE(us.session_start) as activity_date,
    DATE(us.session_start) - sc.signup_date as days_since_signup
  FROM signup_cohorts sc
  LEFT JOIN user_sessions us ON sc.user_id = us.user_id
)
SELECT
  signup_date,
  COUNT(DISTINCT user_id) as total_users,
  ROUND(
    COUNT(DISTINCT CASE WHEN days_since_signup = 1 THEN user_id END)::FLOAT /
    COUNT(DISTINCT user_id) * 100,
    2
  ) as day_1_retention,
  ROUND(
    COUNT(DISTINCT CASE WHEN days_since_signup = 3 THEN user_id END)::FLOAT /
    COUNT(DISTINCT user_id) * 100,
    2
  ) as day_3_retention,
  ROUND(
    COUNT(DISTINCT CASE WHEN days_since_signup = 7 THEN user_id END)::FLOAT /
    COUNT(DISTINCT user_id) * 100,
    2
  ) as day_7_retention,
  ROUND(
    COUNT(DISTINCT CASE WHEN days_since_signup = 14 THEN user_id END)::FLOAT /
    COUNT(DISTINCT user_id) * 100,
    2
  ) as day_14_retention,
  ROUND(
    COUNT(DISTINCT CASE WHEN days_since_signup = 30 THEN user_id END)::FLOAT /
    COUNT(DISTINCT user_id) * 100,
    2
  ) as day_30_retention
FROM cohort_activity
WHERE signup_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY signup_date
ORDER BY signup_date DESC;
```

### Other Metrics
```sql
-- Platform breakdown
SELECT
  platform,
  COUNT(*) as sessions,
  ROUND((COUNT(*)::FLOAT / SUM(COUNT(*)) OVER ()) * 100, 2) as percentage
FROM user_sessions
WHERE session_start >= NOW() - INTERVAL '30 days'
GROUP BY platform;

-- Average session duration (rounded up)
SELECT
  AVG(CEIL(EXTRACT(EPOCH FROM (last_heartbeat - session_start)) / 60)) as avg_minutes,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CEIL(EXTRACT(EPOCH FROM (last_heartbeat - session_start)) / 60)) as median_minutes
FROM user_sessions
WHERE session_start >= NOW() - INTERVAL '30 days';

-- Session length distribution
WITH session_lengths AS (
  SELECT
    CEIL(EXTRACT(EPOCH FROM (last_heartbeat - session_start)) / 60) as duration_minutes
  FROM user_sessions
  WHERE session_start >= NOW() - INTERVAL '30 days'
)
SELECT
  CASE
    WHEN duration_minutes <= 1 THEN '0-1 min'
    WHEN duration_minutes <= 3 THEN '1-3 min'
    WHEN duration_minutes <= 5 THEN '3-5 min'
    WHEN duration_minutes <= 10 THEN '5-10 min'
    ELSE '10+ min'
  END as bucket,
  COUNT(*) as count,
  ROUND((COUNT(*)::FLOAT / SUM(COUNT(*)) OVER ()) * 100, 2) as percentage
FROM session_lengths
GROUP BY bucket
ORDER BY
  CASE bucket
    WHEN '0-1 min' THEN 1
    WHEN '1-3 min' THEN 2
    WHEN '3-5 min' THEN 3
    WHEN '5-10 min' THEN 4
    WHEN '10+ min' THEN 5
  END;

-- Session length trend over time
SELECT
  DATE(session_start) as date,
  AVG(CEIL(EXTRACT(EPOCH FROM (last_heartbeat - session_start)) / 60)) as avg_minutes
FROM user_sessions
WHERE session_start >= NOW() - INTERVAL '30 days'
GROUP BY DATE(session_start)
ORDER BY date DESC;

-- Average sessions per user
SELECT
  COUNT(*)::FLOAT / COUNT(DISTINCT user_id) as avg_sessions_per_user
FROM user_sessions
WHERE session_start >= NOW() - INTERVAL '30 days';

-- Stickiness (DAU/MAU)
WITH dau AS (
  SELECT COUNT(DISTINCT user_id) as count
  FROM user_sessions
  WHERE DATE(session_start) = CURRENT_DATE
),
mau AS (
  SELECT COUNT(DISTINCT user_id) as count
  FROM user_sessions
  WHERE session_start >= NOW() - INTERVAL '30 days'
)
SELECT
  ROUND((dau.count::FLOAT / mau.count) * 100, 2) as stickiness_percent
FROM dau, mau;

-- Top subjects
SELECT
  subject,
  COUNT(*) as count
FROM examgenie_exams
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND subject IS NOT NULL
GROUP BY subject
ORDER BY count DESC
LIMIT 10;

-- Top categories
SELECT
  category,
  COUNT(*) as count
FROM examgenie_exams
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND category IS NOT NULL
GROUP BY category
ORDER BY count DESC
LIMIT 10;
```

---

## Phase 6: Frontend Dashboard UI

### Technology Choice

**Recharts** (Recommended)
- Free, open source
- React-friendly, TypeScript support
- Good documentation
- Small bundle size (~50KB gzipped)

**Installation:**
```bash
npm install recharts
```

### Components Needed

1. **MetricCard** - Displays single metric with trend indicator
2. **LineChart** - DAU over time + new users over time
3. **BarChart** - Exams generated over time
4. **RetentionChart** - Retention curve (Day 1, 3, 7, 14, 30)
5. **CohortTable** - Retention by signup date cohort
6. **PieChart** - Platform breakdown
7. **DataTable** - Top subjects/categories
8. **SessionLengthHistogram** - Distribution of session durations (buckets)
9. **SessionTrendChart** - Average session length over time

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ExamGenie Analytics Dashboard                                   │
│ Last updated: 2025-10-20 14:32              [Refresh Button]   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────────┬──────────────────┐
│   DAU Today  │ New Users    │ Total Users  │ Day 1 Retention  │ Avg Session Len  │
│      45      │      12      │      87      │      65.5%       │    6.8 min       │
│   +18.4%     │    +50%      │              │    (overall)     │                  │
└──────────────┴──────────────┴──────────────┴──────────────────┴──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Daily Active Users (Last 30 Days)                               │
│ [Line Chart with DAU trend]                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ New Users (Last 30 Days)                                        │
│ [Line Chart with new user signups]                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ User Retention Curve                                            │
│ [Line Chart: Day 1 (65%), Day 3 (52%), Day 7 (42%),            │
│              Day 14 (29%), Day 30 (18%)]                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Retention by Cohort (Last 30 Days)                              │
│ Signup Date │ Users │ Day 1 │ Day 3 │ Day 7 │ Day 14 │ Day 30  │
│ 2025-10-15  │   25  │  68%  │  56%  │  44%  │   -    │   -    │
│ 2025-10-10  │   32  │  62%  │  54%  │  38%  │  28%   │   -    │
│ 2025-10-01  │   42  │  64%  │  50%  │  45%  │  31%   │  19%   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Session Length Distribution                                     │
│ [Histogram: Buckets 0-1min, 1-3min, 3-5min, 5-10min, 10+min]   │
│ Shows how long users stay in the app per session               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Average Session Length (Last 30 Days)                           │
│ [Line Chart showing session duration trend over time]           │
│ Median: 5.0 min                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Exams Generated (Last 30 Days)                                  │
│ [Bar Chart]                                                     │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────┬────────────────────────────────────────────┐
│ Platform Breakdown │ Engagement Metrics                         │
│ [Pie Chart]        │ Avg Sessions/User: 3.2                    │
│                    │ Avg Session Duration: 8.5 min             │
│                    │ Stickiness (DAU/MAU): 51.9%               │
└────────────────────┴────────────────────────────────────────────┘

┌────────────────────┬────────────────────────────────────────────┐
│ Top Subjects       │ Top Categories                             │
│ [Table]            │ [Table]                                    │
└────────────────────┴────────────────────────────────────────────┘
```

### Retention Chart Explanation

**Visual:** Line chart showing retention percentage over time
- X-axis: Days since signup (Day 0, 1, 3, 7, 14, 30)
- Y-axis: Retention % (0-100%)
- Line: Retention curve

**Interpretation:**
- High Day 1 retention (>60%) = good onboarding
- High Day 3 retention (>50%) = early engagement
- High Day 7 retention (>40%) = product stickiness
- High Day 30 retention (>20%) = long-term value

### Session Length Visualization

**Histogram Chart:**
- X-axis: Duration buckets (0-1, 1-3, 3-5, 5-10, 10+ minutes)
- Y-axis: Number of sessions (or percentage)
- Bars: Height shows session count in each bucket

**Trend Line Chart:**
- X-axis: Date (last 30 days)
- Y-axis: Average session length (minutes)
- Line: Shows if sessions are getting longer/shorter over time

**Metrics:**
- Average session length: 6.8 minutes
- Median session length: 5.0 minutes
- Shows engagement quality (longer = more engaged)

---

## Phase 7: Flutter Client Integration

**No changes needed to Flutter app's current behavior!**

The mobile app already sends `student_id` parameter (which is actually `auth.users.id`). The backend will accept both `user_id` and `student_id` for backward compatibility.

**Current Flutter behavior:**
```dart
// Already working - just sends student_id
await http.post(
  Uri.parse('$baseUrl/api/session/heartbeat'),
  body: {'student_id': currentUser.id}
);
```

**API Contract Documentation:**

**Endpoint:** `POST /api/session/heartbeat`

**Request:**
```json
{
  "user_id": "uuid (accepts student_id for backward compat)",
  "platform": "ios | android | web (optional)",
  "app_version": "string (optional)",
  "device_info": {
    "model": "string (optional)",
    "os_version": "string (optional)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid",
  "is_new_user": false
}
```

---

## Implementation Checklist

### Backend (2.5 hours)
- [ ] Create migration file for `user_sessions` table
- [ ] Run migration on staging database
- [ ] Create `/api/session/heartbeat` endpoint
  - [ ] Accept both `user_id` and `student_id` params
  - [ ] Check for existing sessions to set `is_new_user` flag
  - [ ] Handle 30-minute session window logic
- [ ] Test heartbeat endpoint with curl
- [ ] Create `/api/admin/analytics` endpoint
  - [ ] Implement DAU queries
  - [ ] Implement new user queries
  - [ ] Implement retention queries (overall + cohort with Day 1, 3, 7, 14, 30)
  - [ ] Implement session length queries (average, median, distribution, trend)
  - [ ] Implement exam/platform/subject queries
- [ ] Add Basic HTTP Auth middleware
- [ ] Test analytics API returns correct data

### Frontend (1.5 hours)
- [ ] Install Recharts: `npm install recharts`
- [ ] Create analytics dashboard page `/admin/analytics/page.tsx`
- [ ] Build MetricCard component (with trend indicators)
- [ ] Integrate DAU LineChart
- [ ] Integrate New Users LineChart
- [ ] Integrate Retention Curve LineChart (Day 1, 3, 7, 14, 30)
- [ ] Build Cohort Retention Table
- [ ] Integrate Session Length Histogram
- [ ] Integrate Session Trend LineChart
- [ ] Integrate Exams BarChart
- [ ] Integrate Platform PieChart
- [ ] Build Engagement metrics section
- [ ] Add DataTable for top subjects/categories
- [ ] Add refresh button (re-fetch analytics)
- [ ] Test on localhost
- [ ] Deploy to staging

### Testing (30 min)
- [ ] Test heartbeat endpoint (create sessions)
- [ ] Verify sessions appear in database with correct `is_new_user` flag
- [ ] Create test sessions for multiple users over multiple days
- [ ] Verify retention calculations are correct
- [ ] Test Basic HTTP Auth works
- [ ] Verify analytics page displays correct data
- [ ] Test on mobile viewport (640px)
- [ ] Check performance with 1000+ sessions

### Documentation (15 min)
- [ ] Document API endpoints in `/docs/api/`
- [ ] Add admin credentials to team password manager
- [ ] Update CLAUDE.md with new endpoints and tables
- [ ] Document retention calculation methodology

---

## Security Considerations

1. **Admin Credentials**
   - Store in environment variables (`.env.local`, Vercel env vars)
   - Never commit to Git
   - Use strong password (20+ characters, random generated)

2. **Rate Limiting**
   - Heartbeat endpoint: 60 req/hour per user (one per minute max)
   - Admin API: Protected by Basic Auth, no public access

3. **Data Privacy**
   - Only aggregate analytics (no individual user data shown)
   - No IP addresses stored
   - Device info is optional and non-identifying

4. **Production Deployment**
   - Add `user_sessions` table to production via migration
   - Set admin credentials in Vercel production env vars
   - Enable HTTPS only (Vercel handles this automatically)

---

## Future Enhancements (Not in Scope)

- [ ] Real-time dashboard updates (WebSockets or polling)
- [ ] Export analytics as CSV/PDF
- [ ] Email reports (weekly summary)
- [ ] Alerts (DAU drops below threshold, retention < 50%, etc.)
- [ ] Advanced cohort analysis (by acquisition channel, device type)
- [ ] Funnel analysis (signup → first exam → exam completion)
- [ ] Revenue analytics (if monetization added)
- [ ] A/B test tracking
- [ ] Geographic breakdown (if location data collected)

---

## Files to Create/Modify

### New Files
1. `/supabase/migrations/20251020_create_user_sessions.sql` - Database schema
2. `/src/app/api/session/heartbeat/route.ts` - Heartbeat endpoint
3. `/src/app/api/admin/analytics/route.ts` - Analytics data API
4. `/src/app/admin/analytics/page.tsx` - Dashboard UI
5. `/src/lib/auth/admin-auth.ts` - Basic HTTP Auth logic
6. `/src/components/admin/MetricCard.tsx` - Reusable metric card
7. `/src/components/admin/charts/DAUChart.tsx` - DAU line chart
8. `/src/components/admin/charts/NewUsersChart.tsx` - New users line chart
9. `/src/components/admin/charts/RetentionChart.tsx` - Retention curve
10. `/src/components/admin/charts/ExamsChart.tsx` - Exams bar chart
11. `/src/components/admin/charts/PlatformChart.tsx` - Platform pie chart
12. `/src/components/admin/charts/SessionLengthHistogram.tsx` - Session duration histogram
13. `/src/components/admin/charts/SessionTrendChart.tsx` - Session length trend over time
14. `/src/components/admin/tables/CohortTable.tsx` - Retention cohort table
15. `/src/components/admin/tables/DataTable.tsx` - Subjects/categories table

### Modified Files
1. `/.env.local` - Add `ADMIN_USERNAME` and `ADMIN_PASSWORD`
2. `/CLAUDE.md` - Document new endpoints and tables
3. `/README.md` - Add admin analytics to features list
4. `/package.json` - Add `recharts` dependency

---

## Environment Variables Needed

```bash
# .env.local (add these)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<generate_secure_random_password_here>

# Example secure password generation (run in terminal):
# openssl rand -base64 32
```

**Production (Vercel):**
- Set same variables in Vercel dashboard → Settings → Environment Variables
- Environment: Production + Preview

---

## Success Metrics

After implementation, we should see:
- ✅ User sessions being logged on every app open
- ✅ `is_new_user` flag correctly set for first-time sessions
- ✅ DAU chart showing daily trends
- ✅ New user chart showing growth
- ✅ Retention curve showing Day 1/3/7/14/30 percentages
- ✅ Cohort table showing retention by signup date
- ✅ Session length histogram showing duration distribution
- ✅ Session length trend chart showing engagement over time
- ✅ Average and median session duration metrics
- ✅ Exams generated tracked over time
- ✅ Platform breakdown visible
- ✅ Admin dashboard accessible only with password
- ✅ Page loads in <2 seconds with 30 days of data

---

## Timeline

**Day 1 (2.5 hours):**
- Create database migration
- Build heartbeat endpoint with is_new_user logic
- Build analytics API endpoint with all queries
- Implement Basic HTTP Auth
- Test with curl/Postman

**Day 2 (1.5 hours):**
- Install Recharts
- Build all chart components
- Build cohort retention table
- Create analytics dashboard page
- Wire up API data to charts

**Day 3 (30 min):**
- Test end-to-end
- Create test data (multiple users, multiple days)
- Verify retention calculations
- Deploy to staging
- Verify production migration
- Deploy to production

**Total:** ~4.5 hours for backend + frontend + testing

---

## Retention Calculation Example

**Scenario:**
- Oct 1: 100 users signed up (Day 0)
- Oct 2: 60 users came back (Day 1)
- Oct 4: 52 users came back (Day 3)
- Oct 8: 40 users came back (Day 7)
- Oct 15: 30 users came back (Day 14)
- Oct 31: 20 users came back (Day 30)

**Retention:**
- Day 1: 60/100 = 60%
- Day 3: 52/100 = 52%
- Day 7: 40/100 = 40%
- Day 14: 30/100 = 30%
- Day 30: 20/100 = 20%

**Chart would show:** Declining line from 60% → 52% → 40% → 30% → 20% over 30 days

**Good Benchmark:**
- Day 1: >40% (SaaS: 40-60%, social: 30-40%)
- Day 3: >35% (SaaS: 35-50%, social: 25-35%)
- Day 7: >25% (SaaS: 25-40%, social: 20-30%)
- Day 30: >15% (SaaS: 15-30%, social: 10-20%)

## Session Length Calculation Example

**Session Records:**
- User A: session_start = 10:00:00, last_heartbeat = 10:06:30
  - Duration: 6.5 minutes → rounded up = 7 minutes
- User B: session_start = 11:00:00, last_heartbeat = 11:02:15
  - Duration: 2.25 minutes → rounded up = 3 minutes
- User C: session_start = 14:00:00, last_heartbeat = 14:12:45
  - Duration: 12.75 minutes → rounded up = 13 minutes

**Distribution:**
- 0-1 min: 0 sessions (0%)
- 1-3 min: 1 session (33%) - User B
- 3-5 min: 0 sessions (0%)
- 5-10 min: 1 session (33%) - User A
- 10+ min: 1 session (33%) - User C

**Average:** (7 + 3 + 13) / 3 = 7.67 minutes
**Median:** 7 minutes

---

## Questions Resolved

1. ✅ **Auth preference:** Basic HTTP Auth (simpler, built into browsers)
2. ✅ **Heartbeat frequency:** Only on app open (simpler, already implemented in mobile)
3. ✅ **Session duration definition:** 30 minutes (industry standard)
4. ✅ **Migration timing:** Test on staging first, then production
5. ✅ **Admin access:** Single admin user (hardcoded credentials)
6. ✅ **User tracking:** Use auth.users.id directly (ignore empty students table)
7. ✅ **Retention tracking:** Cohort-based with Day 1/7/14/30 milestones

---

**Ready to implement! 🚀**
