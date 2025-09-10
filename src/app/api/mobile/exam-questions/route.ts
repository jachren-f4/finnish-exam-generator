import { NextRequest, NextResponse } from 'next/server'
import { processImagesWithGemini } from '@/lib/gemini'
import { FileMetadata } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'

const DEFAULT_EXAM_PROMPT = `Your task:
- Based on the text, generate exactly **10 exam questions in Finnish**.

Requirements for the questions:
- Use correct Finnish grammar (do not leave broken fragments in the text).
- Only create questions that are relevant to the topic that the text refers to.
- Use varied question types: multiple choice, true/false, short answer, fill-in-the-blank.
- Make questions at appropriate difficulty level for elementary/middle school students.
- Include correct answers for each question.

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
    
    console.log('Received custom prompt:', customPrompt ? 'YES' : 'NO')
    console.log('Number of images received:', images.length)
    
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
    console.log('Prompt preview:', promptToUse.substring(0, 100) + '...')

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

    // Process with Gemini
    console.log('Starting Gemini processing...')
    const startTime = Date.now()
    const geminiResults = await processImagesWithGemini(fileMetadataList, promptToUse)
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

    // Get the raw response from Gemini
    const result = geminiResults[0] // Take first result since we process all images together
    console.log('Using raw Gemini response directly without parsing')

    // Create web exam from the response
    console.log('=== ATTEMPTING TO CREATE EXAM ===')
    console.log('Raw text length:', result.rawText?.length || 0)
    console.log('Raw text preview:', result.rawText?.substring(0, 200) || 'No raw text')
    
    let examResult = null
    try {
      const { createExam } = await import('@/lib/exam-service')
      console.log('createExam function imported successfully')
      examResult = await createExam(result.rawText)
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
          geminiUsage: result.geminiUsage
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