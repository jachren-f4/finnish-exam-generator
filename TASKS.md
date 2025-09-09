# OCR + Compression Web App - Development Tasks

## Milestone 1: Project Setup & Upload Functionality

### 1.1 Initial Project Setup
- [x] Initialize Next.js project with TypeScript
- [x] Set up project structure (components, pages, api, types, utils)
- [x] Configure ESLint and TypeScript strict mode
- [x] Install required dependencies (multer, formidable, etc.)
- [x] Set up environment variables for GEMINI_API_KEY
- [x] Create basic layout and styling system

### 1.2 File Upload System
- [x] Create file upload API endpoint (`POST /api/files/upload`)
- [x] Implement file validation (JPEG, PNG, WebP, HEIC)
- [x] Add file size validation (max 10MB per file)
- [x] Implement batch upload limit (max 20 files)
- [x] Create file metadata extraction (dimensions, mime type)
- [x] Set up temporary file storage with cleanup
- [ ] Add upload progress tracking

### 1.3 Frontend Upload Interface
- [x] Create drag-and-drop file upload component
- [x] Add file selection interface with preview
- [x] Implement upload progress indicators
- [x] Add file validation feedback
- [x] Create file list with remove functionality
- [x] Add upload constraints display (file types, sizes, limits)

## Milestone 2: Gemini API Integration

### 2.1 Gemini API Setup
- [x] Install Google AI SDK
- [x] Create Gemini API client configuration
- [x] Implement API key validation
- [x] Set up error handling for API failures
- [ ] Create rate limiting logic if needed

### 2.2 OCR + Compression Prompt Engineering
- [x] Design single-prompt for OCR + directory compression
- [x] Define JSON schema for Gemini response validation
- [x] Implement prompt with image encoding
- [x] Add fallback handling for invalid JSON responses
- [ ] Test prompt with various image types and layouts

### 2.3 Job Management System
- [x] Create job data structures and types
- [x] Implement in-memory job storage
- [x] Create job ID generation system
- [x] Add job status tracking (pending, processing, completed, failed)
- [x] Implement job cleanup/expiration logic

### 2.4 OCR Processing API
- [x] Create job creation endpoint (`POST /api/ocr/jobs`)
- [x] Implement job status endpoint (`GET /api/ocr/jobs/{id}`)
- [x] Create results retrieval endpoint (`GET /api/ocr/jobs/{id}/results`)
- [x] Add proper error handling and status codes
- [ ] Implement concurrent job processing limits

## Milestone 3: Results Display & Export

### 3.1 Directory Compression Schema
- [x] Define TypeScript types for compression schema
- [x] Implement vocabulary.tokens structure
- [x] Implement vocabulary.phrases structure
- [x] Create body.segments with references (t, p, raw, nl)
- [x] Add stats calculation (counts, compression ratio)
- [x] Validate schema compliance

### 3.2 Results Display Interface
- [x] Create results page with job status display
- [x] Implement raw OCR text viewer
- [x] Create compressed JSON structure viewer
- [ ] Add expandable/collapsible sections
- [x] Implement per-file result navigation
- [ ] Add copy-to-clipboard functionality

### 3.3 JSONL Export System
- [x] Create JSONL export endpoint (`GET /api/ocr/jobs/{id}/jsonl`)
- [x] Implement NDJSON formatting with userId and stage fields
- [x] Add file download headers and streaming
- [x] Create export button in results interface
- [ ] Add export progress indication
- [x] Handle large export files efficiently

## Milestone 4: Polish & Error Handling

### 4.1 Error Handling & Validation
- [ ] Implement comprehensive error boundaries
- [ ] Add input validation for all API endpoints
- [ ] Create user-friendly error messages
- [ ] Add loading states throughout the application
- [ ] Implement retry logic for failed requests
- [ ] Add timeout handling for long-running jobs

### 4.2 Performance Optimization
- [ ] Optimize image processing pipeline
- [ ] Implement efficient memory management for jobs
- [ ] Add request caching where appropriate
- [ ] Optimize bundle size and loading performance
- [ ] Add compression for API responses

### 4.3 Testing & Quality Assurance
- [ ] Write unit tests for utility functions
- [ ] Create integration tests for API endpoints
- [ ] Test with various image types and sizes
- [ ] Validate JSON schema compliance
- [ ] Test concurrent job processing
- [ ] Verify JSONL export format accuracy

### 4.4 Documentation & Deployment
- [ ] Update CLAUDE.md with final architecture
- [ ] Create development setup instructions
- [ ] Add API documentation
- [ ] Test localhost deployment
- [ ] Verify environment variable setup
- [ ] Create troubleshooting guide

## Technical Considerations

### Security & Validation
- API key should never be exposed to frontend
- All file uploads must be validated and sanitized
- Implement proper CORS settings for localhost
- Add request size limits to prevent abuse

### Performance Targets
- Support batch processing of up to 20 images
- Handle files up to 10MB efficiently
- Maintain responsive UI during processing
- Ensure reliable cleanup of temporary files

### Error Scenarios to Handle
- Invalid image formats or corrupted files
- Gemini API failures or timeouts
- Network connectivity issues
- Invalid JSON responses from Gemini
- Memory limits with large batch jobs
- Concurrent access to job data

## Success Criteria
- [x] User can upload multiple images via drag-and-drop
- [x] Single Gemini prompt processes OCR + compression
- [x] Results display both raw text and compressed JSON
- [x] JSONL export works correctly with proper schema
- [ ] Application handles edge cases gracefully
- [ ] Performance meets requirements for batch processing