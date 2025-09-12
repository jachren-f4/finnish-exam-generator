import { NextRequest, NextResponse } from 'next/server'
import { processImagesWithGemini, extractRawTextFromImages } from '@/lib/gemini'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'
import { SupabaseStorageManager } from '@/lib/storage'
import { PROMPTS } from '@/lib/config'
import { FileProcessor } from '@/lib/utils/file-handler'
import { OperationTimer } from '@/lib/utils/performance-logger'


export async function POST(request: NextRequest) {
  const timer = new OperationTimer('Mobile API Processing')
  console.log('=== MOBILE API ENDPOINT CALLED ===')
  
  try {
    
    // Parse form data
    timer.startPhase('Form Data Parsing')
    const formData = await request.formData()
    timer.endPhase('Form Data Parsing')
    const customPrompt = formData.get('prompt') as string
    const images = formData.getAll('images') as File[]
    
    console.log('Received custom prompt:', customPrompt ? 'YES' : 'NO')
    console.log('Number of images received:', images.length)
    console.log('Processing mode: LEGACY (Standard)')
    
    // Validate images using our file handler
    const validation = FileProcessor.validate(images)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 }
      )
    }
    
    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('File validation warnings:', validation.warnings)
    }

    // Use custom prompt or fallback to default
    const promptToUse = customPrompt && customPrompt.trim() !== '' ? customPrompt : PROMPTS.DEFAULT_EXAM_GENERATION
    console.log('Using prompt type:', customPrompt && customPrompt.trim() !== '' ? 'CUSTOM' : 'FALLBACK')
    
    // Log full prompt for quality analysis and optimization
    console.log('=== FULL PROMPT SENT TO GEMINI ===')
    console.log(promptToUse)
    console.log('=== END PROMPT ===')
    console.log('Prompt length:', promptToUse.length, 'characters')

    // Process images using our file handler
    timer.startPhase('File Processing')
    const processedFiles = await FileProcessor.save(images, uuidv4)
    const fileMetadataList = processedFiles.map(file => file.metadata)
    
    // Log file processing statistics
    FileProcessor.logStats(images, processedFiles)
    timer.endPhase('File Processing')

    // Diagnostic Mode Processing
    let diagnosticImageUrls: string[] = []
    let rawOcrText: string = ''
    const diagnosticModeEnabled = SupabaseStorageManager.isDiagnosticModeEnabled()
    
    if (diagnosticModeEnabled) {
      console.log('=== DIAGNOSTIC MODE ENABLED ===')
      const diagnosticStartTime = Date.now()
      
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
        console.log(`⏱️  [TIMER] Diagnostic processing: ${Date.now() - diagnosticStartTime}ms`)
        
      } catch (diagnosticError) {
        console.error('Diagnostic mode error:', diagnosticError)
        // Don't fail the entire request, just log the error
      }
    }

    // Process with Gemini using legacy mode
    console.log('Starting Gemini processing...')
    console.log('=== USING LEGACY MODE ===')
    const geminiStartTime = Date.now()
    console.log(`⏱️  [TIMER] Gemini processing started with prompt length: ${promptToUse.length} chars`)
    
    // Use legacy processing method
    const geminiResults = await processImagesWithGemini(fileMetadataList, promptToUse)
    const result = geminiResults[0] // Take first result since we process all images together
    
    const geminiEndTime = Date.now()
    const geminiProcessingTime = geminiEndTime - geminiStartTime
    console.log(`⏱️  [TIMER] Gemini processing completed: ${geminiProcessingTime}ms`)
    console.log(`⏱️  [TIMER] Gemini tokens - Input: ${result.geminiUsage?.promptTokenCount}, Output: ${result.geminiUsage?.candidatesTokenCount}, Cost: $${result.geminiUsage?.estimatedCost?.toFixed(6)}`)

    // Clean up uploaded files
    timer.startPhase('File Cleanup')
    const cleanupResult = await FileProcessor.cleanupByMetadata(fileMetadataList)
    console.log(`Cleaned up ${cleanupResult.cleaned} files${cleanupResult.errors.length > 0 ? ` (${cleanupResult.errors.length} errors)` : ''}`)
    if (cleanupResult.errors.length > 0) {
      console.warn('Cleanup errors:', cleanupResult.errors)
    }
    timer.endPhase('File Cleanup')

    console.log('Using Gemini response for exam creation')

    // Create web exam from the response
    console.log('=== ATTEMPTING TO CREATE EXAM ===')
    const examCreationStartTime = Date.now()
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
      examResult = await createExam(result.rawText, actualPromptUsed, diagnosticDataToPass, result.geminiUsage)
      console.log(`⏱️  [TIMER] Exam creation: ${Date.now() - examCreationStartTime}ms`)
      console.log('Exam creation result:', examResult ? 'SUCCESS' : 'NULL')
      if (!examResult) {
        console.log('WARNING: Exam creation returned null - check exam processing and Supabase connection')
      }
    } catch (examError) {
      console.error('Error creating exam - full error:', examError)
      console.error('Error message:', examError instanceof Error ? examError.message : 'Unknown error')
      console.error('Error stack:', examError instanceof Error ? examError.stack : 'No stack trace')
    }

    const breakdown = timer.complete({
      imageCount: images.length,
      promptType: customPrompt && customPrompt.trim() !== '' ? 'custom' : 'default',
      geminiProcessingTime,
      examCreated: !!examResult
    })
    
    // Return clean mobile response with exam URLs at root level
    return NextResponse.json({
      success: true,
      data: {
        metadata: {
          processingTime: breakdown.totalDuration,
          geminiProcessingTime,
          imageCount: images.length,
          promptUsed: customPrompt && customPrompt.trim() !== '' ? 'custom' : 'default',
          processingMode: 'legacy',
          geminiUsage: result.geminiUsage,
          performanceBreakdown: breakdown.phases,
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