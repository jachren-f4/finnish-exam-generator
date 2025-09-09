# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is an OCR + Compression Web App built with Next.js that processes images using Google's Gemini 2.5 Flash-Lite API. The app performs OCR text extraction and directory-based compression in a single API call to Gemini.

## Architecture
- **Frontend**: Next.js React application with file upload interface
- **Backend**: Next.js API routes handling file uploads and Gemini API integration  
- **AI Processing**: Single-prompt Gemini 2.5 Flash-Lite requests for OCR + compression
- **Storage**: In-memory job and result storage (no persistence)
- **Export**: JSONL format only

## Key Components
- File upload handler supporting JPEG, PNG, WebP, HEIC (max 10MB, 20 files per job)
- Gemini API integration with structured JSON response validation
- Directory compression schema with vocabulary tokens and phrases
- Results viewer with raw text and compressed JSON display
- JSONL export functionality

## API Endpoints Structure
- `POST /api/files/upload` - Handle image uploads
- `POST /api/ocr/jobs` - Create OCR+compression jobs
- `GET /api/ocr/jobs/{id}` - Get job status
- `GET /api/ocr/jobs/{id}/results` - Retrieve results
- `GET /api/ocr/jobs/{id}/jsonl` - Export as JSONL

## Directory Compression Schema
Results must include:
- `vocabulary.tokens`: most frequent tokens
- `vocabulary.phrases`: repeated multi-word phrases  
- `body.segments`: ordered references (t, p, raw, nl)
- `stats`: counts and compression ratio

## Environment Configuration
- `GEMINI_API_KEY`: Required for Gemini API access
- App runs on localhost only
- No authentication or persistence required

## Development Commands
Standard Next.js development workflow:
- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript validation

## Constraints
- Maximum 20 files per job
- Maximum 10MB per file
- Localhost deployment only
- JSONL export format only (no ZIP)
- JSON responses must match defined schema
- No history persistence between sessions