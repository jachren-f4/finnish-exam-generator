import { NextRequest, NextResponse } from 'next/server'
import { processImagesWithGemini, extractRawTextFromImages, extractTextWithTopicDetection, generateStructuredQuestions } from '@/lib/gemini'
import { FileMetadata } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import { SupabaseStorageManager } from '@/lib/storage'

const DEFAULT_EXAM_PROMPT = `Your task:
- Based on the text, generate exactly **10 exam questions in Finnish**.

CRITICAL Requirements for the questions:
- **ONLY use correct Finnish language**: All words, grammar, and sentences must be proper Finnish. Do not use Swedish, English, or made-up words.
- **Verify OCR accuracy**: If the source text contains non-Finnish words or OCR errors, interpret the context and use correct Finnish equivalents.
- **Perfect grammar**: Use correct Finnish grammar, spelling, and sentence structure. No broken fragments or incomplete sentences.
- **Topic relevance**: Only create questions directly related to the main topic and content of the text.
- **Varied question types**: Use multiple choice, true/false, short answer, fill-in-the-blank in balanced proportions.
- **Appropriate difficulty**: Target elementary/middle school students (ages 7-15).
- **Complete answers**: Include correct answers and explanations for every question.
- **SELF-CONTAINED QUESTIONS ONLY**: Every question must make complete sense without any additional context. NEVER use phrases like "in this context", "according to the text", "in the passage above", or "what does X mean here". If a question needs background information, include that information WITHIN the question itself. Transform contextual references into standalone scenarios that students can understand independently.

Output format:
Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text in Finnish",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Brief explanation in Finnish"
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "Statement in Finnish",
      "correct_answer": true,
      "explanation": "Brief explanation in Finnish"
    },
    {
      "id": 3,
      "type": "short_answer",
      "question": "Question in Finnish",
      "correct_answer": "Expected answer",
      "explanation": "Brief explanation in Finnish"
    }
  ],
  "topic": "Brief description of the main topic covered",
  "difficulty": "elementary|middle_school|high_school"
}

Important: Return only the JSON object. Do not include any additional explanations or markdown formatting.`

export async function POST(request: NextRequest) {
  try {
    console.log('=== MOBILE API ENDPOINT CALLED ===')
    
    // Parse form data
    const formData = await request.formData()
    const customPrompt = formData.get('prompt') as string
    const images = formData.getAll('images') as File[]
    const useStructuredMode = formData.get('structured_mode') === 'true' // New toggle parameter
    
    console.log('Received custom prompt:', customPrompt ? 'YES' : 'NO')
    console.log('Number of images received:', images.length)
    console.log('Processing mode:', useStructuredMode ? 'STRUCTURED (Topic-aware)' : 'LEGACY (Standard)')
    
    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      )
    }

    if (images.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 images allowed per request' },
        { status: 400 }
      )
    }

    // Use custom prompt or fallback to default
    const promptToUse = customPrompt && customPrompt.trim() !== '' ? customPrompt : DEFAULT_EXAM_PROMPT
    console.log('Using prompt type:', customPrompt && customPrompt.trim() !== '' ? 'CUSTOM' : 'DEFAULT')
    
    // Log full prompt for quality analysis and optimization
    console.log('=== FULL PROMPT SENT TO GEMINI ===')
    console.log(promptToUse)
    console.log('=== END PROMPT ===')
    console.log('Prompt length:', promptToUse.length, 'characters')

    // Process images and create file metadata
    const fileMetadataList: FileMetadata[] = []
    
    // Helper function to detect proper MIME type from file extension
    const getProperMimeType = (fileName: string, providedMimeType: string): string => {
      // If provided MIME type is valid image type, use it
      const validImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
      if (validImageMimeTypes.includes(providedMimeType.toLowerCase())) {
        return providedMimeType
      }
      
      // Fall back to file extension detection
      const ext = path.extname(fileName).toLowerCase()
      const mimeTypeMap: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.heic': 'image/heic',
        '.heif': 'image/heic'
      }
      
      return mimeTypeMap[ext] || 'image/jpeg' // Default to JPEG for safety
    }
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i]
      const fileId = uuidv4()
      const fileExtension = path.extname(image.name) || '.jpg'
      const fileName = `${fileId}${fileExtension}`
      const filePath = path.join('/tmp', fileName)
      
      // Fix MIME type issue - detect proper MIME type
      const properMimeType = getProperMimeType(image.name, image.type)
      
      console.log(`Processing image ${i + 1}:`)
      console.log(`  - Original MIME type: ${image.type}`)
      console.log(`  - Corrected MIME type: ${properMimeType}`)
      console.log(`  - File extension: ${fileExtension}`)
      
      // Ensure tmp directory exists (usually exists in serverless environments)
      await fs.mkdir('/tmp', { recursive: true })
      
      // Save file
      const buffer = await image.arrayBuffer()
      await fs.writeFile(filePath, Buffer.from(buffer))
      
      console.log(`Saved image ${i + 1}: ${fileName} (${buffer.byteLength} bytes)`)
      
      fileMetadataList.push({
        id: fileId,
        filename: image.name,
        mimeType: properMimeType,
        size: buffer.byteLength,
        uploadedAt: new Date()
      })
    }

    // Diagnostic Mode Processing
    let diagnosticImageUrls: string[] = []
    let rawOcrText: string = ''
    const diagnosticModeEnabled = SupabaseStorageManager.isDiagnosticModeEnabled()
    
    if (diagnosticModeEnabled) {
      console.log('=== DIAGNOSTIC MODE ENABLED ===')
      
      try {
        // Upload images to Supabase Storage for visual inspection
        const examId = uuidv4() // Generate exam ID early for diagnostic purposes
        console.log('Generated exam ID for diagnostic:', examId)
        
        const imageBuffers: Buffer[] = []
        for (const fileMetadata of fileMetadataList) {
          const filePath = path.join('/tmp', `${fileMetadata.id}${path.extname(fileMetadata.filename)}`)
          const buffer = await fs.readFile(filePath)
          imageBuffers.push(buffer)
        }
        
        // Upload images to storage
        diagnosticImageUrls = await SupabaseStorageManager.uploadMultipleDiagnosticImages(imageBuffers, examId)
        console.log('Uploaded diagnostic images:', diagnosticImageUrls.length)
        
        // Extract raw OCR text separately
        const imageParts = []
        for (const fileMetadata of fileMetadataList) {
          const filePath = path.join('/tmp', `${fileMetadata.id}${path.extname(fileMetadata.filename)}`)
          const buffer = await fs.readFile(filePath)
          const base64Data = buffer.toString('base64')
          
          imageParts.push({
            inlineData: {
              data: base64Data,
              mimeType: fileMetadata.mimeType
            }
          })
        }
        
        const ocrResult = await extractRawTextFromImages(imageParts)
        rawOcrText = ocrResult.rawText
        console.log('Raw OCR text length:', rawOcrText.length)
        console.log('Raw OCR preview:', rawOcrText.substring(0, 300))
        
      } catch (diagnosticError) {
        console.error('Diagnostic mode error:', diagnosticError)
        // Don't fail the entire request, just log the error
      }
    }

    // Process with Gemini using appropriate method
    console.log('Starting Gemini processing...')
    const startTime = Date.now()
    
    let result: any
    let structuredTopicData: any = null
    
    if (useStructuredMode) {
      console.log('=== USING STRUCTURED TOPIC-AWARE MODE ===')
      
      // Prepare image parts for topic detection
      const imageParts = []
      for (const fileMetadata of fileMetadataList) {
        const filePath = path.join('/tmp', `${fileMetadata.id}${path.extname(fileMetadata.filename)}`)
        const buffer = await fs.readFile(filePath)
        const base64Data = buffer.toString('base64')
        
        imageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: fileMetadata.mimeType
          }
        })
      }
      
      // Step 1: Extract text and detect topics
      console.log('Step 1: Topic detection and OCR...')
      const topicResult = await extractTextWithTopicDetection(imageParts)
      structuredTopicData = topicResult
      
      console.log('Detected topics:', Object.keys(topicResult.topics))
      for (const [key, topic] of Object.entries(topicResult.topics)) {
        console.log(`  - ${key}: ${topic.subject} (images ${topic.images.join(', ')})`)
      }
      
      // Step 2: Generate structured questions
      console.log('Step 2: Structured question generation...')
      result = await generateStructuredQuestions(topicResult.topics, promptToUse)
      
    } else {
      console.log('=== USING LEGACY MODE ===')
      
      // Use original processing method
      const geminiResults = await processImagesWithGemini(fileMetadataList, promptToUse)
      result = geminiResults[0] // Take first result since we process all images together
    }
    
    const endTime = Date.now()
    const processingTime = endTime - startTime
    console.log(`Gemini processing completed in ${processingTime}ms`)

    // Clean up uploaded files
    for (const fileMetadata of fileMetadataList) {
      const filePath = path.join('/tmp', `${fileMetadata.id}${path.extname(fileMetadata.filename)}`)
      try {
        await fs.unlink(filePath)
        console.log(`Cleaned up file: ${fileMetadata.filename}`)
      } catch (error) {
        console.warn(`Failed to clean up file: ${fileMetadata.filename}`, error)
      }
    }

    console.log('Using Gemini response for exam creation')

    // Create web exam from the response
    console.log('=== ATTEMPTING TO CREATE EXAM ===')
    console.log('Raw text length:', result.rawText?.length || 0)
    console.log('Raw text preview:', result.rawText?.substring(0, 200) || 'No raw text')
    
    let examResult = null
    try {
      const { createExam } = await import('@/lib/exam-service')
      console.log('createExam function imported successfully')
      
      // Prepare diagnostic data if available
      const diagnosticDataToPass = diagnosticModeEnabled ? {
        imageUrls: diagnosticImageUrls,
        rawOcrText: rawOcrText,
        diagnosticEnabled: true
      } : undefined

      examResult = await createExam(result.rawText, promptToUse, diagnosticDataToPass)
      console.log('Exam creation result:', examResult ? 'SUCCESS' : 'NULL')
      if (!examResult) {
        console.log('WARNING: Exam creation returned null - check exam processing and Supabase connection')
      }
    } catch (examError) {
      console.error('Error creating exam - full error:', examError)
      console.error('Error message:', examError instanceof Error ? examError.message : 'Unknown error')
      console.error('Error stack:', examError instanceof Error ? examError.stack : 'No stack trace')
    }

    // Return clean mobile response with exam URLs at root level
    return NextResponse.json({
      success: true,
      data: {
        metadata: {
          processingTime,
          imageCount: images.length,
          promptUsed: customPrompt && customPrompt.trim() !== '' ? 'custom' : 'default',
          processingMode: useStructuredMode ? 'structured' : 'legacy',
          geminiUsage: result.geminiUsage,
          ...(useStructuredMode && structuredTopicData && {
            structuredTopics: {
              topicCount: Object.keys(structuredTopicData.topics).length,
              topics: Object.entries(structuredTopicData.topics).map(([key, topic]: [string, any]) => ({
                id: key,
                subject: topic.subject,
                imageCount: topic.images.length,
                keywords: topic.keywords
              })),
              topicDetectionUsage: structuredTopicData.usage
            }
          }),
          ...(diagnosticModeEnabled && {
            diagnostic: {
              enabled: true,
              imageUrls: diagnosticImageUrls,
              rawOcrTextLength: rawOcrText.length,
              rawOcrPreview: rawOcrText.substring(0, 200)
            }
          })
        }
      },
      // Add exam URLs at root level for Flutter app
      ...(examResult ? {
        exam_url: examResult.examUrl,
        exam_id: examResult.examId,
        grading_url: examResult.gradingUrl
      } : {})
    })

  } catch (error) {
    console.error('Error in mobile API endpoint:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error processing images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}