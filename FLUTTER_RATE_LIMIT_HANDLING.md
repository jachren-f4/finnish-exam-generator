# Flutter App - Rate Limit Error Handling Requirements

## Overview

The backend API now enforces rate limiting to prevent abuse:
- **Limit**: 10 exam generations per user per hour
- **Daily Limit**: 50 exam generations per user per day
- **Error Response**: HTTP 429 (Too Many Requests) when limit exceeded
- **Language**: All error messages are in Finnish

## Your Task

Implement error handling in the Flutter app to:
1. Detect when rate limits are exceeded (HTTP 429 errors)
2. Display helpful Finnish messages to users
3. Show remaining quota after successful requests
4. Disable exam generation until rate limit resets
5. Show countdown timer until reset

---

## API Response Formats

### 1. Successful Request (HTTP 200 OK)

**Response Body:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "processingTime": 8500,
      "requestId": "abc-123"
    }
  },
  "exam": {
    "examUrl": "https://...",
    "examId": "xyz-456",
    "gradingUrl": "https://..."
  }
}
```

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1696834800
```

**Header Meanings:**
- `X-RateLimit-Limit`: Maximum requests allowed per hour (10)
- `X-RateLimit-Remaining`: Requests remaining in current hour (0-10)
- `X-RateLimit-Reset`: Unix timestamp (seconds) when limit resets

---

### 2. Rate Limit Exceeded (HTTP 429 Too Many Requests)

**Response Body:**
```json
{
  "error": "Päivittäinen koeraja saavutettu",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "limit": 10,
  "remaining": 0,
  "resetAt": "2023-10-09T10:00:00.000Z",
  "retryAfter": 3421,
  "details": "Voit luoda uuden kokeen 57 minuutin kuluttua.",
  "requestId": "abc-123"
}
```

**Response Headers:**
```
Retry-After: 3421
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1696834800
```

**Field Descriptions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `error` | String | Finnish error message for display | "Päivittäinen koeraja saavutettu" |
| `error_code` | String | Error code for programmatic detection | "RATE_LIMIT_EXCEEDED" |
| `limit` | Integer | Hourly rate limit | 10 |
| `remaining` | Integer | Requests remaining (always 0 when limit exceeded) | 0 |
| `resetAt` | String | ISO 8601 timestamp when limit resets | "2023-10-09T10:00:00.000Z" |
| `retryAfter` | Integer | **Seconds** until limit resets | 3421 |
| `details` | String | Finnish explanation with minutes | "Voit luoda uuden kokeen 57 minuutin kuluttua." |
| `requestId` | String | Request ID for debugging | "abc-123" |

**Important Notes:**
- `retryAfter` is in **seconds**, not milliseconds
- `resetAt` is an **ISO 8601** timestamp with timezone
- `X-RateLimit-Reset` header is a **Unix timestamp** (seconds since epoch)
- All user-facing text (`error`, `details`) is in Finnish

---

## Required UI/UX Behavior

### After Successful Exam Generation

Display the remaining quota to users:

**Example Display (Finnish):**
```
✅ Koe luotu onnistuneesti!
📊 Jäljellä tänään: 7/10 koetta
```

Use `X-RateLimit-Remaining` and `X-RateLimit-Limit` headers from the response.

### When Rate Limit Exceeded (429 Error)

Show an alert/dialog with:

**Required Content:**
1. **Title**: "Koeraja saavutettu" (Rate Limit Reached)
2. **Main Message**: Use the `error` field from response body
3. **Details**: Use the `details` field from response body
4. **Statistics**:
   - Limit: `{remaining}/{limit}` (e.g., "0/10")
   - Reset time: Format `resetAt` timestamp as time (e.g., "10:00")
   - Wait time: Calculate minutes from `retryAfter` (e.g., "57 minuuttia")

**Example Dialog (Finnish):**
```
⏱️ Koeraja saavutettu

Olet käyttänyt kaikki 10 koettasi tältä tunnilta.

Voit luoda uuden kokeen 57 minuutin kuluttua.

📊 Koeraja: 0/10
⏰ Nollautuu klo: 10:00
⏱️ Odota: 57 minuuttia

[OK]
```

### Disable Exam Generation Button

When rate limit is exceeded:
- **Disable** the "Create Exam" / "Luo koe" button
- **Show countdown timer**: "Saatavilla 57 minuutin kuluttua" (Available in 57 minutes)
- **Update countdown** every second
- **Re-enable button** automatically when timer reaches zero

---

## Implementation Requirements

### 1. Detect Rate Limit Errors

Check for:
- HTTP status code = **429**
- `error_code` field = **"RATE_LIMIT_EXCEEDED"**

### 2. Extract Data from 429 Response

Parse these fields from the JSON response body:
- `error` → Display as main error message
- `details` → Display as explanation
- `limit` → Show in statistics
- `remaining` → Show in statistics (will be 0)
- `resetAt` → Use to calculate reset time
- `retryAfter` → Use for countdown timer

### 3. Calculate Time Values

From `retryAfter` (seconds):
- **Minutes**: `Math.ceil(retryAfter / 60)`
- **Countdown**: Update every second until zero

From `resetAt` (ISO timestamp):
- **Reset time**: Parse and format as "HH:MM" (e.g., "10:00")

### 4. Store Rate Limit State

Track:
- Whether limit is exceeded (true/false)
- Reset time (DateTime)
- Enable timer to re-enable button when reset time arrives

### 5. Handle Response Headers (Successful Requests)

Extract and display:
- `X-RateLimit-Remaining` → Show remaining quota
- `X-RateLimit-Limit` → Show total limit
- `X-RateLimit-Reset` → Calculate reset time (Unix timestamp in seconds)

---

## Error Detection Flow

```
1. Make API request to /api/mobile/exam-questions
2. Check HTTP status code
   ├─ 200: Success
   │  ├─ Extract headers: X-RateLimit-Remaining, X-RateLimit-Limit
   │  └─ Show: "Jäljellä tänään: {remaining}/{limit} koetta"
   │
   └─ 429: Rate Limit Exceeded
      ├─ Parse response body JSON
      ├─ Extract: error, details, retryAfter, resetAt
      ├─ Show dialog with Finnish error message
      ├─ Disable exam generation button
      ├─ Start countdown timer (retryAfter seconds)
      └─ Re-enable button when timer expires
```

---

## Finnish Text Reference

All user-facing text from the backend will be in Finnish. Here are additional translations you might need:

| English | Finnish |
|---------|---------|
| "Rate Limit Reached" | "Koeraja saavutettu" |
| "Remaining today" | "Jäljellä tänään" |
| "Available in X minutes" | "Saatavilla X minuutin kuluttua" |
| "Resets at" | "Nollautuu klo" |
| "Exam limit" | "Koeraja" |
| "Please wait" | "Odota" |
| "minutes" | "minuuttia" |
| "minute" | "minuutti" |

---

## Edge Cases to Handle

1. **App backgrounded**: When user returns, recalculate time remaining based on `resetAt` timestamp
2. **Network offline**: Don't show rate limit error if request failed due to network issues
3. **Invalid timestamps**: Fallback to `retryAfter` seconds if `resetAt` parsing fails
4. **Timezone issues**: `resetAt` includes timezone info - parse correctly
5. **Timer drift**: Always use backend's `resetAt` timestamp, not local calculations

---

## Testing Checklist

After implementation, test:

- [ ] Make 10 successful exam generations
- [ ] 11th request returns 429 error
- [ ] Error dialog shows correct Finnish text from backend
- [ ] Dialog shows correct minutes (from `retryAfter`)
- [ ] Countdown timer updates every second
- [ ] Button is disabled when limit exceeded
- [ ] Button re-enables when timer reaches zero
- [ ] After successful request, remaining quota is displayed
- [ ] Quota display updates correctly after each exam
- [ ] No crashes when receiving 429 error

---

## Example Error Response (Full)

This is exactly what you'll receive from the backend when rate limit is exceeded:

**HTTP Status:** 429 Too Many Requests

**Headers:**
```
Content-Type: application/json
Retry-After: 3421
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1696834800
```

**Body:**
```json
{
  "error": "Päivittäinen koeraja saavutettu",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "limit": 10,
  "remaining": 0,
  "resetAt": "2025-10-09T10:00:00.000Z",
  "retryAfter": 3421,
  "details": "Voit luoda uuden kokeen 57 minuutin kuluttua.",
  "requestId": "e4fdf24a-faff-4ec5-b10a-bd562ed8e719"
}
```

Use this exact structure for your error handling logic.

---

## Questions?

If you need clarification on any of the following, please ask:

1. Is `retryAfter` always in seconds? **Yes**
2. Is `resetAt` in ISO 8601 format with timezone? **Yes**
3. Is `X-RateLimit-Reset` a Unix timestamp in seconds? **Yes**
4. Should we cache rate limit status locally? **No, always use response headers**
5. What if user signs out and back in? **Rate limits are per user_id, so they persist**
6. Can we show the error text directly to users? **Yes, it's already in Finnish**

---

## Summary

**What you need to do:**
1. Catch HTTP 429 errors from the exam generation endpoint
2. Parse the JSON response to get Finnish error messages and timing info
3. Display a user-friendly dialog with the error message and countdown
4. Disable the exam generation button until the rate limit resets
5. Show remaining quota after successful requests

**What the backend provides:**
- Finnish error messages ready to display
- Exact timing info (`retryAfter` in seconds, `resetAt` timestamp)
- Rate limit headers on every successful request
- Request ID for debugging

Implement this so users understand why they're rate limited and when they can create exams again.
