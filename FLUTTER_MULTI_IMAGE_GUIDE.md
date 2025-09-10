# Flutter Multi-Image Upload Request Specification

## HTTP Request Specification

### Endpoint
```
POST /api/mobile/exam-questions
```

### Headers
```
Content-Type: multipart/form-data
```

### Request Body (multipart/form-data)

#### Required Fields
```
images: File (can be multiple files with same field name)
```

#### Optional Fields
```
prompt: String (custom prompt text)
```

### Example Request Structure
```
POST /api/mobile/exam-questions HTTP/1.1
Host: your-domain.com
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="images"; filename="image1.jpg"
Content-Type: image/jpeg

[Binary image data for image 1]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="images"; filename="image2.jpg"
Content-Type: image/jpeg

[Binary image data for image 2]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="images"; filename="image3.jpg"
Content-Type: image/jpeg

[Binary image data for image 3]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="prompt"

Your custom prompt text here (optional)
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

## Critical Requirements

### ✅ **Field Naming**
- **MUST use**: `images` (not `images[]`, `image`, or `files`)
- **Multiple files**: Use same field name `images` for each file
- **Prompt field**: Use `prompt` (not `custom_prompt`)

### ✅ **File Specifications**
- **Format**: JPEG recommended (HEIC/HEIF converted to JPEG)
- **Size limit**: 10MB per image maximum
- **Count limit**: 1-20 images per request
- **Resolution**: 2000px width optimal (maintains aspect ratio)
- **Quality**: 75% JPEG compression for OCR optimization

### ✅ **Request Limits**
- **Total size**: Up to 100MB per request
- **Timeout**: Allow 5+ minutes for processing
- **Concurrent**: One request at a time per user

## Response Format
```json
{
  "success": true,
  "data": {
    "metadata": {
      "processingTime": 15000,
      "imageCount": 5,
      "promptUsed": "custom",
      "geminiUsage": {...}
    }
  },
  "exam_url": "https://exam-generator.vercel.app/exam/abc123",
  "exam_id": "abc123", 
  "grading_url": "https://exam-generator.vercel.app/grading/abc123"
}
```

## Flutter Implementation Notes

### FormData Construction
- Add multiple files using same field name `images`
- Each file should have unique filename
- Set proper MIME type (`image/jpeg`)
- Include optional prompt field if provided

### Error Handling
- **400**: Invalid request format or file size
- **413**: Request too large
- **500**: Server processing error
- **Timeout**: Processing took too long

This specification ensures compatibility with the existing backend while supporting multi-image uploads.