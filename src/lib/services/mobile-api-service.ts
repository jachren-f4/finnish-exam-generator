import { v4 as uuidv4 } from 'uuid'
import { FileProcessor, ProcessedFile } from '../utils/file-handler'
import { OperationTimer } from '../utils/performance-logger'
import { SupabaseStorageManager } from '../storage'
import { PROMPTS, GEMINI_CONFIG, getGeminiApiKey } from '../config'
import { GoogleGenerativeAI } from '@google/generative-ai'
// Import ExamGenie services instead of old exam service
import { supabaseAdmin } from '../supabase'
import { PromptLogger, ImageReference } from '../utils/prompt-logger'
import { shuffleQuestionsOptions, getShuffleStats } from '../utils/question-shuffler'
import { getConfiguredProviderType } from './ai-providers/provider-factory'
import { MathExamService } from './math-exam-service'
import { createUsageMetadata } from '../utils/cost-calculator'
import { safeJsonParse } from '../utils/json-handler'

export interface MobileApiRequest {
  images: File[]
  customPrompt?: string
  processingId: string
  // ExamGenie MVP parameters
  category?: string // 'mathematics', 'core_academics', 'language_studies'
  subject?: string // Optional - will be detected from content if category is provided
  grade?: number
  language?: string // User's language for exam generation
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
    const { images, customPrompt, processingId, category, subject, grade, language, user_id } = request

    try {
      console.log('=== EXAMGENIE MOBILE API ENDPOINT CALLED ===')
      console.log('Processing ID:', processingId)
      console.log('Category:', category || 'not specified')
      console.log('Subject:', subject || 'will be detected')
      console.log('Grade:', grade || 'not specified')
      console.log('User ID:', user_id || 'not specified')
      console.log('Language:', language || 'en')

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
   * NOTE: Diagnostic mode is disabled in config (DIAGNOSTIC_MODE_ENABLED: false)
   * This method always returns undefined
   */
  private static async handleDiagnosticMode(
    fileMetadataList: any[],
    timer: OperationTimer
  ): Promise<DiagnosticData | undefined> {
    // Diagnostic mode is permanently disabled
    return undefined
  }

  /**
   * Process images with Math Exam Service (specialized for mathematics category)
   */
  private static async processWithMathService(
    fileMetadataList: any[],
    timer: OperationTimer,
    grade?: number,
    language: string = 'en',
    processingId: string = 'math-mobile-api'
  ): Promise<{ success: true; data: any; processingTime: number; promptUsed: string } | { success: false; error: string; details: string }> {
    try {
      console.log('=== ROUTING TO MATH EXAM SERVICE ===')
      console.log('Grade:', grade || 'auto-detect')
      console.log('Language:', language)

      const mathStartTime = Date.now()

      // Load images from temporary files
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

      // Call math exam service
      const mathResult = await MathExamService.generateMathExam({
        images: imageParts,
        grade: grade || 8, // Default to grade 8 if not specified
        language,
        processingId
      })

      if (!mathResult.success) {
        return {
          success: false,
          error: mathResult.error || 'Math exam generation failed',
          details: mathResult.details || 'Unknown error in math service'
        }
      }

      const mathProcessingTime = Date.now() - mathStartTime
      console.log(`⏱️  [MATH-SERVICE] Processing completed: ${mathProcessingTime}ms`)
      console.log(`⏱️  [MATH-SERVICE] Temperature used: ${mathResult.temperatureUsed}`)
      console.log(`⏱️  [MATH-SERVICE] Validation score: ${mathResult.validationScore}/100`)
      console.log(`⏱️  [MATH-SERVICE] Questions generated: ${mathResult.questions?.length || 0}`)
      console.log(`⏱️  [MATH-SERVICE] Audio summary present: ${mathResult.audioSummary ? 'YES' : 'NO'}`)

      // Format result to match expected structure
      const formattedData = {
        rawText: JSON.stringify({
          questions: mathResult.questions,
          audio_summary: mathResult.audioSummary,  // NEW: Include audio summary
          key_concepts: mathResult.keyConcepts,  // NEW: Include key concepts
          gamification: mathResult.gamification,  // NEW: Include gamification
          topic: mathResult.topic,
          difficulty: 'medium' // Math exams don't have difficulty in the same way
        }),
        geminiUsage: mathResult.geminiUsage,
        audioSummary: mathResult.audioSummary,  // NEW: Pass audio summary for TTS generation
        keyConcepts: mathResult.keyConcepts,  // NEW: Pass key concepts
        gamification: mathResult.gamification  // NEW: Pass gamification
      }

      return {
        success: true,
        data: formattedData,
        processingTime: mathProcessingTime,
        promptUsed: 'MATH_V1_PROMPT'
      }

    } catch (error: any) {
      console.error('Error in Math Service processing:', error)
      return {
        success: false,
        error: 'Math service processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process images with Gemini AI using category and language-aware prompts
   * Routes to Math Service for mathematics category
   */
  private static async processWithGemini(
    fileMetadataList: any[],
    customPrompt: string | undefined,
    timer: OperationTimer,
    category?: string,
    subject?: string,
    grade?: number,
    language: string = 'en'
  ): Promise<{ success: true; data: any; processingTime: number; promptUsed: string } | { success: false; error: string; details: string }> {
    try {
      // ROUTING LOGIC: Check if this is a mathematics exam
      if (category === 'mathematics' && !customPrompt) {
        console.log('🔀 ROUTING: Mathematics category detected → Math Exam Service')
        return await this.processWithMathService(
          fileMetadataList,
          timer,
          grade,
          language,
          'math-mobile-api'
        )
      }
      // Determine which prompt to use
      let promptToUse: string
      let promptType: string

      if (customPrompt && customPrompt.trim() !== '') {
        promptToUse = customPrompt
        promptType = 'CUSTOM'
      } else if (subject && /historia|history|geschichte/i.test(subject)) {
        // Use specialized prompt for history subjects (any language)
        promptToUse = PROMPTS.getHistoryPrompt(grade, language, fileMetadataList.length)
        promptType = `HISTORY(subject-${subject}, grade-${grade || 'auto'}, images-${fileMetadataList.length})`
      } else if (category) {
        // Use specialized prompt for language studies, category prompt with summary for others
        if (category === 'language_studies') {
          promptToUse = PROMPTS.getLanguageStudiesPrompt(grade, language)
          promptType = `LANGUAGE_STUDIES(grade-${grade || 'auto'}, student-lang-${language})`
        } else {
          promptToUse = PROMPTS.getCategoryAwarePrompt(category, grade, language, fileMetadataList.length)
          promptType = `CATEGORY_AWARE_PROMPT(${category}, grade-${grade || 'auto'}, lang-${language}, images-${fileMetadataList.length})`
        }
      } else {
        // Always use category-aware prompt with summary and core_academics as default
        promptToUse = PROMPTS.getCategoryAwarePrompt('core_academics', grade, language, fileMetadataList.length)
        promptType = `CATEGORY_AWARE_PROMPT(core_academics, grade-${grade || 'auto'}, lang-${language}, images-${fileMetadataList.length})`
      }

      console.log('Using prompt type:', promptType)

      // Log full prompt for quality analysis (console)
      console.log('=== FULL PROMPT SENT TO GEMINI ===')
      console.log(promptToUse)
      console.log('=== END PROMPT ===')
      console.log('Prompt length:', promptToUse.length, 'characters')

      console.log('Starting Gemini processing...')
      const geminiStartTime = Date.now()
      console.log(`⏱️  [TIMER] Gemini processing started with prompt length: ${promptToUse.length} chars`)

      // Load images from temporary files and prepare for Gemini API
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

      // Call Gemini API directly
      const genAI = new GoogleGenerativeAI(getGeminiApiKey())
      const model = genAI.getGenerativeModel({
        model: GEMINI_CONFIG.MODEL_NAME,
        generationConfig: GEMINI_CONFIG.GENERATION_CONFIG
      })

      const result = await model.generateContent([promptToUse, ...imageParts])
      const response = result.response
      const text = response.text()
      const usageMetadata = response.usageMetadata

      const geminiEndTime = Date.now()
      const geminiProcessingTime = geminiEndTime - geminiStartTime

      // Create usage metadata for cost tracking
      const usage = createUsageMetadata(promptToUse, text, usageMetadata)

      console.log(`⏱️  [TIMER] Gemini processing completed: ${geminiProcessingTime}ms`)
      console.log(`⏱️  [TIMER] Gemini tokens - Input: ${usage.promptTokenCount}, Output: ${usage.candidatesTokenCount}, Cost: $${usage.estimatedCost.toFixed(6)}`)

      // Format result in expected structure
      const formattedResult = {
        rawText: text,
        geminiUsage: usage
      }

      return {
        success: true,
        data: formattedResult,
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
   * REMOVED: logPromptToFile() method
   *
   * File-based prompt logging has been disabled because:
   * - Vercel serverless functions have read-only filesystems (except /tmp)
   * - Prompts are now saved to database (generation_prompt field) which is more reliable
   * - Console logs still show the full prompt for debugging
   *
   * If you need to review prompts, query the database:
   * SELECT id, generation_prompt FROM examgenie_exams WHERE created_at > NOW() - INTERVAL '1 day'
   */

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

      // Parse the Gemini response to extract questions and summary
      let parsedQuestions = []
      let summaryData: any = null
      let summaryText: string | null = null
      let audioSummaryData: any = null  // NEW: For math audio summaries

      // Use safeJsonParse to handle markdown code fences (```json ... ```)
      const parseResult = safeJsonParse(geminiData.rawText)

      if (!parseResult.success) {
        console.error('Failed to parse Gemini JSON response:', parseResult.error)
        console.error('Parse method attempted:', parseResult.method)
        console.error('Response preview:', geminiData.rawText?.substring(0, 500))
        return null
      }

      console.log(`✅ JSON parsed successfully using method: ${parseResult.method}`)

      const parsedResult = parseResult.data
      parsedQuestions = parsedResult.questions || []

      // NEW: Extract key concepts and gamification from response
      let keyConcepts: any[] | null = null
      let gamification: any | null = null

      if (geminiData.keyConcepts || parsedResult.key_concepts) {
        keyConcepts = geminiData.keyConcepts || parsedResult.key_concepts
        console.log('=== KEY CONCEPTS EXTRACTED ===')
        console.log('Concepts count:', keyConcepts?.length || 0)
      }

      if (geminiData.gamification || parsedResult.gamification) {
        gamification = geminiData.gamification || parsedResult.gamification
        console.log('=== GAMIFICATION EXTRACTED ===')
        console.log('Boss question type:', gamification?.boss_question_multiple_choice ? 'Multiple Choice' : 'Open')
      }

      // NEW: Check for math audio_summary (from Math Service)
      if (geminiData.audioSummary || parsedResult.audio_summary) {
        audioSummaryData = geminiData.audioSummary || parsedResult.audio_summary
        console.log('=== MATH AUDIO SUMMARY EXTRACTED ===')
        console.log('Language:', audioSummaryData.language || 'not specified')
        console.log('Word count:', audioSummaryData.total_word_count || 'not specified')
        console.log('Reflections:', audioSummaryData.guided_reflections?.length || 0)

        // Flatten audio summary sections into summaryText for database storage
        console.log('[SUMMARY_TEXT DEBUG] Starting to flatten math audio summary...')
        console.log('[SUMMARY_TEXT DEBUG] audioSummaryData keys:', Object.keys(audioSummaryData))

        const mathSections = [
          audioSummaryData.overview || '',
          audioSummaryData.key_ideas || '',
          audioSummaryData.applications || '',
          audioSummaryData.common_mistakes || ''
        ].filter(s => s.trim())

        console.log('[SUMMARY_TEXT DEBUG] Math sections count:', mathSections.length)
        console.log('[SUMMARY_TEXT DEBUG] Section lengths:', mathSections.map(s => s.length))

        // Add guided reflections to text summary
        if (audioSummaryData.guided_reflections && audioSummaryData.guided_reflections.length > 0) {
          console.log('[SUMMARY_TEXT DEBUG] Adding', audioSummaryData.guided_reflections.length, 'guided reflections')
          audioSummaryData.guided_reflections.forEach((reflection: any) => {
            if (reflection.question) {
              mathSections.push(`${reflection.question} ${reflection.short_answer || ''}`)
            }
          })
        }

        summaryText = mathSections.join('\n\n')
        console.log('[SUMMARY_TEXT DEBUG] ✅ Math summary flattened to text:', summaryText.length, 'characters')
        console.log('[SUMMARY_TEXT DEBUG] Summary preview (first 200 chars):', summaryText.substring(0, 200))
      }
      // Extract summary if present (core_academics format)
      else if (parsedResult.summary) {
        summaryData = parsedResult.summary
        console.log('=== SUMMARY EXTRACTED ===')
        console.log('Summary language:', summaryData.language || 'not specified')
        console.log('Summary word count:', summaryData.total_word_count || 'not specified')

        // Combine all summary sections into single text for TTS
        summaryText = [
          summaryData.introduction || '',
          summaryData.key_concepts || '',
          summaryData.examples_and_applications || '',
          summaryData.summary_conclusion || ''
        ].filter(s => s.trim()).join('\n\n')

        // Remove bold markdown formatting for TTS (e.g., **text** → text)
        summaryText = summaryText.replace(/\*\*([^*]+)\*\*/g, '$1')

        console.log('Combined summary length:', summaryText.length, 'characters')
        console.log('Summary preview:', summaryText.substring(0, 200))
      } else {
        console.log('No summary found in response (may be language_studies or custom prompt)')
      }

      if (!parsedQuestions || parsedQuestions.length === 0) {
        console.error('No questions found in Gemini response')
        return null
      }

      // Shuffle multiple-choice options before storing in database
      console.log('=== SHUFFLING MULTIPLE CHOICE OPTIONS ===')
      const originalQuestions = [...parsedQuestions] // Keep copy for stats
      parsedQuestions = shuffleQuestionsOptions(parsedQuestions)

      // Log shuffle statistics
      const shuffleStats = getShuffleStats(originalQuestions, parsedQuestions)
      console.log('Shuffle statistics:', {
        totalQuestions: shuffleStats.totalQuestions,
        multipleChoiceCount: shuffleStats.multipleChoiceCount,
        shuffledCount: shuffleStats.shuffledCount,
        correctAnswerDistribution: shuffleStats.correctAnswerPositions
      })
      console.log('=== END SHUFFLING ===')

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
        generation_prompt: promptUsed || null,
        ai_provider: getConfiguredProviderType(),
        summary_text: summaryText || null,
        key_concepts: keyConcepts || null,  // NEW: Save key concepts as JSONB
        gamification: gamification || null  // NEW: Save gamification as JSONB
        // completed_at is NULL by default - will be set when student completes the exam
        // audio_url and audio_metadata will be set later by async audio generation
      }

      // Note: user_id is already set in examData above
      // No need for separate student_id handling - we use user_id directly

      console.log('[SUMMARY_TEXT DEBUG] 📝 About to insert exam with summary_text:', {
        summary_text_length: summaryText ? summaryText.length : 0,
        summary_text_is_null: summaryText === null,
        summary_text_preview: summaryText ? summaryText.substring(0, 100) : 'NULL'
      })
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

      console.log('[SUMMARY_TEXT DEBUG] ✅ Exam inserted successfully')
      console.log('[SUMMARY_TEXT DEBUG] DB returned summary_text length:', exam?.[0]?.summary_text?.length || 0)
      console.log('[SUMMARY_TEXT DEBUG] DB returned summary_text preview:', exam?.[0]?.summary_text?.substring(0, 100) || 'NULL')

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

      // Generate audio summary if available
      // NEW: Handle both math audio summaries and core_academics summaries
      if (audioSummaryData && audioSummaryData.language) {
        console.log('=== GENERATING MATH AUDIO SUMMARY ===')
        await this.generateMathAudioSummaryAsync(examId, audioSummaryData)
      } else if (summaryText && summaryData?.language) {
        console.log('=== GENERATING AUDIO SUMMARY ===')
        await this.generateAudioSummaryAsync(examId, summaryText, summaryData.language)
      } else {
        console.log('No summary available - skipping audio generation')
      }

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
   * Generate audio summary asynchronously (non-blocking)
   * This method runs in the background and updates the database when complete
   * @param examId - Exam ID to update
   * @param summaryText - Combined summary text for TTS
   * @param languageCode - ISO 639-1 language code (e.g., 'fi', 'en')
   */
  static async generateAudioSummaryAsync(
    examId: string,
    summaryText: string,
    languageCode: string
  ): Promise<void> {
    console.log('[Audio Generation] Starting async audio generation for exam:', examId)
    console.log('[Audio Generation] Language:', languageCode)
    console.log('[Audio Generation] Original summary length:', summaryText.length, 'characters')

    try {
      // Import TTS service
      const { ttsService, TTSService } = await import('./tts-service')

      // Convert ISO 639-1 code to Google Cloud language code
      const ttsLanguageCode = TTSService.getLanguageCodeForTTS(languageCode)
      console.log('[Audio Generation] TTS language code:', ttsLanguageCode)

      // Truncate summary to fit within 5000 bytes (Google Cloud TTS limit)
      // Must check BYTE length, not character length, due to multi-byte UTF-8 characters
      const MAX_TTS_BYTES = 4900 // Use 4900 to be safe (leave 100 bytes buffer)
      let processedSummaryText = summaryText
      const originalByteLength = Buffer.byteLength(summaryText, 'utf8')

      if (originalByteLength > MAX_TTS_BYTES) {
        // Truncate by bytes, not characters
        let truncated = summaryText
        while (Buffer.byteLength(truncated, 'utf8') > MAX_TTS_BYTES) {
          truncated = truncated.substring(0, truncated.length - 100) // Remove 100 chars at a time
        }
        processedSummaryText = truncated
        console.log('[Audio Generation] ⚠️  Summary truncated from', originalByteLength, 'bytes to', Buffer.byteLength(processedSummaryText, 'utf8'), 'bytes')
        console.log('[Audio Generation] Character count:', summaryText.length, '→', processedSummaryText.length)
        console.log('[Audio Generation] Truncation reason: Google Cloud TTS 5000-byte limit')
      } else {
        console.log('[Audio Generation] Summary size within TTS limit:', originalByteLength, 'bytes')
      }

      // Generate audio using TTS service
      const audioResult = await ttsService.generateAudio(processedSummaryText, {
        languageCode: ttsLanguageCode,
        audioEncoding: 'MP3',
        speakingRate: 0.8, // 20% slower for better educational clarity
        pitch: 0.0,
      })

      console.log('[Audio Generation] Audio generated, size:', audioResult.audioBuffer.length, 'bytes')

      // Upload audio to Supabase Storage
      const uploadResult = await SupabaseStorageManager.uploadAudioSummary(
        audioResult.audioBuffer,
        examId,
        languageCode
      )

      if (uploadResult.error || !uploadResult.url) {
        console.error('[Audio Generation] Upload failed:', uploadResult.error)
        return
      }

      console.log('[Audio Generation] Audio uploaded:', uploadResult.url)

      // Update exam record with audio URL and metadata
      if (!supabaseAdmin) {
        console.error('[Audio Generation] Supabase admin client not available')
        return
      }

      const audioMetadata = {
        durationSeconds: audioResult.metadata.durationSeconds,
        fileSizeBytes: audioResult.metadata.fileSizeBytes,
        voiceUsed: audioResult.metadata.voiceUsed,
        languageCode: audioResult.metadata.languageCode,
        generatedAt: audioResult.metadata.generatedAt,
      }

      const { error: updateError } = await supabaseAdmin
        .from('examgenie_exams')
        .update({
          audio_url: uploadResult.url,
          audio_metadata: audioMetadata,
        })
        .eq('id', examId)

      if (updateError) {
        console.error('[Audio Generation] Failed to update exam with audio URL:', updateError)
        // Clean up uploaded file
        await SupabaseStorageManager.deleteAudioSummary(uploadResult.url)
        return
      }

      console.log('[Audio Generation] Exam updated with audio URL successfully')
      console.log('[Audio Generation] Audio summary generation complete for exam:', examId)

    } catch (error) {
      console.error('[Audio Generation] Failed to generate audio summary')
      console.error('[Audio Generation] Error type:', error?.constructor?.name)
      console.error('[Audio Generation] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[Audio Generation] Error stack:', error instanceof Error ? error.stack : 'No stack trace')

      if (error && typeof error === 'object' && 'code' in error) {
        console.error('[Audio Generation] Error code:', (error as any).code)
      }

      // Don't throw - this is a background operation that shouldn't block exam creation
    }
  }

  /**
   * Generate math audio summary asynchronously (non-blocking)
   * Handles math-specific audio with 5 sections + guided reflections
   * @param examId - Exam ID to update
   * @param audioSummary - Math audio summary data from MathExamService
   */
  static async generateMathAudioSummaryAsync(
    examId: string,
    audioSummary: any
  ): Promise<void> {
    console.log('[Math Audio] Starting async math audio generation for exam:', examId)
    console.log('[Math Audio] Language:', audioSummary.language)
    console.log('[Math Audio] Estimated duration:', audioSummary.estimated_duration_seconds, 'seconds')

    try {
      // Step 1: Concatenate all audio sections (Option A: simple concatenation)
      const sections = [
        audioSummary.overview || '',
        audioSummary.key_ideas || '',
        audioSummary.applications || '',
        audioSummary.common_mistakes || ''
      ].filter(s => s.trim())

      // Step 2: Add guided reflections (question + answer, ignore pause_seconds)
      if (audioSummary.guided_reflections && audioSummary.guided_reflections.length > 0) {
        console.log('[Math Audio] Adding', audioSummary.guided_reflections.length, 'guided reflections')

        audioSummary.guided_reflections.forEach((reflection: any, index: number) => {
          sections.push(`${reflection.question || ''} ${reflection.short_answer || ''}`)
        })
      }

      const fullAudioText = sections.join('\n\n')
      console.log('[Math Audio] Total audio text length:', fullAudioText.length, 'characters')

      // Import TTS service
      const { ttsService, TTSService } = await import('./tts-service')

      // Convert ISO 639-1 code to Google Cloud language code
      const ttsLanguageCode = TTSService.getLanguageCodeForTTS(audioSummary.language)
      console.log('[Math Audio] TTS language code:', ttsLanguageCode)

      // Truncate to fit within 5000 bytes (Google Cloud TTS limit)
      const MAX_TTS_BYTES = 4900 // Use 4900 to be safe (leave 100 bytes buffer)
      let processedAudioText = fullAudioText
      const originalByteLength = Buffer.byteLength(fullAudioText, 'utf8')

      if (originalByteLength > MAX_TTS_BYTES) {
        // Truncate by bytes, not characters
        let truncated = fullAudioText
        while (Buffer.byteLength(truncated, 'utf8') > MAX_TTS_BYTES) {
          truncated = truncated.substring(0, truncated.length - 100) // Remove 100 chars at a time
        }
        processedAudioText = truncated
        console.log('[Math Audio] ⚠️  Audio text truncated from', originalByteLength, 'bytes to', Buffer.byteLength(processedAudioText, 'utf8'), 'bytes')
        console.log('[Math Audio] Character count:', fullAudioText.length, '→', processedAudioText.length)
        console.log('[Math Audio] Truncation reason: Google Cloud TTS 5000-byte limit')
      } else {
        console.log('[Math Audio] Audio text size within TTS limit:', originalByteLength, 'bytes')
      }

      // Generate audio using TTS service
      const audioResult = await ttsService.generateAudio(processedAudioText, {
        languageCode: ttsLanguageCode,
        audioEncoding: 'MP3',
        speakingRate: 0.8, // 20% slower for better educational clarity
        pitch: 0.0,
      })

      console.log('[Math Audio] Audio generated, size:', audioResult.audioBuffer.length, 'bytes')

      // Upload audio to Supabase Storage
      const uploadResult = await SupabaseStorageManager.uploadAudioSummary(
        audioResult.audioBuffer,
        examId,
        audioSummary.language
      )

      if (uploadResult.error || !uploadResult.url) {
        console.error('[Math Audio] Upload failed:', uploadResult.error)
        return
      }

      console.log('[Math Audio] Audio uploaded:', uploadResult.url)

      // Update exam record with audio URL and metadata
      if (!supabaseAdmin) {
        console.error('[Math Audio] Supabase admin client not available')
        return
      }

      const audioMetadata = {
        durationSeconds: audioResult.metadata.durationSeconds,
        fileSizeBytes: audioResult.metadata.fileSizeBytes,
        voiceUsed: audioResult.metadata.voiceUsed,
        languageCode: audioResult.metadata.languageCode,
        generatedAt: audioResult.metadata.generatedAt,
        audioType: 'math_summary', // NEW: Identify this as math audio summary
        reflectionsCount: audioSummary.guided_reflections?.length || 0
      }

      const { error: updateError } = await supabaseAdmin
        .from('examgenie_exams')
        .update({
          audio_url: uploadResult.url,
          audio_metadata: audioMetadata,
        })
        .eq('id', examId)

      if (updateError) {
        console.error('[Math Audio] Failed to update exam with audio URL:', updateError)
        // Clean up uploaded file
        await SupabaseStorageManager.deleteAudioSummary(uploadResult.url)
        return
      }

      console.log('[Math Audio] Exam updated with audio URL successfully')
      console.log('[Math Audio] Math audio summary generation complete for exam:', examId)

    } catch (error) {
      console.error('[Math Audio] Failed to generate math audio summary')
      console.error('[Math Audio] Error type:', error?.constructor?.name)
      console.error('[Math Audio] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[Math Audio] Error stack:', error instanceof Error ? error.stack : 'No stack trace')

      if (error && typeof error === 'object' && 'code' in error) {
        console.error('[Math Audio] Error code:', (error as any).code)
      }

      // Don't throw - this is a background operation that shouldn't block exam creation
      // Per user's instruction: "Just skip audio" on failure
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
          promptUsed: geminiResult.promptUsed || (request.customPrompt && request.customPrompt.trim() !== '' ? 'custom' : 'default'),
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