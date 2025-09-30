# Project Overview: Finnish Exam Generator (ExamGenie)

## Executive Summary
This is a full-stack web application that generates Finnish language educational exams from Swedish textbook images using Google's Gemini 2.5 Flash-Lite AI. Originally conceived as an OCR compression tool, it has evolved into a comprehensive educational technology platform serving both web and mobile (Flutter) clients.

## Core Functionality
1. **Image-to-Exam Generation**: Upload textbook pages → AI extracts content → Generates grade-appropriate exam questions
2. **Multi-Language Support**: Processes Swedish source material → Generates Finnish exams
3. **Mobile API**: RESTful API for Flutter app integration with exam generation and grading
4. **Exam Management**: Create, store, share, and grade exams with AI-powered evaluation

## Current URLs and Deployment
- **Production**: https://exam-generator.vercel.app
- **Local Development**: http://localhost:3001 (configurable)
- **GitHub Repository**: https://github.com/jachren-f4/finnish-exam-generator.git

## Technology Stack

### Frontend
- **Framework**: Next.js 15.0.3 with React 18
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.3.0
- **Deployment**: Vercel

### Backend
- **Runtime**: Node.js with Next.js API Routes
- **AI Integration**: Google Gemini 2.5 Flash-Lite (gemini-2.0-flash-exp)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **File Storage**: Temporary local storage (/tmp)

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes configurations available
- **Monitoring**: Prometheus + Grafana setup
- **CI/CD**: Vercel automatic deployments

## Project Structure

```
/gemini-ocr/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API endpoints
│   │   │   ├── mobile/         # Mobile-specific endpoints
│   │   │   ├── ocr/           # Legacy OCR endpoints (unused)
│   │   │   ├── exams/         # Exam management
│   │   │   ├── files/         # File upload handling
│   │   │   └── health/        # Health checks
│   │   ├── exam/[id]/         # Exam taking interface
│   │   ├── grading/[id]/      # Grading results page
│   │   └── results/[id]/      # OCR results (legacy)
│   ├── components/             # React components
│   ├── lib/                   # Core business logic
│   │   ├── services/          # Service layer
│   │   ├── utils/             # Utilities
│   │   ├── monitoring/        # Logging and monitoring
│   │   └── middleware/        # Request processing
│   └── types/                 # TypeScript definitions
├── docs/                      # Documentation
│   └── api/                   # API documentation
├── k8s/                       # Kubernetes configs
├── monitoring/                # Prometheus/Grafana
├── supabase/                  # Database migrations
└── assets/                    # Test images and samples
```

## Key API Endpoints

### Primary Mobile API
**`POST /api/mobile/exam-questions`**
- **Purpose**: Generate exam from images (main endpoint)
- **Input**: Images + optional category/subject/grade
- **Output**: Exam questions + URLs for web interface
- **Used by**: Flutter mobile app

### Supporting Endpoints
- `POST /api/files/upload` - Handle file uploads
- `POST /api/exams/create` - Create new exam (authenticated)
- `GET /api/exam/[id]` - Retrieve exam for taking
- `GET /api/exam/[id]/grade` - Get grading results
- `GET /api/health` - System health check

### Legacy/Unused Endpoints
- `/api/ocr/*` - Original OCR endpoints (not actively used)

## Environment Configuration

### Required Environment Variables (.env.local)
```bash
# Gemini API (Required)
GEMINI_API_KEY=your_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Application URL (Important!)
NEXT_PUBLIC_APP_URL=https://exam-generator.vercel.app  # Or http://localhost:3001 for local

# Optional
ENABLE_PROMPT_LOGGING=true  # For development debugging
```

## Database Schema

### Main Tables
- **examgenie_exams**: Exam metadata and questions
- **examgenie_questions**: Individual exam questions
- **students**: Student profiles
- **users**: Authentication (managed by Supabase)

## How the System Works

### 1. Image Processing Flow
```
Client uploads images →
Server validates (max 20 files, 10MB each) →
Convert to base64 →
Send to Gemini with prompt →
Receive JSON with questions
```

### 2. Prompt System
- **Default**: Uses category-aware prompts (mathematics, core_academics, language_studies)
- **Fallback**: If no category specified, defaults to 'core_academics'
- **Custom**: Supports custom prompts for specific requirements

### 3. Question Generation
- Gemini analyzes educational content
- Generates 10 multiple-choice questions
- Includes Finnish translations
- Provides explanations and correct answers

### 4. Exam Storage
- Creates exam record in database
- Generates shareable URLs
- Stores for student access and grading

## Common Development Tasks

### Start Development Server
```bash
npm run dev -- --port 3001
```

### Run Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
git push  # Automatic deployment via Vercel
```

### Test Mobile API Locally
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@test.jpg" \
  -F "subject=matematiikka" \
  -F "grade=5"
```

## Important Implementation Notes

### 1. NO Server-Side OCR
- All text extraction happens via Gemini AI
- The "OCR" naming in code is misleading/legacy
- Never implement traditional OCR - use Gemini

### 2. URL Configuration
- Exam URLs always use NEXT_PUBLIC_APP_URL
- Set to production URL even in development
- This ensures shareable links always work

### 3. Authentication
- Mobile API supports optional auth
- Creates system user for anonymous requests
- Full auth required for exam management endpoints

### 4. Cost Management
- Gemini API costs ~$0.001 per exam
- Token usage tracked and logged
- Retry logic for API failures

### 5. Finnish Education Context
- Supports grades 1-9 (peruskoulu)
- 24 supported Finnish subjects
- Questions follow Finnish curriculum standards

## Known Issues and Gotchas

1. **Legacy OCR Endpoints**: `/api/ocr/*` exist but aren't used - ignore them
2. **Port Mismatch**: Ensure NEXT_PUBLIC_APP_URL matches your runtime port
3. **HEIC Support**: Requires conversion, handled automatically
4. **File Cleanup**: Temporary files in `/tmp` - cleaned after processing
5. **System User**: Auto-created for anonymous mobile requests

## Current State (January 2025)

- ✅ Production deployment on Vercel
- ✅ Mobile API fully functional
- ✅ Finnish exam generation working
- ✅ AI grading implemented
- ✅ Multi-image support (up to 20)
- ⚠️  OCR endpoints exist but unused
- ⚠️  Some documentation refers to old "OCR + compression" purpose

## Quick Troubleshooting

### "Wrong domain in exam URLs"
- Check `NEXT_PUBLIC_APP_URL` in `.env.local`
- Should be `https://exam-generator.vercel.app` for production

### "Gemini API errors"
- Verify `GEMINI_API_KEY` is set
- Check for 503 errors (API overload) - will auto-retry

### "Can't find exam"
- Ensure Supabase is configured correctly
- Check if exam was created with system user

### "Mobile app can't connect"
- CORS is enabled for all origins
- Check if using correct endpoint URL

## Future Enhancements (Planned)

- [ ] WebSocket support for real-time updates
- [ ] Batch job processing queue
- [ ] Result caching for performance
- [ ] Multi-language question generation
- [ ] Advanced difficulty customization
- [ ] Student progress tracking
- [ ] Teacher dashboard

## Contact and Resources

- **Documentation**: `/docs/` folder in repository
- **API Docs**: `/docs/api/mobile-exam-questions-endpoint.md`
- **Test Images**: `/assets/images/`
- **Sample Exams**: `/prompttests/`

## For Claude Code/AI Assistants

When working on this project:
1. **Read this file first** for context
2. **Check CLAUDE.md** for specific instructions
3. **Never modify** `.env.local` API keys
4. **Always use** Gemini for text extraction (no OCR libraries)
5. **Test with** Finnish content when possible
6. **Maintain** backward compatibility with mobile API
7. **Document** any new endpoints in `/docs/api/`

## Development Philosophy

This project prioritizes:
- **Simplicity**: Direct Gemini integration, minimal abstractions
- **Performance**: Async processing, efficient token usage
- **Reliability**: Comprehensive error handling, retry logic
- **Compatibility**: Mobile-first API design
- **Education**: Finnish curriculum alignment

---

*Last Updated: January 2025*
*Primary Use Case: Finnish exam generation from Swedish textbooks*
*Status: Production Active*