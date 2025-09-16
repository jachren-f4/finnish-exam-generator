import { v4 as uuidv4 } from 'uuid'
import { FileProcessor, ProcessedFile } from '../utils/file-handler'
import { OperationTimer } from '../utils/performance-logger'
import { SupabaseStorageManager } from '../storage'
import { PROMPTS } from '../config'
import { processImagesWithGemini } from '../gemini'
// Import ExamGenie services instead of old exam service
import { supabaseAdmin } from '../supabase'

export interface MobileApiRequest {
  images: File[]
  customPrompt?: string
  processingId: string
  // ExamGenie MVP parameters
  subject?: string
  grade?: number
  student_id?: string
  user_id?: string
}

export interface DiagnosticData {
  imageUrls: string[]
  rawOcrText: string
  diagnosticEnabled: boolean
}

export interface MobileApiResult {
  success: boolean
  data?: {
    metadata: {
      processingTime: number
      geminiProcessingTime: number
      imageCount: number
      promptUsed: 'custom' | 'default'
      processingMode: string
      geminiUsage: any
      performanceBreakdown: any
      diagnostic?: {
        enabled: boolean
        imageUrls: string[]
        rawOcrTextLength: number
        rawOcrPreview: string
      }
    }
  }
  examUrl?: string
  examId?: string
  gradingUrl?: string
  error?: string
  details?: string
}

/**
 * Mobile API Service - Handles the complete exam generation workflow
 * Extracted from mobile API route to separate business logic from HTTP handling
 */
export class MobileApiService {
  /**
   * Process the complete exam generation workflow
   */
  static async generateExam(request: MobileApiRequest): Promise<MobileApiResult> {
    const timer = new OperationTimer('ExamGenie Mobile API Processing')
    const { images, customPrompt, processingId, subject, grade, student_id, user_id } = request

    try {
      console.log('=== EXAMGENIE MOBILE API ENDPOINT CALLED ===')
      console.log('Processing ID:', processingId)
      console.log('Subject:', subject || 'not specified')
      console.log('Grade:', grade || 'not specified')
      console.log('Student ID:', student_id || 'not specified')
      console.log('User ID:', user_id || 'not authenticated')

      // Process files using FileProcessor
      timer.startPhase('File Processing')
      const processedFiles = await FileProcessor.save(images, uuidv4)
      const fileMetadataList = processedFiles.map(file => file.metadata)
      
      // Log file processing statistics
      FileProcessor.logStats(images, processedFiles)
      timer.endPhase('File Processing')

      // Handle diagnostic mode if enabled
      const diagnosticData = await this.handleDiagnosticMode(
        fileMetadataList,
        timer
      )

      // Process with Gemini using subject-aware prompts
      const geminiResult = await this.processWithGemini(
        fileMetadataList,
        customPrompt,
        timer,
        subject,
        grade
      )

      if (!geminiResult.success) {
        return geminiResult
      }

      // Create exam from Gemini response
      const examResult = await this.createExamFromResponse(
        geminiResult.data!,
        customPrompt,
        diagnosticData,
        timer,
        request
      )

      // Clean up files
      await this.cleanupFiles(fileMetadataList, timer)

      // Build final response
      const breakdown = timer.complete({
        imageCount: images.length,
        promptType: customPrompt && customPrompt.trim() !== '' ? 'custom' : 'default',
        geminiProcessingTime: geminiResult.processingTime!,
        examCreated: !!examResult
      })

      return this.buildSuccessResponse(
        breakdown,
        geminiResult,
        diagnosticData,
        examResult,
        request
      )

    } catch (error) {
      console.error('Error in mobile API processing:', error)
      return {
        success: false,
        error: 'Internal server error processing images',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Handle diagnostic mode processing if enabled
   */
  private static async handleDiagnosticMode(
    fileMetadataList: any[],
    timer: OperationTimer
  ): Promise<DiagnosticData | undefined> {
    const diagnosticModeEnabled = SupabaseStorageManager.isDiagnosticModeEnabled()
    
    if (!diagnosticModeEnabled) {
      return undefined
    }

    console.log('=== DIAGNOSTIC MODE ENABLED ===')
    const diagnosticStartTime = Date.now()
    let diagnosticImageUrls: string[] = []
    let rawOcrText: string = ''

    try {
      const examId = uuidv4()
      console.log('Generated exam ID for diagnostic:', examId)

      // Note: Diagnostic image uploads are disabled to save storage costs
      console.log('Diagnostic image uploads disabled - keeping OCR text only')

      // Extract raw OCR text separately
      const fs = require('fs').promises
      const path = require('path')
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
      
      const { extractRawTextFromImages } = await import('../gemini')
      const ocrResult = await extractRawTextFromImages(imageParts)
      rawOcrText = ocrResult.rawText
      
      console.log('Raw OCR text length:', rawOcrText.length)
      console.log('Raw OCR preview:', rawOcrText.substring(0, 300))
      console.log(`⏱️  [TIMER] Diagnostic processing: ${Date.now() - diagnosticStartTime}ms`)
      
      return {
        imageUrls: diagnosticImageUrls,
        rawOcrText,
        diagnosticEnabled: true
      }
      
    } catch (diagnosticError) {
      console.error('Diagnostic mode error:', diagnosticError)
      return undefined
    }
  }

  /**
   * Process images with Gemini AI using subject-aware prompts
   */
  private static async processWithGemini(
    fileMetadataList: any[],
    customPrompt: string | undefined,
    timer: OperationTimer,
    subject?: string,
    grade?: number
  ): Promise<{ success: true; data: any; processingTime: number } | { success: false; error: string; details: string }> {
    try {
      // Determine which prompt to use
      let promptToUse: string
      let promptType: string

      if (customPrompt && customPrompt.trim() !== '') {
        promptToUse = customPrompt
        promptType = 'CUSTOM'
      } else if (subject || grade) {
        promptToUse = PROMPTS.getSubjectAwarePrompt(subject, grade)
        promptType = `SUBJECT_AWARE(${subject || 'none'}, grade-${grade || 'none'})`
      } else {
        promptToUse = PROMPTS.DEFAULT_EXAM_GENERATION
        promptType = 'DEFAULT'
      }

      console.log('Using prompt type:', promptType)
      
      // Log full prompt for quality analysis
      console.log('=== FULL PROMPT SENT TO GEMINI ===')
      console.log(promptToUse)
      console.log('=== END PROMPT ===')
      console.log('Prompt length:', promptToUse.length, 'characters')

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

      return {
        success: true,
        data: result,
        processingTime: geminiProcessingTime
      }

    } catch (error: any) {
      console.error('Error in Gemini processing:', error)

      // Check if this is a Gemini API overload error
      const isGeminiOverloaded = error?.status === 503 ||
                                error?.message?.includes('overloaded') ||
                                error?.message?.includes('Service Unavailable')

      if (isGeminiOverloaded) {
        return {
          success: false,
          error: 'Gemini API is currently overloaded',
          details: 'Google\'s AI service is temporarily at capacity. Please try again in a few moments.'
        }
      }

      return {
        success: false,
        error: 'Gemini processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Create ExamGenie exam from Gemini response
   */
  private static async createExamFromResponse(
    geminiData: any,
    customPrompt: string | undefined,
    diagnosticData: DiagnosticData | undefined,
    timer: OperationTimer,
    request: MobileApiRequest
  ): Promise<any> {
    console.log('=== ATTEMPTING TO CREATE EXAMGENIE EXAM ===')
    const examCreationStartTime = Date.now()
    console.log('Raw text length:', geminiData.rawText?.length || 0)
    console.log('Raw text preview:', geminiData.rawText?.substring(0, 200) || 'No raw text')

    try {
      timer.startPhase('ExamGenie Exam Creation')

      // Parse the Gemini response to extract questions
      let parsedQuestions = []
      try {
        const parsedResult = JSON.parse(geminiData.rawText)
        parsedQuestions = parsedResult.questions || []
      } catch (parseError) {
        console.error('Failed to parse Gemini JSON response:', parseError)
        return null
      }

      if (!parsedQuestions || parsedQuestions.length === 0) {
        console.error('No questions found in Gemini response')
        return null
      }

      // Create exam in examgenie_exams table
      const examId = crypto.randomUUID()
      const shareId = crypto.randomUUID().substring(0, 8)

      const examData = {
        id: examId,
        user_id: request.user_id || null,
        student_id: request.student_id || null,
        subject: request.subject || 'Yleinen',
        grade: request.grade?.toString() || '1',
        status: 'READY',
        processed_text: geminiData.rawText,
        share_id: shareId,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }

      console.log('Creating ExamGenie exam:', examData)

      if (!supabaseAdmin) {
        console.error('Supabase admin client not available')
        return null
      }

      const { data: exam, error: examError } = await supabaseAdmin
        .from('examgenie_exams')
        .insert(examData)
        .select()
        .single()

      if (examError) {
        console.error('Failed to create examgenie_exams record:', examError)
        return null
      }

      // Create questions in examgenie_questions table
      const questionsData = parsedQuestions.map((q: any, index: number) => ({
        id: crypto.randomUUID(),
        exam_id: examId,
        question_number: index + 1,
        question_text: q.question || q.question_text || '',
        question_type: q.type || q.question_type || 'multiple_choice',
        options: q.options || null,
        correct_answer: q.correct_answer || null,
        explanation: q.explanation || null,
        max_points: 2,
        is_selected: true
      }))

      console.log(`Creating ${questionsData.length} questions for exam ${examId}`)

      const { error: questionsError } = await supabaseAdmin
        .from('examgenie_questions')
        .insert(questionsData)

      if (questionsError) {
        console.error('Failed to create examgenie_questions:', questionsError)
        // Clean up exam record
        await supabaseAdmin.from('examgenie_exams').delete().eq('id', examId)
        return null
      }

      timer.endPhase('ExamGenie Exam Creation')
      console.log(`⏱️  [TIMER] ExamGenie exam creation: ${Date.now() - examCreationStartTime}ms`)

      // Return exam URLs in the expected format
      const examUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/exam/${examId}`
      const gradingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/grading/${examId}`

      return {
        examId,
        examUrl,
        gradingUrl
      }

    } catch (examError) {
      console.error('Error creating ExamGenie exam - full error:', examError)
      console.error('Error message:', examError instanceof Error ? examError.message : 'Unknown error')
      console.error('Error stack:', examError instanceof Error ? examError.stack : 'No stack trace')
      return null
    }
  }

  /**
   * Clean up temporary files
   */
  private static async cleanupFiles(
    fileMetadataList: any[],
    timer: OperationTimer
  ): Promise<void> {
    timer.startPhase('File Cleanup')
    const cleanupResult = await FileProcessor.cleanupByMetadata(fileMetadataList)
    console.log(`Cleaned up ${cleanupResult.cleaned} files${cleanupResult.errors.length > 0 ? ` (${cleanupResult.errors.length} errors)` : ''}`)
    if (cleanupResult.errors.length > 0) {
      console.warn('Cleanup errors:', cleanupResult.errors)
    }
    timer.endPhase('File Cleanup')
  }

  /**
   * Build success response in the expected format
   */
  private static buildSuccessResponse(
    breakdown: any,
    geminiResult: any,
    diagnosticData: DiagnosticData | undefined,
    examResult: any,
    request: MobileApiRequest
  ): MobileApiResult {
    const response: MobileApiResult = {
      success: true,
      data: {
        metadata: {
          processingTime: breakdown.totalDuration,
          geminiProcessingTime: geminiResult.processingTime,
          imageCount: request.images.length,
          promptUsed: request.customPrompt && request.customPrompt.trim() !== '' ? 'custom' : 'default',
          processingMode: 'legacy',
          geminiUsage: geminiResult.data.geminiUsage,
          performanceBreakdown: breakdown.phases,
          ...(diagnosticData && {
            diagnostic: {
              enabled: true,
              imageUrls: diagnosticData.imageUrls,
              rawOcrTextLength: diagnosticData.rawOcrText.length,
              rawOcrPreview: diagnosticData.rawOcrText.substring(0, 200)
            }
          })
        }
      }
    }

    // Add exam URLs at root level for Flutter app
    if (examResult) {
      response.examUrl = examResult.examUrl
      response.examId = examResult.examId
      response.gradingUrl = examResult.gradingUrl
    }

    return response
  }
}