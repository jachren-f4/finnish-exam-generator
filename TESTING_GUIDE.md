# Security Implementation Testing Guide

This guide explains how to test the newly implemented security features: rate limiting, request logging, and JWT validation.

## Prerequisites

1. **Development server running**:
   ```bash
   npm run dev
   ```

2. **Environment variables configured** (`.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. **Test image available**:
   - Default path: `assets/images/physics_hires/fyssa2_hires.jpg`
   - Or provide your own image path

## Test Scripts

All test scripts are in the `scripts/` directory and are executable.

### 1. Test Rate Limiting

**Purpose**: Verify that rate limiting blocks requests after 10 requests/hour.

```bash
./scripts/test-rate-limiting.sh
```

**Expected Behavior**:
- Requests 1-10: ✅ 200 OK
- Request 11: 🚫 429 Too Many Requests
- Response includes:
  - Finnish error message: "Päivittäinen koeraja saavutettu"
  - Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`

**Server Logs Should Show**:
```
[RateLimit] User xxx - Remaining: 9/10
[RateLimit] User xxx - Remaining: 8/10
...
[RateLimit] User xxx exceeded limit (10 per hour)
```

**Notes**:
- Rate limits are in-memory and reset on server restart
- Uses hourly limit: 10 requests/hour
- Daily limit: 50 requests/day

### 2. Test JWT Validation

**Purpose**: Verify optional JWT authentication works correctly.

```bash
./scripts/test-jwt-validation.sh
```

**Test Cases**:

#### Test 1: No JWT (Backwards Compatibility)
- Sends `user_id` in request body
- Should succeed with `auth_source='body'`

#### Test 2: Invalid JWT
- Sends malformed JWT token
- Should gracefully fall back to body `user_id`
- Logs warning: `[JWT] Invalid token: <error>`

#### Test 3: Valid JWT (Optional)
- Requires real Supabase JWT token
- Export token: `export JWT_TOKEN='your-jwt-here'`
- Should succeed with `auth_source='jwt'`
- User ID extracted from JWT, not body

**Server Logs Should Show**:
```
[JWT] Valid token for user: <user_id>
[Auth] JWT provided: true, Source: jwt
```

**How to Get Real JWT Token**:
1. Sign in to Flutter app
2. Extract token from Supabase session:
   ```dart
   final session = await supabase.auth.session();
   final jwt = session?.accessToken;
   ```
3. Export token: `export JWT_TOKEN='<your-jwt>'`
4. Re-run test

### 3. Test Admin API

**Purpose**: Verify admin endpoints for monitoring rate limits.

```bash
export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
./scripts/test-admin-api.sh
```

**Test Cases**:

#### Test 1: Get All Users
```bash
GET /api/admin/rate-limits
```
Returns list of all users with rate limit usage.

#### Test 2: Get Specific User
```bash
GET /api/admin/rate-limits?user_id=xxx
```
Returns specific user's hourly and daily usage.

#### Test 3: Reset User Limits
```bash
DELETE /api/admin/rate-limits?user_id=xxx
```
Resets rate limits for specific user.

#### Test 4: Unauthorized Access
Attempts to access without service role key.
Should return 401 Unauthorized.

**Expected Response Format**:
```json
{
  "user_id": "xxx",
  "hourly": {
    "used": 5,
    "limit": 10,
    "remaining": 5
  },
  "daily": {
    "used": 12,
    "limit": 50,
    "remaining": 38
  }
}
```

## Manual Testing

### Test Exam Generation with Security Features

```bash
curl -X POST http://localhost:3000/api/mobile/exam-questions \
  -F "images=@assets/images/physics_hires/fyssa2_hires.jpg" \
  -F "user_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "category=core_academics" \
  -F "grade=8" \
  -F "language=fi"
```

**Check Response Headers**:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: <unix-timestamp>
```

**Check Server Logs**:
```
[RateLimiter] Initialized with limits: 10/hour, 50/day
[RateLimit] User xxx - Remaining: 9/10
[Auth] JWT provided: false, Source: body
[RequestLogger] Initialized (enabled: true)
```

### Test with JWT Header

```bash
curl -X POST http://localhost:3000/api/mobile/exam-questions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@assets/images/physics_hires/fyssa2_hires.jpg" \
  -F "category=mathematics" \
  -F "grade=5"
```

**Expected**:
- User ID extracted from JWT
- Server logs: `[JWT] Valid token for user: <user_id>`
- `auth_source='jwt'` in logs

## Database Testing

### After Running Migration

Once you've run the `api_request_logs` migration:

1. **Check table exists**:
   - Supabase Dashboard → Table Editor
   - Look for `api_request_logs` table

2. **Query recent logs**:
   ```sql
   SELECT * FROM api_request_logs
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Check JWT adoption rate**:
   ```sql
   SELECT
     COUNT(*) as total_requests,
     COUNT(*) FILTER (WHERE has_valid_jwt = true) as jwt_requests,
     ROUND(100.0 * COUNT(*) FILTER (WHERE has_valid_jwt = true) / COUNT(*), 2) as jwt_percentage
   FROM api_request_logs
   WHERE created_at > NOW() - INTERVAL '7 days';
   ```

4. **Check rate limit violations**:
   ```sql
   SELECT
     user_id,
     COUNT(*) as violation_count
   FROM api_request_logs
   WHERE rate_limit_status = 'exceeded'
     AND created_at > NOW() - INTERVAL '7 days'
   GROUP BY user_id
   ORDER BY violation_count DESC;
   ```

## Troubleshooting

### Rate Limiting Not Working

**Check**:
- Rate limiter initialized: Look for `[RateLimiter] Initialized` in logs
- User ID is valid UUID format
- Rate limit config in `.env.local`:
  ```env
  RATE_LIMIT_HOURLY=10
  RATE_LIMIT_DAILY=50
  RATE_LIMITING_ENABLED=true
  ```

**Reset rate limits**:
- Restart dev server: `Ctrl+C` then `npm run dev`
- Or use admin API: `DELETE /api/admin/rate-limits?user_id=xxx`

### JWT Validation Failing

**Check**:
- Supabase credentials in `.env.local`
- JWT token is not expired
- Authorization header format: `Bearer <token>`
- Token has 3 parts separated by dots

**Test JWT manually**:
```bash
# Decode JWT payload (base64)
echo "YOUR.JWT.TOKEN" | cut -d'.' -f2 | base64 -d | jq '.'
```

### Request Logging Not Working

**Check**:
- `api_request_logs` table exists (run migration)
- `SUPABASE_SERVICE_ROLE_KEY` is set
- `ENABLE_REQUEST_LOGGING` not set to `false`

**Expected error if table missing**:
```
[RequestLogger] Failed to insert log: Could not find the table 'public.api_request_logs'
```

**Solution**: Run migration (see `MIGRATION_INSTRUCTIONS.md`)

## Performance Testing

### Load Test Rate Limiting

Test with concurrent requests:

```bash
# Install Apache Bench
brew install apache-bench

# Send 20 concurrent requests
ab -n 20 -c 5 -p request.json -T "multipart/form-data" \
  http://localhost:3000/api/mobile/exam-questions
```

**Expected**:
- First 10 requests: 200 OK
- Remaining requests: 429 Too Many Requests

### Monitor Memory Usage

Rate limiter uses in-memory storage:

```bash
# Check Node.js memory usage
node --inspect-brk ./node_modules/.bin/next dev
```

Open Chrome DevTools → Memory → Take heap snapshot

**Expected**:
- Rate limiter Map size: ~1KB per user
- Cleanup runs every 5 minutes
- Old entries removed automatically

## Pre-Alpha Checklist

Before launching alpha testing:

- [ ] Rate limiting works (11th request blocked)
- [ ] Admin API accessible with service role key
- [ ] JWT validation works (optional - backwards compatible)
- [ ] Request logging enabled (after running migration)
- [ ] Rate limit headers present in responses
- [ ] Finnish error messages working
- [ ] Server logs showing auth source (jwt/body/none)
- [ ] Test with real Flutter app JWT token
- [ ] Database migration run on staging
- [ ] Monitoring dashboard set up (optional)

## Next Steps

### Phase 2 (During Alpha)

**Flutter App Team**:
- Add `Authorization: Bearer <jwt>` headers to API requests
- Update error handling for 429 responses
- Show rate limit status to users

**Backend Team**:
- Monitor JWT adoption rate using `getJwtAdoptionStats()`
- Track rate limit violations using `getRateLimitViolations()`
- Adjust limits if needed based on usage patterns

### Phase 3 (Post-Alpha)

When JWT adoption reaches 95%+:
- Enforce mandatory JWT authentication
- Remove fallback to body `user_id`
- Enable Supabase RLS policies

## Support

- Migration issues: See `MIGRATION_INSTRUCTIONS.md`
- Security audit: See `SECURITY_AUDIT_CHECKLIST.md`
- Implementation plan: See `SECURITY_IMPLEMENTATION_PLAN.md`
- API docs: (To be created)
