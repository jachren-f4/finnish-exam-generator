/**
 * Exam Creation Service
 * Extracted from exam-service.ts to provide focused exam creation functionality
 * Handles the creation of exams from Gemini responses
 */

import { processGeminiResponse, createFallbackExam } from '../exam-transformer'
import { APP_CONFIG } from '../config'
import { GeminiUsageMetadata } from '../utils/cost-calculator'
import { OperationTimer, GeminiLogger } from '../utils/performance-logger'

export interface DiagnosticData {
  imageUrls: string[]
  rawOcrText: string
  diagnosticEnabled: boolean
}

export interface ExamCreationOptions {
  promptUsed?: string
  diagnosticData?: DiagnosticData
  geminiUsage?: GeminiUsageMetadata
}

export interface ExamCreationResult {
  examId: string
  examUrl: string
  gradingUrl: string
}

export interface DatabaseInsertData {
  subject: string
  grade: string
  exam_json: any
  status: 'created'
  prompt_text: string | null
  prompt_type: 'custom' | 'default'
  prompt_length: number
  diagnostic_image_urls?: string[]
  ocr_raw_text?: string
  diagnostic_enabled?: boolean
  creation_gemini_usage?: GeminiUsageMetadata
}

/**
 * Exam Creator Service Class
 * Handles all aspects of exam creation from Gemini responses
 */
export class ExamCreator {
  /**
   * Creates an exam from Gemini response string
   */
  static async createFromGeminiResponse(
    geminiResponse: string,
    options: ExamCreationOptions = {}
  ): Promise<ExamCreationResult | null> {
    const timer = new OperationTimer('Exam Creation')
    const { promptUsed, diagnosticData, geminiUsage } = options

    try {
      GeminiLogger.logExamCreationPhase('Starting exam creation', {
        responseLength: geminiResponse?.length || 0,
        hasPrompt: !!promptUsed,
        hasDiagnostic: !!diagnosticData?.diagnosticEnabled,
        hasUsage: !!geminiUsage
      })

      // Validate input
      if (!geminiResponse || typeof geminiResponse !== 'string') {
        GeminiLogger.logExamCreationPhase('Invalid input: geminiResponse is empty or invalid')
        return null
      }

      // Process response into exam data structure
      timer.startPhase('Response Processing')
      const examData = this.processResponse(geminiResponse)
      timer.endPhase('Response Processing')

      if (!examData) {
        GeminiLogger.logExamCreationPhase('Response processing failed')
        return null
      }

      // Prepare database insert data
      timer.startPhase('Database Preparation')
      const insertData = this.prepareDatabaseInsert(examData, options)
      timer.endPhase('Database Preparation')

      // Insert into database (delegated to repository)
      timer.startPhase('Database Insert')
      const { ExamRepository } = await import('./exam-repository')
      const examId = await ExamRepository.create(insertData)
      timer.endPhase('Database Insert')

      if (!examId) {
        GeminiLogger.logExamCreationPhase('Database insert failed')
        return null
      }

      // Generate URLs
      const result = this.generateExamUrls(examId)

      timer.complete({
        examId,
        promptLength: promptUsed?.length || 0,
        diagnosticEnabled: !!diagnosticData?.diagnosticEnabled,
        questionsCreated: examData.exam?.questions?.length || 0
      })

      GeminiLogger.logExamCreationPhase('Exam creation completed', { examId })
      return result

    } catch (error) {
      timer.complete({
        error: error instanceof Error ? error.message : 'Unknown error',
        failed: true
      })
      GeminiLogger.logExamCreationPhase('Exam creation failed', { error: error instanceof Error ? error.message : 'Unknown' })
      return null
    }
  }

  /**
   * Processes Gemini response into exam data structure
   */
  private static processResponse(geminiResponse: string): any {
    GeminiLogger.logExamCreationPhase('Processing Gemini response', { length: geminiResponse.length })
    
    // Try to process with main transformer
    let examData = processGeminiResponse(geminiResponse)
    
    if (!examData) {
      GeminiLogger.logExamCreationPhase('Main processing failed, creating fallback exam')
      examData = createFallbackExam(geminiResponse)
    }

    if (!examData) {
      GeminiLogger.logExamCreationPhase('Both main and fallback processing failed')
      return null
    }

    // Validate exam data structure
    if (!this.validateExamData(examData)) {
      GeminiLogger.logExamCreationPhase('Exam data validation failed')
      return null
    }

    GeminiLogger.logExamCreationPhase('Response processing completed', {
      hasExam: !!examData.exam,
      questionsCount: examData.exam?.questions?.length || 0
    })

    return examData
  }

  /**
   * Validates exam data structure
   */
  private static validateExamData(examData: any): boolean {
    if (!examData || !examData.exam) {
      return false
    }

    const { exam } = examData
    
    // Check required fields
    if (!exam.subject || !exam.grade) {
      return false
    }

    // Check questions array
    if (!Array.isArray(exam.questions) || exam.questions.length === 0) {
      return false
    }

    // Validate each question has required fields
    for (const question of exam.questions) {
      if (!question.id || !question.question_text || !question.question_type) {
        return false
      }
    }

    return true
  }

  /**
   * Prepares data for database insertion
   */
  private static prepareDatabaseInsert(
    examData: any,
    options: ExamCreationOptions
  ): DatabaseInsertData {
    const { promptUsed, diagnosticData, geminiUsage } = options

    // Add prompt metadata to exam data
    const examDataWithPrompt = {
      ...examData,
      metadata: {
        ...examData.metadata,
        prompt_used: promptUsed,
        prompt_length: promptUsed?.length || 0,
        created_at: new Date().toISOString()
      }
    }

    const insertData: DatabaseInsertData = {
      subject: examData.exam.subject,
      grade: examData.exam.grade,
      exam_json: examDataWithPrompt,
      status: 'created',
      prompt_text: promptUsed || null,
      prompt_type: promptUsed && promptUsed.trim() !== '' ? 'custom' : 'default',
      prompt_length: promptUsed?.length || 0
    }

    // Add diagnostic data if available
    if (diagnosticData?.diagnosticEnabled) {
      insertData.diagnostic_image_urls = diagnosticData.imageUrls
      insertData.ocr_raw_text = diagnosticData.rawOcrText
      insertData.diagnostic_enabled = true
    }

    // Add Gemini usage data for cost tracking if available
    if (geminiUsage) {
      insertData.creation_gemini_usage = geminiUsage
    }

    return insertData
  }

  /**
   * Generates exam and grading URLs
   */
  private static generateExamUrls(examId: string): ExamCreationResult {
    return {
      examId,
      examUrl: `${APP_CONFIG.BASE_URL}${APP_CONFIG.ENDPOINTS.EXAM(examId)}`,
      gradingUrl: `${APP_CONFIG.BASE_URL}${APP_CONFIG.ENDPOINTS.GRADING(examId)}`
    }
  }

  /**
   * Logs exam data structure for debugging
   */
  static logExamStructure(examData: any): void {
    if (!examData) {
      console.log('Exam data is null or undefined')
      return
    }

    console.log('Exam data structure check:', {
      hasExam: !!examData.exam,
      hasSubject: !!examData.exam?.subject,
      hasGrade: !!examData.exam?.grade,
      questionsCount: examData.exam?.questions?.length || 0,
      hasMetadata: !!examData.metadata
    })
  }
}