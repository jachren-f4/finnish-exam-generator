# Flutter Integration Guide: Exam Question Generator API

## API Overview

**Endpoint:** `POST /api/mobile/exam-questions`  
**Base URL:** `http://localhost:3000` (development) / `https://your-vercel-app.vercel.app` (production)  
**Content-Type:** `multipart/form-data`

## Required Flutter Dependencies

Your Flutter app will need these packages:
- `http` for API requests
- `image_picker` for camera/gallery access
- `path` for file path utilities

## API Request Structure

### Multipart Form Data Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | File[] | ✅ Yes | 1-5 image files from textbook pages |
| `prompt` | String | ❌ Optional | Custom exam generation prompt (falls back to default if empty) |

### Image Requirements

- **Supported formats:** JPG, PNG, WebP
- **Maximum files:** 5 images per request
- **Recommended size:** < 5MB per image for optimal processing speed
- **Source:** Camera capture or gallery selection of textbook pages

## Implementation Requirements

### 1. Image Selection Service

Create a service class that handles:
- **Camera capture:** Single image with quality settings (maxWidth: 1920, maxHeight: 1080, imageQuality: 85)
- **Gallery selection:** Multiple images with same quality settings
- **Image filtering:** Only allow image file types
- **Count limiting:** Maximum 5 images per request
- **File conversion:** Convert XFile objects to File objects for HTTP requests

### 2. API Communication Service

Implement HTTP client functionality:
- **Multipart request creation:** Use http.MultipartRequest for file uploads
- **Image attachment:** Add each image file with field name "images"
- **Prompt handling:** Add custom prompt to request fields if provided and not empty
- **Response parsing:** Handle JSON response and convert to typed objects
- **Error handling:** Proper exception handling for network and API errors

### 3. Data Models

Create data classes for type-safe response handling:

**ExamQuestionResponse:**
- success (boolean)
- data (ExamData object or null)
- error (string or null)
- details (string or null)

**ExamData:**
- examQuestions (ExamQuestions object)
- metadata (RequestMetadata object)

**ExamQuestions:**
- questions (List of Question objects)
- topic (string)
- difficulty (string)

**Question:**
- id (integer)
- type (string: 'multiple_choice', 'true_false', 'short_answer', 'text_analysis')
- question (string)
- options (List of strings, nullable for multiple choice)
- correctAnswer (dynamic - string, boolean, or other types)
- explanation (string, nullable)
- content (string, nullable for text analysis type)
- Helper methods: isMultipleChoice, isTrueFalse, isShortAnswer, isTextAnalysis

**RequestMetadata:**
- processingTime (integer)
- imageCount (integer)
- promptUsed (string: 'custom' or 'default')
- geminiUsage (GeminiUsage object, nullable)

**GeminiUsage:**
- promptTokenCount (integer)
- candidatesTokenCount (integer)
- totalTokenCount (integer)
- estimatedCost (double)
- inputCost (double)
- outputCost (double)
- model (string)

### 4. UI Components

Build user interface with these features:

**Image Selection Screen:**
- Button to select images from gallery
- Button to capture image from camera
- Display selected images count (X/5 format)
- Image preview thumbnails
- Remove individual images functionality

**Prompt Input:**
- Multi-line text field for custom prompt
- Placeholder text explaining default behavior
- Optional field that falls back to server default when empty

**Processing Screen:**
- Loading indicator during API call
- Processing status message
- Cancel button for long requests
- Progress indication if possible

**Results Display:**
- Question cards with type-specific formatting
- Multiple choice: question + options list + correct answer
- True/false: statement + correct answer + explanation
- Short answer: question + expected answer + explanation
- Text analysis: question + extracted content
- Processing metadata display (time, cost, token usage)
- Topic and difficulty level display

### 5. Error Handling Strategy

Implement comprehensive error handling:

**Network Errors:**
- SocketException: "Network connection error. Please check your internet."
- TimeoutException: "Request timed out. Please try again."
- FormatException: "Invalid response format from server."

**API Errors (HTTP status codes):**
- 400 Bad Request: Show specific error message from response
- 404 Not Found: "Service temporarily unavailable"
- 500 Internal Server Error: "Server error occurred. Please try again."

**Validation Errors:**
- No images selected: Prevent API call, show user message
- Too many images: Limit selection to 5 images maximum
- Invalid image format: Filter during selection process

## API Response Format

### Successful Response Structure
```
{
  "success": true,
  "data": {
    "examQuestions": {
      "questions": [
        {
          "id": 1,
          "type": "multiple_choice",
          "question": "Mikä on pääkaupunki Ruotsissa?",
          "options": ["Tukholma", "Göteborg", "Malmö", "Uppsala"],
          "correct_answer": "Tukholma",
          "explanation": "Tukholma on Ruotsin pääkaupunki ja suurin kaupunki."
        }
      ],
      "topic": "Ruotsin maantieto",
      "difficulty": "elementary"
    },
    "metadata": {
      "processingTime": 3500,
      "imageCount": 2,
      "promptUsed": "default",
      "geminiUsage": {...}
    }
  }
}
```

### Error Response Structure
```
{
  "success": false,
  "error": "Maximum 5 images allowed per request",
  "details": "Request contained 7 images, but limit is 5"
}
```

## Performance Optimization Requirements

### Image Preprocessing
- Resize images to maximum 1920x1080 pixels before upload
- Compress with 85% quality for optimal balance between quality and size
- Implement client-side image cropping to focus on text areas if needed

### Network Optimization
- Implement retry logic with exponential backoff for failed requests
- Show upload progress to user during multipart upload
- Cache results locally to avoid re-processing identical content
- Implement request timeout with appropriate duration

### User Experience
- Display processing status and estimated completion time
- Allow users to cancel long-running requests
- Implement offline queue for requests when network is unavailable
- Show clear loading states during all async operations

## Security and Validation

- No API keys required on client side (handled by server)
- Validate file types before upload (JPG, PNG, WebP only)
- Limit file sizes to prevent oversized uploads
- Handle CORS properly for cross-origin requests
- Sanitize user input in custom prompts before sending

## Testing Requirements

Your app should be tested for:
- Single image upload functionality
- Multiple image upload (2-5 images)
- Custom prompt handling
- Default prompt fallback (empty/null prompt)
- Error handling for oversized requests (>5 images)
- Network timeout scenarios
- Malformed or corrupted image files
- Response parsing for all question types
- UI state updates during loading phases
- Proper error message display to users

## Integration Notes

- The API processes all uploaded images together as a single batch
- Server automatically cleans up uploaded files after processing
- Response includes both the generated questions and processing metadata
- Custom prompts override the default Finnish exam question generation template
- All questions are returned in Finnish language regardless of input image language