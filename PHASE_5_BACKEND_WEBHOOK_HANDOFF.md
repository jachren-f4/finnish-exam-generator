# 🔗 Phase 5: Backend Webhook Processing - Handoff Document

**For**: Backend Development Team
**Purpose**: Implement RevenueCat webhook processing to sync subscription data with Supabase
**Timeline**: 2-3 days
**Status**: Ready for implementation

---

## 📋 Executive Summary

The Flutter app integrates with RevenueCat for subscription management and Superwall for paywalls. When users subscribe, cancel, or renew, RevenueCat sends webhooks to your backend. Your job is to:

1. **Receive webhooks** from RevenueCat
2. **Validate signatures** to ensure data integrity
3. **Process events** (purchase, renewal, cancellation, refund, expiration)
4. **Update Supabase** subscription records
5. **Track history** for analytics and debugging

This document provides everything you need.

---

## 🗄️ Part 1: Supabase Schema Reference

### Table 1: `subscriptions`

This is the main table tracking user subscription status.

```sql
CREATE TABLE subscriptions (
  user_id UUID PRIMARY KEY,
  subscription_status TEXT NOT NULL,
  trial_started_at TIMESTAMP,
  trial_expires_at TIMESTAMP,
  is_trial_expired BOOLEAN DEFAULT false,
  subscription_expiry TIMESTAMP,
  revenuecat_customer_id TEXT UNIQUE,
  user_currency TEXT,
  user_country TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Column Details:**

| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| `user_id` | UUID | Primary key | Links to auth.users.id |
| `subscription_status` | TEXT | Current status | See enum below |
| `trial_started_at` | TIMESTAMP | Trial start date | Set when trial initiated (app-side) |
| `trial_expires_at` | TIMESTAMP | Trial end date | Set when trial initiated (app-side) |
| `is_trial_expired` | BOOLEAN | Trial status | Set by app or backend check |
| `subscription_expiry` | TIMESTAMP | When subscription ends | **Updated by webhook** |
| `revenuecat_customer_id` | TEXT | RevenueCat ID | Unique per user, maps webhook events |
| `user_currency` | TEXT | Billing currency | e.g., "USD", "EUR", "GBP" |
| `user_country` | TEXT | User country | Used for geo-specific pricing |
| `created_at` | TIMESTAMP | Record creation | Auto-set |
| `updated_at` | TIMESTAMP | Last update | Auto-set on each webhook |

**Subscription Status Enum Values:**
```
- "unactivated"       (user hasn't created first exam yet)
- "free_trial"        (user is in 3-day trial)
- "premium_weekly"    (active weekly subscription)
- "premium_annual"    (active annual subscription)
- "cancelled"         (subscription cancelled, may still be valid if not expired)
```

---

### Table 2: `subscription_history`

Audit trail for all subscription changes. Use this for analytics, debugging, and chargeback disputes.

```sql
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  revenuecat_event_id TEXT,
  revenuecat_transaction_id TEXT,
  product_id TEXT,
  price NUMERIC,
  currency TEXT,
  webhook_timestamp TIMESTAMP,
  processed_at TIMESTAMP DEFAULT now(),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

**Column Details:**

| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| `id` | UUID | Unique record ID | Auto-generated |
| `user_id` | UUID | User being affected | Links to subscriptions.user_id |
| `event_type` | TEXT | What happened | See webhook events below |
| `previous_status` | TEXT | Status before change | For tracking transitions |
| `new_status` | TEXT | Status after change | For tracking transitions |
| `revenuecat_event_id` | TEXT | RevenueCat event ID | Prevents duplicate processing |
| `revenuecat_transaction_id` | TEXT | Transaction ID | Links to purchase |
| `product_id` | TEXT | Product purchased | "examgenie_weekly" or "examgenie_annual" |
| `price` | NUMERIC | Amount charged | In original currency |
| `currency` | TEXT | Billing currency | "USD", "EUR", etc. |
| `webhook_timestamp` | TIMESTAMP | When event occurred | From RevenueCat webhook |
| `processed_at` | TIMESTAMP | When we processed it | Server time |
| `raw_data` | JSONB | Full webhook payload | For debugging |
| `created_at` | TIMESTAMP | Record creation | Auto-set |

---

## 🔑 Part 2: RevenueCat Integration Details

### Webhook Endpoint Configuration

**Your endpoint should be:**
```
POST https://your-backend.com/api/webhooks/revenuecat
```

### RevenueCat Webhook Setup (Already Configured)

In RevenueCat dashboard (already done by user):
- **Staging App**: RevenueCat Staging configured
- **Products Created**:
  - `examgenie_weekly` - $4.99/week
  - `examgenie_annual` - $49.99/year
- **Offerings Created**:
  - "standard" offering with both products

**Your backend needs to:**
1. Register this webhook endpoint in RevenueCat dashboard
2. Receive and validate webhook payloads
3. Handle all webhook event types

### RevenueCat API Keys

The following are already configured:
- **Staging API Key**: Available in RevenueCat account (backend team should fetch from secrets)
- **Production API Key**: Will be available when moving to production

---

## 📨 Part 3: Webhook Events & Processing

### Event Types to Handle

RevenueCat sends these events (you need to handle all):

#### 1. INITIAL_PURCHASE
**When**: User buys a subscription (not a trial)

**Webhook Payload Structure:**
```json
{
  "event": {
    "type": "INITIAL_PURCHASE",
    "id": "unique-event-id-12345",
    "timestamp": "2024-10-22T14:30:00Z"
  },
  "app": {
    "name": "ExamGenie"
  },
  "subscriber": {
    "id": "revenuecat_customer_id_xyz"
  },
  "product": {
    "id": "examgenie_weekly",
    "type": "subscription"
  },
  "price": {
    "amount": 4.99,
    "currency": "USD"
  },
  "transaction": {
    "id": "transaction-12345",
    "purchaseDate": "2024-10-22T14:30:00Z"
  },
  "expiration": {
    "date": "2024-10-29T14:30:00Z"
  }
}
```

**Processing Steps:**
1. Extract `subscriber.id` → lookup user by `revenuecat_customer_id`
2. Extract `product.id` → map to subscription_status:
   - "examgenie_weekly" → "premium_weekly"
   - "examgenie_annual" → "premium_annual"
3. Extract `expiration.date` → set as `subscription_expiry`
4. Set `updated_at` = now()
5. Create history record with event_type = "INITIAL_PURCHASE"

**SQL Update Pattern:**
```sql
UPDATE subscriptions
SET
  subscription_status = $1,
  subscription_expiry = $2,
  updated_at = now()
WHERE revenuecat_customer_id = $3;

INSERT INTO subscription_history (...) VALUES (...)
```

---

#### 2. RENEWAL
**When**: Active subscription renews (weekly or annual)

**Webhook Payload:**
```json
{
  "event": {
    "type": "RENEWAL",
    "id": "unique-event-id-67890"
  },
  "subscriber": {
    "id": "revenuecat_customer_id_xyz"
  },
  "product": {
    "id": "examgenie_weekly"
  },
  "expiration": {
    "date": "2024-10-29T14:30:00Z"
  }
}
```

**Processing Steps:**
1. Extract user by `subscriber.id`
2. Confirm `subscription_status` is still "premium_weekly" or "premium_annual"
3. Update `subscription_expiry` to new expiration date
4. Create history record with event_type = "RENEWAL"

**Note**: Do NOT change subscription_status on renewal, just extend expiry date.

---

#### 3. CANCELLATION
**When**: User cancels subscription (may still be valid until expiry)

**Webhook Payload:**
```json
{
  "event": {
    "type": "CANCELLATION",
    "id": "unique-event-id-11111"
  },
  "subscriber": {
    "id": "revenuecat_customer_id_xyz"
  },
  "product": {
    "id": "examgenie_weekly"
  },
  "expiration": {
    "date": "2024-10-29T14:30:00Z",
    "cancellationReason": "UNSUBSCRIBE"
  }
}
```

**Processing Steps:**
1. Extract user by `subscriber.id`
2. Set `subscription_status` = "cancelled"
3. Keep `subscription_expiry` as-is (user still has access until this date)
4. Create history record with event_type = "CANCELLATION"
5. Set `previous_status` = current status, `new_status` = "cancelled"

**Important**: Cancelled ≠ expired. User can still create exams until `subscription_expiry` passes.

---

#### 4. REFUND
**When**: User gets refunded (full or partial)

**Webhook Payload:**
```json
{
  "event": {
    "type": "REFUND",
    "id": "unique-event-id-22222"
  },
  "subscriber": {
    "id": "revenuecat_customer_id_xyz"
  },
  "product": {
    "id": "examgenie_weekly"
  },
  "transaction": {
    "id": "transaction-12345"
  },
  "price": {
    "amount": 4.99,
    "currency": "USD"
  }
}
```

**Processing Steps:**
1. Extract user by `subscriber.id`
2. Set `subscription_status` = "cancelled" (revoke access immediately)
3. Create history record with event_type = "REFUND"
4. Store refund amount and transaction ID for accounting

**Note**: Refunds revoke access immediately.

---

#### 5. EXPIRATION
**When**: RevenueCat detects a subscription has expired (optional event)

**Processing Steps:**
1. Extract user by `subscriber.id`
2. Check if `subscription_expiry` has passed
3. If passed, set `subscription_status` = "free_trial_expired" (if was premium, now they're blocked)
4. Set `is_trial_expired` = true

**Note**: This is optional since app-side checks also verify expiry. Use as backup.

---

#### 6. SUBSCRIPTION_EXTENDED (Not Required, But Nice-to-Have)
If RevenueCat sends this, same as RENEWAL.

---

### Events to Ignore

These are sent by RevenueCat but you don't need to process them:
- `PRODUCT_CHANGE` - User switches products (we treat as cancellation + new purchase)
- `BILLING_ISSUE` - Informational only
- `TEST_PURCHASE` - Ignore in production

---

## 🔐 Part 4: Webhook Signature Validation

**Critical**: Validate every webhook to prevent spoofing.

### Validation Steps

1. **Get RevenueCat Public Key** from RevenueCat documentation
2. **Extract signature** from webhook header: `X-RevenueCat-Signature`
3. **Verify signature** using the public key and webhook body
4. **Reject** if validation fails (return 401)

### Implementation (Pseudo-code)

```python
import hmac
import hashlib
import base64

def validate_revenuecat_webhook(request_body: bytes, signature_header: str) -> bool:
    """
    Validate RevenueCat webhook signature.

    Args:
        request_body: Raw request body (bytes)
        signature_header: Value of X-RevenueCat-Signature header

    Returns:
        True if valid, False otherwise
    """
    # Get RevenueCat public key from environment or config
    REVENUECAT_PUBLIC_KEY = os.getenv("REVENUECAT_PUBLIC_KEY")

    # Compute HMAC-SHA256
    computed_signature = base64.b64encode(
        hmac.new(
            REVENUECAT_PUBLIC_KEY.encode(),
            request_body,
            hashlib.sha256
        ).digest()
    ).decode()

    # Compare signatures (timing-safe comparison)
    return hmac.compare_digest(computed_signature, signature_header)


@app.post("/api/webhooks/revenuecat")
def handle_revenuecat_webhook(request):
    # Validate signature
    signature = request.headers.get("X-RevenueCat-Signature")
    if not validate_revenuecat_webhook(request.body, signature):
        return {"error": "Invalid signature"}, 401

    # Process webhook
    process_webhook(request.json)

    return {"success": true}, 200
```

---

## 🔄 Part 5: Workflow & Data Mapping

### Step-by-Step Processing Workflow

```
Webhook arrives
    ↓
1. Extract signature, validate ✓ → Reject if invalid
    ↓
2. Extract revenuecat_customer_id from subscriber.id
    ↓
3. Query subscriptions table for matching revenuecat_customer_id
    ↓
4. If not found:
    ├─ Check if user exists in auth.users (by linking method)
    ├─ If exists: Create new subscriptions row
    └─ If not exists: Log error, return 400
    ↓
5. Based on event.type, update subscription_status and/or subscription_expiry
    ↓
6. Create audit record in subscription_history
    ↓
7. Return 200 OK to RevenueCat
```

---

### Product ID to Status Mapping

RevenueCat Product ID → Subscription Status:

| RevenueCat Product ID | Status | Details |
|----------------------|--------|---------|
| `examgenie_weekly` | `premium_weekly` | $4.99/week |
| `examgenie_annual` | `premium_annual` | $49.99/year |

---

### Event Type Handling Matrix

| Event | Previous Status | New Status | Update Expiry | Action |
|-------|-----------------|------------|----------------|--------|
| INITIAL_PURCHASE | unactivated / free_trial | premium_weekly / premium_annual | ✅ YES | Grant access immediately |
| RENEWAL | premium_weekly / premium_annual | (same) | ✅ YES | Extend access |
| CANCELLATION | premium_* | cancelled | ❌ NO | Mark cancelled, access expires at date |
| REFUND | premium_* | cancelled | ❌ NO | Revoke immediately |
| EXPIRATION | premium_* | free_trial_expired | ❌ NO | Block, move back to free tier |

---

## ⚠️ Part 6: Error Handling & Edge Cases

### Duplicate Event Prevention

RevenueCat may send the same event multiple times (network retries). Prevent duplicate processing:

```python
def process_webhook(event_data):
    # Check if we've already processed this event
    existing = subscription_history.find_one({
        "revenuecat_event_id": event_data["event"]["id"]
    })

    if existing:
        print(f"Duplicate event {event_data['event']['id']}, skipping")
        return 200  # Return OK (idempotent)

    # Process normally
    ...
```

---

### User Not Found

If `revenuecat_customer_id` doesn't match any user:

```
1. Log error with full webhook payload
2. Store webhook in pending_webhooks table for manual review
3. Return 202 ACCEPTED (don't retry)
4. Alert ops team
```

**Investigation**: This likely means the user ID wasn't linked in RevenueCat when they subscribed. Fallback:
- Check if email exists in both systems
- Manually link `revenuecat_customer_id` to user_id

---

### Concurrent Updates

If two webhooks arrive simultaneously for the same user:

```python
# Use database-level locking
BEGIN TRANSACTION;
SELECT * FROM subscriptions WHERE user_id = $1 FOR UPDATE;  -- Lock row
UPDATE subscriptions SET ...
INSERT INTO subscription_history ...
COMMIT;
```

---

### Time Zone Handling

All timestamps from RevenueCat are in **UTC ISO-8601 format**:
- Receive: `"2024-10-22T14:30:00Z"`
- Store in Supabase as: `timestamp with time zone`
- Always work in UTC

---

## 🧪 Part 7: Testing Checklist

### Local Testing

**1. Webhook Signature Validation**
- [ ] Valid signature → Accepted
- [ ] Invalid signature → 401 Rejected
- [ ] Missing signature → 401 Rejected
- [ ] Tampered payload → 401 Rejected

**2. Event Processing - INITIAL_PURCHASE**
- [ ] New subscription created
- [ ] Status set to "premium_weekly"
- [ ] Expiry date calculated correctly (7 days from now)
- [ ] History record created
- [ ] Currency and country stored

**3. Event Processing - RENEWAL**
- [ ] Existing subscription updated (not new record)
- [ ] Expiry date extended
- [ ] Status unchanged
- [ ] History record created

**4. Event Processing - CANCELLATION**
- [ ] Status set to "cancelled"
- [ ] Expiry date NOT changed (user still has access until date)
- [ ] History record created with previous_status

**5. Event Processing - REFUND**
- [ ] Status set to "cancelled"
- [ ] Access revoked immediately
- [ ] History record created

**6. Duplicate Event Handling**
- [ ] Same event sent twice → Only processed once
- [ ] Returns 200 OK both times (idempotent)
- [ ] Only one history record created

**7. User Not Found**
- [ ] Returns 202 ACCEPTED
- [ ] Error logged
- [ ] Webhook stored for manual review

---

### RevenueCat Staging Environment Testing

RevenueCat provides test webhooks in the dashboard:

1. Go to RevenueCat Dashboard → Integrations → Webhooks
2. Select your staging app
3. Use "Send Test Event" to simulate:
   - INITIAL_PURCHASE
   - RENEWAL
   - CANCELLATION
   - REFUND
4. Verify Supabase records update correctly
5. Check logs for any errors

---

### Integration Testing

**Test Scenario 1: New User First Purchase**
```
1. User signs up → creates subscriptions row with unactivated status
2. User buys weekly subscription → INITIAL_PURCHASE webhook
3. Verify: status → premium_weekly, expiry set to +7 days
4. Verify: user can create unlimited exams
```

**Test Scenario 2: Subscription Renewal**
```
1. Weekly subscriber at day 6 (expiry tomorrow)
2. RevenueCat auto-renews → RENEWAL webhook
3. Verify: status stays premium_weekly, expiry extends to +7 days
4. Verify: user still has access
```

**Test Scenario 3: User Cancels**
```
1. Premium subscriber cancels in app
2. RevenueCat sends CANCELLATION webhook
3. Verify: status → cancelled, expiry date unchanged
4. Verify: user still has access until expiry date
5. User tries to create exam on expiry day + 1 → blocked
```

**Test Scenario 4: Refund**
```
1. Premium subscriber requests refund
2. RevenueCat sends REFUND webhook
3. Verify: status → cancelled, access revoked immediately
4. Verify: user cannot create exams (blocked)
```

---

## 📝 Part 8: Implementation Checklist

### Backend Setup
- [ ] Create endpoint: `POST /api/webhooks/revenuecat`
- [ ] Add RevenueCat public key to environment config
- [ ] Implement signature validation function
- [ ] Add error logging and monitoring

### Database Operations
- [ ] Write `update_subscriptions()` function
- [ ] Write `create_history_record()` function
- [ ] Add database transaction handling for concurrency
- [ ] Add idempotency check (revenuecat_event_id)

### Event Handlers
- [ ] Implement `handle_initial_purchase()`
- [ ] Implement `handle_renewal()`
- [ ] Implement `handle_cancellation()`
- [ ] Implement `handle_refund()`
- [ ] Implement `handle_expiration()`

### Error Handling
- [ ] User not found → Log and store for manual review
- [ ] Duplicate event → Return 200 (idempotent)
- [ ] Invalid signature → Return 401
- [ ] Database errors → Return 500 with logging
- [ ] Concurrent updates → Use database-level locking

### Testing
- [ ] Unit tests for signature validation
- [ ] Unit tests for each event handler
- [ ] Integration test with RevenueCat staging
- [ ] Test duplicate event handling
- [ ] Test user not found scenario
- [ ] Load test (simulate high webhook volume)

### Monitoring
- [ ] Add logging for every webhook received
- [ ] Add metrics for event processing (latency, success rate)
- [ ] Alert on signature validation failures
- [ ] Alert on user not found errors
- [ ] Dashboard to view recent webhooks

### Documentation
- [ ] Add README explaining webhook endpoint
- [ ] Document all event types
- [ ] Document error scenarios
- [ ] Add troubleshooting guide

---

## 🚀 Part 9: Deployment & Runbook

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Staging environment tested with RevenueCat staging
- [ ] Error logging configured
- [ ] Monitoring/alerts set up
- [ ] Backup strategy in place

### Deployment Steps

1. **Deploy code** to staging
2. **Test with RevenueCat staging** webhooks
3. **Deploy to production**
4. **Configure RevenueCat production** webhook endpoint
5. **Monitor logs** for first 24 hours

### Rollback Plan

If issues occur:
1. Disable webhook endpoint (return 202 ACCEPTED but don't process)
2. Investigate root cause
3. Fix code
4. Replay webhooks manually from subscription_history
5. Re-enable endpoint

---

## 📞 Part 10: Key Contacts & Resources

### RevenueCat Documentation
- **Webhook Docs**: https://docs.revenuecat.com/docs/server-webhooks
- **API Reference**: https://docs.revenuecat.com/reference
- **Signature Validation**: https://docs.revenuecat.com/docs/server-webhooks#webhook-signature-validation

### Supabase
- **Project URL**: [Your Supabase URL]
- **Database**: PostgreSQL 14+
- **Schema Location**: `public.subscriptions`, `public.subscription_history`

### Backend Questions?
- Ask Flutter team for: Supabase credentials, RevenueCat staging app credentials
- Ask ops for: Production environment setup, domain configuration

---

## 🎯 Part 11: Success Criteria

**Phase 5 is complete when:**

- [ ] All webhook events are received and processed correctly
- [ ] Subscriptions table updates correctly on each event
- [ ] Subscription history tracks all changes
- [ ] Duplicate events are handled idempotently
- [ ] Signature validation prevents spoofing
- [ ] Error scenarios are handled gracefully
- [ ] All integration tests pass
- [ ] Monitoring and alerting are configured
- [ ] Documentation is complete
- [ ] Code is reviewed and approved

---

## 📊 Reference: Database Views (Optional)

You may want to create useful views for analytics:

```sql
-- View: Active Subscriptions
CREATE VIEW active_subscriptions AS
SELECT
  user_id,
  subscription_status,
  subscription_expiry,
  (subscription_expiry > now()) as is_active
FROM subscriptions
WHERE subscription_status IN ('premium_weekly', 'premium_annual');

-- View: Recent Changes
CREATE VIEW subscription_changes_7d AS
SELECT
  user_id,
  event_type,
  previous_status,
  new_status,
  processed_at
FROM subscription_history
WHERE processed_at > now() - interval '7 days'
ORDER BY processed_at DESC;
```

---

**Document Version**: 1.0
**Created**: 2024-10-22
**Status**: Ready for Backend Implementation

For questions or clarifications, contact the Flutter team.
