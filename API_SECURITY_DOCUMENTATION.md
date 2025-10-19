# API Security Documentation

## Overview

The ExamGenie API implements a comprehensive security layer with:
- **Rate Limiting**: Prevents abuse and cost explosion
- **Request Logging**: Tracks usage and security events
- **JWT Authentication**: Optional during alpha, mandatory post-alpha
- **Admin Monitoring**: Real-time rate limit management

**Status**: Phase 1 Complete (Pre-Alpha Ready)

## Authentication

### Current (Alpha Phase): Optional JWT

The API supports two authentication methods during alpha testing:

#### Option 1: Body Parameter (Backwards Compatible)
```bash
curl -X POST /api/mobile/exam-questions \
  -F "images=@image.jpg" \
  -F "user_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "category=mathematics" \
  -F "grade=5"
```

**User ID Format**: Valid UUID (PostgreSQL UUID type)

#### Option 2: JWT Token (Recommended)
```bash
curl -X POST /api/mobile/exam-questions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@image.jpg" \
  -F "category=mathematics" \
  -F "grade=5"
```

**JWT Source**: Supabase authentication
```dart
// Flutter app
final session = await supabase.auth.session();
final jwt = session?.accessToken;

// Add to API request
headers: {
  'Authorization': 'Bearer $jwt'
}
```

**JWT Validation**:
- Validates signature using Supabase
- Checks expiration automatically
- Extracts user_id from token payload
- Falls back gracefully if invalid

**Priority**: JWT user_id takes precedence over body user_id

### Future (Post-Alpha): Mandatory JWT

After 95%+ JWT adoption rate:
- Remove body `user_id` parameter
- Reject requests without valid JWT
- Return 401 Unauthorized for missing/invalid tokens

## Rate Limiting

### Limits

- **Hourly**: 10 requests per user
- **Daily**: 50 requests per user
- **Storage**: In-memory (resets on server restart)
- **Cleanup**: Automatic every 5 minutes

### Configuration

Environment variables (`.env.local`):
```env
RATE_LIMIT_HOURLY=10
RATE_LIMIT_DAILY=50
RATE_LIMITING_ENABLED=true  # Default: true
```

### Rate Limit Response

**Success (200 OK)**:
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1696834800

{
  "data": { ... },
  "exam": { ... }
}
```

**Rate Limit Exceeded (429)**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3421
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1696834800

{
  "error": "Päivittäinen koeraja saavutettu",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "limit": 10,
  "remaining": 0,
  "resetAt": "2023-10-09T10:00:00.000Z",
  "retryAfter": 3421,
  "details": "Voit luoda uuden kokeen 57 minuutin kuluttua.",
  "requestId": "xxx"
}
```

**Error Messages**:
- Finnish language for end users
- English technical details in logs

### Rate Limit Headers

All responses include rate limit headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Max requests per hour | `10` |
| `X-RateLimit-Remaining` | Remaining requests | `7` |
| `X-RateLimit-Reset` | Reset timestamp (Unix) | `1696834800` |
| `Retry-After` | Seconds until reset (429 only) | `3421` |

### Client Implementation

**Flutter Example**:
```dart
Future<Response> generateExam(File image, String userId) async {
  final response = await dio.post(
    '/api/mobile/exam-questions',
    data: FormData.fromMap({
      'images': await MultipartFile.fromFile(image.path),
      'user_id': userId,
      'category': 'mathematics',
      'grade': '5',
    }),
  );

  // Check rate limit headers
  final remaining = response.headers['x-ratelimit-remaining']?.first;
  final limit = response.headers['x-ratelimit-limit']?.first;

  if (response.statusCode == 429) {
    final retryAfter = response.headers['retry-after']?.first;
    final minutes = (int.parse(retryAfter!) / 60).ceil();

    throw RateLimitException(
      'Olet ylittänyt päivittäisen koerajan. Yritä uudelleen $minutes minuutin kuluttua.',
      retryAfter: retryAfter,
    );
  }

  // Show rate limit status to user
  print('Remaining exams today: $remaining/$limit');

  return response;
}
```

## Request Logging

### Database Schema

All API requests are logged to `api_request_logs` table:

```sql
CREATE TABLE api_request_logs (
  id UUID PRIMARY KEY,
  request_id VARCHAR(255) NOT NULL,
  user_id UUID,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,

  -- Client info
  ip_address INET,
  user_agent TEXT,

  -- Request metadata
  image_count INTEGER,
  has_valid_jwt BOOLEAN DEFAULT false,
  auth_source VARCHAR(20), -- 'jwt', 'body', 'none'
  request_metadata JSONB,

  -- Response info
  response_status INTEGER,
  processing_time_ms INTEGER,
  error_code VARCHAR(50),

  -- Rate limiting
  rate_limit_status VARCHAR(20), -- 'passed', 'exceeded'
  rate_limit_remaining INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Logged Events

**Successful Request (200)**:
```json
{
  "requestId": "xxx",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "endpoint": "/api/mobile/exam-questions",
  "method": "POST",
  "ipAddress": "192.168.1.100",
  "userAgent": "ExamGenie-Flutter/1.0",
  "imageCount": 1,
  "hasValidJwt": true,
  "authSource": "jwt",
  "requestMetadata": {
    "grade": 8,
    "category": "core_academics",
    "language": "fi"
  },
  "responseStatus": 200,
  "processingTimeMs": 10687,
  "rateLimitStatus": "passed",
  "rateLimitRemaining": 9
}
```

**Rate Limit Violation (429)**:
```json
{
  "requestId": "xxx",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "endpoint": "/api/mobile/exam-questions",
  "responseStatus": 429,
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "rateLimitStatus": "exceeded",
  "rateLimitRemaining": 0
}
```

### Privacy

**IP Address Hashing** (Optional):
```env
HASH_IP_ADDRESSES=true  # Default: false
```

When enabled, IP addresses are hashed before storage:
```
192.168.1.100 → hashed_a3f4b2c1
```

### Log Retention

**Automatic Cleanup**:
```sql
-- Deletes logs older than 30 days
SELECT delete_old_api_logs();
```

**Manual Cleanup** (Admin):
```typescript
import { getRequestLogger } from '@/lib/services/request-logger'

const logger = getRequestLogger()
const deletedCount = await logger.deleteOldLogs(30) // days
```

## Admin API

### Authentication

Admin endpoints require Supabase service role key:

```bash
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  http://localhost:3000/api/admin/rate-limits
```

**Security**:
- Service role key must be kept secret
- Never expose in client-side code
- Use only in backend/admin tools

### Endpoints

#### GET /api/admin/rate-limits

Get all users' rate limit status.

**Request**:
```bash
GET /api/admin/rate-limits
Authorization: Bearer <service-role-key>
```

**Response**:
```json
{
  "total_users": 42,
  "tracked_users": 42,
  "users": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "hourly": {
        "used": 5,
        "reset_at": "2023-10-09T10:00:00.000Z"
      },
      "daily": {
        "used": 12,
        "reset_at": "2023-10-10T00:00:00.000Z"
      }
    }
  ]
}
```

#### GET /api/admin/rate-limits?user_id=xxx

Get specific user's rate limit status.

**Request**:
```bash
GET /api/admin/rate-limits?user_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <service-role-key>
```

**Response**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
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

#### DELETE /api/admin/rate-limits?user_id=xxx

Reset user's rate limits.

**Request**:
```bash
DELETE /api/admin/rate-limits?user_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <service-role-key>
```

**Response**:
```json
{
  "success": true,
  "message": "Rate limits reset for user 550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Use Case**: Reset limits for support requests or testing

### Analytics Queries

**JWT Adoption Rate**:
```typescript
const logger = getRequestLogger()
const stats = await logger.getJwtAdoptionStats(7) // last 7 days

// Returns:
// {
//   totalRequests: 1234,
//   authenticatedRequests: 987,
//   jwtPercentage: 80
// }
```

**Rate Limit Violations**:
```typescript
const violations = await logger.getRateLimitViolations(7)

// Returns:
// {
//   totalAttempts: 1234,
//   violations: 45,
//   violationRate: 4,
//   topViolators: [
//     { userId: "xxx", count: 12 },
//     { userId: "yyy", count: 8 }
//   ]
// }
```

## Error Handling

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | User exceeded hourly/daily limit |
| `INVALID_REQUEST` | 400 | Missing required parameters |
| `FILE_TOO_LARGE` | 400 | Image exceeds 10MB |
| `UNSUPPORTED_FILE_TYPE` | 400 | Invalid image format |
| `TOO_MANY_FILES` | 400 | More than 20 images |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Response Format

```json
{
  "error": "User-friendly error message (Finnish)",
  "error_code": "ERROR_CODE",
  "details": "Technical details (English)",
  "requestId": "xxx",
  "retryAfter": 3421  // Only for 429
}
```

### Client Error Handling

**Flutter Example**:
```dart
try {
  final response = await generateExam(image, userId);
} on DioException catch (e) {
  if (e.response?.statusCode == 429) {
    // Rate limit exceeded
    final errorData = e.response?.data;
    final retryAfter = errorData['retryAfter'];
    final minutes = (retryAfter / 60).ceil();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Koeraja saavutettu'),
        content: Text(errorData['error']),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
  } else if (e.response?.statusCode == 401) {
    // JWT expired - re-authenticate
    await supabase.auth.signOut();
    Navigator.pushReplacementNamed(context, '/login');
  } else {
    // Other errors
    showErrorSnackbar(e.response?.data['error']);
  }
}
```

## Security Best Practices

### API Key Security

✅ **DO**:
- Store `GEMINI_API_KEY` in `.env.local`
- Use server-side API routes only
- Never expose API keys in client code
- Keep `.env.local` in `.gitignore`

❌ **DON'T**:
- Hardcode API keys in source code
- Commit `.env.local` to git
- Send API keys to client
- Use API keys in frontend code

### JWT Security

✅ **DO**:
- Refresh tokens before expiration
- Validate JWT on every request
- Use HTTPS in production
- Store tokens securely (Flutter Secure Storage)

❌ **DON'T**:
- Store JWT in localStorage (web)
- Ignore token expiration
- Use same token across devices
- Share tokens between users

### Rate Limiting

✅ **DO**:
- Show remaining requests to users
- Handle 429 errors gracefully
- Implement exponential backoff
- Cache results when possible

❌ **DON'T**:
- Retry immediately after 429
- Ignore rate limit headers
- Create multiple accounts to bypass
- Flood API with requests

## Migration to Production

### Pre-Deployment Checklist

- [ ] Run database migration for `api_request_logs`
- [ ] Configure production environment variables
- [ ] Enable HTTPS (Vercel/Netlify handles this)
- [ ] Set appropriate rate limits for production
- [ ] Enable IP address hashing if needed
- [ ] Set up log retention policy
- [ ] Configure monitoring alerts
- [ ] Test with production Supabase instance
- [ ] Verify JWT validation with production tokens
- [ ] Update Flutter app with production API URL

### Production Configuration

```env
# Production .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key

# Rate limiting (adjust based on usage)
RATE_LIMIT_HOURLY=10
RATE_LIMIT_DAILY=50
RATE_LIMITING_ENABLED=true

# Request logging
ENABLE_REQUEST_LOGGING=true
HASH_IP_ADDRESSES=true  # Privacy mode
```

### Scaling Considerations

**Current (In-Memory)**:
- Works for single-server deployment
- Rate limits reset on server restart
- Suitable for alpha/beta testing
- No additional infrastructure needed

**Future (Redis)**:
When scaling to multiple servers:
```typescript
// Upgrade to Redis-backed rate limiter
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export class RedisRateLimiter extends RateLimiter {
  // Shared rate limiting across servers
  // Persistent storage
  // Atomic operations
}
```

## Support & Troubleshooting

### Common Issues

**Issue**: Rate limit exceeded immediately
- **Cause**: Multiple devices using same user_id
- **Solution**: Each user should have unique UUID

**Issue**: JWT validation failing
- **Cause**: Token expired or invalid
- **Solution**: Refresh token in Flutter app

**Issue**: Request logging not working
- **Cause**: Database table doesn't exist
- **Solution**: Run migration (see `MIGRATION_INSTRUCTIONS.md`)

**Issue**: Admin API returns 401
- **Cause**: Wrong service role key
- **Solution**: Check `.env.local` for correct key

### Debug Mode

Enable verbose logging:
```env
DEBUG_RATE_LIMITER=true
DEBUG_JWT_VALIDATOR=true
DEBUG_REQUEST_LOGGER=true
```

### Monitoring

**Server Logs**:
```bash
# Watch for rate limit events
tail -f logs/server.log | grep "\[RateLimit\]"

# Watch for JWT events
tail -f logs/server.log | grep "\[JWT\]"

# Watch for authentication events
tail -f logs/server.log | grep "\[Auth\]"
```

**Database Queries**:
```sql
-- Recent requests
SELECT * FROM api_request_logs
ORDER BY created_at DESC
LIMIT 100;

-- Rate limit violations today
SELECT user_id, COUNT(*) as violations
FROM api_request_logs
WHERE rate_limit_status = 'exceeded'
  AND created_at > CURRENT_DATE
GROUP BY user_id
ORDER BY violations DESC;

-- JWT adoption rate
SELECT
  auth_source,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM api_request_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY auth_source;
```

## Next Steps

### Phase 2: Flutter App Integration (During Alpha)

**Tasks**:
1. Add `Authorization` header to API requests
2. Handle token refresh before expiration
3. Update error handling for 429/401 responses
4. Show rate limit status in UI
5. Implement retry logic with exponential backoff
6. Test with real users during alpha

**Timeline**: 2-3 weeks during alpha testing

### Phase 3: Enforce Mandatory JWT (Post-Alpha)

**Criteria**:
- JWT adoption rate ≥ 95%
- All alpha testers using JWT successfully
- No critical bugs reported

**Changes**:
1. Remove fallback to body `user_id`
2. Return 401 for missing/invalid JWT
3. Enable Supabase RLS policies
4. Update API documentation

**Timeline**: 1-2 weeks after successful alpha

## References

- Security Audit Checklist: `SECURITY_AUDIT_CHECKLIST.md`
- Implementation Plan: `SECURITY_IMPLEMENTATION_PLAN.md`
- Migration Instructions: `MIGRATION_INSTRUCTIONS.md`
- Testing Guide: `TESTING_GUIDE.md`

## Contact

For security issues or questions:
- Review documentation files listed above
- Check server logs for detailed error messages
- Test using scripts in `scripts/` directory
