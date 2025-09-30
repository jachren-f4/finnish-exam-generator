# Backend Response: Exam Retrieval Endpoints Ready

## ✅ Summary

**Good news:** The backend **already stores all exam data** in Supabase. I've created three new API endpoints to retrieve it.

---

## 🎯 New Endpoints (Live Now)

### 1. List All Exams for Student
```
GET https://exam-generator.vercel.app/api/mobile/exams?student_id={studentId}
```

**Returns:**
```json
{
  "success": true,
  "data": {
    "exams": [
      {
        "exam_id": "uuid",
        "student_id": "uuid",
        "subject": "Matematiikka",
        "grade": "5",
        "status": "READY",
        "question_count": 10,
        "exam_url": "https://...",
        "grading_url": "https://...",
        "created_at": "2025-09-30T12:00:00Z",
        "completed_at": "2025-09-30T12:05:00Z"
      }
    ],
    "total": 12
  }
}
```

**Features:**
- ✅ Sorted by most recent first
- ✅ Returns empty array if no exams (not an error)
- ✅ Includes question count
- ✅ Includes shareable URLs

---

### 2. Get Single Exam with Questions
```
GET https://exam-generator.vercel.app/api/mobile/exams/{examId}
```

**Returns:**
```json
{
  "success": true,
  "data": {
    "exam": {
      "exam_id": "uuid",
      "subject": "Matematiikka",
      "grade": "5",
      "status": "READY",
      "questions": [
        {
          "id": "q-uuid",
          "question_number": 1,
          "question_text": "Mikä on 2+2?",
          "question_type": "multiple_choice",
          "options": ["3", "4", "5", "6"],
          "correct_answer": "4",
          "explanation": "Explanation text",
          "max_points": 2
        }
      ],
      "created_at": "2025-09-30T12:00:00Z"
    }
  }
}
```

**Features:**
- ✅ Full question details
- ✅ Questions sorted by question_number
- ✅ Options already shuffled (don't re-shuffle!)
- ✅ Returns 404 if exam doesn't exist

---

### 3. Get Student Statistics
```
GET https://exam-generator.vercel.app/api/mobile/stats?student_id={studentId}
```

**Returns:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_exams": 12,
      "exams_this_week": 3,
      "exams_by_subject": {
        "Matematiikka": 5,
        "Äidinkieli": 4
      },
      "exams_by_status": {
        "READY": 10,
        "PROCESSING": 1,
        "FAILED": 1
      }
    }
  }
}
```

---

## 📝 Response Format Specs

All responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "ISO 8601 date"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable message",
  "details": "Technical details",
  "metadata": {
    "timestamp": "ISO 8601 date"
  }
}
```

### HTTP Status Codes
- `200` - Success (including empty results)
- `400` - Missing/invalid parameters
- `404` - Exam not found
- `500` - Server error

---

## 🔑 Key Details

### Status Values
- `DRAFT` - Being created (rare)
- `PROCESSING` - AI generating questions
- `READY` - Complete and usable ✅
- `FAILED` - Generation failed

### Question Types
- `multiple_choice` - 4 options
- `true_false` - True/False
- `short_answer` - Open text
- `fill_in_the_blank` - Complete sentence

### Date Format
- **ISO 8601:** `2025-09-30T12:34:56Z`
- Flutter can parse with `DateTime.parse()`

### Correct Answer Format
- For multiple choice: Exact text (e.g., `"4"`)
- **Important:** Options are already shuffled in database
- Don't re-shuffle in Flutter!

---

## 🧪 Testing

### Quick Test (replace student_id)
```bash
curl "https://exam-generator.vercel.app/api/mobile/exams?student_id=YOUR-STUDENT-UUID"
```

### Prerequisites
You need at least one exam created. If testing fresh:
```bash
# Create test exam first
curl -X POST "https://exam-generator.vercel.app/api/mobile/exam-questions" \
  -F "images=@test.jpg" \
  -F "subject=Matematiikka" \
  -F "grade=5" \
  -F "student_id=YOUR-STUDENT-UUID" \
  -F "language=fi"
```

---

## 🔐 Authentication

**Currently:** No authentication required
- Just pass `student_id` in query params
- Any valid UUID works

**Future:** Can add JWT tokens
```
Authorization: Bearer YOUR_TOKEN
```

---

## 🚀 What You Need to Do in Flutter

### 1. Create Dart Models

```dart
class ExamListItem {
  final String examId;
  final String studentId;
  final String subject;
  final String grade;
  final String status;
  final int questionCount;
  final String examUrl;
  final String gradingUrl;
  final DateTime createdAt;
  final DateTime? completedAt;

  factory ExamListItem.fromJson(Map<String, dynamic> json) {
    return ExamListItem(
      examId: json['exam_id'],
      studentId: json['student_id'],
      subject: json['subject'],
      grade: json['grade'],
      status: json['status'],
      questionCount: json['question_count'],
      examUrl: json['exam_url'],
      gradingUrl: json['grading_url'],
      createdAt: DateTime.parse(json['created_at']),
      completedAt: json['completed_at'] != null
        ? DateTime.parse(json['completed_at'])
        : null,
    );
  }
}
```

### 2. Create ExamService

```dart
class ExamService {
  static const baseUrl = 'https://exam-generator.vercel.app/api/mobile';

  // List exams
  Future<List<ExamListItem>> getExamsForStudent(String studentId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/exams?student_id=$studentId')
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        final examsList = data['data']['exams'] as List;
        return examsList.map((e) => ExamListItem.fromJson(e)).toList();
      } else {
        throw Exception(data['error']);
      }
    } else {
      throw Exception('Failed to load exams');
    }
  }

  // Get single exam
  Future<ExamDetail> getExamById(String examId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/exams/$examId')
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        return ExamDetail.fromJson(data['data']['exam']);
      } else {
        throw Exception(data['error']);
      }
    } else {
      throw Exception('Failed to load exam');
    }
  }

  // Get statistics
  Future<ExamStats> getStatsForStudent(String studentId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/stats?student_id=$studentId')
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['success'] == true) {
        return ExamStats.fromJson(data['data']['stats']);
      } else {
        throw Exception(data['error']);
      }
    } else {
      throw Exception('Failed to load statistics');
    }
  }
}
```

### 3. Update Landing Screen

```dart
// In your landing screen
class LandingScreen extends StatefulWidget {
  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final examService = ExamService();
  List<ExamListItem> exams = [];
  ExamStats? stats;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadExams();
  }

  Future<void> loadExams() async {
    setState(() => isLoading = true);
    try {
      final studentId = // Get from your auth/storage
      exams = await examService.getExamsForStudent(studentId);
      stats = await examService.getStatsForStudent(studentId);
    } catch (e) {
      // Handle error
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) return LoadingWidget();

    return Column(
      children: [
        Text('Total Exams: ${stats?.totalExams ?? 0}'),
        Text('This Week: ${stats?.examsThisWeek ?? 0}'),
        ListView.builder(
          itemCount: exams.length,
          itemBuilder: (context, index) {
            final exam = exams[index];
            return ListTile(
              title: Text(exam.subject),
              subtitle: Text('Grade ${exam.grade} • ${exam.questionCount} questions'),
              trailing: Text(exam.status),
              onTap: () => navigateToExam(exam.examId),
            );
          },
        ),
      ],
    );
  }
}
```

---

## 📚 Full Documentation

See `/docs/api/mobile-exam-retrieval-endpoints.md` for:
- Complete API specification
- All error scenarios
- Testing scripts
- Database schema reference

---

## ✅ Checklist for Flutter Agent

- [ ] Create Dart models for ExamListItem, ExamDetail, ExamStats, Question
- [ ] Create ExamService with three methods
- [ ] Update landing screen to load and display exam list
- [ ] Update past exams screen to show history
- [ ] Handle loading states
- [ ] Handle error states (no network, server error)
- [ ] Handle empty state (no exams yet)
- [ ] Add pull-to-refresh
- [ ] (Optional) Add local caching with shared_preferences or hive

---

## 🎉 Ready to Integrate

All three endpoints are:
- ✅ Built and tested
- ✅ Deployed to production
- ✅ Using existing database
- ✅ Returning consistent format
- ✅ Supporting CORS

**You can start integrating immediately!**

---

## ❓ Questions?

If you need:
- Different field names (e.g., camelCase instead of snake_case)
- Additional fields in responses
- Pagination for large exam lists
- Filtering by subject/status/date
- Authentication implementation

Let me know and I can update the endpoints.