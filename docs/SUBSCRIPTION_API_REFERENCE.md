# Subscription & RevenueCat API Reference

## Overview

ExamGenie integrates with RevenueCat for iOS/Android subscription management. When users subscribe, revoke, or renew, RevenueCat sends webhooks to sync subscription data with Supabase.

## Webhook Endpoint

**POST** `/api/webhooks/revenuecat`

Receives subscription events from RevenueCat and updates the `subscriptions` and `subscription_history` tables.

### Headers

```
X-RevenueCat-Signature: {HMAC-SHA256 signature}
Content-Type: application/json
```

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Webhook processed successfully |
| 202 | Accepted but deferred (e.g., user not found) |
| 400 | Invalid payload |
| 401 | Invalid or missing signature |
| 500 | Processing error |

## Webhook Events

### INITIAL_PURCHASE

**When:** User buys a subscription

**Action:**
- Set subscription status to `premium_weekly` or `premium_annual`
- Set expiry date (7 days for weekly, 365 days for annual)
- Create history record

### RENEWAL

**When:** Subscription auto-renews

**Action:**
- Extend expiry date
- Keep status unchanged
- Create history record

### CANCELLATION

**When:** User cancels subscription

**Action:**
- Set status to `cancelled`
- Keep expiry date (user still has access until then)
- Create history record

### REFUND

**When:** User receives refund

**Action:**
- Set status to `cancelled`
- Revoke access immediately
- Create history record

### EXPIRATION

**When:** Subscription expires

**Action:**
- Set status to `free_trial_expired`
- Set `is_trial_expired` to true
- Create history record

## Database Tables

### subscriptions

```sql
CREATE TABLE subscriptions (
  user_id UUID PRIMARY KEY,
  subscription_status TEXT,        -- unactivated, free_trial, premium_weekly, premium_annual, cancelled
  trial_started_at TIMESTAMP,
  trial_expires_at TIMESTAMP,
  is_trial_expired BOOLEAN,
  subscription_expiry TIMESTAMP,   -- When subscription ends (updated by webhook)
  revenuecat_customer_id TEXT,     -- Maps to RevenueCat subscriber ID
  user_currency TEXT,              -- e.g., "USD", "EUR"
  user_country TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### subscription_history

```sql
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type TEXT,                 -- INITIAL_PURCHASE, RENEWAL, CANCELLATION, REFUND, EXPIRATION
  previous_status TEXT,
  new_status TEXT,
  revenuecat_event_id TEXT,        -- Prevents duplicate processing
  revenuecat_transaction_id TEXT,
  product_id TEXT,                 -- examgenie_weekly, examgenie_annual
  price NUMERIC,
  currency TEXT,
  webhook_timestamp TIMESTAMP,     -- When event occurred
  processed_at TIMESTAMP,          -- When we processed it
  raw_data JSONB,                  -- Full webhook payload
  created_at TIMESTAMP
);
```

## Environment Variables

```bash
REVENUECAT_PUBLIC_KEY=your_public_key_here
```

Get from RevenueCat Dashboard → Settings → API Keys → Public Key

## Testing

### Local Testing

```typescript
import {
  generateTestSignature,
  createMockInitialPurchasePayload
} from '@/lib/utils/webhook-test-helper'

const payload = createMockInitialPurchasePayload('test_customer_123')
const signature = generateTestSignature(payload, process.env.REVENUECAT_PUBLIC_KEY!)

// Send to http://localhost:3001/api/webhooks/revenuecat
```

### RevenueCat Staging

1. Go to RevenueCat Dashboard → Integrations → Webhooks
2. Click "Send Test Event" next to your endpoint
3. Choose event type
4. Watch server logs

## Error Scenarios

### User Not Found

If `revenuecat_customer_id` doesn't match any subscription:

1. Webhook logged and **202 ACCEPTED** returned
2. RevenueCat stops retrying
3. Must be manually reviewed and reprocessed

**Fix:**
```sql
INSERT INTO subscriptions (
  user_id,
  revenuecat_customer_id,
  subscription_status
) VALUES (user_uuid, 'rev_cat_id', 'unactivated');
```

### Duplicate Events

RevenueCat may send the same event multiple times:

1. System checks `revenuecat_event_id` in history
2. If exists, **200 OK** returned without reprocessing
3. Ensures idempotency

### Signature Validation Failures

- Invalid or missing signature → **401 Unauthorized**
- Check `REVENUECAT_PUBLIC_KEY` matches RevenueCat configuration

## Subscription Status Flow

```
unactivated
    ↓
free_trial ←→ premium_weekly / premium_annual
    ↓              ↓
free_trial_expired ← cancelled → (expiry date)
```

**Key Points:**
- `cancelled` status: User still has access until `subscription_expiry`
- `free_trial_expired`: No access
- Access checks: Look at both `subscription_status` AND `subscription_expiry`

## App-Side Implementation (Flutter)

The mobile app should:

1. **After purchase:** No immediate action (webhook will update backend)
2. **Check subscription:**
   ```dart
   GET /api/subscriptions/{user_id}
   // Returns current subscription status and expiry
   ```
3. **Display status:**
   - If `premium_weekly` or `premium_annual` and expiry > now → Show "Premium"
   - If `cancelled` and expiry > now → Show "Cancelling (XX days left)"
   - If expired → Show "Expired - Resubscribe"

## Monitoring

**View recent webhooks:**
```sql
SELECT
  event_type,
  user_id,
  previous_status,
  new_status,
  processed_at
FROM subscription_history
ORDER BY processed_at DESC
LIMIT 10;
```

**View active premium users:**
```sql
SELECT
  user_id,
  subscription_status,
  subscription_expiry
FROM subscriptions
WHERE subscription_status IN ('premium_weekly', 'premium_annual')
  AND subscription_expiry > now()
ORDER BY subscription_expiry;
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhooks not processing | Check `REVENUECAT_PUBLIC_KEY` is set and correct |
| 401 Signature errors | Verify public key matches RevenueCat dashboard |
| 202 User not found | Create subscription record in Supabase first |
| Duplicate processing | Check `revenuecat_event_id` is stored in history |
| Missing subscriptions | Ensure webhook endpoint is registered in RevenueCat |

## Quick Start

1. **Add environment variable:**
   ```bash
   REVENUECAT_PUBLIC_KEY=pk_live_abc123...
   ```

2. **Register webhook in RevenueCat:**
   - URL: `https://your-backend.com/api/webhooks/revenuecat`
   - Events: All subscription events

3. **Test:**
   ```bash
   curl https://your-backend.com/api/webhooks/revenuecat
   # Should return: {"status": "ok", "webhook": "revenuecat", ...}
   ```

4. **Verify in Supabase:**
   ```sql
   SELECT COUNT(*) FROM subscription_history;
   ```

## Full Documentation

See `/docs/WEBHOOK_IMPLEMENTATION.md` for comprehensive implementation guide.
