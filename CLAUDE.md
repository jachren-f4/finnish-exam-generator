# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Identity

**ExamGenie** - AI-powered educational platform that transforms textbook images into structured exam questions using Google's Gemini 2.5 Flash-Lite API. Supports both web and mobile (Flutter) clients.

**Production URL:** https://examgenie.app

## Critical Rules - ALWAYS Follow These

### Before Every Push
- ❌ **NEVER push without running `npm run build` first**
  - Dev mode misses type errors that break production
  - Build failures mean DO NOT push

### Branch Strategy
- ✅ **Default branch: `staging`** (push directly)
- ✅ **Production: `main`** (PR only, requires build passing)
- ✅ Feature branches: Auto-preview URLs

### Security
- ❌ NEVER expose `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to client
- ❌ NEVER modify `.env.local` API keys without explicit user request
- ❌ NEVER skip rate limiting checks on staging/production
- ✅ All API keys must remain server-side only

### Architecture Constraints
- ❌ NEVER use OCR libraries - Gemini AI only (legacy naming)
- ❌ NEVER move KaTeX scripts from `layout.tsx` to page-level (breaks client navigation)
- ❌ NEVER modify core prompt structure without user approval
- ✅ ALWAYS use service layer pattern (no direct DB calls in API routes)

## Critical Knowledge - Common Pitfalls

### Parameter Usage (Important!)
- **`subject` parameter**: Stored in DB but **NOT used in prompts** (only `category` matters)
- **`language` parameter**: Accepted by API but **NOT used in prompts** (Gemini auto-detects from images)
- **`category` parameter**: THIS is what routes to correct prompt service
  - `"mathematics"` → math-exam-service.ts (LaTeX, 3-level validation)
  - Everything else → standard prompt via getCategoryAwarePrompt()

### Mathematics Special Handling
- ✅ `category=mathematics` automatically routes to specialized math service
- ✅ Math service uses temperature retry: 0 → 0.3 → 0.5
- ✅ Requires 90+ validation score (out of 135 typical)
- ✅ LaTeX notation: `$x^2$` (inline), `$$...$$` (block)
- ✅ Math audio summaries use spoken notation (e.g., "x squared" not "$x^2$")
- ❌ KaTeX scripts MUST be in `/src/app/layout.tsx` with `strategy="beforeInteractive"`

### Math Audio Summaries
**Files:** `config.ts:getMathPrompt()`, `math-exam-service.ts`, `mobile-api-service.ts:generateMathAudioSummaryAsync()`

**Rules:**
- ✅ Math exams MUST flatten `audio_summary` into `summary_text` field (don't leave NULL)
- ✅ Audio generation is async and non-blocking • Failures are silent (check `[Math Audio]` logs)
- ✅ Spoken notation only in audio (prompt converts LaTeX → speech)
- ✅ Database fields: `summary_text` (flattened), `audio_url` (MP3), `audio_metadata.audioType: 'math_summary'`

### Audio Generation
- ✅ Google Cloud TTS with 0.8 speaking rate
- ✅ Byte-based truncation: 5000-byte limit, uses `Buffer.byteLength()`
- ✅ 80% listening validation prevents reward gaming
- ✅ Math audio uses spoken notation (converts LaTeX to human-readable)
- ❌ Rewards only given after 80% of audio duration played

### Answer Shuffling
- ✅ Fisher-Yates algorithm in `/src/lib/utils/question-shuffler.ts`
- ✅ Shuffles AFTER Gemini generates, BEFORE DB storage
- ✅ Prevents correct answers always in position A

### Rate Limiting
- ✅ 10 req/hour, 50 req/day per user
- ✅ Requires `student_id` parameter on staging/production
- ✅ Falls back to `user_id` for backward compatibility
- ⚠️ Localhost bypasses rate limiting (RLS policies)

### Image Requirements
- ✅ Min 3 images recommended for graph/chart-heavy content
- ✅ Single text-heavy images work well
- ❌ 2 images insufficient for graph-heavy content

## Tech Stack

### Core
- Next.js 15.0.3 (App Router) + TypeScript 5
- Gemini 2.5 Flash-Lite (temperature: 0 for deterministic output)
- Supabase (PostgreSQL + Auth)
- Google Cloud TTS
- Vercel deployment

### Frontend
- Inline styles with design tokens from mobile app
- Custom React components (no UI library)
- KaTeX 0.16.9 for LaTeX rendering

## File Locations - Quick Reference

### Key Configuration
- **Prompts**: `/src/lib/config.ts` (getCategoryAwarePrompt function)
- **Math Service**: `/src/lib/services/math-exam-service.ts`
- **Design Tokens**: `/src/constants/design-tokens.ts`
- **Question Shuffler**: `/src/lib/utils/question-shuffler.ts`
- **Genie Dollars**: `/src/lib/utils/genie-dollars.ts`
- **Gemini Client**: `/src/lib/gemini.ts`
- **Supabase Client**: `/src/lib/supabase.ts`

### API Routes
- **Mobile Exam Gen**: `/src/app/api/mobile/exam-questions/route.ts`
- **Exam Retrieval**: `/src/app/api/exam/[id]/route.ts`
- **Grading**: `/src/app/api/exam/[id]/submit/route.ts`
- **File Upload**: `/src/app/api/files/upload/route.ts`

### Pages
- **Exam Menu Hub**: `/src/app/exam/[id]/page.tsx`
- **Take Exam**: `/src/app/exam/[id]/take/page.tsx`
- **Audio Player**: `/src/app/exam/[id]/audio/page.tsx`

## Testing

### Test Student ID (Staging)
Use this for rate limit testing: `fc495b10-c771-4bd1-8bb4-b2c5003b9613`

### Generate Exam Locally
```bash
# Localhost (no student_id needed)
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5"

# Staging (requires student_id)
curl -X POST https://exam-generator-staging.vercel.app/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5" \
  -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"
```

### Test with Mathematics
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math-test.jpg" \
  -F "category=mathematics" \
  -F "grade=5"
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Wrong exam URLs | Check `NEXT_PUBLIC_APP_URL` in `.env.local` |
| TypeScript build errors | Always run `npm run build` before pushing |
| localhost CURL fails | Use staging URL (RLS policies block localhost) |
| Staging "user_id required" | Add `-F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"` |
| Audio not generating | Check `GOOGLE_CLOUD_CREDENTIALS_JSON` validity |
| Math audio missing | Check `[Math Audio]` logs • Audio fails silently • Verify `GOOGLE_CLOUD_CREDENTIALS_JSON` |
| Math equations not rendering | Verify KaTeX scripts in `layout.tsx` not page-level |
| Questions reference images | Need minimum 3 images for graph-heavy content |

## Architecture Decisions - Don't Break These

### Exam Generation
- 15 questions per exam (configurable via `EXAM_CONFIG.DEFAULT_QUESTION_COUNT`)
- Temperature 0 for deterministic output (reduces hallucinations)
- Cost: ~$0.001 per exam generation
- 100% multiple choice format

### Genie Dollars System
- 5 dollars for audio completion (80% threshold)
- 10 dollars for exam completion
- 12-hour spaced repetition intervals
- localStorage only (no DB persistence)

### Exam Menu Architecture
- Hub page at `/exam/[id]` with cards for Audio/Exam/Results
- 3×2 ultra-compact grid layout
- Audio card only shows if `audio_url` exists
- Results card appears after `completed_at` is set

### Database
- Supabase PostgreSQL
- Temporary file storage (`/tmp` on Vercel, `uploads/` locally)
- Audio files in Supabase Storage (public MP3 bucket)
- No exam history persistence (stateless between sessions)

## When Making Changes

### Adding New Features
1. Check if it affects mobile app compatibility
2. Maintain backward compatibility with Flutter client
3. Update relevant documentation in README.md
4. Run `npm run build` before committing

### Modifying Prompts
1. Test with Finnish content first
2. Compare outputs with `/prompttests/` samples
3. Verify no image reference questions
4. Check question distribution matches expected patterns

### UI Changes
1. Use design tokens from `/src/constants/design-tokens.ts`
2. Maintain 48px minimum touch targets for mobile
3. Test at 640px max-width (mobile first)
4. Ensure consistency with Flutter app design

## Documentation

For detailed explanations, architecture history, and comprehensive guides, see:
- **README.md** - Complete project documentation
- **/PROJECT_OVERVIEW.md** - Architecture deep dive
- **/PROMPT_VARIANTS_DOCUMENTATION.md** - Prompt optimization history
- **/EXAM-MENU-ARCHITECTURE.md** - Menu system specification
- **/docs/api/** - API endpoint documentation

## Current Status (October 2025)

✅ Production active at https://examgenie.app
✅ All core features implemented and tested
✅ Mobile app (Flutter) integrated and working
✅ Math audio summaries with spoken notation
⚠️ Legacy OCR endpoints exist but are unused (can be removed)
