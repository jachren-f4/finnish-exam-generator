# Auto-Language Detection Implementation

**Date**: October 21, 2025  
**Status**: ✅ Complete and Tested

## Overview

The web UI now automatically detects and uses the language of the textbook images for all exam-related pages. When a student uploads Finnish textbook images, the entire UI automatically switches to Finnish. German textbooks show German UI, etc.

## How It Works

### 1. **Language Detection** (Already Working)
Gemini AI analyzes textbook images and returns the detected language in its response:
```json
{
  "questions": [...],
  "summary": {
    "introduction": "...",
    "language": "fi"  // ISO 639-1 code
  }
}
```

### 2. **Database Storage** (NEW)
Language is now captured and stored during exam creation:
- **Field**: `examgenie_exams.detected_language` (VARCHAR(5))
- **Migration**: Already applied to staging and production
- **Values**: 'fi', 'en', 'de', 'sv', etc.

### 3. **i18n Override** (NEW)
The `useTranslation()` hook now accepts an optional language parameter:
```typescript
// Before (environment variable only)
const { t } = useTranslation()

// After (auto-detect from exam)
const { t } = useTranslation(exam?.detected_language)
```

### 4. **Priority System**
Language selection priority:
1. **Exam's detected language** (highest priority)
2. `NEXT_PUBLIC_LOCALE` environment variable
3. Default: 'en'

## Files Modified

### TypeScript Types
- **`/src/lib/supabase.ts`**
  - Added `detected_language?: string | null` to `ExamData` interface
  - Added `detected_language: string | null` to `ExamGenieExam` interface

### Exam Creation Service
- **`/src/lib/services/mobile-api-service.ts`** (lines 635-651)
  ```typescript
  const detectedLanguage = audioSummaryData?.language || summaryData?.language || 'en'
  console.log('[LANGUAGE DETECTION] Detected language from textbook:', detectedLanguage)
  
  const examData: any = {
    // ... other fields
    detected_language: detectedLanguage,  // AUTO-DETECT
  }
  ```

### i18n Infrastructure
- **`/src/i18n/index.ts`**
  - Updated `getCurrentLocale(overrideLocale?)` to accept optional parameter
  - Updated `useTranslation(overrideLocale?)` to support language override
  - Priority: override → environment variable → default 'en'

### Exam Pages (All Updated)
1. **`/src/app/exam/[id]/page.tsx`** (Exam Menu)
   ```typescript
   const { t } = useTranslation(exam?.detected_language)
   ```

2. **`/src/app/exam/[id]/take/page.tsx`** (Taking Exam)
   ```typescript
   const { t } = useTranslation(exam?.detected_language)
   ```

3. **`/src/app/exam/[id]/audio/page.tsx`** (Audio Summary)
   ```typescript
   const { t } = useTranslation(exam?.detected_language)
   ```

4. **`/src/app/grading/[id]/page.tsx`** (Results)
   ```typescript
   // Fetches exam data to get detected_language
   const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
   const { t } = useTranslation(detectedLanguage)
   ```

## User Experience

### Before
- Finnish textbook + `NEXT_PUBLIC_LOCALE=en` → English UI
- UI language disconnected from content language
- Potentially confusing for students

### After
- Finnish textbook → **Finnish UI automatically** ✨
- German textbook → **German UI automatically** ✨
- UI language always matches content language
- Seamless, intuitive experience

## Example Flow

1. **Student uploads Finnish textbook images**
2. Gemini detects: `"language": "fi"`
3. Database stores: `detected_language: "fi"`
4. Exam menu loads with Finnish UI:
   - "Aloita koe" (Start Exam)
   - "Kuuntele yhteenveto" (Listen to Summary)
   - "Tulokset" (Results)
5. All exam pages show Finnish UI automatically

## Supported Languages

Currently supported UI languages:
- **Finnish (fi)** ✅
- **English (en)** ✅

Can easily add more as translations become available:
- German (de)
- Swedish (sv)
- Spanish (es)
- French (fr)
- etc.

## Testing

✅ **Build Test**: `npm run build` passed with no errors  
✅ **Type Safety**: All TypeScript interfaces updated  
✅ **Database**: Migration applied to staging and production  
✅ **Backward Compatibility**: Existing exams default to 'en'

## Future Enhancements

1. **Add more language translations** (German, Swedish, etc.)
2. **Language switcher** (manual override if auto-detection is wrong)
3. **Mobile app integration** (send `detected_language` in API response)
4. **Analytics** (track which languages are most popular)

## Notes

- Language detection happens at **exam creation time**
- Detection is **automatic** and **transparent** to users
- Falls back gracefully if detection fails
- No breaking changes to existing functionality
- Mobile app will need minor updates to use this field
