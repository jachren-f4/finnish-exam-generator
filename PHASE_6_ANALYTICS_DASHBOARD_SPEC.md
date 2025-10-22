# 📊 Phase 6: Analytics Dashboard - Architecture & Specification

**For**: Backend + Frontend Teams
**Purpose**: Build a web-based business analytics dashboard to track monetization metrics
**Timeline**: 3-4 days
**Status**: Requirements & specification phase

---

## 📋 Executive Summary

You need to build a **business analytics dashboard** (separate web app) that shows real-time monetization metrics. Think of it like Stripe's dashboard or RevenueCat's analytics portal.

**What it does:**
- Tracks revenue, subscriptions, churn, and user growth
- Shows trends over time (daily, weekly, monthly)
- Identifies high-value users and cohorts
- Monitors subscription health and LTV

**What it doesn't do:**
- User-facing (not in the Flutter app)
- Real-time transaction details (use RevenueCat for that)
- Individual user data (use Supabase for that)

---

## 🎯 Part 1: What's Actually Happening

### Data Flow

```
Flutter App
    ↓
(Event logging → Supabase)
    ↓
Supabase Database
├─ subscriptions
├─ subscription_history
└─ monetization_events
    ↓
(Dashboard queries data)
    ↓
Backend API Endpoints
    ↓
Web Dashboard (React/Vue/Svelte)
    ↓
Business Team Views Analytics
```

### The Process

1. **Flutter app logs events** to Supabase (this is already built):
   - User subscribed
   - Trial initiated
   - Exam created
   - Paywall shown
   - etc.

2. **Backend API aggregates this data**:
   - Queries raw events from Supabase
   - Calculates metrics (revenue, churn, LTV, etc.)
   - Caches results for performance
   - Returns formatted JSON to dashboard

3. **Web dashboard visualizes it**:
   - Calls backend API endpoints
   - Displays charts, numbers, tables
   - Allows filtering by date range, country, product, etc.

4. **Business team uses it**:
   - Track revenue trends
   - Monitor subscription health
   - Make pricing decisions
   - Identify growth opportunities

---

## 📈 Part 2: Core Metrics & KPIs

### 1. Revenue Metrics

**Total Revenue**
- What: Sum of all subscription purchases
- Calculation: Sum all successful transactions in subscription_history
- Filters: Date range, country, product type
- Display: $123,456.78 YTD

**Monthly Recurring Revenue (MRR)**
- What: Predictable revenue from active subscriptions
- Calculation: Sum of (active subscriptions × monthly price)
  - Weekly: Convert to monthly (4.3 weeks)
  - Annual: Divide by 12
- Filters: Date as of (MRR can vary by date)
- Display: $5,234.50 (current month)

**Average Revenue Per User (ARPU)**
- What: Revenue divided by active users
- Calculation: Total subscription revenue / active user count
- Filters: Date range, country
- Display: $12.34/user/month

**Lifetime Value (LTV)**
- What: Total revenue from average user before churning
- Calculation: Average purchase value × average customer lifetime (months)
- Example: If user pays $50/year and stays for 2 years = $100 LTV
- Filters: Cohort (by signup date), country
- Display: $87.50/user

---

### 2. Subscription Metrics

**Active Subscriptions**
- What: How many users have valid, non-expired subscriptions
- Calculation: Count rows in subscriptions where:
  - `subscription_status` IN ('premium_weekly', 'premium_annual')
  - `subscription_expiry` > now()
- Filters: By product (weekly vs annual)
- Display: 234 active subscriptions

**New Subscriptions**
- What: How many subscriptions started in a period
- Calculation: Count rows in subscription_history where event_type = 'INITIAL_PURCHASE' in date range
- Filters: Date range, country, product
- Display: 45 new subscriptions this week

**Subscription Breakdown**
- What: Split of weekly vs annual (mix)
- Calculation: Count by product_id in subscriptions
- Display:
  - Weekly: 156 (67%)
  - Annual: 78 (33%)

**Subscription Status Distribution**
- What: Pie chart of all subscription statuses
- Calculation: Count by subscription_status
- Display:
  - Active: 234 (60%)
  - Cancelled: 89 (23%)
  - Free Trial: 56 (14%)
  - Unactivated: 12 (3%)

---

### 3. Churn & Retention

**Churn Rate**
- What: % of users who cancelled in a period
- Calculation:
  - Churned = Count event_type = 'CANCELLATION' in period
  - Start = Count of active subs at period start
  - Churn Rate = Churned / Start × 100
- Example: 10 cancelled out of 200 active = 5% monthly churn
- Filters: Date range, country, product
- Display: 5.2% monthly churn (increasing/decreasing trend)

**Retention Cohorts**
- What: % of users from each cohort still active
- How: Group users by signup month, track how many stay each month
- Display:
  ```
  Cohort    Month 1  Month 2  Month 3  Month 4
  Jan 2024   100%     85%      72%      68%
  Feb 2024   100%     82%      69%
  Mar 2024   100%     78%
  Apr 2024   100%
  ```
- Insight: Is retention getting better or worse over time?

**Refund Rate**
- What: % of purchases that were refunded
- Calculation: Count event_type = 'REFUND' / total purchases × 100
- Display: 2.1% of purchases refunded (high = problem)

---

### 4. Trial Metrics

**Trial Conversions**
- What: % of trial users who become paying customers
- Calculation: Users who initiated trial → purchased within 3 days / total trials × 100
- Example: 100 started trial, 35 purchased = 35% conversion
- Filters: Date range (cohort)
- Display: 35% conversion rate
- Insight: Is the paywall working?

**Trial to Paid Timeline**
- What: How fast do trial users convert?
- Display: Average days to convert (should be within 3-day window)
- Example: Trial users convert in 1.8 days on average

**Trial Abandonment**
- What: Users who started trial but didn't purchase
- Calculation: Started trial - Purchased / Started trial × 100
- Example: 100 trials - 35 purchases = 65 abandoned
- Insight: Need better paywall copy? Product issues?

---

### 5. User Metrics

**Total Users**
- What: Count of all users who have created an account
- Calculation: Count rows in auth.users
- Display: 2,456 total users (YTD growth)

**Paying Users**
- What: Users with active subscriptions
- Calculation: Count where subscription_status IN ('premium_weekly', 'premium_annual')
- Display: 234 paying users (9.5% of total)

**Free Tier Users**
- What: Users in trial or unactivated (not paying)
- Calculation: Total - Paying
- Display: 2,222 free tier users

**Daily Active Users (DAU)**
- What: How many users create exams per day
- Calculated from: Count of exam creation events per day
- Display: 123 DAU (trend: ↑ 12% WoW)

---

### 6. Geographic Metrics

**Revenue by Country**
- What: Breakdown of revenue by user location
- Calculation: Sum price where user_country = X
- Display:
  ```
  US:     $45,234.56  (45%)
  Canada: $18,234.23  (18%)
  UK:     $15,672.89  (16%)
  Germany: $12,456.78  (12%)
  Finland: $8,901.54   (9%)
  ```
- Insight: Where is money coming from?

**Conversion Rate by Country**
- What: Trial → Paid conversion in each country
- Display:
  ```
  US:      38% (best)
  Canada:  32%
  UK:      29%
  Germany: 25%
  Finland: 22% (worst)
  ```
- Insight: Do pricing tiers work better in some countries?

---

### 7. Product Mix Metrics

**Weekly vs Annual Split**
- What: Which subscription type is more popular?
- Display:
  - Weekly: 156 active (67%)
  - Annual: 78 active (33%)
- Trend: Is mix shifting?

**ARPU by Product**
- What: Average revenue per user for each product
- Weekly: $4.99 = lower ARPU but higher churn
- Annual: $49.99 = higher ARPU but lower churn
- Decision: Should we push annual more?

---

## 🔌 Part 3: Backend API Endpoints

The backend needs to provide these endpoints. The dashboard will call them to get data.

### Authentication
```
All endpoints require:
- Header: Authorization: Bearer <admin_token>
- Only dashboard admins can access
```

---

### Endpoint 1: GET /api/analytics/dashboard/summary

**What it does**: Returns the main KPI cards for dashboard landing page

**Query Parameters**:
```
- start_date: 2024-01-01 (ISO format)
- end_date: 2024-10-22 (ISO format)
- country: US (optional, filter by country)
```

**Response**:
```json
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-10-22",
    "days": 295
  },
  "revenue": {
    "total": 123456.78,
    "currency": "USD",
    "previous_period": 98234.56,
    "change_percent": 25.7
  },
  "mrr": {
    "current": 5234.50,
    "previous_month": 4890.23,
    "trend": "up"
  },
  "active_subscriptions": {
    "total": 234,
    "weekly": 156,
    "annual": 78,
    "previous_period": 212,
    "change_percent": 10.4
  },
  "paying_users": {
    "total": 234,
    "free_tier": 2222,
    "penetration": 9.5
  },
  "churn_rate": {
    "current": 5.2,
    "trend": "stable"
  },
  "trial_conversion": {
    "rate": 35,
    "trials_started": 156,
    "converted": 55
  }
}
```

---

### Endpoint 2: GET /api/analytics/revenue/timeline

**What it does**: Revenue over time (for line chart)

**Query Parameters**:
```
- start_date: 2024-01-01
- end_date: 2024-10-22
- granularity: day | week | month (default: day)
- country: US (optional)
```

**Response**:
```json
{
  "data": [
    {
      "date": "2024-10-01",
      "revenue": 1234.56,
      "mrr": 4567.89,
      "transactions": 23
    },
    {
      "date": "2024-10-02",
      "revenue": 1456.78,
      "mrr": 4670.12,
      "transactions": 28
    }
    // ... more days
  ],
  "summary": {
    "total_revenue": 123456.78,
    "average_daily": 418.29,
    "peak_day": "2024-10-15"
  }
}
```

---

### Endpoint 3: GET /api/analytics/subscriptions/timeline

**What it does**: Subscription count over time (for stacked area chart)

**Query Parameters**:
```
- start_date: 2024-01-01
- end_date: 2024-10-22
- granularity: day | week | month
```

**Response**:
```json
{
  "data": [
    {
      "date": "2024-10-01",
      "active": 195,
      "weekly": 130,
      "annual": 65,
      "cancelled": 45,
      "trials": 234
    },
    {
      "date": "2024-10-02",
      "active": 198,
      "weekly": 132,
      "annual": 66,
      "cancelled": 46,
      "trials": 240
    }
    // ... more days
  ]
}
```

---

### Endpoint 4: GET /api/analytics/geography/revenue

**What it does**: Revenue breakdown by country (for pie chart)

**Query Parameters**:
```
- start_date: 2024-01-01
- end_date: 2024-10-22
```

**Response**:
```json
{
  "countries": [
    {
      "code": "US",
      "name": "United States",
      "revenue": 45234.56,
      "percentage": 45.2,
      "users": 120,
      "avg_value": 377.00
    },
    {
      "code": "CA",
      "name": "Canada",
      "revenue": 18234.23,
      "percentage": 18.2,
      "users": 45,
      "avg_value": 404.98
    }
    // ... more countries
  ],
  "total": 100234.56
}
```

---

### Endpoint 5: GET /api/analytics/geography/conversion

**What it does**: Conversion rates by country (for table)

**Query Parameters**:
```
- start_date: 2024-01-01
- end_date: 2024-10-22
```

**Response**:
```json
{
  "countries": [
    {
      "code": "US",
      "name": "United States",
      "trials_started": 156,
      "converted": 59,
      "conversion_rate": 37.8,
      "avg_days_to_convert": 1.8
    },
    {
      "code": "CA",
      "name": "Canada",
      "trials_started": 78,
      "converted": 25,
      "conversion_rate": 32.1,
      "avg_days_to_convert": 2.1
    }
    // ... more countries
  ]
}
```

---

### Endpoint 6: GET /api/analytics/churn/timeline

**What it does**: Churn rate over time (for line chart)

**Query Parameters**:
```
- start_date: 2024-01-01
- end_date: 2024-10-22
- granularity: week | month (can't be day)
```

**Response**:
```json
{
  "periods": [
    {
      "period": "2024-W40",
      "start_date": "2024-10-01",
      "end_date": "2024-10-07",
      "starting_subscriptions": 195,
      "churned": 12,
      "churn_rate": 6.2,
      "trend": "up"
    },
    {
      "period": "2024-W41",
      "start_date": "2024-10-08",
      "end_date": "2024-10-14",
      "starting_subscriptions": 203,
      "churned": 9,
      "churn_rate": 4.4,
      "trend": "down"
    }
    // ... more weeks/months
  ]
}
```

---

### Endpoint 7: GET /api/analytics/cohorts/retention

**What it does**: Retention cohort table (which months do users stay?)

**Query Parameters**:
```
- max_months: 12 (how many months to track)
```

**Response**:
```json
{
  "cohorts": [
    {
      "cohort": "2024-01",
      "cohort_name": "January 2024",
      "size": 156,
      "months": [
        {
          "month": 0,
          "users_active": 156,
          "retention_pct": 100.0
        },
        {
          "month": 1,
          "users_active": 132,
          "retention_pct": 84.6
        },
        {
          "month": 2,
          "users_active": 112,
          "retention_pct": 71.8
        },
        {
          "month": 3,
          "users_active": 98,
          "retention_pct": 62.8
        }
      ]
    },
    {
      "cohort": "2024-02",
      "cohort_name": "February 2024",
      "size": 198,
      "months": [
        {
          "month": 0,
          "users_active": 198,
          "retention_pct": 100.0
        },
        {
          "month": 1,
          "users_active": 162,
          "retention_pct": 81.8
        },
        {
          "month": 2,
          "users_active": 134,
          "retention_pct": 67.7
        }
      ]
    }
    // ... more cohorts
  ]
}
```

---

### Endpoint 8: GET /api/analytics/events/timeline

**What it does**: Key events over time (for stacked area: exams created, paywalls shown, etc.)

**Query Parameters**:
```
- start_date: 2024-01-01
- end_date: 2024-10-22
- granularity: day | week | month
```

**Response**:
```json
{
  "data": [
    {
      "date": "2024-10-01",
      "exams_created": 456,
      "paywalls_shown": 234,
      "paywall_conversions": 45,
      "conversion_rate": 19.2
    },
    {
      "date": "2024-10-02",
      "exams_created": 512,
      "paywalls_shown": 267,
      "paywall_conversions": 52,
      "conversion_rate": 19.5
    }
    // ... more days
  ]
}
```

---

### Endpoint 9: GET /api/analytics/products/comparison

**What it does**: Weekly vs Annual subscription comparison

**Query Parameters**:
```
- start_date: 2024-01-01
- end_date: 2024-10-22
```

**Response**:
```json
{
  "weekly": {
    "active_subscriptions": 156,
    "new_subscriptions": 45,
    "churn_rate": 6.2,
    "mrr": 1567.89,
    "arpu": 10.05,
    "price": 4.99,
    "conversion_rate": 32.1
  },
  "annual": {
    "active_subscriptions": 78,
    "new_subscriptions": 18,
    "churn_rate": 2.8,
    "mrr": 3289.50,
    "arpu": 42.17,
    "price": 49.99,
    "conversion_rate": 41.2
  },
  "comparison": {
    "weekly_percentage": 66.7,
    "annual_percentage": 33.3,
    "trend": "annual_growing"
  }
}
```

---

### Endpoint 10: GET /api/analytics/ltv/by-cohort

**What it does**: Lifetime value by signup cohort

**Query Parameters**:
```
- granularity: month | quarter | year
```

**Response**:
```json
{
  "cohorts": [
    {
      "cohort": "2024-01",
      "cohort_name": "January 2024",
      "ltv": 87.50,
      "avg_lifetime_months": 2.3,
      "avg_purchase_value": 37.89,
      "status": "ongoing"
    },
    {
      "cohort": "2024-02",
      "cohort_name": "February 2024",
      "ltv": 92.34,
      "avg_lifetime_months": 2.1,
      "avg_purchase_value": 43.12,
      "status": "ongoing"
    },
    {
      "cohort": "2023-12",
      "cohort_name": "December 2023",
      "ltv": 156.78,
      "avg_lifetime_months": 8.5,
      "avg_purchase_value": 18.45,
      "status": "churned"
    }
  ]
}
```

---

### Endpoint 11: GET /api/analytics/trials/funnel

**What it does**: Trial funnel (how many at each stage?)

**Query Parameters**:
```
- start_date: 2024-01-01
- end_date: 2024-10-22
```

**Response**:
```json
{
  "funnel": [
    {
      "stage": "trial_initiated",
      "label": "Started Trial",
      "count": 1234,
      "percentage": 100.0
    },
    {
      "stage": "day_1",
      "label": "Still Active Day 1",
      "count": 1089,
      "percentage": 88.3
    },
    {
      "stage": "day_2",
      "label": "Still Active Day 2",
      "count": 945,
      "percentage": 76.6
    },
    {
      "stage": "day_3",
      "label": "Still Active Day 3",
      "count": 812,
      "percentage": 65.8
    },
    {
      "stage": "converted",
      "label": "Converted to Paid",
      "count": 434,
      "percentage": 35.2
    }
  ],
  "dropoff": [
    {
      "from": "trial_initiated",
      "to": "day_1",
      "dropoff": 145,
      "dropoff_pct": 11.7
    },
    {
      "from": "day_1",
      "to": "day_2",
      "dropoff": 144,
      "dropoff_pct": 13.2
    }
  ]
}
```

---

## 📊 Part 4: Dashboard Pages & Visualizations

### Page 1: Dashboard Overview (Landing Page)

**KPI Cards**:
- Total Revenue (with % change)
- MRR (with trend)
- Active Subscriptions (with count breakdown)
- Churn Rate (with trend)
- Trial Conversion (%)
- Paying Users (%)

**Charts**:
1. **Revenue Timeline** (Line chart)
   - X-axis: Date
   - Y-axis: Revenue
   - Show: Daily or weekly trend
   - Insight: Is revenue growing?

2. **Subscription Growth** (Stacked Area chart)
   - X-axis: Date
   - Y-axis: Count
   - Layers: Active, Cancelled, Trials
   - Insight: How is subscriber count changing?

---

### Page 2: Revenue Analytics

**Metrics**:
- Total Revenue
- MRR
- Average Revenue Per User
- Lifetime Value

**Charts**:
1. **Revenue by Country** (Pie or Bar chart)
   - Show: US, Canada, UK, Germany, Finland
   - Insight: Where is money coming from?

2. **Revenue Timeline** (Line chart)
   - Daily, weekly, or monthly granularity
   - Show: Trend and seasonality
   - Insight: Revenue predictability

3. **ARPU by Country** (Bar chart)
   - Compare: Which country pays most?
   - Insight: Pricing effectiveness

---

### Page 3: Subscriptions & Health

**Metrics**:
- Active Subscriptions (total, by product)
- New Subscriptions
- Subscription Mix (% weekly vs annual)

**Charts**:
1. **Subscription Timeline** (Stacked Area)
   - Show: Active and Cancelled over time
   - Insight: Net subscriber growth

2. **Churn Rate Timeline** (Line chart)
   - Weekly or monthly churn
   - Insight: Is churn improving?

3. **Retention Cohorts** (Cohort table)
   - Show: % retention by signup month
   - Insight: Are newer users stickier?

4. **Weekly vs Annual Mix** (Pie chart)
   - Show: 67% weekly, 33% annual
   - Insight: Product preference

---

### Page 4: Trial & Conversion

**Metrics**:
- Trial Conversion Rate (%)
- Avg Days to Convert
- Trial Abandonment (%)
- Refund Rate (%)

**Charts**:
1. **Trial Funnel** (Waterfall chart)
   - Show: Started → Day1 → Day2 → Day3 → Converted
   - Insight: Where do users drop off?
   - Example:
     ```
     Started: 1000
     Day 1:    880 (12% dropoff)
     Day 2:    765 (13% dropoff)
     Day 3:    650 (15% dropoff)
     Converted: 350 (46% of Day 3)
     ```

2. **Conversion Rate Timeline** (Line chart)
   - Track: How conversion rate changes over time
   - Insight: Is paywall copy working better?

3. **Conversion by Country** (Table)
   - Compare: US 38%, Canada 32%, UK 29%
   - Insight: Which country converts best?

4. **Days to Convert** (Histogram)
   - Show: Distribution (0-1 day, 1-2 days, 2-3 days)
   - Insight: When do most people convert?

---

### Page 5: Geographic Performance

**Metrics**:
- Revenue by Country (with %)
- Active Subscriptions by Country
- Conversion Rate by Country
- Average Value per User by Country

**Charts**:
1. **Revenue by Country** (Pie chart)
   - Show: US 45%, Canada 18%, UK 16%, Germany 12%, Finland 9%

2. **Conversion Rate Comparison** (Bar chart)
   - Compare: Which country converts best?
   - Decision: Should we push harder in low-conversion countries?

3. **Average Value Comparison** (Bar chart)
   - Which country has highest ARPU?
   - Should we adjust prices per country?

---

### Page 6: Product Comparison

**Metrics**:
- Weekly: Active count, MRR, Churn, Conversion
- Annual: Active count, MRR, Churn, Conversion

**Charts**:
1. **Metric Comparison** (Side-by-side bars)
   - Compare: Weekly vs Annual for each KPI
   - Insight: Which product is healthier?

2. **Product Mix Timeline** (Line chart)
   - Show: Weekly and Annual counts over time
   - Insight: Are we shifting to annual?

3. **LTV by Product** (Bar chart)
   - Compare: Which has higher lifetime value?
   - Decision: Should we push annual more?

---

### Page 7: User Metrics

**Metrics**:
- Total Users
- Paying Users
- Free Tier Users
- Penetration Rate (%)

**Charts**:
1. **User Segmentation** (Pie chart)
   - Paying: 234 (9.5%)
   - Free: 2222 (90.5%)

2. **User Growth Timeline** (Line chart)
   - Show: Total, Paying, Free over time
   - Insight: What's the growth trajectory?

3. **Daily Active Users** (Line chart)
   - Show: Exams created per day
   - Insight: Product engagement

---

## 🔐 Part 5: Security & Authorization

### Admin-Only Access

Dashboard should only be accessible to:
- Company admins
- Finance team
- Product managers
- Marketing team

**Not** accessible to:
- Regular users
- Flutter app users
- Public

### Implementation

1. **Backend checks admin role**:
   ```
   GET /api/analytics/...
   Header: Authorization: Bearer <admin_token>

   Backend checks: Is user_id in admins table?
   If no → Return 401 Unauthorized
   If yes → Return data
   ```

2. **Two-factor authentication** (optional but recommended)
   - Added security for sensitive data

3. **Audit logging**:
   - Who accessed dashboard?
   - What data did they query?
   - When?
   - Store in: analytics_access_logs table

---

## 📱 Part 6: Data Freshness & Caching

### Real-time vs Cached Data

**Real-time (instant):**
- Summary cards (revenue, subscriptions)
- Updated every: 1 minute
- Method: Direct Supabase query

**Cached (5 min delay):**
- Timeline charts (revenue over 100 days)
- Cohort tables
- Updated every: 5 minutes
- Method: Cache in Redis or database

**Daily aggregates (24h delay):**
- LTV calculations
- Complex cohort analysis
- Updated every: 1 time per day
- Method: Batch job at 2 AM UTC

### Caching Strategy

```
User opens dashboard
    ↓
Check cache timestamp
    ├─ < 1 min old: Return cached data (instant load)
    ├─ 1-5 min old: Return cached data + refresh in background
    ├─ > 5 min old: Fetch fresh data (might be slow)
    ↓
Response to dashboard
```

---

## 📈 Part 7: Date Range Filtering

Dashboard should support different time periods:

**Quick Select:**
- Last 7 days
- Last 30 days
- Last 90 days
- Last 12 months
- Year to date
- Custom range

**Comparison:**
- Show: Current period vs previous period (same length)
- Example: Oct 1-22 vs Sep 9-30 (both 22 days)
- Display: Percentage change

---

## 🔍 Part 8: Filters & Drill-Down

### Available Filters

1. **Country Filter**
   - Select: US, CA, UK, DE, FI, or "All Countries"
   - Impact: All metrics recalculate for selected country

2. **Product Filter**
   - Select: Weekly, Annual, or "All Products"
   - Impact: Show only that product's metrics

3. **Date Range**
   - Custom start and end dates
   - Presets (last 7 days, etc.)

### Drill-Down Example

1. Click on "US Revenue" pie slice
2. Dashboard shows: US-only analytics
3. See: All KPIs filtered to US only
4. Back button: Returns to all countries

---

## 🚨 Part 9: Alerts & Anomalies

Dashboard should highlight problems:

**Red Flags:**
- Churn rate spike (> 10% weekly)
- Revenue drop (> 20% MoM)
- Trial conversion below 20%
- Refund rate > 5%

**Implementation:**
- Color code metrics: Green (good), Yellow (warning), Red (alert)
- Show trend arrows: ↑ ↓ →
- Notify ops team on critical metrics

---

## 📊 Part 10: Export & Reporting

Users should be able to:
1. **Export data**
   - CSV: For Excel analysis
   - JSON: For further processing
   - PDF: For stakeholders

2. **Schedule reports**
   - Weekly revenue report
   - Monthly metrics summary
   - Email to team automatically

3. **Custom dashboards**
   - Save: My favorite view
   - Share: Link to other team members

---

## 🛠️ Part 11: Technical Architecture (Conceptual)

### Frontend (React/Vue/Svelte)
```
Web Dashboard
    ↓
Calls: GET /api/analytics/... endpoints
    ↓
Receives: JSON data
    ↓
Renders: Charts, tables, numbers
```

### Backend (Node/Python/Go)
```
API Endpoint Request
    ↓
1. Authenticate (check admin token)
    ↓
2. Validate parameters (date range, country, etc.)
    ↓
3. Check cache (is data fresh?)
    ├─ Yes: Return cached data
    └─ No: Query database
    ↓
4. Query Supabase:
   - SELECT FROM subscriptions WHERE ...
   - SELECT FROM subscription_history WHERE ...
   - SELECT FROM monetization_events WHERE ...
    ↓
5. Aggregate & calculate metrics
    ↓
6. Format response (JSON)
    ↓
7. Cache result (Redis or DB)
    ↓
8. Return to frontend
```

### Database
```
Raw Data Tables (from Flutter app):
- subscriptions
- subscription_history
- monetization_events

Analytics Tables (optional, for performance):
- daily_revenue_summary
- daily_subscription_summary
- daily_churn_summary
```

---

## 📋 Part 12: Implementation Checklist

### Backend (API Development)
- [ ] Create `/api/analytics/` route group
- [ ] Implement 11 API endpoints
- [ ] Add admin authentication middleware
- [ ] Add parameter validation
- [ ] Implement caching strategy
- [ ] Add database queries
- [ ] Add error handling
- [ ] Add logging/monitoring
- [ ] Test all endpoints
- [ ] Document API

### Frontend (Web Dashboard)
- [ ] Create project (React/Vue/Svelte)
- [ ] Setup authentication flow
- [ ] Build layout (navigation, pages)
- [ ] Implement 7 dashboard pages
- [ ] Create KPI card components
- [ ] Create chart components (using Chart.js, Recharts, etc.)
- [ ] Add filters & drill-down
- [ ] Add date range selector
- [ ] Add export functionality
- [ ] Test all flows
- [ ] Deploy to web server

### Operations
- [ ] Setup hosting for dashboard
- [ ] Setup SSL/HTTPS
- [ ] Configure analytics database backups
- [ ] Setup monitoring & alerts
- [ ] Document dashboard usage
- [ ] Train team on dashboard

---

## 🎯 Part 13: Success Criteria

**Phase 6 is complete when:**

✅ **Backend API**
- [ ] All 11 endpoints implemented
- [ ] Admin authentication working
- [ ] All metrics calculating correctly
- [ ] Caching strategy working
- [ ] Performance is acceptable (< 2 sec response time)
- [ ] Proper error handling

✅ **Frontend Dashboard**
- [ ] All 7 pages built and functional
- [ ] Charts rendering correctly
- [ ] Filters working
- [ ] Date range selection working
- [ ] Export functionality working
- [ ] Mobile responsive
- [ ] Performance acceptable (fast loading)

✅ **Data Quality**
- [ ] Metrics match RevenueCat data
- [ ] Calculations verified
- [ ] No data gaps
- [ ] Audit trail logging works

✅ **Security**
- [ ] Admin-only access enforced
- [ ] Authentication validated
- [ ] Audit logs complete
- [ ] No data leaks

✅ **Usability**
- [ ] Intuitive navigation
- [ ] Clear metric labels
- [ ] Helpful tooltips
- [ ] Team trained on usage

---

## 📊 Part 14: Example Dashboard Screenshot Descriptions

### Dashboard Overview
```
Top Row (KPI Cards):
┌─────────────────┬──────────────────┬──────────────────┐
│ Total Revenue   │ MRR              │ Active Subs      │
│ $123,456.78     │ $5,234.50        │ 234              │
│ ↑ 25.7% vs last │ ↑ 7.2% vs prev   │ ↑ 10.4% vs last  │
│ 295 days        │ month            │ period           │
└─────────────────┴──────────────────┴──────────────────┘
┌─────────────────┬──────────────────┬──────────────────┐
│ Churn Rate      │ Trial Conversion │ Paying Users     │
│ 5.2%            │ 35%              │ 234 (9.5%)       │
│ → Stable        │ ↑ +2.1% vs last  │ +15 this week    │
│                 │ period           │                  │
└─────────────────┴──────────────────┴──────────────────┘

Middle Section (Charts):
Left: Revenue Timeline (Line chart - upward trend)
Right: Subscription Growth (Area chart - stacked)

Bottom Section (Tables/Details):
- Recent subscriptions
- Top countries
- Churn alerts
```

---

## 🔗 Part 15: Data Integration Diagram

```
Flutter App
├─ User subscribes
├─ Logs to Supabase: subscription_history
├─ Updates: subscriptions table
├─ Logs: monetization_events
└─ Sends: User country, product, price

        ↓

Supabase Database (Raw Data)
├─ subscriptions (current state)
├─ subscription_history (all changes)
└─ monetization_events (all events)

        ↓

Analytics Backend API
├─ Reads raw data
├─ Aggregates metrics
├─ Caches results
└─ Returns JSON

        ↓

Web Dashboard
├─ Calls API
├─ Renders charts
├─ Shows metrics
└─ Allows filtering

        ↓

Business Team
├─ Views trends
├─ Makes decisions
├─ Exports reports
└─ Plans growth
```

---

**Document Version**: 1.0
**Created**: 2024-10-22
**Status**: Ready for Frontend + Backend Implementation

---

## Quick Reference: What Each Team Builds

**Backend Team Builds:**
- 11 API endpoints in `/api/analytics/`
- Database queries to aggregate data
- Authentication/authorization
- Caching layer
- Monitoring

**Frontend Team Builds:**
- Web app UI (React/Vue)
- 7 dashboard pages
- Charts and visualizations
- Filters and drill-down
- Export functionality

**Both Teams:**
- Database schema planning
- API contract definition
- Testing
- Deployment

