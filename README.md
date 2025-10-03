# Finnish Exam Question Generator (ExamGenie)

A full-stack educational platform that processes textbook images using Google's Gemini 2.5 Flash-Lite API to generate exam questions for elementary/middle school education. Supports both web and mobile (Flutter) clients with comprehensive exam management and grading.

## Overview

This app transforms educational content from images into structured exam questions with multiple question types (multiple choice, true/false, short answer, fill-in-the-blank). Originally built for OCR compression, it has evolved into a complete educational technology platform with multi-user support and AI-powered grading.

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes with service layer architecture
- **AI Processing:** Google Gemini 2.5 Flash-Lite API
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with JWT
- **File Handling:** Formidable for uploads
- **Deployment:** Vercel (Production: https://exam-generator.vercel.app)

## Key Features

- 📚 **Image Processing** - Upload and process educational content (up to 20 images per request)
- 🧠 **AI Question Generation** - Generate grade-appropriate exam questions using Gemini AI
- 🎲 **Answer Shuffling** - Fisher-Yates algorithm randomizes multiple-choice options
- 👥 **Multi-User Support** - User authentication and exam management
- 📱 **Mobile API** - RESTful endpoints for Flutter app integration
- 📊 **Exam History** - Retrieve past exams with statistics and metadata
- ✅ **AI Grading** - Automated exam grading with detailed feedback
- 💰 **Cost Tracking** - Real-time Gemini API usage and cost monitoring
- 🌍 **Multi-Language** - Support for 12+ languages (Finnish, English, Swedish, etc.)
- 🔐 **Authentication** - Optional JWT-based authentication via Supabase
- 📄 **Export Options** - JSONL format for data portability
- ⚡ **Async Processing** - Background job processing with status tracking

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ocr/jobs/          # Web job management
│   │   └── mobile/            # Mobile API endpoint
│   ├── results/[id]/          # Results display page
│   └── page.tsx               # Main upload interface
├── lib/
│   ├── gemini.ts              # Gemini API integration
│   └── jobs.ts                # Job management utilities
├── components/
│   └── FileUpload.tsx         # Main upload component
└── types/
    └── index.ts               # TypeScript interfaces
```

## Environment Setup

Create `.env.local`:
```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Application URL (important for exam sharing)
NEXT_PUBLIC_APP_URL=https://exam-generator.vercel.app
```

## Installation & Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the web interface.

### ⚠️ IMPORTANT: Build Validation Before Production

**Always run a production build locally before pushing to production:**

```bash
npm run build
```

**Why this matters:**
- Dev mode (`npm run dev`) uses relaxed TypeScript checking and may miss type errors
- Production builds enforce strict type checking and will fail on errors that dev mode ignores
- Vercel deployment will fail if the build doesn't pass, potentially breaking production
- Running `npm run build` locally catches these errors before they reach production

**Development Workflow:**
1. Make changes and test in dev mode (`npm run dev`)
2. **Before committing:** Run `npm run build` to verify production compatibility
3. Fix any TypeScript errors or build issues
4. Commit and push only after successful build
5. Vercel will deploy automatically after push

**Common build errors caught by `npm run build`:**
- Missing TypeScript type definitions
- Unused variables/imports (ESLint warnings)
- Interface mismatches
- Import path errors
- Environment variable issues

## API Endpoints

### Mobile API (Primary)
- `POST /api/mobile/exam-questions` - Generate exam from images
- `GET /api/mobile/exams?user_id={id}` - List all exams for a user
- `GET /api/mobile/exams/{examId}` - Get single exam with questions
- `GET /api/mobile/stats?user_id={id}` - Get exam statistics

### Exam Management (Web)
- `GET /api/exam/{id}` - Get exam for taking
- `POST /api/exam/{id}/submit` - Submit answers and get grading
- `GET /api/exam/{id}/grade` - Get grading results

### Legacy Endpoints
- `POST /api/ocr/jobs` - Create processing job (legacy)
- `GET /api/ocr/jobs/[id]/status` - Check job status (legacy)
- `GET /api/ocr/jobs/[id]/results` - Get completed results (legacy)

**See `/docs/api/` for detailed API documentation.**

## Default Exam Prompt

The app uses a predefined Finnish exam question template that generates:
- 10 questions per image set
- Mixed question types (multiple choice, true/false, short answer)
- Finnish language output with explanations
- Appropriate elementary/middle school difficulty

## Mobile Integration

The `/api/mobile/exam-questions` endpoint accepts:
- **Images:** 1-5 textbook images (multipart form data)
- **Prompt:** Optional custom prompt (falls back to default)

Returns structured JSON with exam questions and processing metadata.

## Key Components

### Core Processing (`src/lib/gemini.ts`)
- Gemini 2.5 Flash-Lite API integration
- Image processing and prompt handling
- Token usage tracking and cost calculation
- JSON response parsing with fallbacks

### Job Management (`src/lib/jobs.ts`)
- In-memory job storage using globalThis
- Status tracking (pending → processing → completed/failed)
- UUID-based job identification

### File Upload (`src/components/FileUpload.tsx`)
- Drag & drop interface with image previews
- Custom prompt editing
- Real-time upload progress
- Job status polling

### Results Display (`src/app/results/[id]/page.tsx`)
- Question visualization with type-specific formatting
- Gemini API usage statistics
- JSONL export functionality
- Custom prompt display

## Data Flow

1. **Upload:** User selects images and optional custom prompt
2. **Job Creation:** Server creates job and returns job ID
3. **Processing:** Async processing with Gemini API
4. **Results:** Structured questions with metadata and costs

## Error Handling

- JSON parsing fallbacks for malformed Gemini responses
- File cleanup after processing
- Comprehensive error logging
- User-friendly error messages

## Mobile Integration Files

- `flutter-integration-guide.md` - Complete Flutter implementation guide
- `mobile-architecture-analysis.md` - Cost analysis for mobile architecture

## Cost Optimization

- Image compression before Gemini processing
- Token usage estimation when API metadata unavailable
- Processing time tracking
- Real-time cost calculation display

## Development Notes

- Uses `globalThis` for job persistence during hot reloads
- Supports up to 20 files per web job, 5 files per mobile request
- Automatic file cleanup in uploads directory
- CORS configured for mobile app integration

## Getting Started as New Developer

1. **Read Documentation:**
   - `/PROJECT_OVERVIEW.md` - Complete project context and architecture
   - `/CLAUDE.md` - Development guidelines and instructions
   - `/docs/api/` - API endpoint documentation

2. **Setup Environment:**
   - Configure Gemini API key
   - Set up Supabase project (or use existing)
   - Configure environment variables in `.env.local`

3. **Review Key Files:**
   - `/src/lib/services/mobile-api-service.ts` - Mobile API business logic
   - `/src/lib/services/question-generator-service.ts` - AI question generation
   - `/src/app/api/mobile/` - Mobile API endpoints
   - `/src/lib/supabase.ts` - Database types and client

4. **Test:**
   - Use sample textbook images from `/assets/images/`
   - Test mobile API with curl or Postman
   - Monitor console logs for detailed processing information

## Current Status (January 2025)

- ✅ **Production Active** - Deployed at https://exam-generator.vercel.app
- ✅ **Mobile API Complete** - Full exam generation and retrieval endpoints
- ✅ **Multi-User Support** - User authentication and exam management
- ✅ **AI Grading** - Automated exam grading with Gemini
- ✅ **Answer Shuffling** - Prevents predictable correct answer positions
- ✅ **Multi-Language** - 12+ supported languages for exam generation
- ⚠️ **No Answer Tracking** - `examgenie_exams` status doesn't track answered/unanswered state
- ⚠️ **Legacy Code Present** - Old OCR endpoints exist but unused

## Documentation

- **API Docs:** `/docs/api/mobile-exam-retrieval-endpoints.md`
- **Flutter Integration:** `/FLUTTER_INTEGRATION_RESPONSE.md`
- **Project Overview:** `/PROJECT_OVERVIEW.md`
- **Development Guide:** `/CLAUDE.md`

## Contributing

This project is actively maintained. For issues or feature requests, please create an issue in the repository.

## License

Proprietary - All rights reserved