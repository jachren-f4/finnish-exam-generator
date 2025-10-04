# Final Backend Alignment Checklist - Math Exam Implementation

**Date:** 2025-10-04
**Purpose:** Verify backend implementation aligns perfectly with existing mobile app to minimize frontend changes
**Status:** Pre-implementation verification

---

## Executive Summary

The Math Exam API specification is well-designed and maintains backward compatibility. However, there are a few critical details that need verification to ensure the mobile app requires **minimal to zero changes** for basic math exam support.

This document outlines the final checklist items that need confirmation before backend implementation begins.

---

## 🚨 CRITICAL - Must Verify Before Implementation

### 1. Question Count in Creation Response

**Issue:** Current mobile app expects to access question count immediately after exam creation.

**Current Mobile App Code** (`lib/screens/progress_screen.dart:354`):

```dart
Navigator.pushReplacementNamed(
  context,
  '/share',
  arguments: {
    'examId': examId,
    'examUrl': examUrl,
    'subject': widget.subject,
    'studentId': widget.studentId,
    'questionCount': examResult?.data?.examQuestions?.questions.length ?? 0,
    //                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                Tries to access questions from creation response
  },
);
```

**Current Spec Says** (Section 1.2, line 137):
> Questions are NOT included in the creation response.

**Questions for Backend Team:**

- [ ] Does the **current production backend** return questions in the creation response?
- [ ] Or does it only return `examId`, `examUrl`, and `shareId`?
- [ ] If questions are not included, what does the mobile app currently show for question count?

**Three Possible Solutions:**

**Option A: Backend returns question count (RECOMMENDED - Zero frontend changes)**
```json
{
  "success": true,
  "data": {
    "examId": "uuid",
    "examUrl": "https://...",
    "shareId": "abc123",
    "questionCount": 15  // ← ADD THIS FIELD
  },
  "message": "Exam generated successfully"
}
```

**Option B: Backend returns minimal question data (Current behavior?)**
```json
{
  "success": true,
  "data": {
    "examId": "uuid",
    "examUrl": "https://...",
    "shareId": "abc123",
    "examQuestions": {
      "questions": []  // Empty array or basic info
    }
  },
  "message": "Exam generated successfully"
}
```

**Option C: Frontend change required**
- Remove question count from sharing screen
- Or fetch exam details separately before navigating

**RECOMMENDATION:** Use **Option A** (add `questionCount` field) - requires zero frontend changes.

---

### 2. Current Backend Behavior - Response Format

**Question:** What does the **current production backend** actually return?

**Need:** Actual example responses from production for:

1. **General exam creation** (current behavior):
```bash
POST /api/mobile/exam-questions
# with subject="History", grade="8", student_id="xxx"

# What is the actual response structure?
# Please provide real example
```

2. **List exams** (current behavior):
```bash
GET /api/mobile/exams?student_id=xxx

# What is the actual response structure?
# Does it include completedAt field already?
# Please provide real example
```

3. **Get exam by ID** (current behavior):
```bash
GET /api/mobile/exams/{exam_id}

# What is the actual response structure?
# Please provide real example
```

**Action Required:**
- [ ] Backend team to provide **actual JSON responses** from production endpoints
- [ ] Verify they match the spec format
- [ ] Document any discrepancies

---

### 3. Field Name Casing - Critical for JSON Parsing

**Issue:** JSON field names must match exactly what mobile app expects.

**Current Mobile App Models** use **camelCase**:

From `lib/models/exam_list_item.dart`:
```dart
class ExamListItem {
  final String examId;      // ← camelCase
  final String subject;
  final int questionCount;  // ← camelCase
  final DateTime createdAt; // ← camelCase
  final DateTime? completedAt; // ← camelCase

  factory ExamListItem.fromJson(Map<String, dynamic> json) {
    return ExamListItem(
      examId: json['examId'] as String,           // ← expects 'examId'
      subject: json['subject'] as String,
      questionCount: json['questionCount'] as int, // ← expects 'questionCount'
      createdAt: DateTime.parse(json['createdAt'] as String), // ← expects 'createdAt'
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
    );
  }
}
```

**Spec Uses camelCase** (Section 2.1):
```json
{
  "examId": "uuid-1",
  "subject": "Mathematics",
  "grade": null,
  "createdAt": "2025-10-04T12:35:00Z",
  "completedAt": null,
  "questionCount": 10,
  "examMetadata": {...}
}
```

**Verification Needed:**

- [ ] Confirm backend uses **camelCase** for all field names
- [ ] Confirm these exact field names: `examId`, `createdAt`, `completedAt`, `questionCount`, `examMetadata`
- [ ] NOT: `exam_id`, `created_at`, `completed_at`, `question_count`, `exam_metadata` (snake_case)

**⚠️ CRITICAL:** If backend uses snake_case, frontend models will break. Verify current production behavior.

---

### 4. Grading Status - completedAt Field

**Issue:** Mobile app relies on `completedAt` field for UI logic.

**Current Mobile App Logic** (`lib/screens/past_exams_screen.dart`):

```dart
// Filter tabs
final isUngraded = exam.completedAt == null;
final isGraded = exam.completedAt != null;

// Display logic
if (exam.completedAt == null) {
  // Show "Valmis" (Ready) badge - GREEN
  // Show "Share" + "View" buttons
} else {
  // Show "Arvosteltu" (Graded) badge - BLUE
  // Show "View Grading" button
  // Open grading URL
}
```

**Questions for Backend Team:**

- [ ] Does the **current production backend** already include `completedAt` field?
- [ ] Is it null when exam is created?
- [ ] Does it get set to a timestamp when student submits answers?
- [ ] If not currently implemented, can this be added?

**Spec Shows** (Section 2.1, lines 252, 265):
```json
{
  "examId": "uuid-1",
  "completedAt": null,  // ← Not graded yet
}

{
  "examId": "uuid-2",
  "completedAt": "2025-10-03T11:15:00Z"  // ← Graded
}
```

**CRITICAL:** This field is **required** for existing app functionality. Without it, grading status tracking breaks.

---

### 5. Student ID Filtering - Privacy Critical

**Issue:** Exam list must be filtered by student_id to prevent showing other users' exams.

**Current Mobile App Calls** (`lib/services/exam_api_service.dart` - implied from README):

```
GET /api/mobile/exams?student_id={userId}
```

**Spec Shows** (Section 2.1, line 226):
```
student_id: string (required)
  - User ID from Supabase auth
  - Filters exams to only show this user's exams
```

**Questions for Backend Team:**

- [ ] Does **current production backend** filter by `student_id` query parameter?
- [ ] Or is filtering handled by authentication/authorization?
- [ ] What happens if `student_id` is omitted? (Should return error or empty list)

**Security Concern:** Without filtering, all users would see all exams (major privacy issue).

**Verification:**
```bash
# Test 1: With student_id (should return only user's exams)
GET /api/mobile/exams?student_id=user-A

# Test 2: Without student_id (should return error or empty)
GET /api/mobile/exams

# Test 3: Wrong student_id (should return empty list)
GET /api/mobile/exams?student_id=different-user
```

---

### 6. Math Exam Metadata - New Fields for Mobile App

**Issue:** Mobile app models need to be extended to support new `examMetadata` field.

**Current Model** (`lib/models/exam_list_item.dart`):
```dart
class ExamListItem {
  final String examId;
  final String subject;
  final int questionCount;
  final DateTime createdAt;
  final DateTime? completedAt;

  // ⚠️ Does NOT have examMetadata field
}
```

**Spec Requires** (Section 2.1, lines 254-258):
```json
"examMetadata": {
  "topic": "Ympyräsektorit ja kaaret",
  "difficulty": "intermediate",
  "estimatedTimeMinutes": 45
}
```

**Questions for Backend Team:**

- [ ] For **general exams**, is `examMetadata` **null** or **omitted entirely**?
- [ ] For **math exams**, are all three fields always present (topic, difficulty, estimatedTimeMinutes)?
- [ ] Does the list response include `examMetadata.detectedConcepts` array, or only in detailed exam view?

**Minimal Frontend Change Required:**

```dart
// Need to add this to ExamListItem model
class ExamMetadata {
  final String topic;
  final String difficulty;
  final int estimatedTimeMinutes;
  // final List<String>? detectedConcepts; // If included in list response
}

class ExamListItem {
  // ... existing fields
  final ExamMetadata? examMetadata; // ← ADD THIS (optional)
}
```

**Spec Simplification Option:**

If `examMetadata` in list response only shows essential fields (topic, difficulty, time), that's perfect for mobile.

Full `detectedConcepts` array can be in detailed exam view only.

**Confirm:** Is this the intended structure?

---

### 7. Question Object Field Names

**Issue:** Mobile app needs to parse question objects correctly.

**Current Mobile App Model** (`lib/models/exam_models.dart`):

```dart
class ExamQuestion {
  final int id;
  final String questionText;
  final String questionType;
  final Map<String, String>? options;

  factory ExamQuestion.fromJson(Map<String, dynamic> json) {
    return ExamQuestion(
      id: json['id'] as int,
      questionText: json['questionText'] as String,
      questionType: json['questionType'] as String,
      options: json['options'] != null
          ? Map<String, String>.from(json['options'] as Map)
          : null,
    );
  }
}
```

**Spec Shows** (Section 3.1, lines 494-511):
```json
{
  "id": 1,
  "questionText": "Laske ympyräsektorin pinta-ala...",
  "questionLatex": "Kaava: $A = ...$",
  "answerType": "numeric",
  "options": null
}
```

**Questions for Backend Team:**

- [ ] Confirm field names: `questionText` (camelCase), NOT `question_text` (snake_case)
- [ ] Confirm: `answerType` field (NEW - for math exams)
- [ ] Confirm: `questionLatex` field (NEW - optional, for math exams)
- [ ] For general exams, are new fields **omitted** or **null**?

**Expected Behavior for General Exams:**
```json
{
  "id": 1,
  "questionText": "What year did WWII begin?",
  "questionLatex": null,  // or omitted entirely?
  "answerType": "multiple_choice",
  "options": {
    "A": "1937",
    "B": "1939",
    "C": "1941",
    "D": "1945"
  }
}
```

---

### 8. Error Response Format

**Issue:** Mobile app checks `success` field to determine if request failed.

**Current Mobile App Code** (`lib/services/exam_api_service.dart:302-329`):

```dart
if (response.statusCode == 200) {
  final jsonData = json.decode(response.body);
  final examResponse = ExamQuestionResponse.fromJson(jsonData);
  // Expects: { "success": true, "data": {...} }

} else if (response.statusCode == 429) {
  // Handle daily limit
  final errorJson = json.decode(response.body);
  throw ExamLimitException(
    message: errorJson['message'] ?? 'Päivittäinen koeraja saavutettu',
    limit: errorJson['limit'] ?? 10,
  );
}
```

**Spec Shows** (Section 1.3, lines 145-213):
```json
{
  "success": false,
  "error": "...",
  "message": "..."
}
```

**Questions for Backend Team:**

- [ ] Do **all** error responses include `"success": false`?
- [ ] Do **all** successful responses include `"success": true`?
- [ ] For 429 errors, is there a `limit` field showing the daily limit?

**Example 429 Response Needed:**
```json
{
  "success": false,
  "error": "Daily limit exceeded",
  "message": "You have reached the maximum number of exams for today",
  "limit": 10  // ← Does this exist?
}
```

---

## 📋 Backend Implementation Checklist

Before implementing math exam functionality, verify:

### Response Structure
- [ ] All responses include `success` boolean field
- [ ] Success responses wrap data in `data` object
- [ ] All field names use **camelCase** (not snake_case)
- [ ] Timestamps are ISO 8601 format (UTC)
- [ ] UUIDs are valid UUID v4 format

### Required Fields - Exam Creation Response
- [ ] `success` (boolean)
- [ ] `data.examId` (string, UUID)
- [ ] `data.examUrl` (string, full URL)
- [ ] `data.shareId` (string, short ID)
- [ ] `data.questionCount` (number) ← **ADD THIS** (recommended)
- [ ] `message` (string)

### Required Fields - List Exams Response
- [ ] `success` (boolean)
- [ ] `exams` (array)
- [ ] Each exam item includes:
  - [ ] `examId` (string)
  - [ ] `subject` (string)
  - [ ] `grade` (string | null)
  - [ ] `createdAt` (string, ISO 8601)
  - [ ] `completedAt` (string, ISO 8601 | null) ← **CRITICAL**
  - [ ] `questionCount` (number)
  - [ ] `examMetadata` (object | null) - Only for math exams

### Required Fields - examMetadata Object (Math Exams Only)
- [ ] `topic` (string) - Auto-detected topic in Finnish
- [ ] `difficulty` (string) - "basic" | "intermediate" | "advanced"
- [ ] `estimatedTimeMinutes` (number)
- [ ] `detectedConcepts` (array) - Optional in list view, required in detail view?

### Required Fields - Get Exam Response
- [ ] `success` (boolean)
- [ ] `exam` (object)
- [ ] `exam.examId` (string)
- [ ] `exam.subject` (string)
- [ ] `exam.grade` (string | null)
- [ ] `exam.createdAt` (string)
- [ ] `exam.completedAt` (string | null)
- [ ] `exam.examMetadata` (object | null)
- [ ] `exam.questions` (array)

### Required Fields - Question Object
- [ ] `id` (number)
- [ ] `questionText` (string)
- [ ] `questionLatex` (string | null) - NEW for math
- [ ] `answerType` (string) - NEW for math
- [ ] `options` (object | null)

### Request Parameters
- [ ] `student_id` is **required** in exam creation
- [ ] `student_id` is **required** in list exams (query param)
- [ ] `subject` determines exam type (Math vs General)
- [ ] `grade` is optional for math exams (ignored by backend)

### Security & Filtering
- [ ] List exams filters by `student_id` (privacy requirement)
- [ ] Invalid `student_id` returns empty list or error
- [ ] Missing `student_id` returns error
- [ ] Daily limits tracked per `student_id`

### Error Handling
- [ ] All errors return `success: false`
- [ ] 429 errors include daily limit info
- [ ] 400 errors provide specific validation messages
- [ ] 500 errors don't expose sensitive info

---

## 🎯 Minimal Frontend Changes Strategy

**Goal:** Keep frontend changes to absolute minimum

### If Backend Implements Above Checklist:

**Required Frontend Changes (Minimal):**
1. Add "Mathematics" option to subject selection
2. Add `examMetadata` field to `ExamListItem` model (optional field)
3. Add `questionLatex` and `answerType` to `ExamQuestion` model (optional fields)
4. Display math exam metadata in past exams list (topic, difficulty badge)

**NO Frontend Changes Needed For:**
- ✅ API service (same endpoints, same parameters)
- ✅ Progress screen (same flow)
- ✅ Sharing screen (examUrl works the same)
- ✅ Grading status (completedAt already exists)
- ✅ Error handling (same error format)
- ✅ Authentication (student_id already sent)

### If Backend Deviates from Checklist:

Frontend changes increase based on:
- Missing `questionCount` → Need to fetch exam details before sharing screen
- Wrong field casing → Need to update all model parsers
- Missing `completedAt` → Need to redesign grading status tracking
- Different error format → Need to update error handling logic

---

## 🚀 Next Steps

1. **Backend Team:** Review this checklist and confirm/deny each item
2. **Backend Team:** Provide **actual JSON examples** from current production
3. **Backend Team:** Document any planned deviations from spec
4. **Frontend Team:** Wait for verification before starting implementation
5. **Both Teams:** Schedule alignment call if major discrepancies found

---

## 📞 Critical Questions Summary

**Please answer these BEFORE implementing:**

1. Does current backend return `questionCount` in creation response?
2. Does current backend use **camelCase** or **snake_case** for field names?
3. Does current backend include `completedAt` field in exam lists?
4. Does current backend filter exams by `student_id` query parameter?
5. For math exams, is `examMetadata` always present? Always complete?
6. For general exams, is `examMetadata` null or omitted entirely?
7. Do error responses always include `success: false`?
8. Does 429 error include `limit` field?

**Provide Actual Examples:**
- Current general exam creation response (POST /api/mobile/exam-questions)
- Current exam list response (GET /api/mobile/exams?student_id=xxx)
- Current exam detail response (GET /api/mobile/exams/{id})

---

## ✅ Success Criteria

Backend implementation is aligned with frontend if:

1. ✅ All existing general exam flows work without any frontend changes
2. ✅ Mobile app can detect math exams by checking `examMetadata != null`
3. ✅ Mobile app can parse all responses without model changes (except adding optional fields)
4. ✅ No breaking changes to field names, structure, or types
5. ✅ Grading status continues to work with `completedAt` field
6. ✅ Privacy is maintained with `student_id` filtering

---

**Status:** Awaiting backend verification before proceeding with implementation.

**Last Updated:** 2025-10-04
