# Backend Refactoring Plan

## Current Architecture Issues

### 1. Fat API Route Handler (289 lines)
- Single endpoint handling form parsing, file processing, image validation, diagnostic processing, Gemini calls, and response formatting
- Violates single responsibility principle

### 2. Large Service Files
- `exam-service.ts` (660 lines) handles creation, grading, data access, and transformations
- `gemini.ts` (391 lines) mixes OCR extraction with question generation

### 3. Code Duplication
- JSON parsing/repair logic appears in multiple places
- Cost calculation and usage tracking duplicated
- Timing/logging patterns repeated throughout
- File handling patterns repeated

### 4. Configuration Scattered
- Hard-coded URLs, pricing rates, limits, and magic numbers throughout codebase
- No centralized configuration management

### 5. Complex Parameter Lists
- `createExam()` takes 4 complex parameters including optional objects
- Multiple functions with similar parameter combinations

## Detailed Task List

## Phase 1: Configuration & Utilities Foundation

### Task 1.1: Create Centralized Configuration
**File**: `src/lib/config.ts`
- Extract all hardcoded constants from codebase:
  - Gemini model names (`gemini-2.5-flash-lite`) 
  - API pricing rates ($0.10 input, $0.40 output per 1M tokens)
  - File limits (20 images max, temp directory `/tmp`)
  - Grade scale mappings (4-10 Finnish system)
  - Base URLs (`https://exam-generator.vercel.app`)
  - Bucket names (`diagnostic-images`)
- Create typed configuration object with environment-specific overrides
- Add validation for required environment variables

### Task 1.2: JSON Processing Utilities
**File**: `src/lib/utils/json-handler.ts`
- Extract `attemptJsonRepair()` function from `gemini.ts:40-83`
- Create `extractJsonFromText()` to handle markdown/raw text parsing
- Add `safeJsonParse()` with error handling and fallbacks
- Create `validateResponseStructure()` for schema validation
- **Lines reduced**: ~43 lines removed from `gemini.ts`, ~40 from other files

### Task 1.3: Cost Calculation Utilities  
**File**: `src/lib/utils/cost-calculator.ts`
- Extract cost calculation logic from `gemini.ts:150-155` and `exam-service.ts:393-403`
- Create `calculateGeminiCost()` function with model-specific pricing
- Add `aggregateUsageMetadata()` for combining multiple API calls
- Create `formatCostDisplay()` for consistent cost formatting
- **Lines reduced**: ~20 lines from multiple files

### Task 1.4: Performance Logging Utilities
**File**: `src/lib/utils/performance-logger.ts`
- Standardize timing patterns from API route and services
- Create `createTimer()` function for consistent timing measurements
- Add `logProcessingPhase()` for step-by-step timing
- Create `logPerformanceBreakdown()` for summary reporting
- **Lines reduced**: ~30 lines of repeated logging code

### Task 1.5: File Processing Utilities
**File**: `src/lib/utils/file-handler.ts`
- Extract file validation logic from API route lines 58-78
- Create `validateImageFiles()` with MIME type detection
- Add `saveTemporaryFiles()` and `cleanupTemporaryFiles()`
- Create `convertFilesToGeminiParts()` for API preparation
- **Lines reduced**: ~50 lines from API route

## Phase 2: Service Layer Restructuring

### Task 2.1: Exam Creation Service
**File**: `src/lib/services/exam-creator.ts`
- Extract exam creation logic from `exam-service.ts:49-185` (~136 lines)
- Create `ExamCreator` class with focused responsibilities:
  - `createFromGeminiResponse()`
  - `processResponse()` 
  - `validateExamData()`
  - `prepareDatabaseInsert()`
- **Target size**: ~120 lines vs current 136 in mixed service

### Task 2.2: Exam Grading Service  
**File**: `src/lib/services/exam-grader.ts`
- Extract grading logic from `exam-service.ts:297-637` (~340 lines)
- Create `ExamGrader` class with methods:
  - `gradeExam()`
  - `gradeQuestion()` (Gemini + fallback)
  - `calculateFinalGrade()`
  - `aggregateGradingStats()`
- **Target size**: ~200 lines vs current 340 in mixed service

### Task 2.3: Exam Repository Service
**File**: `src/lib/services/exam-repository.ts`  
- Extract database operations from `exam-service.ts:187-295` (~108 lines)
- Create `ExamRepository` class with methods:
  - `findById()`
  - `create()`
  - `updateStatus()`
  - `findGradingResults()`
- **Target size**: ~100 lines vs current 108 in mixed service

### Task 2.4: OCR Service
**File**: `src/lib/services/ocr-service.ts`
- Extract text extraction from `gemini.ts:86-199` (~113 lines)  
- Create `OcrService` class with:
  - `extractText()`
  - `processImages()`
  - `validateOcrResult()`
- **Target size**: ~80 lines vs current 113 in mixed file

### Task 2.5: Question Generator Service
**File**: `src/lib/services/question-generator.ts`
- Extract question generation from `gemini.ts:201-369` (~168 lines)
- Create `QuestionGenerator` class with:
  - `generateQuestions()`
  - `processWithCustomPrompt()`
  - `validateQuestionFormat()`
- **Target size**: ~120 lines vs current 168 in mixed file

## Phase 3: API Layer Refactoring

### Task 3.1: Request Processing Middleware
**File**: `src/lib/middleware/request-processor.ts`
- Extract form parsing and validation from API route lines 16-51
- Create reusable middleware for image upload handling
- Add request validation and sanitization
- **Lines reduced**: ~35 lines from API route

### Task 3.2: Mobile API Service Layer
**File**: `src/lib/services/mobile-exam-service.ts` 
- Extract business logic from API route lines 167-264
- Create `MobileExamService` class orchestrating other services:
  - `processImageRequest()`
  - `generateExamFromImages()`
  - `formatMobileResponse()`
- **Target size**: ~100 lines of pure business logic

### Task 3.3: Refactor API Route
**File**: `src/app/api/mobile/exam-questions/route.ts`
- Reduce from current 289 lines to ~80 lines
- Focus on HTTP concerns: parsing, validation, error handling, response formatting
- Delegate business logic to service layer
- Use middleware for common processing

## Phase 4: Response & Error Handling

### Task 4.1: Unified Response System
**File**: `src/lib/utils/api-response.ts`
- Create consistent response formatting for all endpoints
- Add success/error response builders with proper status codes
- Create mobile-specific response formatter
- **Lines reduced**: ~20 lines of response formatting per endpoint

### Task 4.2: Error Management System  
**File**: `src/lib/utils/error-handler.ts`
- Create unified error handling with proper logging
- Add error classification (validation, processing, external API, database)
- Create error recovery strategies and fallbacks
- **Lines reduced**: ~30 lines of scattered error handling

## Expected Results

### Code Size Reduction
- `exam-service.ts`: 660 lines → split into 3 services (~120, ~200, ~100 lines)
- `gemini.ts`: 391 lines → split into 2 services (~80, ~120 lines) + utils
- API route: 289 lines → ~80 lines focused on HTTP concerns
- **Total reduction**: ~400 lines through elimination of duplication

### Architecture Improvements
- Clear separation of concerns with single-responsibility modules
- Centralized configuration management 
- Reusable utilities eliminating code duplication
- Service layer abstraction enabling better testing
- Consistent error handling and logging patterns

### Maintainability Gains
- Easier to locate and modify specific functionality
- Reduced cognitive load when working on individual features
- Better testability with smaller, focused units
- Consistent patterns across the codebase

## Implementation Priority

1. **Phase 1** (Foundation): Provides immediate benefits and enables other phases
2. **Phase 2** (Services): Core architectural improvement
3. **Phase 3** (API Layer): Clean up presentation layer  
4. **Phase 4** (Error Handling): Polish and consistency

## Risk Mitigation

- Implement one phase at a time to maintain working system
- Create comprehensive tests before refactoring
- Use feature flags to toggle between old and new implementations
- Maintain backward compatibility during transition