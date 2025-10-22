# RevenueCat Webhook Implementation Guide

This document describes the RevenueCat webhook integration for subscription management in ExamGenie.

## Overview

The webhook endpoint receives subscription events from RevenueCat and updates the Supabase database accordingly. All webhook signatures are validated using HMAC-SHA256.

**Webhook Endpoint:** `POST https://your-backend.com/api/webhooks/revenuecat`

## Setup & Configuration

### 1. Environment Variables

Add to `.env.local` (or Vercel environment variables):

```bash
# Get from RevenueCat Dashboard → Settings → API Keys
REVENUECAT_PUBLIC_KEY=your_revenuecat_public_key_here
```

### 2. Configure Webhook in RevenueCat Dashboard

1. Go to **RevenueCat Dashboard**
2. Select your app (Staging or Production)
3. Navigate to **Integrations** → **Webhooks**
4. Add webhook endpoint:
   - **URL:** `https://your-backend.com/api/webhooks/revenuecat`
   - **Events:** Select all subscription events (INITIAL_PURCHASE, RENEWAL, CANCELLATION, REFUND, EXPIRATION)
5. Save and test

### 3. Database Setup

Ensure these tables exist in Supabase (created via migrations):

- `subscriptions` - Current subscription status for each user
- `subscription_history` - Audit trail of all changes

## Webhook Events

The endpoint handles these RevenueCat events:

| Event | Trigger | Action |
|-------|---------|--------|
| **INITIAL_PURCHASE** | User buys a subscription | Create/Update subscription, set status to `premium_weekly` or `premium_annual` |
| **RENEWAL** | Subscription auto-renews | Extend `subscription_expiry`, keep status unchanged |
| **CANCELLATION** | User cancels subscription | Set status to `cancelled`, keep expiry (access until date) |
| **REFUND** | User gets refunded | Set status to `cancelled`, revoke access immediately |
| **EXPIRATION** | Subscription expires | Set status to `free_trial_expired` |

## Development & Testing

### Local Testing

#### 1. Generate Test Payload

```typescript
import {
  generateTestSignature,
  createMockInitialPurchasePayload
} from '@/lib/utils/webhook-test-helper'

// Create a test subscription (you need to manually create this in Supabase first)
const customerId = 'test_customer_123'
const payload = createMockInitialPurchasePayload(customerId)

// Get your public key (for testing, use any key you configure locally)
const publicKey = process.env.REVENUECAT_PUBLIC_KEY || 'test-key'
const signature = generateTestSignature(payload, publicKey)

console.log('Signature:', signature)
console.log('Payload:', JSON.stringify(payload))
```

#### 2. Send Test Webhook

**Using cURL:**

```bash
curl -X POST http://localhost:3001/api/webhooks/revenuecat \
  -H "X-RevenueCat-Signature: YOUR_SIGNATURE_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "INITIAL_PURCHASE",
      "id": "event-12345",
      "timestamp": "2024-10-22T14:30:00Z"
    },
    "subscriber": {
      "id": "test_customer_123"
    },
    "product": {
      "id": "examgenie_weekly"
    },
    "price": {
      "amount": 4.99,
      "currency": "USD"
    },
    "expiration": {
      "date": "2024-10-29T14:30:00Z"
    }
  }'
```

**Using Node.js:**

```typescript
import fetch from 'node-fetch'
import crypto from 'crypto'

const payload = { /* webhook payload */ }
const publicKey = 'your-public-key'

// Generate signature
const signature = crypto
  .createHmac('sha256', publicKey)
  .update(JSON.stringify(payload))
  .digest('base64')

// Send
const response = await fetch('http://localhost:3001/api/webhooks/revenuecat', {
  method: 'POST',
  headers: {
    'X-RevenueCat-Signature': signature,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})

console.log(await response.json())
```

### RevenueCat Staging Testing

The easiest way to test is using RevenueCat's built-in test events:

1. Go to RevenueCat Dashboard → Integrations → Webhooks
2. Select your staging app
3. Find your webhook endpoint in the list
4. Click "Send Test Event" → Choose event type (INITIAL_PURCHASE, RENEWAL, etc.)
5. Watch your server logs to see processing

**First, create a test subscription in Supabase:**

```sql
INSERT INTO subscriptions (
  user_id,
  revenuecat_customer_id,
  subscription_status,
  created_at,
  updated_at
) VALUES (
  'user-uuid-here',
  'revenuecat_customer_id_from_test',
  'unactivated',
  now(),
  now()
);
```

## Response Codes

| Code | Meaning |
|------|---------|
| **200 OK** | Webhook processed successfully |
| **202 ACCEPTED** | Webhook accepted but deferred (e.g., user not found) |
| **400 Bad Request** | Invalid payload or missing required fields |
| **401 Unauthorized** | Invalid signature or missing signature header |
| **500 Internal Server Error** | Processing error (check logs) |

## Error Handling

### User Not Found

If the `revenuecat_customer_id` doesn't match any user:

1. Webhook is logged
2. Returns **202 ACCEPTED** (prevents RevenueCat from retrying)
3. Can be manually reviewed and reprocessed later

**Investigation:**
- Check if user exists in `auth.users`
- Verify `revenuecat_customer_id` is correctly linked in subscriptions table
- Manually link or create subscription record if needed

### Duplicate Events

RevenueCat may send the same event multiple times. The system:

1. Checks `subscription_history` for existing `revenuecat_event_id`
2. Returns **200 OK** without reprocessing
3. Ensures idempotency

### Signature Validation Failures

- **Missing header:** Returns **401 Unauthorized**
- **Invalid signature:** Returns **401 Unauthorized**
- Check that `REVENUECAT_PUBLIC_KEY` is correct and matches RevenueCat's configured key

## Monitoring & Debugging

### Logs

All webhook processing is logged:

```
[RevenueCat Webhook] Received INITIAL_PURCHASE event: webhook-uuid
[RevenueCat Webhook] Successfully processed INITIAL_PURCHASE: webhook-uuid
```

Check logs in:
- **Local:** Console output
- **Staging:** Vercel dashboard or `vercel logs` command
- **Production:** CloudWatch or similar

### Database Inspection

**View recent webhook events:**

```sql
SELECT
  user_id,
  event_type,
  previous_status,
  new_status,
  processed_at
FROM subscription_history
ORDER BY processed_at DESC
LIMIT 20;
```

**View active subscriptions:**

```sql
SELECT
  user_id,
  subscription_status,
  subscription_expiry,
  (subscription_expiry > now()) as is_active
FROM subscriptions
WHERE subscription_status IN ('premium_weekly', 'premium_annual')
ORDER BY updated_at DESC;
```

## Testing Checklist

### Signature Validation
- [ ] Valid signature → **200 OK**
- [ ] Invalid signature → **401 Unauthorized**
- [ ] Missing signature → **401 Unauthorized**
- [ ] Tampered payload → **401 Unauthorized**

### Event Processing - INITIAL_PURCHASE
- [ ] New subscription created with correct status
- [ ] Status set to `premium_weekly` or `premium_annual` based on product
- [ ] Expiry date calculated correctly (7 days from now for weekly)
- [ ] History record created
- [ ] Currency stored

### Event Processing - RENEWAL
- [ ] Existing subscription updated (not new record)
- [ ] Expiry date extended
- [ ] Status unchanged
- [ ] History record created

### Event Processing - CANCELLATION
- [ ] Status set to `cancelled`
- [ ] Expiry date NOT changed (user still has access)
- [ ] History record created with `previous_status`

### Event Processing - REFUND
- [ ] Status set to `cancelled`
- [ ] Access revoked immediately
- [ ] History record created

### Edge Cases
- [ ] Same event sent twice → Only processed once
- [ ] Returns **200 OK** both times (idempotent)
- [ ] Only one history record created
- [ ] User not found → Returns **202 ACCEPTED**
- [ ] Error logged
- [ ] Webhook stored for manual review

## Deployment

### Staging Deployment

1. **Push code to staging:**
   ```bash
   git push origin staging
   ```

2. **Verify webhook works:**
   ```bash
   curl https://exam-generator-staging.vercel.app/api/webhooks/revenuecat
   # Should return: {"status": "ok", "webhook": "revenuecat", ...}
   ```

3. **Configure in RevenueCat:**
   - Go to RevenueCat Dashboard
   - Add webhook: `https://exam-generator-staging.vercel.app/api/webhooks/revenuecat`
   - Send test events

4. **Monitor logs:**
   ```bash
   ./scripts/vercel-logs.sh staging
   ```

### Production Deployment

1. **Build and verify:**
   ```bash
   npm run build
   ```

2. **Create PR from staging to main:**
   ```bash
   gh pr create --base main --head staging \
     --title "Release: RevenueCat webhook implementation"
   ```

3. **After merge, webhook auto-deploys**

4. **Configure in RevenueCat:**
   - Go to RevenueCat production app
   - Add webhook: `https://examgenie.app/api/webhooks/revenuecat`
   - Test with production data

5. **Monitor logs:**
   ```bash
   ./scripts/vercel-logs.sh production
   ```

## Troubleshooting

### Webhook Not Triggering

**Check RevenueCat Dashboard:**
1. Go to Webhooks section
2. Look for your endpoint
3. Check if events are being sent (should show "Recent Events")
4. Click endpoint to view delivery logs

**Check Supabase:**
1. Verify subscription exists with correct `revenuecat_customer_id`
2. Check `subscription_history` for any records

### Signature Validation Failing

**Verify public key:**
```bash
# Check if key is set
echo $REVENUECAT_PUBLIC_KEY

# Compare with RevenueCat dashboard
# Settings → API Keys → Public Key
```

**Wrong key causes:**
- All webhooks rejected with 401
- RevenueCat will retry 5 times then stop

### User Not Found (202 Response)

**Investigation:**
```sql
-- Check if user exists
SELECT id, email FROM auth.users WHERE id = 'user-uuid';

-- Check subscription record
SELECT * FROM subscriptions
WHERE revenuecat_customer_id = 'revenue_cat_id_from_webhook';

-- Check history for this event
SELECT * FROM subscription_history
WHERE revenuecat_event_id = 'event-id-from-webhook';
```

**Fix:**
```sql
-- Manually create subscription if user exists
INSERT INTO subscriptions (
  user_id,
  revenuecat_customer_id,
  subscription_status,
  created_at,
  updated_at
) VALUES (
  'user-uuid',
  'revenuecat_customer_id',
  'unactivated',
  now(),
  now()
);

-- Then replay the webhook from RevenueCat dashboard
```

### Database Errors

**Check logs for specific error:**
```
[RevenueCat Webhook] Processing error: webhook-uuid
{ error: "duplicate key value", errorId: "err-123" }
```

**Common issues:**
- Foreign key constraint: User doesn't exist in `auth.users`
- Duplicate subscription: Multiple subscriptions for same customer
- Missing table: Check migrations were applied

## Performance

- **Processing time:** Typically 50-200ms per webhook
- **Concurrent webhooks:** Handled safely with database-level locking
- **Retry strategy:** RevenueCat retries 5 times with exponential backoff

## Security

- **Signature validation:** Every webhook is validated with HMAC-SHA256
- **Public key only:** Uses RevenueCat's public key (no secrets exposed)
- **Idempotency:** Prevents processing same event twice
- **Error handling:** Never exposes internal errors to RevenueCat

## References

- **RevenueCat Webhook Docs:** https://docs.revenuecat.com/docs/server-webhooks
- **Signature Validation:** https://docs.revenuecat.com/docs/server-webhooks#webhook-signature-validation
- **API Reference:** https://docs.revenuecat.com/reference
