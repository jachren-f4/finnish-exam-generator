# Mobile Exam Retrieval API Endpoints

**Created:** January 2025
**Purpose:** Enable Flutter app to retrieve previously created exams

---

## Overview

Three new endpoints have been implemented to support exam persistence and retrieval in the mobile app:

1. **GET /api/mobile/exams** - List all exams for a user
2. **GET /api/mobile/exams/[examId]** - Get single exam with questions
3. **GET /api/mobile/stats** - Get user exam statistics

All endpoints:
- ✅ Use existing Supabase database tables (`examgenie_exams`, `examgenie_questions`)
- ✅ Support CORS for mobile apps
- ✅ Return consistent JSON format with `success` field
- ✅ Include proper error handling
- ✅ Require no authentication (use `user_id` as identifier)
- ✅ Support backward compatibility with `student_id` parameter (deprecated)

---

## Endpoint 1: List Exams

### Request

```
GET https://examgenie.app/api/mobile/exams?user_id={userId}
```

**Query Parameters:**
- `user_id` (required): UUID of the user
- `student_id` (deprecated): Still accepted for backward compatibility, use `user_id` instead

**Headers:**
```
Content-Type: application/json
```

### Response Format

**Success (200):**
```json
{
  "success": true,
  "data": {
    "exams": [
      {
        "exam_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "660e8400-e29b-41d4-a716-446655440001",
        "subject": "Matematiikka",
        "grade": "5",
        "status": "READY",
        "question_count": 10,
        "exam_url": "https://examgenie.app/exam/550e8400-e29b-41d4-a716-446655440000",
        "grading_url": "https://examgenie.app/grading/550e8400-e29b-41d4-a716-446655440000",
        "created_at": "2025-09-30T12:00:00Z",
        "completed_at": "2025-09-30T12:05:00Z"
      }
    ],
    "total": 12
  },
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

**Empty Result (200):**
```json
{
  "success": true,
  "data": {
    "exams": [],
    "total": 0
  },
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

**Error (400 - Missing Parameter):**
```json
{
  "success": false,
  "error": "user_id parameter is required",
  "details": "Provide the user UUID in the query string: ?user_id=xxx (student_id still supported for backward compatibility)",
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

**Error (500 - Database Error):**
```json
{
  "success": false,
  "error": "Failed to retrieve exams",
  "details": "Database connection error",
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

### Sorting

Exams are sorted by **most recent first** (`created_at DESC`)

### Status Values

- `DRAFT` - Exam being created (rare)
- `PROCESSING` - AI is generating questions
- `READY` - Exam complete and ready to use
- `FAILED` - Generation failed

### Example cURL Command

```bash
curl -X GET "https://examgenie.app/api/mobile/exams?user_id=660e8400-e29b-41d4-a716-446655440001"
```

---

## Endpoint 2: Get Single Exam

### Request

```
GET https://examgenie.app/api/mobile/exams/{examId}
```

**Path Parameters:**
- `examId` (required): UUID of the exam

**Headers:**
```
Content-Type: application/json
```

### Response Format

**Success (200):**
```json
{
  "success": true,
  "data": {
    "exam": {
      "exam_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "660e8400-e29b-41d4-a716-446655440001",
      "subject": "Matematiikka",
      "grade": "5",
      "status": "READY",
      "questions": [
        {
          "id": "q1-uuid",
          "question_number": 1,
          "question_text": "Mikä on 2 + 2?",
          "question_type": "multiple_choice",
          "options": ["3", "4", "5", "6"],
          "correct_answer": "4",
          "explanation": "2 + 2 = 4 on peruslaskutoimitus.",
          "max_points": 2
        },
        {
          "id": "q2-uuid",
          "question_number": 2,
          "question_text": "Onko 7 parillinen luku?",
          "question_type": "true_false",
          "options": ["Tosi", "Epätosi"],
          "correct_answer": "Epätosi",
          "explanation": "7 on pariton luku.",
          "max_points": 2
        }
      ],
      "exam_url": "https://examgenie.app/exam/550e8400-e29b-41d4-a716-446655440000",
      "grading_url": "https://examgenie.app/grading/550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-09-30T12:00:00Z",
      "completed_at": "2025-09-30T12:05:00Z"
    }
  },
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

**Error (404 - Exam Not Found):**
```json
{
  "success": false,
  "error": "Exam not found",
  "details": "No exam exists with ID: 550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

**Error (400 - Invalid Exam ID):**
```json
{
  "success": false,
  "error": "Invalid exam ID format",
  "details": "Exam ID must be a valid UUID",
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

### Question Types

- `multiple_choice` - Multiple choice with 4 options
- `true_false` - True/False questions
- `short_answer` - Open-ended text response
- `fill_in_the_blank` - Complete the sentence

### Important Notes on Questions

1. **Options are already shuffled** - Don't re-shuffle in Flutter
2. **correct_answer format** - For multiple choice, it's the exact text (e.g., "4")
3. **Questions are sorted** - By `question_number` ascending

### Example cURL Command

```bash
curl -X GET "https://examgenie.app/api/mobile/exams/550e8400-e29b-41d4-a716-446655440000"
```

---

## Endpoint 3: User Statistics

### Request

```
GET https://examgenie.app/api/mobile/stats?user_id={userId}
```

**Query Parameters:**
- `user_id` (required): UUID of the user
- `student_id` (deprecated): Still accepted for backward compatibility, use `user_id` instead

**Headers:**
```
Content-Type: application/json
```

### Response Format

**Success (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_exams": 12,
      "exams_this_week": 3,
      "exams_by_subject": {
        "Matematiikka": 5,
        "Äidinkieli": 4,
        "Historia": 3
      },
      "exams_by_status": {
        "READY": 10,
        "PROCESSING": 1,
        "FAILED": 1
      }
    }
  },
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

**Empty Stats (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_exams": 0,
      "exams_this_week": 0,
      "exams_by_subject": {},
      "exams_by_status": {}
    }
  },
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

**Error (400 - Missing Parameter):**
```json
{
  "success": false,
  "error": "user_id parameter is required",
  "details": "Provide the user UUID in the query string: ?user_id=xxx (student_id still supported for backward compatibility)",
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

### Time Periods

- `exams_this_week` - Created in the last 7 days

### Example cURL Command

```bash
curl -X GET "https://examgenie.app/api/mobile/stats?user_id=660e8400-e29b-41d4-a716-446655440001"
```

---

## Testing

### Prerequisites

You need at least one exam created for the user. Create one via:

```bash
curl -X POST "https://examgenie.app/api/mobile/exam-questions" \
  -F "images=@test.jpg" \
  -F "subject=Matematiikka" \
  -F "grade=5" \
  -F "user_id=YOUR-USER-UUID" \
  -F "language=fi"
```

### Test Sequence

1. **Create an exam** (use POST endpoint above)
2. **List exams** to verify it's stored
3. **Get single exam** using the exam_id from step 1
4. **Get statistics** to see the count

### Example Test Script

```bash
# Set your user ID
USER_ID="660e8400-e29b-41d4-a716-446655440001"
BASE_URL="https://examgenie.app"

# Test 1: List exams
echo "=== Test 1: List Exams ==="
curl -s "$BASE_URL/api/mobile/exams?user_id=$USER_ID" | jq

# Test 2: Get single exam (replace with actual exam_id)
echo "\n=== Test 2: Get Single Exam ==="
EXAM_ID="550e8400-e29b-41d4-a716-446655440000"
curl -s "$BASE_URL/api/mobile/exams/$EXAM_ID" | jq

# Test 3: Get statistics
echo "\n=== Test 3: Get Statistics ==="
curl -s "$BASE_URL/api/mobile/stats?user_id=$USER_ID" | jq
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Additional technical details",
  "metadata": {
    "timestamp": "2025-09-30T14:30:00Z"
  }
}
```

### HTTP Status Codes

- `200 OK` - Success (including empty results)
- `400 Bad Request` - Missing or invalid parameters
- `404 Not Found` - Exam doesn't exist
- `500 Internal Server Error` - Database or server error

### Flutter Error Handling

```dart
try {
  final response = await http.get(Uri.parse(url));
  final data = jsonDecode(response.body);

  if (data['success'] == true) {
    // Handle success
    final exams = data['data']['exams'];
  } else {
    // Handle error
    final errorMessage = data['error'];
    final errorDetails = data['details'];
  }
} catch (e) {
  // Handle network error
}
```

---

## CORS Support

All endpoints support CORS for mobile apps:

- **Allowed Origins:** `*` (all)
- **Allowed Methods:** `GET`, `OPTIONS`
- **Allowed Headers:** `Content-Type`, `Authorization`

No special headers required for basic requests.

---

## Authentication

Currently **optional** - endpoints accept any `user_id` without authentication.

For future authentication:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

The backend will validate the token and ensure the user is authenticated.

---

## Database Schema Reference

### examgenie_exams table
```sql
- id (uuid, primary key)
- user_id (uuid) -- Foreign key to users table, used for filtering
- subject (text)
- grade (text)
- status (text: DRAFT | PROCESSING | READY | FAILED)
- share_id (text)
- created_at (timestamp)
- completed_at (timestamp)
```

### examgenie_questions table
```sql
- id (uuid, primary key)
- exam_id (uuid, foreign key)
- question_number (integer)
- question_text (text)
- question_type (text)
- options (jsonb)
- correct_answer (text)
- explanation (text)
- max_points (integer)
```

---

## Performance Notes

- List endpoint includes JOIN to count questions (efficient query)
- No pagination currently - all exams returned (assumes <1000 exams per user)
- Results sorted in database (not in-memory)
- Timestamp fields in ISO 8601 format

---

## Next Steps for Flutter

1. Create `ExamService` class to call these endpoints
2. Create Dart models matching the response format
3. Implement caching/local storage for offline access
4. Add refresh functionality to reload exam list
5. Handle loading/error states in UI

---

## Support

**Issues:** Report at https://github.com/jachren-f4/finnish-exam-generator/issues
**API Questions:** Check PROJECT_OVERVIEW.md or CLAUDE.md in repo root