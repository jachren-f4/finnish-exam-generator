import { v4 as uuidv4 } from 'uuid'
import { FileProcessor, ProcessedFile } from '../utils/file-handler'
import { OperationTimer } from '../utils/performance-logger'
import { SupabaseStorageManager } from '../storage'
import { PROMPTS } from '../config'
import { processImagesWithGemini } from '../gemini'
// Import ExamGenie services instead of old exam service
import { supabaseAdmin } from '../supabase'
import { PromptLogger, ImageReference } from '../utils/prompt-logger'

export interface MobileApiRequest {
  images: File[]
  customPrompt?: string
  processingId: string
  // ExamGenie MVP parameters
  category?: string // 'mathematics', 'core_academics', 'language_studies'
  subject?: string // Optional - will be detected from content if category is provided
  grade?: number
  student_id?: string
  language?: string // Student's language for exam generation
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
    const { images, customPrompt, processingId, category, subject, grade, student_id, language, user_id } = request

    try {
      console.log('=== EXAMGENIE MOBILE API ENDPOINT CALLED ===')
      console.log('Processing ID:', processingId)
      console.log('Category:', category || 'not specified')
      console.log('Subject:', subject || 'will be detected')
      console.log('Grade:', grade || 'not specified')
      console.log('Student ID:', student_id || 'not specified')
      console.log('Language:', language || 'en')
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

      // Process with Gemini using category and language-aware prompts
      const geminiResult = await this.processWithGemini(
        fileMetadataList,
        customPrompt,
        timer,
        category,
        subject,
        grade,
        language || 'en'
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
        request,
        geminiResult.promptUsed,
        geminiResult.processingTime,
        fileMetadataList
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
   * Process images with Gemini AI using category and language-aware prompts
   */
  private static async processWithGemini(
    fileMetadataList: any[],
    customPrompt: string | undefined,
    timer: OperationTimer,
    category?: string,
    subject?: string,
    grade?: number,
    language: string = 'en'
  ): Promise<{ success: true; data: any; processingTime: number } | { success: false; error: string; details: string }> {
    try {
      // Determine which prompt to use
      let promptToUse: string
      let promptType: string

      if (customPrompt && customPrompt.trim() !== '') {
        promptToUse = customPrompt
        promptType = 'CUSTOM'
      } else if (category) {
        // Use specialized prompt for language studies, regular category prompt for others
        if (category === 'language_studies') {
          promptToUse = PROMPTS.getLanguageStudiesPrompt(grade, language)
          promptType = `LANGUAGE_STUDIES(grade-${grade || 'auto'}, student-lang-${language})`
        } else {
          promptToUse = PROMPTS.getCategoryAwarePrompt(category, grade, language)
          promptType = `CATEGORY_AWARE(${category}, grade-${grade || 'auto'}, lang-${language})`
        }
      } else {
        // Always use category-aware prompt with core_academics as default
        promptToUse = PROMPTS.getCategoryAwarePrompt('core_academics', grade, language)
        promptType = `CATEGORY_AWARE(core_academics, grade-${grade || 'auto'}, lang-${language})`
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
        processingTime: geminiProcessingTime,
        promptUsed: promptToUse
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
    request: MobileApiRequest,
    promptUsed?: string,
    processingTime?: number,
    fileMetadataList?: any[]
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

      // Log exam creation prompt and response
      if (promptUsed && processingTime && geminiData.geminiUsage) {
        try {
          const images: ImageReference[] = fileMetadataList?.map(f => ({
            filename: f.filename,
            sizeInBytes: f.fileSize
          })) || []

          await PromptLogger.logExamCreation(
            examId,
            promptUsed,
            geminiData.rawText || 'No response text',
            {
              processingTime: processingTime,
              promptTokens: geminiData.geminiUsage.promptTokenCount || 0,
              responseTokens: geminiData.geminiUsage.candidatesTokenCount || 0,
              totalTokens: geminiData.geminiUsage.totalTokenCount || 0,
              estimatedCost: geminiData.geminiUsage.estimatedCost || 0,
              examUrl: `http://localhost:3000/exam/${examId}`
            },
            images,
            request.subject || request.category,
            request.grade
          )
        } catch (logError) {
          console.error('Failed to log exam creation:', logError)
          // Continue with exam creation even if logging fails
        }
      }

      // Use system user ID for mobile API requests when no user is authenticated
      const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'
      let userId = request.user_id || SYSTEM_USER_ID

      console.log('Using user_id for exam creation:', userId)

      // Ensure system user exists in auth.users table
      if (userId === SYSTEM_USER_ID) {
        try {
          // First try to find existing system user by email
          const { data: existingUsers, error: listError } = await supabaseAdmin!.auth.admin.listUsers()

          if (listError) {
            console.error('Failed to list users:', listError)
            return null
          }

          // Look for existing system user
          const systemUser = existingUsers.users.find(user =>
            user.email === 'system@examgenie.mobile' ||
            user.user_metadata?.created_for === 'mobile_api'
          )

          if (systemUser) {
            console.log('Found existing system user:', systemUser.id)
            userId = systemUser.id
          } else {
            console.log('Creating system user for mobile API...')
            const { data: newUser, error: createError } = await supabaseAdmin!.auth.admin.createUser({
              email: 'system@examgenie.mobile',
              email_confirm: true,
              user_metadata: {
                role: 'system',
                created_for: 'mobile_api'
              }
            })

            if (createError) {
              console.error('Failed to create system user:', createError)
              // Fallback - skip exam creation for now
              console.log('Skipping exam creation due to system user creation failure')
              return null
            } else {
              console.log('System user created successfully:', newUser.user?.id)
              // Use the newly created user's actual ID
              userId = newUser.user?.id || SYSTEM_USER_ID
            }
          }
        } catch (userError) {
          console.error('Error checking/creating system user:', userError)
          // Fallback - skip exam creation for now
          console.log('Skipping exam creation due to system user error')
          return null
        }
      }

      const examData: any = {
        id: examId,
        user_id: userId,
        subject: request.subject || 'Yleinen',
        grade: request.grade?.toString() || '1',
        status: 'READY',
        processed_text: geminiData.rawText,
        share_id: shareId,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }

      // Handle student_id for exam creation
      if (request.student_id) {
        examData.student_id = request.student_id
      } else {
        // Create or use a system student for testing purposes when no student_id is provided
        const SYSTEM_STUDENT_ID = '00000000-0000-0000-0000-000000000002' // Different from user ID
        try {
          // Check if system student exists, create if not
          const { data: existingStudent } = await supabaseAdmin!
            .from('students')
            .select('id')
            .eq('id', SYSTEM_STUDENT_ID)
            .single()

          if (!existingStudent) {
            console.log('Creating system student for testing...')
            const { error: studentError } = await supabaseAdmin!
              .from('students')
              .insert({
                id: SYSTEM_STUDENT_ID,
                user_id: userId, // Use the same system user ID
                name: 'System Test Student',
                grade: parseInt(request.grade?.toString() || '1'),
                language: request.language || 'en',
                created_at: new Date().toISOString()
              })

            if (studentError) {
              console.warn('Failed to create system student:', studentError.message)
              // Don't include student_id if creation fails
            } else {
              console.log('System student created successfully')
              examData.student_id = SYSTEM_STUDENT_ID
            }
          } else {
            console.log('Using existing system student')
            examData.student_id = SYSTEM_STUDENT_ID
          }
        } catch (studentError) {
          console.warn('Error handling system student:', studentError)
          // Don't include student_id if there's an error
        }
      }

      console.log('Creating ExamGenie exam:', examData)

      if (!supabaseAdmin) {
        console.error('Supabase admin client not available')
        return null
      }

      console.log('Attempting to insert exam:', JSON.stringify(examData, null, 2))
      const { data: exam, error: examError } = await supabaseAdmin
        .from('examgenie_exams')
        .insert(examData)
        .select()

      console.log('Exam insert result:', { exam, examError })

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