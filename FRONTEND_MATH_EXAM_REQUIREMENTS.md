# Frontend API Requirements for Math Exams

This document specifies the API endpoints, request/response formats, and data structures needed to support math exams in the frontend.

---

## Overview

Math exams use the **same unified exam creation endpoint** as general exams. The exam type is determined by which fields are provided:

- **General Exam**: Include `subject` AND `grade` parameters
- **Math Exam**: Omit `subject` AND `grade` parameters (or set to null)

Math exams require integration with 3 main API workflows:
1. **Create exam** - Upload textbook images and generate questions (unified endpoint)
2. **List exams** - Retrieve all exams (including math exams)
3. **Get exam questions** - Retrieve questions for a specific exam

---

## 1. Create Exam (Unified Endpoint)

### 1.1 Create Exam Request

**Endpoint:** `POST /api/exams/create`

**Request Format:** `multipart/form-data`

**Request Fields:**

```
images: File[] (required)
  - Accept: JPEG, PNG, WebP, HEIC
  - Max files: 10
  - Max size per file: 10MB
  - Field name: "images" (array of files)

subject: string | null (optional)
  - For GENERAL exams: Provide subject (e.g., "Mathematics", "History")
  - For MATH exams: Omit or set to null (triggers topic auto-detection)

grade: string | null (optional)
  - For GENERAL exams: Provide grade (e.g., "8", "9")
  - For MATH exams: Omit or set to null (triggers dynamic difficulty analysis)

language: string (optional)
  - Values: "fi" | "sv" | "en"
  - Default: "fi"

question_count: integer (optional)
  - Range: 8-15
  - Default: 15
```

**Example Request - GENERAL EXAM:**
```
POST /api/exams/create
Content-Type: multipart/form-data

images: [File, File]
subject: "Mathematics"
grade: "8"
language: "fi"
question_count: 15
```

**Example Request - MATH EXAM:**
```
POST /api/exams/create
Content-Type: multipart/form-data

images: [File, File, File]
subject: null          // or omit entirely
grade: null            // or omit entirely
language: "fi"
question_count: 12
```

**Backend Logic:**
```
If subject is null/omitted AND grade is null/omitted:
  → MATH EXAM mode
  → Use math exam prompt (topic auto-detection + dynamic difficulty)
  → Generate questions with 9 answer types
  → Return metadata.detected_concepts and metadata.difficulty

Else if subject provided AND grade provided:
  → GENERAL EXAM mode
  → Use grade/subject-specific prompt
  → Generate questions with existing answer types
  → Return subject and grade in response
```

**Response (Success - 201 Created):**
```json
{
  "exam_id": "uuid-string",
  "status": "DRAFT",
  "subject": "Mathematics",
  "grade": "8",
  "share_id": "abc12345",
  "message": "Exam created successfully. Use /api/exams/:id/process to start processing.",
  "created_at": "2025-10-04T12:30:00Z"
}
```

**Response Fields:**
- `exam_id` (string, UUID) - Unique identifier for the exam
- `status` (string) - Initial status, "DRAFT" (not yet processed)
- `subject` (string | null) - Subject name for general exams, null for math exams
- `grade` (string | null) - Grade level for general exams, null for math exams
- `share_id` (string) - Short ID for sharing
- `message` (string) - Next step instruction
- `created_at` (string, ISO 8601) - Timestamp of exam creation

**Error Responses:**

```json
400 Bad Request - File too large
{
  "error": "File exceeds 10MB limit",
  "file": "image3.jpg",
  "size": 12582912
}

400 Bad Request - Too many files
{
  "error": "Maximum 10 files allowed",
  "uploaded": 12
}

400 Bad Request - Invalid file type
{
  "error": "Invalid file type",
  "file": "document.pdf",
  "allowed_types": ["image/jpeg", "image/png", "image/webp", "image/heic"]
}

400 Bad Request - Invalid question count
{
  "error": "Invalid question_count",
  "value": 20,
  "allowed_range": [8, 15]
}

400 Bad Request - Missing images
{
  "error": "At least one image is required"
}
```

---

### 1.2 Start Exam Processing

After creating the exam (which creates a DRAFT record), trigger processing to generate questions.

**Endpoint:** `POST /api/exams/{exam_id}/process`

**Request:**
```
POST /api/exams/550e8400-e29b-41d4-a716-446655440000/process
```

**Response (Success - 202 Accepted):**
```json
{
  "message": "Processing started",
  "exam_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING"
}
```

---

### 1.3 Poll Exam Status

Poll this endpoint to check when question generation is complete.

**Endpoint:** `GET /api/exams/{exam_id}/progress`

**Request:**
```
GET /api/exams/550e8400-e29b-41d4-a716-446655440000/progress
```

**Response (Processing - 200 OK):**
```json
{
  "exam_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING",
  "progress": 50,
  "message": "Generating questions...",
  "updated_at": "2025-10-04T12:30:15Z"
}
```

**Response (Completed - 200 OK):**
```json
{
  "exam_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "READY",
  "progress": 100,
  "message": "Exam ready",
  "updated_at": "2025-10-04T12:31:45Z",
  "exam_data": {
    "exam_metadata": {
      "topic": "Ympyräsektorit ja kaaret",
      "detected_concepts": ["circle_sectors", "arc_length", "central_angles"],
      "difficulty": "intermediate",
      "estimated_time_minutes": 45
    },
    "questions": [
      {
        "question_id": "q_001",
        "question_text": "Laske ympyräsektorin pinta-ala, kun säde on $r = 8.2$ cm ja keskuskulma on $\\alpha = 72°$.",
        "question_latex": "Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$",
        "question_display_mode": "block",
        "answer_type": "numeric",
        "answer_format": {
          "type": "decimal",
          "tolerance": 0.5,
          "units": "cm²",
          "decimals": 1
        },
        "correct_answer": {
          "value": 34.0,
          "display": "34.0 cm²"
        },
        "grading_rules": {
          "match_type": "numeric_tolerance",
          "tolerance": 0.5
        },
        "explanation": "Sektorin pinta-ala lasketaan kaavalla...",
        "explanation_latex": "$A = \\frac{72°}{360°} \\times \\pi (8.2)^2$",
        "difficulty": "intermediate",
        "curriculum_topic": "circle_sectors",
        "estimated_time_seconds": 180
      }
      // ... more questions (8-15 total)
    ]
  }
}
```

**Response (Failed - 200 OK):**
```json
{
  "exam_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "FAILED",
  "progress": 0,
  "message": "Failed to generate valid questions from images",
  "error": {
    "code": "GENERATION_FAILED",
    "details": "Unable to extract content from images"
  }
}
```

**Status Values:**
- `"DRAFT"` - Exam created, not yet started processing
- `"PROCESSING"` - LLM is analyzing images and generating questions
- `"READY"` - Questions generated successfully, exam ready to use
- `"FAILED"` - Processing failed, `error` object available

**Polling Strategy:**
- Poll every 2-3 seconds after calling `/process` endpoint
- Stop when status is "READY" or "FAILED"
- Timeout after 120 seconds (backend timeout limit)

**Note on exam_data:**
- For **math exams**: `exam_data` contains `exam_metadata` with `detected_concepts` and `difficulty`
- For **general exams**: `exam_data` does not contain `exam_metadata` (or it's null)

---

### 1.4 exam_data Structure (from completed processing)

**exam_metadata object:**
```typescript
{
  topic: string                    // Auto-detected topic in Finnish (e.g., "Ympyräsektorit ja kaaret")
  detected_concepts: string[]      // Array of topic identifiers (e.g., ["circle_sectors", "arc_length"])
  difficulty: "basic" | "intermediate" | "advanced"
  estimated_time_minutes: number   // Total estimated time for all questions
}
```

**questions array - Each question object:**
```typescript
{
  question_id: string                   // Unique ID (e.g., "q_001")
  question_text: string                 // Question in Finnish, may contain LaTeX inline (e.g., "$r = 5.3$ cm")
  question_latex: string | null         // Optional separate formula display (e.g., "Kaava: $A = ...$")
  question_display_mode: "inline" | "block"

  answer_type: "numeric" | "algebraic" | "solution_set" | "multiple_choice" | "angle_set" | "ordered_pair" | "inequality" | "ratio_proportion" | "unit_conversion"

  answer_format: object | null          // Format depends on answer_type (see below)

  correct_answer: {
    value: number | string              // The correct answer value
    display: string                     // Human-readable display format
  }

  grading_rules: {
    match_type: "numeric_tolerance" | "exact" | "symbolic_equivalence" | "set_equivalence"
    tolerance?: number                  // For numeric answers
  }

  explanation: string                   // Explanation text in Finnish, may contain LaTeX
  explanation_latex: string | null      // Optional formula-only explanation

  difficulty: "basic" | "intermediate" | "advanced"
  curriculum_topic: string              // Topic identifier (e.g., "circle_sectors")
  estimated_time_seconds: number        // Estimated time for this question

  options?: object                      // Only present if answer_type is "multiple_choice"
}
```

---

### 1.4 answer_format Structures by answer_type

**For answer_type: "numeric"**
```typescript
answer_format: {
  type: "decimal" | "integer"
  tolerance: number              // Acceptable margin of error
  units: string                  // Unit symbol (e.g., "cm²", "°", "m")
  decimals: number               // Expected decimal places
}

// Example:
answer_format: {
  type: "decimal",
  tolerance: 0.5,
  units: "cm²",
  decimals: 1
}
```

**For answer_type: "multiple_choice"**
```typescript
answer_format: {
  type: "options"
  choices: ["A", "B", "C", "D"]
}

options: {
  "A": "Option A text (may contain LaTeX)",
  "B": "Option B text",
  "C": "Option C text",
  "D": "Option D text"
}

correct_answer: {
  value: "A",                    // Letter of correct option
  display: "A"
}
```

**For answer_type: "algebraic"**
```typescript
answer_format: {
  type: "expression"
  variables: string[]            // Expected variables (e.g., ["x", "y"])
}

correct_answer: {
  value: "2x + 3",
  display: "2x + 3"
}
```

**For answer_type: "solution_set"**
```typescript
answer_format: {
  type: "set"
  set_type: "finite" | "interval" | "inequality"
}

correct_answer: {
  value: "{1, 2, 3}",
  display: "{1, 2, 3}"
}
```

**For answer_type: "angle_set"**
```typescript
answer_format: {
  type: "angles"
  units: "degrees" | "radians"
  tolerance: number
}

correct_answer: {
  value: "{45, 135}",
  display: "{45°, 135°}"
}
```

**For answer_type: "ordered_pair"**
```typescript
answer_format: {
  type: "coordinate"
  tolerance: number
}

correct_answer: {
  value: "(3, 4)",
  display: "(3, 4)"
}
```

**For answer_type: "inequality"**
```typescript
answer_format: {
  type: "inequality"
  variable: string
}

correct_answer: {
  value: "x < 5",
  display: "x < 5"
}
```

**For answer_type: "ratio_proportion"**
```typescript
answer_format: {
  type: "ratio"
}

correct_answer: {
  value: "2:3",
  display: "2:3"
}
```

**For answer_type: "unit_conversion"**
```typescript
answer_format: {
  type: "conversion"
  from_unit: string
  to_unit: string
  tolerance: number
}

correct_answer: {
  value: 5000,
  display: "5000 m"
}
```

---

### 1.5 Finalize Exam (Select Questions)

After exam processing completes with status "READY", you can optionally select which questions to include in the final exam.

**Endpoint:** `POST /api/exams/{exam_id}/finalize`

**Request:**
```json
{
  "selected_question_ids": ["q_001", "q_002", "q_003", "q_005", "q_007"]
}
```

**Request Fields:**
- `selected_question_ids` (string[]) - Array of question IDs to include in final exam
- If omitted or empty, all generated questions are included

**Response (Success - 200 OK):**
```json
{
  "exam_id": "uuid-string",
  "status": "READY",
  "question_count": 5,
  "selected_questions_count": 5,
  "message": "Exam finalized successfully"
}
```

**Response Fields:**
- `exam_id` (string, UUID) - Unique identifier for the exam
- `status` (string) - "READY" (exam is ready to use)
- `question_count` (number) - Total questions generated
- `selected_questions_count` (number) - Number of questions selected for final exam
- `message` (string) - Success message

**Note:** This step is optional. If you don't call `/finalize`, all generated questions are included by default when students access the exam.

---

## 2. List Exams

### 2.1 Get All Exams

**Endpoint:** `GET /api/exams`

**Query Parameters (optional):**
```
exam_type: "all" | "general" | "math"    // Filter by exam type
difficulty: "basic" | "intermediate" | "advanced"   // Filter by difficulty (math exams only)
limit: number                             // Pagination limit
offset: number                            // Pagination offset
```

**Example Request:**
```
GET /api/exams?exam_type=math&limit=20&offset=0
```

**Response (Success - 200 OK):**
```json
{
  "exams": [
    {
      "exam_id": "uuid-1",
      "title": "Ympyräsektorit ja kaaret",
      "exam_type": "math",
      "question_count": 10,
      "created_at": "2025-10-04T12:35:00Z",
      "metadata": {
        "detected_concepts": ["circle_sectors", "arc_length"],
        "difficulty": "intermediate",
        "estimated_time_minutes": 45
      }
    },
    {
      "exam_id": "uuid-2",
      "title": "Finnish Grammar Basics",
      "exam_type": "general",
      "question_count": 15,
      "created_at": "2025-10-03T10:20:00Z",
      "metadata": null
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Exam List Item Fields:**
- `exam_id` (string, UUID) - Unique identifier
- `title` (string) - Exam title
- `exam_type` (string) - "math" or "general"
- `question_count` (number) - Number of questions
- `created_at` (string, ISO 8601) - Creation timestamp
- `metadata` (object | null) - Math exam metadata (only for math exams)
  - `detected_concepts` (string[]) - Topic identifiers
  - `difficulty` (string) - "basic" | "intermediate" | "advanced"
  - `estimated_time_minutes` (number) - Estimated completion time

**Frontend Display Logic:**
```
If exam_type === "math":
  - Display metadata.difficulty badge
  - Display metadata.detected_concepts as tags
  - Display metadata.estimated_time_minutes
  - Show "📐 Math" indicator
Else:
  - Display as general exam (existing logic)
```

---

## 3. Get Exam Questions

### 3.1 Get Exam by ID

**Endpoint:** `GET /api/exams/{exam_id}`

**Request:**
```
GET /api/exams/550e8400-e29b-41d4-a716-446655440000
```

**Response (Success - 200 OK) - Math Exam:**
```json
{
  "exam_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Ympyräsektorit ja kaaret",
  "exam_type": "math",
  "created_at": "2025-10-04T12:35:00Z",
  "metadata": {
    "detected_concepts": ["circle_sectors", "arc_length"],
    "difficulty": "intermediate",
    "estimated_time_minutes": 45
  },
  "questions": [
    {
      "question_id": "uuid-q1",
      "question_number": 1,
      "question_text": "Laske ympyräsektorin pinta-ala, kun säde on $r = 8.2$ cm ja keskuskulma on $\\alpha = 72°$.",
      "question_latex": "Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$",
      "question_display_mode": "block",
      "answer_type": "numeric",
      "answer_format": {
        "type": "decimal",
        "tolerance": 0.5,
        "units": "cm²",
        "decimals": 1
      },
      "difficulty": "intermediate",
      "curriculum_topic": "circle_sectors",
      "options": null
    },
    {
      "question_id": "uuid-q2",
      "question_number": 2,
      "question_text": "Mikä on ympyräsektorin pinta-alan kaava?",
      "question_latex": null,
      "question_display_mode": "inline",
      "answer_type": "multiple_choice",
      "answer_format": {
        "type": "options",
        "choices": ["A", "B", "C", "D"]
      },
      "difficulty": "basic",
      "curriculum_topic": "circle_sectors",
      "options": {
        "A": "$A = \\frac{\\alpha}{360°} \\times \\pi r^2$",
        "B": "$A = \\frac{\\alpha}{180°} \\times \\pi r^2$",
        "C": "$A = \\frac{\\alpha}{360°} \\times 2 \\pi r$",
        "D": "$A = \\frac{\\alpha}{180°} \\times 2 \\pi r$"
      }
    }
    // ... more questions
  ]
}
```

**Response (Success - 200 OK) - General Exam:**
```json
{
  "exam_id": "uuid-2",
  "title": "Finnish Grammar Basics",
  "exam_type": "general",
  "created_at": "2025-10-03T10:20:00Z",
  "metadata": null,
  "questions": [
    {
      "question_id": "uuid-q1",
      "question_number": 1,
      "question_text": "What is the plural of 'talo'?",
      "question_type": "multiple_choice",
      "options": {
        "A": "talot",
        "B": "taloja",
        "C": "taloissa",
        "D": "talojen"
      },
      "correct_answer": "A"
    }
    // ... general exam questions (existing format)
  ]
}
```

**Question Object Fields (Math Exams):**
- `question_id` (string, UUID) - Unique identifier
- `question_number` (number) - Display order (1, 2, 3, ...)
- `question_text` (string) - Question text, may contain LaTeX
- `question_latex` (string | null) - Optional separate formula
- `question_display_mode` (string) - "inline" or "block"
- `answer_type` (string) - One of 9 answer types
- `answer_format` (object) - Format specification (see section 1.4)
- `difficulty` (string) - "basic" | "intermediate" | "advanced"
- `curriculum_topic` (string) - Topic identifier
- `options` (object | null) - Only present for multiple_choice

**Note:** `correct_answer`, `grading_rules`, `explanation` fields are NOT included in GET requests. These are only returned after submission for grading.

---

## 4. LaTeX Rendering (Optional)

### 4.1 LaTeX Detection and Rendering

**LaTeX Delimiters:**
- Inline: `$...$` (e.g., "when $r = 5.3$ cm")
- Block: `$$...$$` (not used in question_text, only in question_latex)

**Fields that may contain LaTeX:**
- `question_text` - Inline LaTeX only
- `question_latex` - Full LaTeX formula (if present)
- `options.A/B/C/D` - Inline LaTeX in multiple choice options
- `explanation` - Inline LaTeX in explanations (after grading)
- `explanation_latex` - Full LaTeX formula (if present, after grading)

**Rendering Library:**
- KaTeX: `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css`
- KaTeX JS: `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js`
- Auto-render: `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js`

**Example LaTeX Strings:**
```
"Laske ympyräsektorin pinta-ala, kun säde on $r = 8.2$ cm"
"Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$"
"$A = \\frac{\\alpha}{360°} \\times \\pi r^2$"
```

**Note:** LaTeX backslashes are escaped in JSON (`\\frac` not `\frac`). Unescape before rendering.

---

## 5. Error Responses

### 5.1 Common Error Formats

**404 Not Found:**
```json
{
  "error": "Exam not found",
  "exam_id": "invalid-uuid"
}

{
  "error": "Job not found",
  "job_id": "invalid-uuid"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Failed to process request"
}
```

**503 Service Unavailable:**
```json
{
  "error": "Service temporarily unavailable",
  "message": "Gemini API is unavailable, please try again later"
}
```

---

## Summary: Required Frontend Changes

### API Integration - Unified Exam Creation
1. **POST /api/exams/create** - Create exam (both general and math types)
   - General exams: Provide `subject` and `grade`
   - Math exams: Omit `subject` and `grade` (or set to null)
2. **POST /api/exams/{id}/process** - Start question generation
3. **GET /api/exams/{id}/progress** - Poll processing status until READY or FAILED
4. **POST /api/exams/{id}/finalize** - Optionally select questions (optional step)
5. **GET /api/exams** - List all exams (handle math exam metadata)
6. **GET /api/exams/{exam_id}** - Get exam questions (handle math fields)

### New Data Structures to Handle
1. **exam_metadata** - Topic, concepts, difficulty, estimated_time
2. **9 answer_types** - numeric, algebraic, solution_set, multiple_choice, angle_set, ordered_pair, inequality, ratio_proportion, unit_conversion
3. **answer_format** - Different structure for each answer_type
4. **LaTeX strings** - Inline `$...$` in text fields
5. **question_latex** - Separate formula field
6. **difficulty levels** - basic, intermediate, advanced
7. **curriculum_topic** - Topic identifier string

### Display Changes (No UI/UX Guidance)
- Handle `exam_type: "math"` in exam list
- Display `metadata.difficulty`, `metadata.detected_concepts`, `metadata.estimated_time_minutes`
- Render LaTeX if implementing Phase 3 (optional)
- Handle 9 answer input types when students take exam

---

## Notes

- All timestamps are ISO 8601 format (UTC)
- All UUIDs are standard UUID v4 format
- LaTeX rendering is optional (Phase 3) - text display works without it
- No database schema knowledge required - backend handles all storage
- Existing general exam endpoints remain unchanged
