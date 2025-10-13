# Finnish Exam Generator (ExamGenie)

An AI-powered educational platform that transforms textbook images into structured exam questions using Google's Gemini 2.5 Flash-Lite API. Supports both web and mobile (Flutter) clients with comprehensive exam management and AI-powered grading.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment (see Environment Setup below)
cp .env.example .env.local

# Start development server
npm run dev

# Visit http://localhost:3001
```

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Security Features](#security-features)
- [Environment Setup](#environment-setup)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Key Features](#key-features)
- [Design System](#design-system)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Overview

An AI-powered educational platform that transforms textbook images into exam questions for Finnish elementary/middle school education (grades 1-9).

**Core Capabilities:**
- Processes educational content from textbook images via Gemini AI
- Generates 15 grade-appropriate exam questions per image set
- Provides AI-powered grading with detailed feedback
- Supports 12+ languages (Finnish, Swedish, English, Spanish, German, French, etc.)
- Serves both web and mobile (Flutter) applications

**Production URL:** https://exam-generator.vercel.app

## Tech Stack

### Frontend
- **Framework:** Next.js 15.0.3 (App Router)
- **Language:** TypeScript 5
- **Styling:** Inline styles with design tokens (mobile app design system)
- **UI Components:** Custom React components

### Backend
- **Runtime:** Node.js with Next.js API Routes
- **AI:** Google Gemini 2.5 Flash-Lite
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with JWT (optional)
- **File Handling:** Formidable for multipart uploads
- **Deployment:** Vercel with automatic CI/CD
- **Storage:** Temporary file storage (`/tmp` on Vercel, `uploads/` locally)

## Security Features

| Feature | Details |
|---------|---------|
| **Rate Limiting** | 10 req/hour, 50 req/day per user • Returns HTTP 429 with headers |
| **Authentication** | Optional JWT (Phase 1) • Falls back to `user_id` • Gradual enforcement planned |
| **Request Logging** | All API calls logged to DB • Tracks user, endpoint, JWT status, timing, IP |
| **Admin Monitoring** | `/api/admin/rate-limits` endpoint • View usage, reset limits, query logs |
| **API Key Protection** | Server-side only • Never exposed to client • Gitignored properly |

**📚 Detailed Documentation:** `/SECURITY_IMPLEMENTATION_SUMMARY.md` • `/API_SECURITY_DOCUMENTATION.md` • `/FLUTTER_RATE_LIMIT_HANDLING.md` • `/TESTING_GUIDE.md`

## Environment Setup

Create `.env.local` in project root:

```bash
# Required - Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Required - Application URL
NEXT_PUBLIC_APP_URL=https://exam-generator.vercel.app  # Production
# NEXT_PUBLIC_APP_URL=http://localhost:3001  # Local development

# Optional - Development
ENABLE_PROMPT_LOGGING=true  # Logs prompts to /prompttests/

# Optional - Security (defaults shown)
RATE_LIMIT_HOURLY=10        # Max requests per hour per user
RATE_LIMIT_DAILY=50         # Max requests per day per user
RATE_LIMITING_ENABLED=true  # Enable/disable rate limiting
ENABLE_REQUEST_LOGGING=true # Log API requests to database
```

**Keys:** [Gemini API](https://aistudio.google.com/app/apikey) • [Supabase](https://app.supabase.com/project/_/settings/api) • Set `NEXT_PUBLIC_APP_URL` for exam sharing URLs

## Development Workflow

**🔴 CRITICAL:** Always run `npm run build` before pushing! Dev mode misses type errors that break production.

### Branch Strategy

| Branch | URL | Database | Push | Purpose |
|--------|-----|----------|------|---------|
| `staging` | exam-generator-staging.vercel.app | Staging DB | Direct ✅ | **DEFAULT** - Daily dev |
| `main` | exam-generator.vercel.app | Production DB | PR only | Releases |
| `feature/*` | Auto-generated preview | Staging DB | Direct ✅ | Experimental work |

### Daily Workflow (AI Assistants)

```bash
git checkout staging && git pull origin staging
# Make changes
npm run build  # REQUIRED before push
git add . && git commit -m "Description" && git push origin staging
```

### Release to Production

```bash
npm run build  # Must pass
gh pr create --base main --head staging --title "Release: [description]"
# After merge → Vercel auto-deploys
```

### Key Commands

```bash
npm run dev        # Start dev server (port 3001)
npm run build      # ALWAYS RUN BEFORE PUSH
npm run lint       # ESLint check
```

## Project Structure

```
src/
├── app/api/
│   ├── mobile/              # Mobile API (exam-questions, exams, stats)
│   ├── exam/[id]/          # Exam taking & grading
│   └── files/upload/       # File upload handler
├── components/exam/         # React components (NavigationDots, etc.)
├── constants/              # Design tokens, UI text, icons
├── lib/
│   ├── services/          # mobile-api, question-generator, grading
│   ├── utils/            # question-shuffler, database-manager
│   ├── gemini.ts         # Gemini API integration
│   ├── supabase.ts       # Database client
│   └── config.ts         # Exam generation prompts
└── types/                 # TypeScript definitions
```

## API Endpoints

### Primary Mobile API

**POST `/api/mobile/exam-questions`** - Generate exam from images
- **Input:** Multipart form data with images + optional metadata
- **Output:** Exam questions + web URLs for taking/grading
- **Used by:** Flutter mobile app

```bash
# Localhost (no student_id needed)
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@textbook-page.jpg" \
  -F "category=mathematics" \
  -F "grade=5" \
  -F "language=fi"

# Staging (requires student_id for rate limiting)
curl -X POST https://exam-generator-staging.vercel.app/api/mobile/exam-questions \
  -F "images=@textbook-page.jpg" \
  -F "category=mathematics" \
  -F "grade=5" \
  -F "language=fi" \
  -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"
```

**GET `/api/mobile/exams?user_id={id}`** - List user's exams
**GET `/api/mobile/exams/{examId}`** - Get single exam with questions
**GET `/api/mobile/stats?user_id={id}`** - Get exam statistics

### Web Exam Management

**GET `/api/exam/{id}`** - Retrieve exam for taking
**POST `/api/exam/{id}/submit`** - Submit answers for grading
**GET `/api/exam/{id}/grade`** - Get grading results

**📚 Full API Documentation:** See `/docs/api/` directory

## Key Features

### 1. AI Question Generation
- **Model:** Gemini 2.5 Flash-Lite with `temperature: 0` (deterministic, reduces hallucinations)
- **Categories:** mathematics, core_academics, language_studies
- **Output:** 15 questions per exam • ~$0.001 cost
- **Quality:** 100% multiple choice • 0% image references • Consistent across compression levels
- **Prompt:** `getCategoryAwarePrompt()` in `/src/lib/config.ts` • See `/PROMPT_VARIANTS_DOCUMENTATION.md` for optimization history
- **Image Requirements:** Minimum 3 images recommended when source material contains graphs/charts to avoid visual reference questions • Single text-heavy images work well • 2 images insufficient for graph-heavy content
- ⚠️ **Known Limitation:** `subject` parameter stored in DB but doesn't guide generation (only `category` matters)

### 2. Answer Shuffling
- **Algorithm:** Fisher-Yates shuffle
- **When:** After Gemini generates questions, before database storage
- **Why:** Prevents correct answers always appearing in position A
- **Implementation:** `/src/lib/utils/question-shuffler.ts`
- **Distribution:** Correct answers evenly distributed across A/B/C/D positions

### 3. AI-Powered Grading
- **Gemini Integration:** Evaluates student answers against correct answers
- **Feedback:** Detailed explanations for each question
- **Grading Methods:** AI grading for open-ended, rule-based for multiple choice
- **Output:** Final grade (0-10), percentage, question-by-question breakdown

### 4. Multi-Language Support
- **12+ Languages:** Finnish, English, Swedish, Spanish, German, French, etc.
- **Auto-Detection:** Identifies source language from images
- **Output Language:** Matches source material language

### 5. Mobile-First Design
- **Design System:** Extracted from ExamGenie Flutter app for visual consistency
- **Design Tokens:** Centralized in `/src/constants/design-tokens.ts`
- **Touch Targets:** Minimum 48px for mobile compatibility
- **NavigationDots Component:** Dynamic progress indicator (adapts to question count)

## Common Tasks

These are used to run tests directly from Claude Code.

### Generate Exam Locally

```bash
# Localhost
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5"

# Staging (use this test student_id)
curl -X POST https://exam-generator-staging.vercel.app/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5" \
  -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"
```

### Test Prompt Variants

```bash
npx tsx test-prompt-variants.ts assets/images/test-image.jpg
```

### Test Prompt Quality with Multiple Images

```bash
# Test with multiple images to verify question quality
npx tsx test-prompt-multiple-images.ts
```

### Test OCR Quality Across Compression Levels

```bash
# Compare text extraction quality between compressed/uncompressed images
npx tsx test-ocr-compression-quality.ts
```

### Database Migrations

```bash
supabase db push  # Migrations in /supabase/migrations/
```

### View Logs

```bash
vercel logs       # Production logs
# Local: Check console output and /prompttests/
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Wrong exam URLs** | Check `NEXT_PUBLIC_APP_URL` in `.env.local` |
| **TypeScript build errors** | Always run `npm run build` before pushing |
| **localhost CURL fails** | Use staging: `https://exam-generator-staging.vercel.app` (RLS policies block localhost) |
| **Staging "user_id required" error** | Add `-F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"` to curl command |
| **Gemini 503 errors** | Verify `GEMINI_API_KEY` • Check `/prompttests/` logs • Retry logic handles overload |

## Important Notes

- **Text Extraction:** Gemini AI only (no OCR libraries) • "OCR" naming is legacy
- **Constraints:** Max 20 images/web, 5/mobile • 10MB per image • JPEG, PNG, WebP, HEIC
- **Authentication:** Optional • Falls back to system user for anonymous requests
- **Storage:** Temporary only (`/tmp` on Vercel) • Auto-cleanup after processing
- **Finnish Education:** Grades 1-9 (peruskoulu) • Curriculum-aligned difficulty

## Documentation

### Developer Guides
- `/PROJECT_OVERVIEW.md` - Complete architecture overview
- `/CLAUDE.md` - Instructions for AI assistants
- `/PROMPT_VARIANTS_DOCUMENTATION.md` - Prompt optimization journey

### API Documentation
- `/docs/api/mobile-exam-questions-endpoint.md` - Mobile exam generation API
- `/docs/api/mobile-exam-retrieval-endpoints.md` - Exam retrieval endpoints

### Reference Materials
- `/assets/images/` - Test images
- `/prompttests/` - Sample prompts and logs
- `/assets/references/mobile2.PNG` - Mobile app UI reference

## For AI Assistants

**Read:** `README.md` • `/PROJECT_OVERVIEW.md` • `/CLAUDE.md`

**Rules:** ✅ Run `npm run build` before commit • Use Gemini (no OCR libs) • Test with Finnish content • Maintain mobile API compatibility | ❌ Don't modify `.env.local` keys • Don't create traditional OCR

**Standards:** TypeScript strict • Inline styles with design tokens • Service layer architecture • Comprehensive error handling

## Current Status (October 2025)

✅ **Production Active:** https://exam-generator.vercel.app
✅ **15 Questions Per Exam:** Configurable via `EXAM_CONFIG.DEFAULT_QUESTION_COUNT`
✅ **completed_at Fix:** Tracks exam completion status correctly
✅ **Mobile API Complete:** Full exam generation, retrieval, and statistics
✅ **AI Grading:** Automated grading with detailed feedback
✅ **Answer Shuffling:** Fisher-Yates randomization (even distribution)
✅ **Prompt Optimization:** Variant 4 (100% quality, 35% size reduction)
⚠️ **Legacy Code:** OCR endpoints exist but are unused

## License

Proprietary - All rights reserved

---

**Last Updated:** October 2025
**Repository:** https://github.com/jachren-f4/finnish-exam-generator.git
**Production:** https://exam-generator.vercel.app
