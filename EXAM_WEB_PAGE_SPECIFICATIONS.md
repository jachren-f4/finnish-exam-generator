# Exam Web Page Specifications

## Overview

This document outlines the complete specification for creating exam web pages from JSON data stored in a database. The system provides two main interfaces:

1. **Exam Page** (`/exam/[exam_id]`) → User answers questions  
2. **Grading Page** (`/grading/[exam_id]`) → Display graded results and feedback

The system uses a three-stage database lifecycle: `created → answered → graded`.

## Database Schema

### Core Tables

#### `exams` Table
```sql
CREATE TABLE exams (
    exam_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    exam_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status exam_status DEFAULT 'created'
);

CREATE TYPE exam_status AS ENUM ('created', 'answered', 'graded');
```

#### `answers` Table
```sql
CREATE TABLE answers (
    answer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    user_id VARCHAR(100), -- Optional for anonymous users
    answers_json JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `grading` Table
```sql
CREATE TABLE grading (
    grading_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    grade_scale VARCHAR(50) DEFAULT '1-10',
    grading_json JSONB NOT NULL,
    final_grade VARCHAR(10) NOT NULL,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## JSON Data Structures

### Exam JSON Schema
The `exam_json` field in the database stores the following structure:

```json
{
  "exam": {
    "subject": "Historia",
    "grade": "8. luokka",
    "questions": [
      {
        "id": "q1",
        "question_text": "Minä vuonna Suomi itsenäistyi?",
        "answer_text": "1917",
        "max_points": 2
      },
      {
        "id": "q2", 
        "question_text": "Kuka oli Suomen ensimmäinen presidentti?",
        "answer_text": "K.J. Ståhlberg",
        "max_points": 3
      }
    ]
  }
}
```

### Student Answers JSON Schema
The `answers_json` field stores student responses:

```json
{
  "answers": [
    {
      "question_id": "q1",
      "answer_text": "1917"
    },
    {
      "question_id": "q2",
      "answer_text": "K.J. Ståhlberg"
    }
  ]
}
```

### Grading Results JSON Schema
The `grading_json` field contains detailed grading information:

```json
{
  "subject": "Historia",
  "grade": "8. luokka",
  "questions": [
    {
      "id": "q1",
      "question_text": "Minä vuonna Suomi itsenäistyi?",
      "expected_answer": "1917",
      "student_answer": "1917",
      "points_awarded": 2,
      "max_points": 2,
      "feedback": "Oikein! Suomi julistautui itsenäiseksi 6.12.1917."
    }
  ],
  "final_grade": "9",
  "total_points": 8,
  "max_total_points": 10
}
```

## TypeScript Interfaces

```typescript
export interface ExamContent {
  exam: {
    subject: string;
    grade: string;
    questions: ExamQuestion[];
  };
}

export interface ExamQuestion {
  id: string;
  question_text: string;
  answer_text: string;
  max_points: number;
}

export interface StudentAnswer {
  question_id: string;
  answer_text: string;
}

export interface GradingResult {
  subject: string;
  grade: string;
  questions: GradedQuestion[];
  final_grade: string;
  total_points: number;
  max_total_points: number;
}

export interface GradedQuestion {
  id: string;
  question_text: string;
  expected_answer: string;
  student_answer: string;
  points_awarded: number;
  max_points: number;
  feedback: string;
}
```

## API Endpoints

### 1. Get Exam for Taking (`GET /api/exam/[id]`)

**Purpose**: Fetch exam data to display the exam-taking interface

**Response Format**:
```json
{
  "exam_id": "uuid",
  "subject": "Historia",
  "grade": "8. luokka",
  "status": "created",
  "created_at": "2023-12-01T10:00:00Z",
  "questions": [
    {
      "id": "q1",
      "question_text": "Minä vuonna Suomi itsenäistyi?",
      "max_points": 2
    }
  ],
  "total_questions": 5,
  "max_total_points": 15
}
```

**Note**: The `answer_text` field is NOT included in this response to prevent cheating.

### 2. Submit Answers (`POST /api/exam/[id]/submit`)

**Request Format**:
```json
{
  "answers": [
    {
      "question_id": "q1",
      "answer_text": "1917"
    }
  ]
}
```

**Response Format**:
```json
{
  "success": true,
  "message": "Vastaukset lähetetty ja arvosteltu onnistuneesti",
  "exam_id": "uuid",
  "status": "graded",
  "final_grade": "9",
  "total_points": 8,
  "max_total_points": 10,
  "grading_url": "/grading/uuid"
}
```

### 3. Get Grading Results (`GET /api/exam/[id]/grade`)

**Response Format**:
```json
{
  "success": true,
  "exam_id": "uuid",
  "subject": "Historia",
  "grade": "8. luokka",
  "status": "graded",
  "final_grade": "9",
  "grade_scale": "4-10",
  "total_points": 8,
  "max_total_points": 10,
  "percentage": 80,
  "questions": [
    {
      "id": "q1",
      "question_text": "Minä vuonna Suomi itsenäistyi?",
      "expected_answer": "1917",
      "student_answer": "1917",
      "points_awarded": 2,
      "max_points": 2,
      "feedback": "Oikein! Suomi julistautui itsenäiseksi 6.12.1917.",
      "percentage": 100
    }
  ],
  "graded_at": "2023-12-01T10:05:00Z",
  "submitted_at": "2023-12-01T10:03:00Z",
  "created_at": "2023-12-01T10:00:00Z",
  "questions_count": 5,
  "questions_correct": 4,
  "questions_partial": 1,
  "questions_incorrect": 0
}
```

## Web Page Components

### 1. Exam Taking Page (`/exam/[id]`)

**Features:**
- Header with exam info (subject, grade, progress)
- Progress bar showing completion percentage
- Question navigation buttons
- Current question display with:
  - Question number and points
  - Question text
  - Large textarea for answer input
- Navigation controls (Previous/Next)
- Submit button with confirmation dialog
- Real-time validation and error handling

**Key UI Elements:**
```typescript
interface ExamPageState {
  exam: ExamData | null;
  answers: {[questionId: string]: string};
  currentQuestion: number;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string;
  showConfirmDialog: boolean;
}

interface ExamData {
  exam_id: string;
  subject: string;
  grade: string;
  status: string;
  created_at: string;
  questions: ExamQuestion[];
  total_questions: number;
  max_total_points: number;
}
```

### 2. Grading Results Page (`/grading/[id]`)

**Features:**
- Grade summary with large grade display
- Statistics cards (points, correct answers, total questions)
- Answer breakdown visualization
- Expandable question-by-question details showing:
  - Original question
  - Student answer vs expected answer
  - Points awarded and feedback
- Metadata (timestamps)
- Action buttons (print, create new exam)

**Key UI Elements:**
```typescript
interface GradingPageState {
  grading: GradingData | null;
  isLoading: boolean;
  error: string;
  showAllQuestions: boolean;
}

interface GradingData {
  exam_id: string;
  subject: string;
  grade: string;
  status: string;
  final_grade: string;
  grade_scale: string;
  total_points: number;
  max_total_points: number;
  percentage: number;
  questions: GradedQuestion[];
  // ... metadata and statistics
}
```

## Status Flow Management

The system uses automatic status transitions:

1. **created** → **answered**: Triggered by answer submission
2. **answered** → **graded**: Triggered by grading completion

```sql
-- Automatic status update triggers
CREATE OR REPLACE FUNCTION update_exam_status_on_answer()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE exams 
    SET status = 'answered' 
    WHERE exam_id = NEW.exam_id AND status = 'created';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_status_on_answer
    AFTER INSERT ON answers
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_status_on_answer();
```

## Error Handling

### Validation Rules:
- Exam ID must be valid UUID format
- All questions must be answered before submission
- Exam must be in "created" status to accept answers
- Student answers must match question IDs in the exam

### Error Response Format:
```json
{
  "error": "Error title in Finnish",
  "details": "Detailed error message in Finnish"
}
```

### Common Error Scenarios:
- Exam not found (404)
- Exam already answered (409)
- Invalid answer format (400)
- Grading in progress (202)

## Security Considerations

1. **Input Validation**: All user inputs are validated and sanitized
2. **UUID Validation**: Strict regex validation for exam IDs
3. **Status Checks**: Prevent manipulation of closed exams
4. **Rate Limiting**: Should be implemented for API endpoints
5. **CORS**: Proper configuration for cross-origin requests

## Integration Points

### For New Projects:

1. **Database Setup**: Implement the three-table schema with triggers
2. **API Layer**: Create endpoints following the specified request/response formats
3. **Frontend Components**: Build exam-taking and results display components
4. **State Management**: Handle the status flow and real-time updates
5. **Validation**: Implement comprehensive input validation
6. **Error Handling**: Use consistent error response formats

### Key Architecture Decisions:

- **Single-Use Exams**: No user authentication required, each exam is taken once
- **External Database**: PostgreSQL for reliable storage  
- **Async Processing**: Answer submission can trigger automatic grading

### Customization Options:

- **Grading System**: Modify grade_scale field and validation
- **Question Types**: Extend question schema for multiple choice, etc.
- **User Management**: Add authentication and user tracking
- **Time Limits**: Add exam duration and time tracking
- **Question Randomization**: Shuffle questions or answers
- **Partial Credit**: Implement more sophisticated grading logic
- **Background Grading**: Move grading to async queue for better UX

## Performance Considerations

1. **Database Indexing**: Proper indexes on exam_id, status, and timestamps
2. **JSON Querying**: Use PostgreSQL JSONB operators for efficient queries
3. **Caching**: Cache exam data during exam-taking session
4. **Lazy Loading**: Load questions progressively for large exams
5. **Response Optimization**: Only send necessary data to frontend

This specification provides a complete blueprint for implementing exam web pages from JSON data, suitable for adaptation to various educational or assessment platforms.