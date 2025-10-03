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

**What it does:**
- Processes educational content from textbook images
- Generates grade-appropriate exam questions (multiple choice, true/false, short answer, fill-in-blank)
- Provides AI-powered grading with detailed feedback
- Supports multi-language content (12+ languages including Finnish, Swedish, English)
- Serves both web and mobile (Flutter) applications

**Primary Use Case:** Finnish exam generation for elementary/middle school education (grades 1-9)

**Production URL:** https://exam-generator.vercel.app

## Tech Stack

### Frontend
- **Framework:** Next.js 15.0.3 (App Router)
- **Language:** TypeScript 5
- **Styling:** Inline styles with design tokens (mobile app design system)
- **UI Components:** Custom React components

### Backend
- **Runtime:** Node.js with Next.js API Routes
- **AI:** Google Gemini 2.5 Flash-Lite (`gemini-2.0-flash-exp`)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with JWT (optional)
- **File Handling:** Formidable for multipart uploads

### Deployment
- **Platform:** Vercel
- **CI/CD:** Automatic deployment on push to main
- **Storage:** Temporary file storage in `/tmp`

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

### Supporting Endpoints

**POST `/api/files/upload`** - Handle file uploads
**GET `/api/health`** - System health check

**📚 Full API Documentation:** See `/docs/api/` directory

## Key Features

### 1. AI Question Generation
- **Powered by:** Gemini 2.5 Flash-Lite
- **Prompt System:** Category-aware prompts (mathematics, core_academics, language_studies)
- **Output:** 10 questions per exam with explanations
- **Cost:** ~$0.001 per exam generation

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
- **Design System:** Extracted from mobile app (ExamGenie Flutter app)
- **Design Tokens:** Centralized colors, typography, spacing
- **Touch Targets:** Minimum 48px for mobile browser compatibility
- **No Header Bars:** Maximizes screen space on mobile

## Design System

### Design Tokens (`/src/constants/design-tokens.ts`)

The web interface uses design tokens extracted from the mobile app for visual consistency:

```typescript
COLORS.primary.dark     // #2D2D2D - Primary UI elements
COLORS.background.primary  // #FFFFFF - Main background
COLORS.semantic.success    // #4CAF50 - Success states
TYPOGRAPHY.fontSize.xl     // 20px - Page titles
SPACING.lg                // 24px - Large spacing
RADIUS.lg                 // 16px - Large border radius
TOUCH_TARGETS.comfortable // 48px - Minimum touch size
```

### Components

**NavigationDots** (`/src/components/exam/NavigationDots.tsx`)
- Progress indicator matching mobile app
- Active, past, and future states
- Optional click navigation

## Common Tasks

### Generate Exam Locally

```bash
# Using curl
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5"

# Response includes:
# - exam_id
# - take_exam_url (web interface)
# - grading_url
# - questions array
```

### Test Prompt Variants

```bash
# Run prompt testing script
npx tsx test-prompt-variants.ts assets/images/test-image.jpg
```

### Database Migrations

```bash
# Supabase migrations in /supabase/migrations/
supabase db push
```

### View Logs

```bash
# Production logs
vercel logs

# Local development
# Check console output and /prompttests/ directory
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
**Solution:**
- CORS is enabled for all origins
- Verify endpoint URL is correct
- Check if using HTTPS in production

### "Character encoding issues (Cyrillic)"
**Solution:** Prompt Variant 4 fixes this
- Removed bilingual mixing in prompts
- Simplified constraint structure
- See `/PROMPT_VARIANTS_DOCUMENTATION.md`

## Important Notes

### 1. No Traditional OCR
- All text extraction happens via Gemini AI
- "OCR" naming in code is legacy/misleading
- Never implement traditional OCR libraries

### 2. Exam Generation Constraints
- Maximum 20 images per web request
- Maximum 5 images per mobile request
- Maximum 10MB per image
- Supported formats: JPEG, PNG, WebP, HEIC

### 3. Authentication
- Mobile API supports optional authentication
- Creates system user for anonymous requests
- Full auth required for exam management

### 4. File Storage
- Temporary storage in `/tmp` (Vercel) or `uploads/` (local)
- Auto-cleanup after processing
- No persistent file storage

### 5. Finnish Education Context
- Grades 1-9 (peruskoulu)
- 24 supported subjects
- Curriculum-aligned question difficulty

## Documentation

### For Developers
- **Project Context:** `/PROJECT_OVERVIEW.md` - Complete architecture overview
- **Development Guide:** `/CLAUDE.md` - Instructions for AI assistants
- **Prompt Documentation:** `/PROMPT_VARIANTS_DOCUMENTATION.md` - Prompt optimization journey

### API Documentation
- **Mobile Endpoints:** `/docs/api/mobile-exam-questions-endpoint.md`
- **Exam Retrieval:** `/docs/api/mobile-exam-retrieval-endpoints.md`

### Reference
- **Test Images:** `/assets/images/`
- **Sample Prompts:** `/prompttests/`
- **Mobile App Reference:** `/assets/references/mobile2.PNG`

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

- ✅ **Production Active** - Deployed at https://exam-generator.vercel.app
- ✅ **Mobile API Complete** - Full exam generation and retrieval
- ✅ **Multi-User Support** - Authentication and exam management
- ✅ **AI Grading** - Automated grading with detailed feedback
- ✅ **Answer Shuffling** - Fisher-Yates randomization implemented
- ✅ **Design System** - Mobile app visual consistency
- ✅ **Prompt Optimization** - Variant 4 (100% quality, 35% smaller)
- ⚠️ **Legacy Code** - OCR endpoints exist but unused

## License

Proprietary - All rights reserved

---

**Last Updated:** October 2025
**Repository:** https://github.com/jachren-f4/finnish-exam-generator.git
**Production:** https://exam-generator.vercel.app
