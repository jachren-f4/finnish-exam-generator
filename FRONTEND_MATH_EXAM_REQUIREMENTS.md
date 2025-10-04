# Frontend API Requirements for Math Exams

This document specifies the API endpoints, request/response formats, and data structures needed to support math exams in the frontend. **This document maintains full backward compatibility with the existing mobile app implementation.**

---

## Overview

Math exams use the **same unified exam creation endpoint** as general exams. The exam type is determined by the `subject` parameter value:

- **Math Exam**: `subject` = "Mathematics" OR "Math"
- **General Exam**: `subject` = any other value (e.g., "History", "Biology", "Finnish")

Math exams integrate with 3 main API workflows:
1. **Create exam** - Upload textbook images and generate questions (synchronous, 120s timeout)
2. **List exams** - Retrieve all exams for a specific student (including math exams)
3. **Get exam questions** - Retrieve questions for a specific exam

---

## 1. Create Exam (Unified Synchronous Endpoint)

### 1.1 Create and Generate Exam

**Endpoint:** `POST /api/mobile/exam-questions`

**Request Format:** `multipart/form-data`

**Timeout:** 120 seconds (synchronous processing, no polling needed)

**Request Fields:**

```
images: File[] (required)
  - Accept: JPEG, PNG, WebP, HEIC
  - Max files: 10
  - Max size per file: 10MB
  - Field name: "images" (array of files)

subject: string (required)
  - For MATH exams: "Mathematics" OR "Math"
  - For GENERAL exams: Any other subject (e.g., "History", "Biology", "Finnish")

grade: string (optional)
  - For GENERAL exams: Required (e.g., "1" to "9")
  - For MATH exams: Optional (can be omitted or sent - will be ignored by backend)

student_id: string (required)
  - User ID from Supabase auth
  - Used for exam ownership and daily limit tracking

language: string (optional)
  - Values: "fi" | "sv" | "en"
  - Default: "fi"
```

**Example Request - MATH EXAM:**
```
POST /api/mobile/exam-questions
Content-Type: multipart/form-data

images: [File, File, File]
subject: "Mathematics"
grade: "5"             // Optional, backend ignores for math exams
student_id: "uuid-user-id"
language: "fi"
```

**Example Request - GENERAL EXAM:**
```
POST /api/mobile/exam-questions
Content-Type: multipart/form-data

images: [File, File]
subject: "History"
grade: "8"             // Required for general exams
student_id: "uuid-user-id"
language: "fi"
```

**Backend Logic:**
```
If subject === "Mathematics" OR subject === "Math":
  → MATH EXAM mode
  → Use math exam prompt (topic auto-detection + dynamic difficulty)
  → Generate questions with 9 answer types
  → Return exam with exam_metadata
  → Ignore grade parameter (difficulty is auto-detected from images)

Else:
  → GENERAL EXAM mode
  → Use grade/subject-specific prompt
  → Generate questions with existing answer types
  → Return exam without exam_metadata
  → Grade parameter is required
```

---

### 1.2 Response (Success - 200 OK)

**IMPORTANT:** Backend returns minimal information at exam creation time (no full question objects). Full question details are fetched separately via the "Get Exam by ID" endpoint when needed.

**Math Exam Creation Response:**
```json
{
  "success": true,
  "data": {
    "examId": "550e8400-e29b-41d4-a716-446655440000",
    "examUrl": "https://exam-generator.vercel.app/exam/abc12345",
    "shareId": "abc12345",
    "questionCount": 15
  },
  "message": "Exam generated successfully"
}
```

**General Exam Creation Response:**
```json
{
  "success": true,
  "data": {
    "examId": "550e8400-e29b-41d4-a716-446655440000",
    "examUrl": "https://exam-generator.vercel.app/exam/xyz67890",
    "shareId": "xyz67890",
    "questionCount": 10
  },
  "message": "Exam generated successfully"
}
```

**Response Fields:**
- `success` (boolean) - Whether request succeeded
- `data.examId` (string, UUID) - Unique exam identifier
- `data.examUrl` (string) - Full URL for sharing (used for WhatsApp, clipboard, browser)
- `data.shareId` (string) - Short ID used in the URL (extracted from examUrl)
- `data.questionCount` (number) - **CRITICAL:** Number of questions generated (required by mobile app for sharing screen)
- `message` (string) - Success message

**Note:** Full question objects are NOT included in the creation response. Frontend fetches them separately using `GET /api/mobile/exams/{examId}` when displaying the exam.

---

### 1.3 Error Responses

**400 Bad Request - File too large:**
```json
{
  "success": false,
  "error": "File exceeds 10MB limit",
  "file": "image3.jpg",
  "size": 12582912
}
```

**400 Bad Request - Too many files:**
```json
{
  "success": false,
  "error": "Maximum 10 files allowed",
  "uploaded": 12
}
```

**400 Bad Request - Invalid file type:**
```json
{
  "success": false,
  "error": "Invalid file type",
  "file": "document.pdf",
  "allowed_types": ["image/jpeg", "image/png", "image/webp", "image/heic"]
}
```

**400 Bad Request - Missing required field:**
```json
{
  "success": false,
  "error": "Missing required field: student_id"
}
```

**408 Request Timeout - Processing timeout:**
```json
{
  "success": false,
  "error": "Request timeout",
  "message": "Exam generation took longer than 120 seconds"
}
```

**429 Too Many Requests - Daily limit exceeded:**
```json
{
  "success": false,
  "error": "Daily limit exceeded",
  "message": "You have reached the maximum number of exams for today"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to process request"
}
```

**503 Service Unavailable - Gemini API down:**
```json
{
  "success": false,
  "error": "Service temporarily unavailable",
  "message": "Gemini API is unavailable, please try again later"
}
```

---

## 2. List Exams

### 2.1 Get All Exams for Student

**Endpoint:** `GET /api/mobile/exams`

**Query Parameters:**
```
student_id: string (required)
  - User ID from Supabase auth
  - Filters exams to only show this user's exams

limit: number (optional)
  - Pagination limit (default: 20)

offset: number (optional)
  - Pagination offset (default: 0)
```

**Example Request:**
```
GET /api/mobile/exams?student_id=uuid-user-id&limit=20&offset=0
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "exams": [
    {
      "examId": "uuid-1",
      "subject": "Mathematics",
      "grade": null,
      "createdAt": "2025-10-04T12:35:00Z",
      "completedAt": null,
      "questionCount": 10,
      "examMetadata": {
        "topic": "Ympyräsektorit ja kaaret",
        "difficulty": "intermediate",
        "estimatedTimeMinutes": 45
      }
    },
    {
      "examId": "uuid-2",
      "subject": "History",
      "grade": "8",
      "createdAt": "2025-10-03T10:20:00Z",
      "completedAt": "2025-10-03T11:15:00Z",
      "questionCount": 15,
      "examMetadata": null
    }
  ],
  "total": 2
}
```

**Exam List Item Fields:**
- `examId` (string, UUID) - Unique identifier
- `subject` (string) - Subject name
- `grade` (string | null) - Grade level for general exams, null for math exams
- `createdAt` (string, ISO 8601) - When exam was created
- `completedAt` (string, ISO 8601 | null) - When exam was graded
  - `null` = Not graded yet (show "Valmis" badge, Share + View buttons)
  - `timestamp` = Graded (show "Arvosteltu" badge, View Grading button)
- `questionCount` (number) - Number of questions
- `examMetadata` (object | null) - Only present for math exams
  - `topic` (string) - Auto-detected topic in Finnish (display as exam title)
  - `difficulty` (string) - "basic" | "intermediate" | "advanced" (show as badge)
  - `estimatedTimeMinutes` (number) - Estimated completion time

**Frontend Display Logic:**
```
If examMetadata exists:
  → Math exam
  - Title: examMetadata.topic
  - Badge: examMetadata.difficulty ("Basic", "Intermediate", "Advanced")
  - Time: examMetadata.estimatedTimeMinutes + " min"
  - Icon: "📐 Math"
Else:
  → General exam
  - Title: subject + " - Grade " + grade
  - Show existing general exam UI

Grading Status (both exam types):
If completedAt is null:
  - Badge: "Valmis" (green)
  - Buttons: "Share" + "View"
Else:
  - Badge: "Arvosteltu" (blue)
  - Button: "View Grading"
```

---

## 3. Get Exam Questions

### 3.1 Get Exam by ID

**Endpoint:** `GET /api/mobile/exams/{exam_id}`

**Request:**
```
GET /api/mobile/exams/550e8400-e29b-41d4-a716-446655440000
```

**Response (Success - 200 OK) - Math Exam:**
```json
{
  "success": true,
  "exam": {
    "examId": "550e8400-e29b-41d4-a716-446655440000",
    "subject": "Mathematics",
    "grade": null,
    "createdAt": "2025-10-04T12:35:00Z",
    "completedAt": null,
    "examMetadata": {
      "topic": "Ympyräsektorit ja kaaret",
      "difficulty": "intermediate",
      "estimatedTimeMinutes": 45
    },
    "questions": [
      {
        "id": 1,
        "questionText": "Laske ympyräsektorin pinta-ala, kun säde on $r = 8.2$ cm ja keskuskulma on $\\alpha = 72°$.",
        "questionLatex": "Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$",
        "answerType": "numeric",
        "options": null
      },
      {
        "id": 2,
        "questionText": "Millä tavalla toisistaan eroavat ympyrän kehän pituuden lauseke?",
        "questionLatex": null,
        "answerType": "multiple_choice",
        "options": {
          "A": "Kaaren pituus on aina pienempi",
          "B": "Kaaren pituus on osuus kehästä",
          "C": "Kaaren pituus on suurempi",
          "D": "Ne ovat samat"
        }
      }
    ]
  }
}
```

**Response (Success - 200 OK) - General Exam:**
```json
{
  "success": true,
  "exam": {
    "examId": "uuid-2",
    "subject": "History",
    "grade": "8",
    "createdAt": "2025-10-03T10:20:00Z",
    "completedAt": null,
    "examMetadata": null,
    "questions": [
      {
        "id": 1,
        "questionText": "What year did World War II begin?",
        "questionLatex": null,
        "answerType": "multiple_choice",
        "options": {
          "A": "1937",
          "B": "1939",
          "C": "1941",
          "D": "1945"
        }
      }
    ]
  }
}
```

**Question Object Fields (What Frontend Needs):**
- `id` (number) - Question number (1, 2, 3, ...)
- `questionText` (string) - Question text (may contain LaTeX inline with `$...$`)
- `questionLatex` (string | null) - Optional separate formula to display in formula box
- `answerType` (string) - Type of answer expected (determines input UI)
  - `"multiple_choice"` → Show radio buttons (A, B, C, D)
  - `"numeric"` → Show text input field (for numbers)
  - `"algebraic"` → Show text input field (for expressions like "2x + 3")
  - `"solution_set"` → Show text input field (for sets like "{1, 2, 3}")
  - `"angle_set"` → Show text input field (for angles like "{45°, 135°}")
  - `"ordered_pair"` → Show text input field (for coordinates like "(3, 4)")
  - `"inequality"` → Show text input field (for inequalities like "x < 5")
  - `"ratio_proportion"` → Show text input field (for ratios like "2:3")
  - `"unit_conversion"` → Show text input field (for conversions like "5000")
- `options` (object | null) - Only present if answerType is "multiple_choice"
  - Structure: `{ "A": "text", "B": "text", "C": "text", "D": "text" }`

**Frontend Rendering Logic:**
```
For each question:
  1. Display questionText (with LaTeX rendering if supported)
  2. If questionLatex exists, display it in a separate formula box
  3. Show input UI based on answerType:
     - If "multiple_choice" → Radio buttons with options A, B, C, D
     - Otherwise → Text input field
  4. Collect student's answer as text
  5. Submit to backend for grading
```

**Note:** The following fields are NOT included when students fetch the exam (they are only used by the backend for grading):
- `correctAnswer` - Not sent to frontend
- `explanation` - Not sent to frontend
- `answerFormat` - Backend-only grading metadata
- `gradingRules` - Backend-only grading logic
- `difficulty` - Backend-only metadata
- `curriculumTopic` - Backend-only metadata

---

## 4. Submit Exam Answers (For Grading)

### 4.1 Submit Student Answers

**Endpoint:** `POST /api/exam/{exam_id}/submit`

**Request Format:** `application/json`

**Request Body:**
```json
{
  "studentId": "uuid-user-id",
  "answers": [
    {
      "questionId": 1,
      "answerText": "12.9"
    },
    {
      "questionId": 2,
      "answerText": "B"
    }
  ]
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "message": "Exam graded successfully",
  "examId": "uuid-exam-id",
  "finalGrade": 8.5,
  "totalPoints": 17,
  "maxTotalPoints": 20,
  "gradingUrl": "https://exam-generator.vercel.app/grading/uuid-exam-id"
}
```

**Response Fields:**
- `success` (boolean) - Whether grading succeeded
- `message` (string) - Success message
- `examId` (string) - Exam identifier
- `finalGrade` (number) - Final grade out of 10
- `totalPoints` (number) - Points earned
- `maxTotalPoints` (number) - Total possible points
- `gradingUrl` (string) - URL to view detailed grading results

**Note:** After successful submission, the exam's `completedAt` field will be set to the current timestamp, which changes the exam's status from "Valmis" to "Arvosteltu" in the exam list.

---

## 5. LaTeX Rendering (Optional)

### 5.1 LaTeX Detection and Rendering

**LaTeX Delimiters:**
- Inline: `$...$` (e.g., "when $r = 5.3$ cm")
- Block: `$$...$$` (not typically used in questionText)

**Fields that may contain LaTeX:**
- `questionText` - Inline LaTeX only
- `questionLatex` - Full LaTeX formula (if present)
- `options.A/B/C/D` - Inline LaTeX in multiple choice options

**Rendering Library (Optional):**
If the mobile app supports LaTeX rendering:
- KaTeX: `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css`
- KaTeX JS: `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js`
- Auto-render: `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js`

**Example LaTeX Strings:**
```
"Laske ympyräsektorin pinta-ala, kun säde on $r = 8.2$ cm"
"Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$"
```

**Note:** LaTeX backslashes are escaped in JSON (`\\frac` not `\frac`). If rendering, unescape before processing.

---

## Summary: Frontend Implementation Checklist

### API Integration
- [ ] **POST /api/mobile/exam-questions** - Create exam (include `student_id` parameter)
- [ ] **GET /api/mobile/exams?student_id={id}** - List exams with filtering
- [ ] **GET /api/mobile/exams/{exam_id}** - Fetch exam questions
- [ ] **POST /api/exam/{exam_id}/submit** - Submit answers for grading

### Data Structures to Handle

**1. Exam Creation Response:**
- `success` (boolean) - Request success status
- `data.examId` (string) - Exam identifier
- `data.examUrl` (string) - Sharing URL
- `data.shareId` (string) - Short URL ID

**2. Exam List Item:**
- `examId`, `subject`, `grade` (null for math), `createdAt`, `completedAt`, `questionCount`
- `examMetadata` (object | null) - Only for math exams:
  - `topic` - Display as title
  - `difficulty` - Display as badge
  - `estimatedTimeMinutes` - Display as time estimate

**3. Question Object:**
- `id` - Question number
- `questionText` - Question content
- `questionLatex` - Optional formula (display separately)
- `answerType` - Determines input UI
- `options` - Only for multiple_choice

### UI Logic

**Exam List Display:**
```
If examMetadata exists:
  → Math exam UI (topic, difficulty badge, time estimate)
Else:
  → General exam UI (subject + grade)

If completedAt is null:
  → Show "Valmis" badge + Share/View buttons
Else:
  → Show "Arvosteltu" badge + View Grading button
```

**Question Display:**
```
If answerType === "multiple_choice":
  → Show radio buttons with options
Else:
  → Show text input field

If questionLatex exists:
  → Display in separate formula box
```

### Key Differences from General Exams
- **Math detection**: Backend uses `subject === "Mathematics"` or `"Math"`
- **No grade dependency**: `grade` parameter optional/ignored for math exams
- **Display metadata**: `examMetadata` object only for math exams
- **Answer types**: 9 types instead of just multiple_choice
- **Optional LaTeX**: Questions may contain `$...$` notation

---

## Notes

- All timestamps are ISO 8601 format (UTC)
- All UUIDs are standard UUID v4 format
- LaTeX rendering is optional - plain text display works without it
- Backend handles all grading logic - frontend only collects answers as text
- `student_id` is required for exam creation, listing, and grading
- Synchronous endpoint - no polling or async job tracking needed
- 120-second timeout - exam generation completes within this window
- Response structure maintains full backward compatibility with existing mobile app

---

## Backward Compatibility

✅ **Fully compatible** with existing mobile app implementation:
- Same response structure (`success`, `data` wrapper)
- Same required fields (`examUrl`, `shareId`, `student_id`)
- Same grading status tracking (`completedAt`)
- Same filtering mechanism (`student_id` query parameter)
- General exams continue to work without any changes
