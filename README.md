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
```

**Important:**
- `NEXT_PUBLIC_APP_URL` determines exam sharing URLs - set correctly for your environment
- Get Gemini API key from: https://aistudio.google.com/app/apikey
- Supabase credentials from: https://app.supabase.com/project/_/settings/api

## Development Workflow

### ⚠️ CRITICAL: Build Validation Before Production

**Always run a production build locally before pushing:**

```bash
npm run build
```

**Why this matters:**
- Dev mode (`npm run dev`) uses relaxed TypeScript checking and may miss type errors
- Production builds enforce strict type checking and will fail on errors dev mode ignores
- Vercel deployment will fail if build doesn't pass, potentially breaking production
- Running `npm run build` locally catches these errors before they reach production

**Recommended Workflow:**
1. Make changes and test in dev mode (`npm run dev`)
2. **Before committing:** Run `npm run build` to verify production compatibility
3. Fix any TypeScript errors or build issues
4. Only commit and push after successful build
5. Vercel deploys automatically after push

**Common build errors caught by production build:**
- Missing TypeScript type definitions
- Unused variables/imports (ESLint warnings)
- Interface mismatches
- Import path errors
- Environment variable issues

### Development Commands

```bash
# Development
npm run dev              # Start dev server (port 3001)
npm run build           # Build for production (ALWAYS RUN BEFORE PUSH)
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # TypeScript validation

# Testing
npm run test            # Run tests (if configured)
```

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── mobile/              # Mobile API (PRIMARY)
│   │   │   ├── exam-questions/  # Generate exam from images
│   │   │   ├── exams/          # List/retrieve exams
│   │   │   └── stats/          # Student statistics
│   │   ├── exam/[id]/          # Exam taking & grading
│   │   ├── files/upload/       # File upload handler
│   │   └── ocr/                # Legacy OCR (unused)
│   ├── exam/[id]/              # Exam taking page
│   ├── grading/[id]/           # Grading results page
│   ├── shared/exam/[share_id]/ # Shared exam view
│   └── page.tsx                # Home page
├── components/                  # React components
│   └── exam/
│       └── NavigationDots.tsx  # Progress indicator
├── constants/                   # Design system
│   ├── design-tokens.ts        # Colors, typography, spacing
│   ├── exam-ui.ts             # UI text constants
│   └── exam-icons.ts          # Icon constants
├── lib/                        # Core business logic
│   ├── services/              # Service layer
│   │   ├── mobile-api-service.ts
│   │   ├── question-generator-service.ts
│   │   └── grading-service.ts
│   ├── utils/                 # Utilities
│   │   ├── question-shuffler.ts  # Fisher-Yates shuffling
│   │   └── database-manager.ts
│   ├── gemini.ts             # Gemini API integration
│   ├── supabase.ts           # Database client
│   └── config.ts             # Exam generation prompts
└── types/
    └── index.ts              # TypeScript definitions
```

## API Endpoints

### Primary Mobile API

**POST `/api/mobile/exam-questions`** - Generate exam from images
- **Input:** Multipart form data with images + optional metadata
- **Output:** Exam questions + web URLs for taking/grading
- **Used by:** Flutter mobile app

```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@textbook-page.jpg" \
  -F "category=mathematics" \
  -F "grade=5" \
  -F "language=fi"
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
- **Powered by:** Gemini 2.5 Flash-Lite
- **Prompt System:** Category-aware prompts (mathematics, core_academics, language_studies)
- **Output:** 15 questions per exam with explanations
- **Cost:** ~$0.001 per exam generation

**Active Prompt:** `getCategoryAwarePrompt()` in `/src/lib/config.ts:196-232`
- **Primary prompt** used by mobile API endpoint
- Takes `category`, `grade`, and `language` parameters
- ⚠️ **Known Limitation:** `subject` parameter is sent by mobile app but NOT injected into prompt
  - Example: Sending `subject=Physics` results in generic prompt: "Subject area: Science, history, geography, biology, physics, chemistry..."
  - Only `category` (core_academics, mathematics, language_studies) determines subject description
  - `subject` is stored in database but doesn't guide question generation

**Unused Prompts in config.ts:**
- `DEFAULT_EXAM_GENERATION` (lines 103-124) - Basic fallback, not called
- `getSimplifiedCategoryPrompt()` (lines 158-194) - Defined but never used
- `OCR_EXTRACTION` (lines 126-154) - Legacy OCR, not used
- `getLanguageStudiesPrompt()` (lines 235-300) - Only for `category=language_studies`

**Prompt Optimization:**
- Variant 4 implementation (100% quality, 35% size reduction)
- Few-shot learning with Finnish examples
- Answer format validation (text vs letter format)
- No image references (knowledge-based questions only)

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

### Generate Exam Locally

```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5"
```

### Test Prompt Variants

```bash
npx tsx test-prompt-variants.ts assets/images/test-image.jpg
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

### "Exam URLs point to wrong domain"
**Solution:** Check `NEXT_PUBLIC_APP_URL` in `.env.local`
- Production: `https://exam-generator.vercel.app`
- Local: `http://localhost:3001`

### "Gemini API errors (503)"
**Solution:** API overload - automatic retry logic will handle it
- Check `GEMINI_API_KEY` is set correctly
- Review `/prompttests/` for logged prompts

### "TypeScript build errors in Vercel"
**Solution:** Always run `npm run build` locally before pushing
- Dev mode doesn't catch all type errors
- Production build enforces strict checking

### "Can't find exam in database"
**Solution:**
- Verify Supabase configuration
- Check if exam created with system user (for anonymous requests)
- Confirm `share_id` is correct

### "Mobile app can't connect"
**Solution:** CORS is enabled for all origins. Verify endpoint URL and ensure HTTPS in production.

## Important Notes

### Text Extraction
- All text extraction via Gemini AI (no traditional OCR libraries)
- "OCR" naming in code is legacy/misleading

### Constraints
- **Images:** Max 20 per web request, 5 per mobile request
- **File Size:** Max 10MB per image
- **Formats:** JPEG, PNG, WebP, HEIC

### Authentication
- Mobile API supports optional authentication
- Creates system user for anonymous requests

### Storage
- Temporary file storage only (`/tmp` on Vercel, `uploads/` locally)
- Auto-cleanup after processing

### Finnish Education Context
- Grades 1-9 (peruskoulu)
- Curriculum-aligned question difficulty

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

## For Claude Code / AI Assistants

When working on this project:

1. **Read First:**
   - This README for overview
   - `/PROJECT_OVERVIEW.md` for detailed context
   - `/CLAUDE.md` for specific instructions

2. **Development Rules:**
   - ✅ Always run `npm run build` before committing
   - ✅ Use Gemini for text extraction (no OCR libraries)
   - ✅ Test with Finnish content when possible
   - ✅ Maintain mobile API backward compatibility
   - ❌ Never modify API keys in `.env.local`
   - ❌ Never create traditional OCR implementations

3. **Code Standards:**
   - TypeScript strict mode
   - Inline styles with design tokens (no Tailwind in new components)
   - Service layer architecture for business logic
   - Comprehensive error handling

4. **Testing:**
   - Use sample images from `/assets/images/`
   - Test mobile API with curl or Postman
   - Verify production build succeeds

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
