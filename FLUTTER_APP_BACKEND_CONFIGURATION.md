# Flutter App - Backend Configuration Guide

This document provides instructions for configuring the ExamGenie Flutter mobile app to connect to the correct backend environment (staging vs production).

**For AI Assistants / Claude Code:** This file should be copied to the Flutter project repository as `BACKEND_CONFIG.md` or similar.

---

## Backend Environments

The ExamGenie backend has two separate environments:

| Environment | Purpose | Base URL | Database |
|-------------|---------|----------|----------|
| **Production** | Real users | `https://exam-generator.vercel.app` | Production Supabase |
| **Staging** | Testing/Development | `https://exam-generator-staging.vercel.app` | Staging Supabase |

**Key Differences:**
- ✅ **Staging** uses a separate test database (safe for testing, data can be deleted)
- ✅ **Production** uses the live database with real user data
- ✅ Both environments have the same API endpoints and behavior

---

## API Endpoints Overview

All backend endpoints use the same paths on both environments:

### Primary Mobile Endpoints

```
POST   /api/mobile/exam-questions    # Generate exam from images
GET    /api/mobile/exams              # List user's exams
GET    /api/mobile/exams/{examId}     # Get single exam
GET    /api/mobile/stats              # Get exam statistics
```

### Example API Calls

**Staging:**
```
POST https://exam-generator-staging.vercel.app/api/mobile/exam-questions
GET  https://exam-generator-staging.vercel.app/api/mobile/exams?user_id=123
```

**Production:**
```
POST https://exam-generator.vercel.app/api/mobile/exam-questions
GET  https://exam-generator.vercel.app/api/mobile/exams?user_id=123
```

---

## Flutter App Configuration

### Recommended Approach: Build Flavors

Create separate build flavors for staging and production environments.

#### Step 1: Create Environment Config File

**File:** `lib/config/environment.dart`

```dart
enum Environment {
  production,
  staging,
}

class EnvironmentConfig {
  // Set this based on build flavor
  static Environment currentEnvironment = Environment.production;

  // Base URLs for each environment
  static const String _productionBaseUrl = 'https://exam-generator.vercel.app';
  static const String _stagingBaseUrl = 'https://exam-generator-staging.vercel.app';

  // Get the current base URL based on environment
  static String get baseUrl {
    switch (currentEnvironment) {
      case Environment.production:
        return _productionBaseUrl;
      case Environment.staging:
        return _stagingBaseUrl;
    }
  }

  // API endpoint builders
  static String get examQuestionsEndpoint => '$baseUrl/api/mobile/exam-questions';
  static String get examsEndpoint => '$baseUrl/api/mobile/exams';
  static String get statsEndpoint => '$baseUrl/api/mobile/stats';

  static String examByIdEndpoint(String examId) => '$baseUrl/api/mobile/exams/$examId';

  // Environment info
  static bool get isProduction => currentEnvironment == Environment.production;
  static bool get isStaging => currentEnvironment == Environment.staging;
  static String get environmentName => currentEnvironment.name.toUpperCase();
}
```

#### Step 2: Configure Build Flavors

**Android:** `android/app/build.gradle`

```gradle
android {
    // ... existing config

    flavorDimensions "environment"

    productFlavors {
        production {
            dimension "environment"
            applicationIdSuffix ""
            versionNameSuffix ""
            manifestPlaceholders = [appName: "ExamGenie"]
        }

        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
            manifestPlaceholders = [appName: "ExamGenie Staging"]
        }
    }
}
```

**iOS:** Create schemes in Xcode

1. Open `ios/Runner.xcworkspace` in Xcode
2. Product → Scheme → New Scheme → "Staging"
3. Edit scheme → Run → Build Configuration → Create "Staging" configuration
4. Duplicate "Release" configuration and rename to "Staging"

#### Step 3: Set Environment on App Launch

**File:** `lib/main.dart`

```dart
import 'package:flutter/material.dart';
import 'config/environment.dart';

void main() {
  // Set environment based on build flavor
  // This can be configured via --dart-define or flavor-specific entry points

  // Default to production (safest)
  EnvironmentConfig.currentEnvironment = Environment.production;

  // For staging builds, use:
  // EnvironmentConfig.currentEnvironment = Environment.staging;

  runApp(MyApp());
}
```

**Or use separate entry points:**

**File:** `lib/main_staging.dart`
```dart
import 'package:flutter/material.dart';
import 'config/environment.dart';
import 'main.dart' as main_app;

void main() {
  EnvironmentConfig.currentEnvironment = Environment.staging;
  main_app.main();
}
```

**File:** `lib/main_production.dart`
```dart
import 'package:flutter/material.dart';
import 'config/environment.dart';
import 'main.dart' as main_app;

void main() {
  EnvironmentConfig.currentEnvironment = Environment.production;
  main_app.main();
}
```

#### Step 4: Use Environment Config in API Calls

**File:** `lib/services/exam_service.dart`

```dart
import 'package:http/http.dart' as http;
import 'package:dio/dio.dart';
import '../config/environment.dart';

class ExamService {
  // Using http package
  Future<void> generateExamFromImages(List<File> images, {
    String? category,
    int? grade,
    String? language,
  }) async {
    final uri = Uri.parse(EnvironmentConfig.examQuestionsEndpoint);

    var request = http.MultipartRequest('POST', uri);

    // Add images
    for (var image in images) {
      request.files.add(await http.MultipartFile.fromPath('images', image.path));
    }

    // Add optional parameters
    if (category != null) request.fields['category'] = category;
    if (grade != null) request.fields['grade'] = grade.toString();
    if (language != null) request.fields['language'] = language;

    var response = await request.send();
    // Handle response...
  }

  // Using Dio package (recommended)
  final Dio _dio = Dio(BaseOptions(
    baseUrl: EnvironmentConfig.baseUrl,
    connectTimeout: Duration(seconds: 30),
    receiveTimeout: Duration(seconds: 60), // Exam generation can take time
  ));

  Future<ExamResponse> generateExam(List<File> images, {
    String? category,
    int? grade,
    String? language,
  }) async {
    FormData formData = FormData();

    // Add images
    for (var image in images) {
      formData.files.add(MapEntry(
        'images',
        await MultipartFile.fromFile(image.path, filename: image.path.split('/').last),
      ));
    }

    // Add optional parameters
    if (category != null) formData.fields.add(MapEntry('category', category));
    if (grade != null) formData.fields.add(MapEntry('grade', grade.toString()));
    if (language != null) formData.fields.add(MapEntry('language', language));

    try {
      final response = await _dio.post(
        '/api/mobile/exam-questions',
        data: formData,
      );

      return ExamResponse.fromJson(response.data);
    } catch (e) {
      print('Error generating exam: $e');
      rethrow;
    }
  }

  Future<List<Exam>> getUserExams(String userId) async {
    final response = await _dio.get(
      '/api/mobile/exams',
      queryParameters: {'user_id': userId},
    );

    return (response.data['exams'] as List)
        .map((e) => Exam.fromJson(e))
        .toList();
  }
}
```

---

## Build Commands

### Building for Different Environments

**Production Build (App Store / Play Store):**
```bash
# Android
flutter build apk --flavor production --release
flutter build appbundle --flavor production --release

# iOS
flutter build ios --flavor production --release
```

**Staging Build (Testing):**
```bash
# Android
flutter build apk --flavor staging --release
flutter build apk --flavor staging --debug  # For debugging

# iOS
flutter build ios --flavor staging --release
```

**Running on Device:**
```bash
# Run production
flutter run --flavor production

# Run staging
flutter run --flavor staging
```

---

## Testing Backend Connectivity

Add a debug screen to verify which environment is active:

**File:** `lib/screens/debug_screen.dart`

```dart
import 'package:flutter/material.dart';
import '../config/environment.dart';

class DebugScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Debug Info')),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoRow('Environment', EnvironmentConfig.environmentName),
            _buildInfoRow('Base URL', EnvironmentConfig.baseUrl),
            _buildInfoRow('Is Production', EnvironmentConfig.isProduction.toString()),
            _buildInfoRow('Is Staging', EnvironmentConfig.isStaging.toString()),
            SizedBox(height: 20),
            Text('API Endpoints:', style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 10),
            _buildInfoRow('Exam Questions', EnvironmentConfig.examQuestionsEndpoint),
            _buildInfoRow('Exams List', EnvironmentConfig.examsEndpoint),
            _buildInfoRow('Stats', EnvironmentConfig.statsEndpoint),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text('$label:', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
```

---

## Visual Indicators

Add visual indicators to distinguish staging from production:

```dart
// In your main app widget
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: EnvironmentConfig.isStaging ? 'ExamGenie (Staging)' : 'ExamGenie',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        // Add a banner for staging
        bannerTheme: MaterialBannerThemeData(
          backgroundColor: EnvironmentConfig.isStaging ? Colors.orange : Colors.blue,
        ),
      ),
      home: EnvironmentConfig.isStaging
          ? Stack(
              children: [
                HomeScreen(),
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    padding: EdgeInsets.all(8),
                    color: Colors.orange,
                    child: Text(
                      'STAGING',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            )
          : HomeScreen(),
    );
  }
}
```

---

## For AI Assistants / Claude Code

### Default Behavior

**When working on the Flutter app:**

1. ✅ **Always assume staging environment for development and testing**
2. ✅ **Use `EnvironmentConfig.baseUrl` instead of hardcoded URLs**
3. ✅ **Never hardcode backend URLs in API calls**
4. ✅ **Test changes against staging backend first**

### Examples

**❌ WRONG:**
```dart
final response = await http.post(
  Uri.parse('https://exam-generator.vercel.app/api/mobile/exam-questions'),
  // ...
);
```

**✅ CORRECT:**
```dart
final response = await http.post(
  Uri.parse(EnvironmentConfig.examQuestionsEndpoint),
  // ...
);
```

### When to Use Each Environment

**Use Staging When:**
- 🔧 Developing new features
- 🧪 Testing API changes
- 🐛 Debugging issues
- 📱 Testing with Claude Code or AI assistants
- 🚀 Beta testing with testers

**Use Production When:**
- ✅ Final testing before app store release
- ✅ Publishing to App Store / Play Store
- ✅ Real users accessing the app

### Testing Workflow

```bash
# 1. Start with staging flavor
flutter run --flavor staging

# 2. Test your changes against staging backend
# Backend: https://exam-generator-staging.vercel.app

# 3. When changes are stable, test production flavor
flutter run --flavor production

# 4. Build for release (production only)
flutter build apk --flavor production --release
```

---

## Troubleshooting

### "Connection refused" or "Network error"

**Check:**
1. Is the backend URL correct? (print `EnvironmentConfig.baseUrl`)
2. Is the backend deployment live? (visit URL in browser)
3. Are you using the correct environment?

**Test backend connectivity:**
```bash
# Test staging
curl https://exam-generator-staging.vercel.app/api/mobile/exam-questions

# Test production
curl https://exam-generator.vercel.app/api/mobile/exam-questions
```

### "Exam data appears in wrong database"

**Problem:** You're using production flavor but expecting staging database.

**Solution:** Check your build flavor:
```dart
print('Current environment: ${EnvironmentConfig.environmentName}');
print('Base URL: ${EnvironmentConfig.baseUrl}');
```

### "Staging shows production data"

**Problem:** Environment config not set correctly.

**Solution:** Verify environment is set in `main.dart` or flavor-specific entry point.

---

## Quick Reference

### Backend API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mobile/exam-questions` | POST | Generate exam from images |
| `/api/mobile/exams` | GET | List user's exams |
| `/api/mobile/exams/{id}` | GET | Get single exam |
| `/api/mobile/stats` | GET | Get statistics |

### Request Parameters

**POST /api/mobile/exam-questions:**
- `images` (File[]) - Required - Image files
- `category` (String) - Optional - "mathematics", "core_academics", "language_studies"
- `grade` (int) - Optional - 1-9
- `language` (String) - Optional - "fi", "en", "sv", etc.
- `user_id` (String) - Optional - User identifier

### Response Format

```json
{
  "success": true,
  "exam_id": "uuid-here",
  "exam_url": "https://exam-generator.vercel.app/exam/{id}",
  "grading_url": "https://exam-generator.vercel.app/grading/{id}",
  "data": {
    "metadata": {
      "processingTime": 8500,
      "imageCount": 1,
      "promptUsed": "default"
    }
  }
}
```

---

## Summary

**For AI Assistants:**
- ✅ Use `EnvironmentConfig.baseUrl` for all API calls
- ✅ Default to staging environment for development
- ✅ Never hardcode backend URLs
- ✅ Test against staging before production
- ✅ Use build flavors to switch environments

**Backend URLs:**
- **Staging:** `https://exam-generator-staging.vercel.app`
- **Production:** `https://exam-generator.vercel.app`

---

**Last Updated:** October 2025
**Backend Repository:** https://github.com/jachren-f4/finnish-exam-generator.git
**Backend Documentation:** See `README.md` and `STAGING_ENVIRONMENT_SETUP.md` in backend repo
