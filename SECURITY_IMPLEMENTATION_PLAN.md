# Security Implementation Plan - Backend & Frontend Task Breakdown

**Project:** Finnish Exam Generator (ExamGenie)
**Goal:** Implement authentication & rate limiting before alpha testing
**Timeline:** Phase 1 (Pre-Alpha) - 2-3 days
**Created:** October 8, 2025

---

## Overview

This document breaks down the security implementation into **Backend tasks** (Next.js API) and **Frontend tasks** (Flutter mobile app), with clear ownership and dependencies.

### Strategy Summary
- **Phase 1 (Pre-Alpha):** Backend implements optional JWT + rate limiting
- **Phase 2 (During Alpha):** Frontend adds auth headers
- **Phase 3 (Post-Alpha):** Backend enforces mandatory JWT

---

## Phase 1: Pre-Alpha Implementation (BACKEND ONLY)

**Timeline:** 2-3 days before alpha launch
**Deliverable:** Secure backend that works with current Flutter app

### BACKEND Task List

#### Task Group A: Rate Limiting Implementation

**Owner:** Backend Developer (You/Claude)
**Priority:** 🔴 CRITICAL - Must complete before alpha
**Estimated Time:** 3-4 hours

##### A1: Create Rate Limiter Service
- [ ] **File:** Create `/src/lib/services/rate-limiter.ts`
- [ ] **Implementation:**
  - In-memory rate limiting using Map or Redis (if available)
  - Track requests by user ID
  - Support hourly and daily limits
  - Return remaining quota and reset time
  - Clean up expired entries (memory management)

- [ ] **Interface Design:**
```typescript
interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until reset
}

class RateLimiter {
  checkLimit(userId: string, limitType: 'hourly' | 'daily'): Promise<RateLimitResult>
  resetLimit(userId: string): Promise<void>
  getUsage(userId: string): Promise<{ hourly: number, daily: number }>
}
```

- [ ] **Configuration:**
  - Hourly limit: 10 exams per user
  - Daily limit: 50 exams per user
  - Store limits in `/src/lib/config.ts` as `RATE_LIMIT_CONFIG`

- [ ] **Dependencies:** None (pure TypeScript, no external packages needed initially)

---

##### A2: Apply Rate Limiting to Mobile API Endpoint
- [ ] **File:** Modify `/src/app/api/mobile/exam-questions/route.ts`
- [ ] **Implementation:**
  - Import RateLimiter service
  - Extract `student_id` from request body
  - Check hourly limit BEFORE processing images
  - Check daily limit if hourly passes
  - Return 429 if either limit exceeded
  - Include rate limit headers in response

- [ ] **Response Format (429 Too Many Requests):**
```typescript
{
  error: "Päivittäinen koeraja saavutettu", // Finnish error message
  error_code: "RATE_LIMIT_EXCEEDED",
  limit: 10,
  remaining: 0,
  resetAt: "2025-10-08T15:00:00Z",
  retryAfter: 3600 // seconds
}
```

- [ ] **Success Response Headers:**
```typescript
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1696777200 // Unix timestamp
```

- [ ] **Edge Cases to Handle:**
  - Missing `student_id` → Reject with 400 Bad Request
  - Invalid `student_id` format → Reject with 400
  - Rate limiter service failure → Allow request but log error (fail open)

- [ ] **Testing Requirements:**
  - Test with same user ID 11 times in 1 hour → 11th should fail
  - Test after 1 hour reset → Should allow new requests
  - Test with different user IDs → Independent limits

---

##### A3: Add Rate Limit Monitoring Endpoint (Optional but Recommended)
- [ ] **File:** Create `/src/app/api/admin/rate-limits/route.ts`
- [ ] **Implementation:**
  - GET endpoint to view current rate limit usage
  - Requires admin authentication (Supabase service role check)
  - Returns list of users and their current usage
  - Supports filtering by user ID

- [ ] **Response Format:**
```typescript
{
  users: [
    {
      user_id: "uuid-here",
      hourly_usage: 7,
      daily_usage: 23,
      last_request: "2025-10-08T14:30:00Z",
      hourly_reset_at: "2025-10-08T15:00:00Z",
      daily_reset_at: "2025-10-09T00:00:00Z"
    }
  ]
}
```

- [ ] **Security:** Only accessible with valid admin credentials

---

#### Task Group B: Request Logging

**Owner:** Backend Developer (You/Claude)
**Priority:** 🟡 HIGH - Important for monitoring during alpha
**Estimated Time:** 2-3 hours

##### B1: Create Request Logger Service
- [ ] **File:** Create `/src/lib/services/request-logger.ts`
- [ ] **Implementation:**
  - Log exam generation requests to database or file
  - Capture: user_id, timestamp, IP, image_count, has_jwt, success/failure
  - Support async logging (don't block API response)
  - Handle logging failures gracefully

- [ ] **Database Table (if using Supabase):**
```sql
CREATE TABLE api_request_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  image_count INTEGER,
  has_valid_jwt BOOLEAN DEFAULT false,
  request_metadata JSONB,
  response_status INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_logs_user_id ON api_request_logs(user_id);
CREATE INDEX idx_api_logs_created_at ON api_request_logs(created_at);
CREATE INDEX idx_api_logs_has_jwt ON api_request_logs(has_valid_jwt);
```

- [ ] **Alternative (File Logging):**
  - If database not preferred, log to `/logs/api-requests.log`
  - Use JSON format, one line per request
  - Implement log rotation (max 100MB per file)

- [ ] **Configuration:**
  - Enable/disable via environment variable: `ENABLE_REQUEST_LOGGING=true`
  - Privacy mode: Hash IP addresses if enabled
  - Retention: Auto-delete logs older than 30 days

---

##### B2: Integrate Logger into Mobile API Endpoint
- [ ] **File:** Modify `/src/app/api/mobile/exam-questions/route.ts`
- [ ] **Implementation:**
  - Log request START (before processing)
  - Log request END (after response sent)
  - Capture success/failure status
  - Measure processing time
  - Include rate limit hit/miss info

- [ ] **What to Log:**
```typescript
{
  user_id: string,
  endpoint: "/api/mobile/exam-questions",
  method: "POST",
  ip_address: string,
  user_agent: string,
  image_count: number,
  has_valid_jwt: boolean,
  request_metadata: {
    grade: string,
    subject: string,
    language: string,
    category: string
  },
  response_status: 200 | 400 | 401 | 429 | 500,
  processing_time_ms: number,
  rate_limit_status: "passed" | "exceeded",
  created_at: ISO8601 timestamp
}
```

- [ ] **Privacy Considerations:**
  - DO NOT log image contents
  - DO NOT log JWT tokens
  - DO NOT log Gemini API responses (may contain sensitive content)
  - Hash IP addresses if GDPR compliance needed

---

##### B3: Create Admin Log Viewer Endpoint (Optional)
- [ ] **File:** Create `/src/app/api/admin/logs/route.ts`
- [ ] **Implementation:**
  - GET endpoint to view recent request logs
  - Pagination support (limit, offset)
  - Filter by: user_id, date range, status code, has_jwt
  - Requires admin authentication

- [ ] **Response Format:**
```typescript
{
  logs: [...],
  pagination: {
    total: 1234,
    limit: 50,
    offset: 0,
    hasMore: true
  }
}
```

---

#### Task Group C: Optional JWT Authentication

**Owner:** Backend Developer (You/Claude)
**Priority:** 🟡 HIGH - Enables smooth transition to mandatory auth
**Estimated Time:** 3-4 hours

##### C1: Create JWT Validator Service
- [ ] **File:** Create `/src/lib/services/jwt-validator.ts`
- [ ] **Implementation:**
  - Extract JWT from `Authorization: Bearer <token>` header
  - Validate Supabase JWT signature using Supabase public key
  - Verify token expiration
  - Extract `user_id` (sub claim) from JWT payload
  - Return validation result

- [ ] **Interface Design:**
```typescript
interface JWTValidationResult {
  valid: boolean;
  userId?: string;
  error?: string;
  expiresAt?: Date;
}

class JWTValidator {
  validateToken(authHeader: string): Promise<JWTValidationResult>
  getSupabasePublicKey(): Promise<string>
}
```

- [ ] **Supabase JWT Structure:**
```json
{
  "sub": "user-uuid-here",
  "aud": "authenticated",
  "role": "authenticated",
  "email": "user@example.com",
  "exp": 1696777200,
  "iat": 1696773600
}
```

- [ ] **Validation Steps:**
  1. Check Authorization header exists
  2. Extract token (remove "Bearer " prefix)
  3. Verify JWT signature using Supabase JWT secret
  4. Check token not expired
  5. Extract user_id from `sub` claim
  6. Return validation result

- [ ] **Configuration:**
  - Supabase JWT secret: `process.env.SUPABASE_JWT_SECRET` or derive from anon key
  - Use `@supabase/supabase-js` built-in JWT verification if available

---

##### C2: Add Optional JWT Validation to Mobile API
- [ ] **File:** Modify `/src/app/api/mobile/exam-questions/route.ts`
- [ ] **Implementation:**
  - Extract `Authorization` header from request
  - If present, validate JWT
  - If valid, use `user_id` from JWT (secure source)
  - If invalid/missing, fall back to `student_id` from body (current behavior)
  - Log which source was used (JWT vs body)
  - Continue processing regardless of JWT validation result

- [ ] **Logic Flow:**
```typescript
let userId: string;
let authSource: 'jwt' | 'body' | 'none';

// Try JWT first
const authHeader = request.headers.get('Authorization');
if (authHeader) {
  const jwtResult = await jwtValidator.validateToken(authHeader);
  if (jwtResult.valid) {
    userId = jwtResult.userId!;
    authSource = 'jwt';
  } else {
    // Log JWT validation failure but don't reject
    console.warn('Invalid JWT:', jwtResult.error);
  }
}

// Fall back to body student_id
if (!userId) {
  const body = await request.formData();
  userId = body.get('student_id') as string;
  authSource = userId ? 'body' : 'none';
}

// Validate we have a user ID
if (!userId) {
  return NextResponse.json(
    { error: 'student_id or Authorization header required' },
    { status: 400 }
  );
}

// Continue with exam generation...
// Use userId for rate limiting, logging, database insertion
```

- [ ] **Response Headers (for monitoring):**
```typescript
X-Auth-Source: jwt | body | none
X-Auth-Valid: true | false
```

- [ ] **Monitoring:**
  - Log percentage of requests with valid JWT
  - Track in request logs: `has_valid_jwt` field
  - Target: 95%+ before enforcing mandatory auth

---

##### C3: Prepare for Mandatory JWT Enforcement (Future)
- [ ] **File:** Add feature flag to `/src/lib/config.ts`
- [ ] **Implementation:**
```typescript
export const AUTH_CONFIG = {
  REQUIRE_JWT: process.env.REQUIRE_JWT === 'true', // Default: false
  JWT_GRACE_PERIOD_DAYS: 14, // Days to enforce after enabling
  ENFORCEMENT_DATE: process.env.JWT_ENFORCEMENT_DATE, // Optional hard date
} as const;
```

- [ ] **Enforcement Logic (for Phase 3):**
```typescript
if (AUTH_CONFIG.REQUIRE_JWT && !jwtResult.valid) {
  return NextResponse.json(
    {
      error: 'Authentication required',
      error_code: 'AUTH_REQUIRED',
      message: 'Please update your app to continue using this service'
    },
    { status: 401 }
  );
}
```

- [ ] **Environment Variables:**
  - `REQUIRE_JWT=false` → Staging (optional auth)
  - `REQUIRE_JWT=false` → Production (during alpha)
  - `REQUIRE_JWT=true` → Production (after Flutter update deployed)

---

#### Task Group D: Error Handling & Response Improvements

**Owner:** Backend Developer (You/Claude)
**Priority:** 🟢 MEDIUM - Improves UX but not blocking
**Estimated Time:** 1-2 hours

##### D1: Standardize API Error Responses
- [ ] **File:** Create `/src/lib/utils/api-errors.ts`
- [ ] **Implementation:**
  - Define standard error response format
  - Error codes for common scenarios
  - Support for Finnish error messages (Flutter app uses Finnish)

- [ ] **Standard Error Format:**
```typescript
interface APIError {
  error: string;              // Human-readable message (Finnish)
  error_code: string;         // Machine-readable code
  details?: any;              // Optional additional info
  status: number;             // HTTP status code
  timestamp: string;          // ISO8601
  request_id?: string;        // For debugging
}
```

- [ ] **Error Codes:**
```typescript
const ERROR_CODES = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  MISSING_STUDENT_ID: 'MISSING_STUDENT_ID',
  INVALID_GRADE: 'INVALID_GRADE',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  TOO_MANY_IMAGES: 'TOO_MANY_IMAGES',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  GEMINI_API_ERROR: 'GEMINI_API_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

- [ ] **Finnish Error Messages:**
```typescript
const FINNISH_ERRORS = {
  RATE_LIMIT_EXCEEDED: 'Päivittäinen koeraja saavutettu',
  AUTH_REQUIRED: 'Kirjautuminen vaaditaan',
  INVALID_TOKEN: 'Virheellinen tunnistautuminen',
  TOO_MANY_IMAGES: 'Liikaa kuvia (max 5)',
  IMAGE_TOO_LARGE: 'Kuva on liian suuri (max 10MB)',
  // ... etc
};
```

---

##### D2: Apply Standardized Errors to Mobile API
- [ ] **File:** Modify `/src/app/api/mobile/exam-questions/route.ts`
- [ ] **Implementation:**
  - Replace ad-hoc error responses with standardized format
  - Include error codes with all error responses
  - Add request IDs for debugging

- [ ] **Before/After Example:**
```typescript
// Before
return NextResponse.json(
  { error: 'Too many images' },
  { status: 400 }
);

// After
return NextResponse.json(
  {
    error: 'Liikaa kuvia (max 5)',
    error_code: 'TOO_MANY_IMAGES',
    details: { received: 7, max: 5 },
    status: 400,
    timestamp: new Date().toISOString()
  },
  { status: 400 }
);
```

---

#### Task Group E: Testing & Documentation

**Owner:** Backend Developer (You/Claude)
**Priority:** 🟡 HIGH - Critical for alpha success
**Estimated Time:** 2-3 hours

##### E1: Create API Testing Script
- [ ] **File:** Create `/scripts/test-mobile-api.sh`
- [ ] **Implementation:**
  - Bash script to test all mobile API endpoints
  - Test rate limiting (make 11 requests rapidly)
  - Test with/without JWT headers
  - Test error scenarios
  - Verify response formats

- [ ] **Test Cases:**
```bash
# Test 1: Normal exam generation
curl -X POST $API_URL/api/mobile/exam-questions \
  -F "images=@test-image.jpg" \
  -F "student_id=test-user-123" \
  -F "grade=5"

# Test 2: Rate limit (11th request should fail)
for i in {1..11}; do
  curl -X POST $API_URL/api/mobile/exam-questions \
    -F "images=@test-image.jpg" \
    -F "student_id=test-user-123" \
    -F "grade=5"
done

# Test 3: With JWT header
curl -X POST $API_URL/api/mobile/exam-questions \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "images=@test-image.jpg" \
  -F "student_id=test-user-123" \
  -F "grade=5"

# Test 4: Missing student_id
curl -X POST $API_URL/api/mobile/exam-questions \
  -F "images=@test-image.jpg" \
  -F "grade=5"
# Should return 400 with MISSING_STUDENT_ID error
```

---

##### E2: Update API Documentation
- [ ] **File:** Update `/docs/api/mobile-exam-questions-endpoint.md`
- [ ] **Add Documentation For:**
  - Rate limiting behavior
  - Rate limit response headers
  - 429 error response format
  - Optional JWT authentication
  - Auth-Source response header
  - Error codes and Finnish messages

- [ ] **Example Documentation:**
```markdown
## Rate Limiting

All requests are rate-limited per user:
- **Hourly limit:** 10 exam generations per user
- **Daily limit:** 50 exam generations per user

### Rate Limit Headers (included in all responses)
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1696777200
```

### 429 Rate Limit Exceeded Response
```json
{
  "error": "Päivittäinen koeraja saavutettu",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "limit": 10,
  "remaining": 0,
  "resetAt": "2025-10-08T15:00:00Z",
  "retryAfter": 3600
}
```

## Optional Authentication

The API supports optional JWT authentication via Authorization header:

```bash
curl -H "Authorization: Bearer <supabase-jwt-token>" ...
```

If a valid JWT is provided, the user_id is extracted from the token.
Otherwise, the API falls back to the `student_id` field in the request body.

**Note:** JWT authentication will become mandatory in a future release.
```

---

##### E3: Test on Staging Environment
- [ ] **Environment:** Deploy to `exam-generator-staging.vercel.app`
- [ ] **Test Plan:**
  1. Deploy backend changes to staging
  2. Run automated test script
  3. Test manually with Postman/curl
  4. Verify rate limiting works
  5. Verify logging works
  6. Check Supabase logs for any errors
  7. Test with actual textbook images
  8. Verify exam generation still works correctly
  9. Check response times (should be <5s)
  10. Test error scenarios (missing fields, invalid data)

- [ ] **Success Criteria:**
  - ✅ Rate limiting enforces 10/hour, 50/day
  - ✅ Request logging captures all required fields
  - ✅ Optional JWT validation works correctly
  - ✅ Existing Flutter app functionality unchanged
  - ✅ Error responses include error codes
  - ✅ No performance regression

---

### BACKEND Task Summary

**Total Estimated Time:** 11-16 hours

| Task Group | Priority | Time | Status |
|------------|----------|------|--------|
| A. Rate Limiting | 🔴 Critical | 3-4h | ⬜ Not Started |
| B. Request Logging | 🟡 High | 2-3h | ⬜ Not Started |
| C. JWT Authentication | 🟡 High | 3-4h | ⬜ Not Started |
| D. Error Handling | 🟢 Medium | 1-2h | ⬜ Not Started |
| E. Testing & Docs | 🟡 High | 2-3h | ⬜ Not Started |

**Minimum Viable Implementation (MVP):** Tasks A, B, C (8-11 hours)
**Full Implementation:** All tasks (11-16 hours)

---

## Phase 2: During Alpha (FRONTEND TASKS)

**Timeline:** Week 1-2 of alpha testing
**Deliverable:** Flutter app sends authentication headers
**Owner:** Flutter Developer (Separate Team/Agent)

### FRONTEND Task List

#### Task Group F: Add JWT Authentication Headers

**Owner:** Flutter Developer
**Priority:** 🟡 HIGH - Required for Phase 3
**Estimated Time:** 2-3 hours
**Dependencies:** None (can be done independently)

##### F1: Update Exam API Service
- [ ] **File:** Modify `lib/services/exam_api_service.dart` (lines ~119-286)
- [ ] **Implementation:**
  - Import SupabaseService to get access token
  - Add Authorization header to multipart request
  - Handle null token gracefully (shouldn't happen but defensive)

- [ ] **Code Changes:**
```dart
// Before (current)
final request = http.MultipartRequest('POST', uri);

// After (with auth header)
final request = http.MultipartRequest('POST', uri);

// Get JWT token from Supabase session
final token = SupabaseService.instance.accessToken;
if (token != null && token.isNotEmpty) {
  request.headers['Authorization'] = 'Bearer $token';
} else {
  // Log warning - user should be authenticated
  print('WARNING: No access token available for API request');
}
```

- [ ] **Testing:**
  - Verify token is sent with requests
  - Test with expired token (should auto-refresh)
  - Test with logged-out user (should redirect to login)

---

##### F2: Update Exam Service (Past Exams API)
- [ ] **File:** Modify `lib/services/exam_service.dart` (line ~52)
- [ ] **Implementation:**
  - Add Authorization header to GET requests
  - Apply to `/api/mobile/exams` endpoint
  - Apply to `/api/mobile/stats` endpoint

- [ ] **Code Changes:**
```dart
// Before (current)
final uri = Uri.parse('$apiUrl$endpoint?student_id=$studentId');
final response = await http.get(uri);

// After (with auth header)
final uri = Uri.parse('$apiUrl$endpoint?student_id=$studentId');
final token = SupabaseService.instance.accessToken;
final headers = token != null
  ? {'Authorization': 'Bearer $token'}
  : <String, String>{};
final response = await http.get(uri, headers: headers);
```

---

##### F3: Add 401 Unauthorized Error Handling
- [ ] **File:** Modify `lib/services/exam_api_service.dart` (error handling section)
- [ ] **Implementation:**
  - Detect 401 response status
  - Attempt token refresh via Supabase
  - Retry request once with new token
  - If still fails, redirect to login screen

- [ ] **Code Changes:**
```dart
// Add after existing error handling (around line ~341-385)
if (response.statusCode == 401) {
  // Attempt to refresh token
  try {
    await SupabaseService.instance.client.auth.refreshSession();

    // Retry request with new token
    final newToken = SupabaseService.instance.accessToken;
    if (newToken != null) {
      request.headers['Authorization'] = 'Bearer $newToken';
      final retryResponse = await request.send().timeout(Duration(seconds: 120));

      if (retryResponse.statusCode == 200) {
        // Success on retry
        final responseBody = await retryResponse.stream.bytesToString();
        final jsonData = json.decode(responseBody);
        return ExamQuestionResponse.fromJson(jsonData);
      }
    }
  } catch (refreshError) {
    print('Token refresh failed: $refreshError');
  }

  // If we get here, auth failed - redirect to login
  throw UnauthorizedException(
    message: 'Kirjautuminen vanhentunut. Kirjaudu uudelleen.',
  );
}
```

- [ ] **Create New Exception:**
```dart
// Add to lib/services/exam_api_service.dart
class UnauthorizedException implements Exception {
  final String message;
  UnauthorizedException({required this.message});

  @override
  String toString() => message;
}
```

---

##### F4: Test with Staging Backend
- [ ] **Testing Checklist:**
  - [ ] Test exam creation with auth headers → Should work
  - [ ] Test past exams retrieval → Should work
  - [ ] Test stats endpoint → Should work
  - [ ] Test with expired token → Should auto-refresh and succeed
  - [ ] Test with manually invalidated token → Should redirect to login
  - [ ] Verify no regression in existing functionality
  - [ ] Test on physical iOS device (not just simulator)

- [ ] **Backend Coordination:**
  - Coordinate with backend team to deploy optional JWT support to staging first
  - Test against staging environment before production
  - Verify backend logs show `has_valid_jwt: true`

---

##### F5: Deploy Flutter Update
- [ ] **Deployment Steps:**
  1. Merge changes to Flutter main branch
  2. Build iOS app bundle
  3. Distribute to alpha testers (TestFlight or direct)
  4. Monitor for crashes/errors
  5. Confirm all testers updated (check backend logs)

- [ ] **Rollout Strategy:**
  - Deploy to staging environment first (1-2 days testing)
  - Deploy to production (alpha testers)
  - Monitor adoption rate (target: 95% within 1 week)
  - Once adoption high, backend can enforce mandatory JWT

---

### FRONTEND Task Summary

**Total Estimated Time:** 2-3 hours

| Task | Priority | Time | Dependencies | Status |
|------|----------|------|--------------|--------|
| F1. Add Auth Headers to Exam API | 🟡 High | 1h | None | ⬜ Not Started |
| F2. Add Auth Headers to Exam Service | 🟡 High | 30m | None | ⬜ Not Started |
| F3. Handle 401 Errors | 🟡 High | 30m | None | ⬜ Not Started |
| F4. Test with Staging | 🟡 High | 30m | Backend Phase 1 | ⬜ Not Started |
| F5. Deploy to Testers | 🟡 High | 30m | F1-F4 | ⬜ Not Started |

**Can Start:** After backend deploys Phase 1 to staging
**Must Complete:** Before backend enforces mandatory JWT (Phase 3)

---

## Phase 3: Post-Alpha (BACKEND TASKS)

**Timeline:** 3-4 weeks after alpha launch
**Deliverable:** Enforce mandatory JWT authentication
**Dependencies:** 95%+ of requests include valid JWT (monitored in logs)

### BACKEND Task List (Phase 3)

#### Task Group G: Enforce Mandatory JWT

**Owner:** Backend Developer
**Priority:** 🟡 HIGH - Required for production security
**Estimated Time:** 1-2 hours

##### G1: Monitor JWT Adoption Rate
- [ ] **Action:** Query request logs for JWT adoption
- [ ] **Target:** 95%+ of requests include valid JWT
- [ ] **Timeline:** Monitor for 1 week after Flutter update deployed

- [ ] **SQL Query (if using database logging):**
```sql
SELECT
  COUNT(*) as total_requests,
  SUM(CASE WHEN has_valid_jwt THEN 1 ELSE 0 END) as authenticated_requests,
  ROUND(100.0 * SUM(CASE WHEN has_valid_jwt THEN 1 ELSE 0 END) / COUNT(*), 2) as jwt_percentage
FROM api_request_logs
WHERE created_at > NOW() - INTERVAL '7 days'
  AND endpoint = '/api/mobile/exam-questions';
```

---

##### G2: Enable JWT Enforcement
- [ ] **File:** Set environment variable in Vercel
- [ ] **Action:**
  - Production: Set `REQUIRE_JWT=true`
  - Staging: Keep `REQUIRE_JWT=false` (for testing)

- [ ] **Verification:**
  - Test without JWT → Should return 401
  - Test with valid JWT → Should work
  - Test with expired JWT → Should return 401
  - Verify error response includes clear message

---

##### G3: Remove Fallback to Body student_id
- [ ] **File:** Modify `/src/app/api/mobile/exam-questions/route.ts`
- [ ] **Implementation:**
  - Remove fallback logic to body `student_id`
  - Always require valid JWT
  - Extract user_id from JWT only

- [ ] **Code Changes:**
```typescript
// Remove this fallback logic:
if (!userId) {
  userId = body.get('student_id') as string;
}

// Keep only JWT path:
if (!jwtResult.valid) {
  return NextResponse.json(
    {
      error: 'Kirjautuminen vaaditaan',
      error_code: 'AUTH_REQUIRED',
      message: 'Please update your app to continue',
      status: 401
    },
    { status: 401 }
  );
}

userId = jwtResult.userId!;
```

---

##### G4: Update API Documentation
- [ ] **File:** Update `/docs/api/mobile-exam-questions-endpoint.md`
- [ ] **Changes:**
  - Mark JWT authentication as REQUIRED (not optional)
  - Remove references to `student_id` in request body
  - Update examples to include Authorization header
  - Document 401 error response

---

### BACKEND Task Summary (Phase 3)

**Total Estimated Time:** 1-2 hours

| Task | Priority | Time | Dependencies | Status |
|------|----------|------|--------------|--------|
| G1. Monitor JWT Adoption | 🟡 High | 30m | Flutter deployed | ⬜ Not Started |
| G2. Enable JWT Enforcement | 🟡 High | 15m | 95%+ adoption | ⬜ Not Started |
| G3. Remove Fallback Logic | 🟡 High | 30m | G2 complete | ⬜ Not Started |
| G4. Update Documentation | 🟢 Medium | 15m | G3 complete | ⬜ Not Started |

---

## Additional Security Tasks (Tier 2 from Original Audit)

**Timeline:** During or after alpha
**Priority:** 🟡 HIGH but not blocking alpha launch

### Task Group H: Supabase Row Level Security (Backend)

**Owner:** Backend Developer
**Priority:** 🟡 HIGH - Critical for data protection
**Estimated Time:** 2-3 hours

##### H1: Enable RLS on Exams Table
- [ ] **Action:** Run Supabase migration
- [ ] **SQL:**
```sql
-- Enable RLS
ALTER TABLE examgenie_exams ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own exams
CREATE POLICY "Users can view own exams"
  ON examgenie_exams
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own exams
CREATE POLICY "Users can insert own exams"
  ON examgenie_exams
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own exams
CREATE POLICY "Users can update own exams"
  ON examgenie_exams
  FOR UPDATE
  USING (auth.uid() = user_id);
```

##### H2: Enable RLS on Questions Table
- [ ] **SQL:**
```sql
ALTER TABLE examgenie_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view questions from their own exams
CREATE POLICY "Users can view own exam questions"
  ON examgenie_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM examgenie_exams
      WHERE examgenie_exams.id = examgenie_questions.exam_id
        AND examgenie_exams.user_id = auth.uid()
    )
  );
```

##### H3: Test RLS Policies
- [ ] **Testing:**
  - Create exam as User A
  - Attempt to access as User B → Should fail
  - Verify User A can access their own exams
  - Test all CRUD operations

---

### Task Group I: Server-Side File Validation (Backend)

**Owner:** Backend Developer
**Priority:** 🟢 MEDIUM - Good security practice
**Estimated Time:** 1-2 hours

##### I1: Validate File Size on Server
- [ ] **File:** Modify `/src/app/api/mobile/exam-questions/route.ts`
- [ ] **Implementation:**
  - Check file size before processing
  - Max: 10MB per image
  - Return 400 with clear error if exceeded

##### I2: Validate File Type Using Magic Bytes
- [ ] **Implementation:**
  - Read first few bytes of file
  - Verify matches expected JPEG/PNG/WebP signature
  - Don't rely on file extension or MIME type header

##### I3: Validate File Count
- [ ] **Implementation:**
  - Count uploaded files
  - Mobile: Max 5 images
  - Web: Max 20 images
  - Return 400 if exceeded

---

## Dependencies & Sequencing

### Phase 1 (Backend Only - Can Start Immediately)
```
A. Rate Limiting ──────────┐
B. Request Logging ────────┼──► E. Testing & Docs ──► Deploy to Staging
C. JWT Validation ─────────┤
D. Error Handling ─────────┘
```

### Phase 2 (Frontend - Depends on Backend Phase 1)
```
Backend Phase 1 Deployed ──► F1-F3. Add Auth Headers ──► F4. Test ──► F5. Deploy
```

### Phase 3 (Backend - Depends on Frontend Phase 2)
```
Frontend Deployed ──► Monitor Adoption (1 week) ──► G2-G4. Enforce JWT
```

---

## Environment Variables Needed

### Backend (.env.local + Vercel)

```bash
# Existing
GEMINI_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key

# New for Phase 1
ENABLE_REQUEST_LOGGING=true          # Enable API request logging
REQUEST_LOG_DESTINATION=database     # database | file
RATE_LIMIT_HOURLY=10                 # Exams per hour per user
RATE_LIMIT_DAILY=50                  # Exams per day per user

# New for Phase 3 (future)
REQUIRE_JWT=false                    # Set to true when enforcing auth
JWT_ENFORCEMENT_DATE=2025-11-01      # Optional hard cutover date
```

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] Rate limiting works: 11th request in 1 hour returns 429
- [ ] Request logging captures all required fields
- [ ] JWT validation correctly identifies valid tokens
- [ ] Existing Flutter app continues to work unchanged
- [ ] No performance regression (response time < 5s)

### Phase 2 Success Criteria
- [ ] Flutter app sends Authorization headers
- [ ] Backend logs show 95%+ requests with valid JWT
- [ ] 401 errors handled gracefully (token refresh + retry)
- [ ] No user-facing errors or crashes

### Phase 3 Success Criteria
- [ ] Requests without JWT are rejected (401)
- [ ] All alpha testers can still use the app
- [ ] No unauthorized API access possible
- [ ] Documentation updated

---

## Risk Mitigation

### Risk 1: Rate Limiting Too Strict
**Mitigation:**
- Start with generous limits (10/hour, 50/day)
- Monitor actual usage in logs
- Adjust if legitimate users hitting limits

### Risk 2: JWT Validation Breaks Existing App
**Mitigation:**
- Make JWT optional in Phase 1 (fallback to body student_id)
- Test thoroughly on staging before production
- Can roll back easily if issues arise

### Risk 3: Flutter Update Not Adopted
**Mitigation:**
- Monitor adoption rate before enforcing JWT
- Provide grace period (2-4 weeks)
- Send in-app notification to update

### Risk 4: Token Refresh Failures
**Mitigation:**
- Implement retry logic in Flutter app
- Graceful fallback to login screen
- Clear error messages for users

---

## Communication Plan

### Backend ↔ Frontend Coordination

**Checkpoint 1: Before Implementation**
- [ ] Backend team confirms task list
- [ ] Frontend team confirms task list
- [ ] Agree on timeline and dependencies

**Checkpoint 2: After Backend Phase 1**
- [ ] Backend deploys to staging
- [ ] Backend provides staging API URL to frontend
- [ ] Frontend begins implementation

**Checkpoint 3: After Frontend Phase 2**
- [ ] Frontend deploys to staging
- [ ] Both teams test integration
- [ ] Verify JWT adoption rate increasing

**Checkpoint 4: Before Phase 3 Enforcement**
- [ ] Confirm 95%+ JWT adoption
- [ ] Agree on enforcement date
- [ ] Backend enables REQUIRE_JWT

---

## Timeline Summary

| Phase | Owner | Duration | When |
|-------|-------|----------|------|
| Phase 1: Backend Prep | Backend | 2-3 days | Now (before alpha) |
| Alpha Launch | Both | 1-2 weeks | After Phase 1 |
| Phase 2: Flutter Update | Frontend | 2-3 hours | During alpha |
| Monitoring | Backend | 1 week | After Phase 2 |
| Phase 3: Enforce JWT | Backend | 1-2 hours | Week 3-4 post-alpha |

**Total Backend Time:** 12-18 hours (across 4-5 weeks)
**Total Frontend Time:** 2-3 hours (week 1-2 of alpha)

---

## Questions Before Starting

1. **Rate Limiting Storage:** Should we use in-memory (simple, resets on deploy) or Redis (persistent, requires setup)?
   - **Recommendation:** In-memory for MVP, Redis for production scale

2. **Request Logging Destination:** Database table or log files?
   - **Recommendation:** Database (easier querying, better for monitoring)

3. **Admin Endpoints:** Should we build admin dashboard endpoints (Tasks A3, B3)?
   - **Recommendation:** Optional but very useful for monitoring alpha

4. **Testing:** Do you want me to create automated tests?
   - **Recommendation:** Yes, at least integration tests for rate limiting

5. **Supabase RLS:** Should we implement this in Phase 1 or wait until post-alpha?
   - **Recommendation:** Phase 1 if time allows, otherwise post-alpha

---

**Ready to implement when you confirm!** 🚀

---

**Last Updated:** October 8, 2025
