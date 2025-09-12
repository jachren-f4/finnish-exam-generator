import { NextRequest, NextResponse } from 'next/server'
import { processImagesWithGemini, extractRawTextFromImages } from '@/lib/gemini'
import { FileMetadata } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import { SupabaseStorageManager } from '@/lib/storage'
import { supabase } from '@/lib/supabase'


export async function POST(request: NextRequest) {
  try {
    console.log('=== MOBILE API ENDPOINT CALLED ===')
    
    // Parse form data
    const formData = await request.formData()
    const customPrompt = formData.get('prompt') as string
    const images = formData.getAll('images') as File[]
    
    console.log('Received custom prompt:', customPrompt ? 'YES' : 'NO')
    console.log('Number of images received:', images.length)
    console.log('Processing mode: LEGACY (Standard)')
    
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

    // Use custom prompt (required now)
    const promptToUse = customPrompt && customPrompt.trim() !== '' ? customPrompt : 'Generate 10 exam questions in Finnish based on the image content.'
    console.log('Using prompt type:', customPrompt && customPrompt.trim() !== '' ? 'CUSTOM' : 'FALLBACK')
    
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
        
        // Upload images to storage - DISABLED to save storage costs
        // diagnosticImageUrls = await SupabaseStorageManager.uploadMultipleDiagnosticImages(imageBuffers, examId)
        // console.log('Uploaded diagnostic images:', diagnosticImageUrls.length)
        console.log('Diagnostic image uploads disabled - keeping OCR text only')
        
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

    // Process with Gemini using legacy mode
    console.log('Starting Gemini processing...')
    console.log('=== USING LEGACY MODE ===')
    const startTime = Date.now()
    
    // Use legacy processing method
    const geminiResults = await processImagesWithGemini(fileMetadataList, promptToUse)
    const result = geminiResults[0] // Take first result since we process all images together
    
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

      // Use the prompt that was sent to Gemini
      const actualPromptUsed = promptToUse
      examResult = await createExam(result.rawText, actualPromptUsed, diagnosticDataToPass)
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
          processingMode: 'legacy',
          geminiUsage: result.geminiUsage,
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