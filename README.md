# Finnish Exam Question Generator

A Next.js web application that processes textbook images using Google's Gemini 2.5 Flash-Lite API to generate Finnish exam questions for elementary/middle school students.

## Overview

This app transforms Swedish textbook images into structured Finnish exam questions with multiple question types (multiple choice, true/false, short answer). Originally built for OCR compression, it has evolved into an educational tool for Finnish students learning from Swedish materials.

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **AI Processing:** Google Gemini 2.5 Flash-Lite API
- **File Handling:** Formidable for uploads
- **Storage:** In-memory job storage (development)

## Key Features

- 📚 **Textbook Image Processing** - Upload and process Swedish textbook pages
- 🧠 **AI Question Generation** - Generate 10 Finnish exam questions per image set
- 💰 **Cost Tracking** - Real-time Gemini API usage and cost monitoring
- 📱 **Mobile API** - Dedicated endpoint for Flutter app integration
- 📄 **JSONL Export** - Export questions in structured format
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
GEMINI_API_KEY=your_gemini_api_key_here
```

## Installation & Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the web interface.

## API Endpoints

### Web Interface
- `POST /api/ocr/jobs` - Create processing job
- `GET /api/ocr/jobs/[id]/status` - Check job status
- `GET /api/ocr/jobs/[id]/results` - Get completed results

### Mobile API
- `POST /api/mobile/exam-questions` - Process images directly (for Flutter app)

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

1. Set up Gemini API key in environment
2. Review `/src/lib/gemini.ts` for core AI integration
3. Check `/src/app/api/mobile/exam-questions/route.ts` for mobile API
4. Test with sample textbook images
5. Monitor console logs for detailed processing information

The app is production-ready for the core functionality but uses in-memory storage for development simplicity.