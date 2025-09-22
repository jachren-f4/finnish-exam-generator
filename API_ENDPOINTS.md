# ExamGenie API Endpoints

## Core Exam Operations

### 📝 Exam Creation
```bash
# Create exam from images (primary endpoint)
POST /api/mobile/exam-questions
curl -X POST http://localhost:3000/api/mobile/exam-questions \
    -F "grade=9" \
    -F "subject=Ympäristöoppi" \
    -F "language=fi" \
    -F "images=@assets/images/photo1.jpg"
```

### 📋 Exam Management
```bash
# Get exam data
GET /api/exam/{id}
curl http://localhost:3000/api/exam/{exam-id}

# Submit answers for grading
POST /api/exam/{id}/submit
curl -X POST http://localhost:3000/api/exam/{exam-id}/submit \
    -H "Content-Type: application/json" \
    -d '{"answers": [{"question_id": "uuid", "answer_text": "answer"}]}'

# Get grading results
GET /api/exam/{id}/grade
curl http://localhost:3000/api/exam/{exam-id}/grade
```

## ExamGenie Multi-User System

### 🎓 Student Management
```bash
# List students
GET /api/students
curl http://localhost:3000/api/students

# Get specific student
GET /api/students/{id}
curl http://localhost:3000/api/students/{student-id}
```

### 📚 Advanced Exam Operations
```bash
# Create exam (multi-user)
POST /api/exams/create
curl -X POST http://localhost:3000/api/exams/create

# Get exam details
GET /api/exams/{id}
curl http://localhost:3000/api/exams/{exam-id}

# Process exam
POST /api/exams/{id}/process
curl -X POST http://localhost:3000/api/exams/{exam-id}/process

# Get exam progress
GET /api/exams/{id}/progress
curl http://localhost:3000/api/exams/{exam-id}/progress

# Finalize exam
POST /api/exams/{id}/finalize
curl -X POST http://localhost:3000/api/exams/{exam-id}/finalize

# Retry failed exam
POST /api/exams/{id}/retry
curl -X POST http://localhost:3000/api/exams/{exam-id}/retry
```

### 🔧 Question Management
```bash
# Get exam questions
GET /api/exams/{id}/questions
curl http://localhost:3000/api/exams/{exam-id}/questions

# Replace question
POST /api/exams/{id}/questions/{question_id}/replace
curl -X POST http://localhost:3000/api/exams/{exam-id}/questions/{question-id}/replace

# Replace multiple questions
POST /api/exams/{id}/questions/replace
curl -X POST http://localhost:3000/api/exams/{exam-id}/questions/replace

# Get share text
GET /api/exams/{id}/share-text
curl http://localhost:3000/api/exams/{exam-id}/share-text
```

### 👥 User & Sharing
```bash
# Get user's exams
GET /api/users/exams
curl http://localhost:3000/api/users/exams

# Access shared exam
GET /api/shared/exam/{share_id}
curl http://localhost:3000/api/shared/exam/{share-id}
```

## Legacy OCR System

### 📁 File Operations
```bash
# Upload files
POST /api/files/upload
curl -X POST http://localhost:3000/api/files/upload \
    -F "files=@image.jpg"
```

### 🔍 OCR Jobs
```bash
# Create OCR job
POST /api/ocr/jobs
curl -X POST http://localhost:3000/api/ocr/jobs

# Get job status
GET /api/ocr/jobs/{id}
curl http://localhost:3000/api/ocr/jobs/{job-id}

# Get job results
GET /api/ocr/jobs/{id}/results
curl http://localhost:3000/api/ocr/jobs/{job-id}/results

# Export as JSONL
GET /api/ocr/jobs/{id}/jsonl
curl http://localhost:3000/api/ocr/jobs/{job-id}/jsonl
```

## Authentication & Security

### 🔐 Auth Operations
```bash
# Login
POST /api/auth/login
curl -X POST http://localhost:3000/api/auth/login

# Logout
POST /api/auth/logout
curl -X POST http://localhost:3000/api/auth/logout

# Refresh token
POST /api/auth/refresh
curl -X POST http://localhost:3000/api/auth/refresh
```

## System & Monitoring

### 🏥 Health & Metrics
```bash
# Health check
GET /api/health
curl http://localhost:3000/api/health

# System metrics
GET /api/metrics
curl http://localhost:3000/api/metrics

# Dashboard data
GET /api/dashboard
curl http://localhost:3000/api/dashboard

# Performance dashboard
GET /api/performance/dashboard
curl http://localhost:3000/api/performance/dashboard

# Security audit
GET /api/security/audit
curl http://localhost:3000/api/security/audit
```

### 🧪 Testing & Development
```bash
# Simple test
GET /api/test/simple
curl http://localhost:3000/api/test/simple

# Validation test
GET /api/test/validation
curl http://localhost:3000/api/test/validation

# JWT test
GET /api/test/jwt
curl http://localhost:3000/api/test/jwt

# Error recovery test
GET /api/test/error-recovery
curl http://localhost:3000/api/test/error-recovery

# Audit test
GET /api/test/audit
curl http://localhost:3000/api/test/audit

# Error handling test
GET /api/error-handling
curl http://localhost:3000/api/error-handling
```

## Language Support

### 🌍 Localization
```bash
# Get supported languages
GET /api/languages/supported
curl http://localhost:3000/api/languages/supported
```

## Primary Endpoints for Testing

The most important endpoints for cURL testing are:

1. **`POST /api/mobile/exam-questions`** - Create exams from images
2. **`GET /api/exam/{id}`** - Get exam data
3. **`POST /api/exam/{id}/submit`** - Submit answers
4. **`GET /api/exam/{id}/grade`** - Get grading results
5. **`GET /api/health`** - System health check

## Quick Test Examples

### Create and Grade an Exam (Complete Flow)
```bash
# Step 1: Create exam
curl -X POST http://localhost:3000/api/mobile/exam-questions \
    -F "grade=9" \
    -F "language=fi" \
    -F "subject=Ympäristöoppi" \
    -F "images=@assets/images/photo1.jpg" \
    -F "images=@assets/images/photo2.jpg"

# Response: {"exam_id": "abc-123", "exam_url": "..."}

# Step 2: Get exam questions
curl http://localhost:3000/api/exam/abc-123

# Step 3: Submit answers
curl -X POST http://localhost:3000/api/exam/abc-123/submit \
    -H "Content-Type: application/json" \
    -d '{
        "answers": [
            {"question_id": "q1", "answer_text": "112"},
            {"question_id": "q2", "answer_text": "Sähkövirtaa"}
        ]
    }'

# Step 4: View grading results
curl http://localhost:3000/api/exam/abc-123/grade
```

### Health Check
```bash
# Check system status
curl http://localhost:3000/api/health
# Expected: {"status": "ok", "timestamp": "..."}
```

### Language Support Check
```bash
# Get supported languages
curl http://localhost:3000/api/languages/supported
# Returns: [{"code": "fi", "name": "Finnish"}, {"code": "en", "name": "English"}, ...]
```