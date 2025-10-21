import { GoogleGenerativeAI } from '@google/generative-ai'
import { StudentAnswer, GradingResult } from '../supabase'
import { GEMINI_CONFIG, getGeminiApiKey, getGradingPrompt } from '../config'
import { PromptLogger } from '../utils/prompt-logger'

const genAI = new GoogleGenerativeAI(getGeminiApiKey())

export interface QuestionGradingResult {
  points_awarded: number
  percentage: number
  feedback: string
  usage_metadata?: any  // Kept for backward compatibility, but not used for DB storage
}

export interface BatchGradingResult {
  gradingResults: Map<string, QuestionGradingResult>
  gradingUsageMetadata: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
    estimatedCost: number
    inputCost: number
    outputCost: number
    model: string
    questionsGraded: number
  } | null
}

export interface ExamGradingOptions {
  gradeScale?: string
  useAiGrading?: boolean
}

/**
 * Exam Grading Service - Handles AI-powered and rule-based exam grading
 * Extracted from exam-service.ts to create focused grading functionality
 */
export class ExamGradingService {
  /**
   * Grade multiple questions with a single AI call (BATCH GRADING)
   */
  static async gradeQuestionsWithBatchAI(
    questions: any[],
    studentAnswers: StudentAnswer[],
    examId?: string
  ): Promise<BatchGradingResult | null> {
    try {
      const startTime = Date.now()
      const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME })

      // Build batch grading prompt with compact format
      const questionsData = questions.map((q, index) => {
        // Support both UUID and integer question IDs
        // Try UUID first, then try mapping integer to question number
        let studentAnswer = studentAnswers.find(a => a.question_id === q.id)
        if (!studentAnswer) {
          // Try matching by question number (1-based index)
          const questionNumber = (index + 1).toString()
          studentAnswer = studentAnswers.find(a => a.question_id === questionNumber)
        }

        const studentText = studentAnswer?.answer_text?.trim() || ''

        return `Q${index + 1}[${q.id}]: ${q.question_text}
TYPE: ${q.question_type} | POINTS: ${q.max_points}
CORRECT: ${q.answer_text}
STUDENT: ${studentText}`
      }).join('\n\n')

      const batchPrompt = `${getGradingPrompt()}

EVALUATE:
${questionsData}

JSON:
{
  "grading_results": [
    {
      "question_id": "ID",
      "points_awarded": 0,
      "percentage": 0,
      "feedback": "feedback"
    }
  ]
}`

      const result = await model.generateContent(batchPrompt)
      const responseText = result.response.text()

      // Log API usage for cost tracking
      const usageMetadata = result.response.usageMetadata
      if (usageMetadata) {
        const promptTokenCount = usageMetadata.promptTokenCount || 0
        const candidatesTokenCount = usageMetadata.candidatesTokenCount || 0
        const inputCost = (promptTokenCount / 1000000) * 0.10
        const outputCost = (candidatesTokenCount / 1000000) * 0.40
        const estimatedCost = inputCost + outputCost

        console.log('Gemini BATCH grading API usage:', {
          promptTokenCount,
          candidatesTokenCount,
          totalTokenCount: promptTokenCount + candidatesTokenCount,
          estimatedCost: estimatedCost.toFixed(6),
          questionsGraded: questions.length
        })
      }

      // Parse batch response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('No JSON found in Gemini batch grading response:', responseText)
        return null
      }

      const batchResult = JSON.parse(jsonMatch[0])
      const gradingResults = new Map<string, QuestionGradingResult>()

      // Process each graded question
      if (batchResult.grading_results && Array.isArray(batchResult.grading_results)) {
        batchResult.grading_results.forEach((result: any) => {
          const questionId = result.question_id
          const question = questions.find(q => q.id === questionId)
          if (question) {
            // Validate and constrain points
            const pointsAwarded = Math.max(0, Math.min(question.max_points, result.points_awarded || 0))

            gradingResults.set(questionId, {
              points_awarded: pointsAwarded,
              percentage: Math.round((pointsAwarded / question.max_points) * 100),
              feedback: result.feedback || 'No feedback',
              usage_metadata: usageMetadata
            })
          }
        })
      }

      console.log(`✅ Batch graded ${gradingResults.size}/${questions.length} questions successfully`)

      // Create usage metadata for database storage
      const gradingUsageMetadata = usageMetadata ? {
        promptTokenCount: usageMetadata.promptTokenCount || 0,
        candidatesTokenCount: usageMetadata.candidatesTokenCount || 0,
        totalTokenCount: (usageMetadata.promptTokenCount || 0) + (usageMetadata.candidatesTokenCount || 0),
        estimatedCost: ((usageMetadata.promptTokenCount || 0) / 1_000_000) * GEMINI_CONFIG.PRICING.INPUT_COST_PER_1M +
                       ((usageMetadata.candidatesTokenCount || 0) / 1_000_000) * GEMINI_CONFIG.PRICING.OUTPUT_COST_PER_1M,
        inputCost: ((usageMetadata.promptTokenCount || 0) / 1_000_000) * GEMINI_CONFIG.PRICING.INPUT_COST_PER_1M,
        outputCost: ((usageMetadata.candidatesTokenCount || 0) / 1_000_000) * GEMINI_CONFIG.PRICING.OUTPUT_COST_PER_1M,
        model: GEMINI_CONFIG.MODEL_NAME,
        questionsGraded: questions.length
      } : null

      // Log batch grading prompt and response
      if (examId) {
        try {
          const processingTime = Date.now() - startTime
          await PromptLogger.logGrading(
            examId,
            batchPrompt,
            responseText,
            {
              processingTime: processingTime,
              promptTokens: usageMetadata?.promptTokenCount || 0,
              responseTokens: usageMetadata?.candidatesTokenCount || 0,
              totalTokens: (usageMetadata?.promptTokenCount || 0) + (usageMetadata?.candidatesTokenCount || 0),
              estimatedCost: gradingUsageMetadata?.estimatedCost || 0
            },
            'BATCH'
          )
        } catch (logError) {
          console.error('Failed to log batch grading:', logError)
          // Continue with grading even if logging fails
        }
      }

      return {
        gradingResults,
        gradingUsageMetadata
      }

    } catch (error) {
      console.error('Batch AI grading failed:', error)
      return null
    }
  }


  /**
   * Grade a single question using Gemini AI
   */
  static async gradeQuestionWithAI(
    question: any,
    studentAnswer: string,
    maxPoints: number
  ): Promise<QuestionGradingResult | null> {
    try {
      const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.MODEL_NAME })
      
      const contextPrompt = `${getGradingPrompt()}

QUESTION DETAILS:
Question: "${question.question_text}"
Question type: ${question.question_type}
Model answer: "${question.answer_text}"
Maximum points: ${maxPoints}
${question.options ? `Answer options: ${question.options.join(', ')}` : ''}
${question.explanation ? `Explanation: ${question.explanation}` : ''}

STUDENT ANSWER: "${studentAnswer}"

Evaluate the answer and give points between 0-${maxPoints}.`

      const result = await model.generateContent(contextPrompt)
      const responseText = result.response.text()
      
      // Log API usage for cost tracking
      const usageMetadata = result.response.usageMetadata
      
      // Calculate cost (Gemini 2.5 Flash Lite pricing as of 2025)
      const inputCostPer1M = 0.10   // $0.10 per 1M input tokens
      const outputCostPer1M = 0.40  // $0.40 per 1M output tokens
      
      const promptTokenCount = usageMetadata?.promptTokenCount || 0
      const candidatesTokenCount = usageMetadata?.candidatesTokenCount || 0
      const totalTokenCount = usageMetadata?.totalTokenCount || promptTokenCount + candidatesTokenCount
      
      const inputCost = (promptTokenCount / 1000000) * inputCostPer1M
      const outputCost = (candidatesTokenCount / 1000000) * outputCostPer1M
      const estimatedCost = inputCost + outputCost
      
      if (usageMetadata) {
        console.log('Gemini grading API usage:', {
          promptTokenCount,
          candidatesTokenCount,
          totalTokenCount,
          estimatedCost: estimatedCost.toFixed(6)
        })
      }
      
      // Parse Gemini response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('No JSON found in Gemini grading response:', responseText)
        return null
      }
      
      const gradingResult = JSON.parse(jsonMatch[0])
      
      // Validate and constrain points
      gradingResult.points_awarded = Math.max(0, Math.min(maxPoints, gradingResult.points_awarded || 0))
      gradingResult.percentage = Math.round((gradingResult.points_awarded / maxPoints) * 100)
      
      // Add usage metadata with cost calculations for tracking
      gradingResult.usage_metadata = {
        ...usageMetadata,
        inputCost,
        outputCost,
        estimatedCost,
        model: GEMINI_CONFIG.MODEL_NAME
      }
      
      return gradingResult
      
    } catch (error) {
      console.error('Error in Gemini grading:', error)
      return null
    }
  }

  /**
   * Grade a question using rule-based logic (fallback method)
   */
  static gradeQuestionWithRules(
    question: any,
    studentAnswer: string,
    maxPoints: number
  ): QuestionGradingResult {
    const correctText = question.answer_text?.trim().toLowerCase() || ''
    const studentText = studentAnswer.trim().toLowerCase()
    let pointsAwarded = 0
    let feedback = ''

    switch (question.question_type) {
      case 'multiple_choice':
        if (studentText === correctText) {
          pointsAwarded = maxPoints
          feedback = 'Oikein! Hyvä vastaus.'
        } else {
          pointsAwarded = 0
          feedback = `Väärin. Oikea vastaus: ${question.answer_text}`
        }
        break

      case 'true_false':
        if (studentText === correctText || 
            (correctText === 'true' && ['tosi', 'kyllä', 'oikein'].includes(studentText)) ||
            (correctText === 'false' && ['epätosi', 'ei', 'väärin'].includes(studentText))) {
          pointsAwarded = maxPoints
          feedback = 'Oikein!'
        } else {
          pointsAwarded = 0
          feedback = `Väärin. Oikea vastaus: ${correctText === 'true' ? 'Tosi' : 'Epätosi'}`
        }
        break

      case 'short_answer':
      case 'fill_in_the_blank':
        if (studentText.includes(correctText) || correctText.includes(studentText)) {
          if (studentText === correctText) {
            pointsAwarded = maxPoints
            feedback = 'Oikein! Täydellinen vastaus.'
          } else {
            pointsAwarded = Math.ceil(maxPoints * 0.7)
            feedback = `Osittain oikein. Malliovastaus: ${question.answer_text}`
          }
        } else {
          pointsAwarded = 0
          feedback = `Katso malliovastausta: ${question.answer_text}`
        }
        break

      default:
        pointsAwarded = 0
        feedback = 'Tuntematon kysymystyyppi'
    }

    return {
      points_awarded: pointsAwarded,
      percentage: Math.round((pointsAwarded / maxPoints) * 100),
      feedback
    }
  }

  /**
   * Grade an entire exam
   */
  static async gradeExam(
    examData: any, 
    studentAnswers: StudentAnswer[],
    options: ExamGradingOptions = {}
  ): Promise<GradingResult | null> {
    try {
      const questions = examData.exam_json.exam.questions
      const useAiGrading = options.useAiGrading !== false && process.env.GEMINI_API_KEY
      
      let totalPoints = 0
      let maxTotalPoints = 0
      let correctCount = 0
      let partialCount = 0
      let incorrectCount = 0

      // Try BATCH AI grading first if enabled
      let batchGradingResults: Map<string, QuestionGradingResult> | null = null
      let batchGradingUsage: any = null  // Store usage metadata for DB
      if (useAiGrading) {
        try {
          console.log(`🚀 Starting BATCH grading for ${questions.length} questions...`)
          const batchResult = await this.gradeQuestionsWithBatchAI(questions, studentAnswers, examData.exam_id)
          if (batchResult) {
            batchGradingResults = batchResult.gradingResults
            batchGradingUsage = batchResult.gradingUsageMetadata  // Capture for DB storage
            console.log(`✅ BATCH grading completed for ${batchGradingResults.size} questions`)
            if (batchGradingUsage) {
              console.log(`💰 Grading cost: $${batchGradingUsage.estimatedCost.toFixed(6)}`)
            }
          }
        } catch (error) {
          console.warn('Batch AI grading failed, falling back to individual processing:', error)
        }
      }

      // Process all questions (using batch results where available)
      const gradedQuestions = questions.map((q: any) => {
        const studentAnswer = studentAnswers.find(a => a.question_id === q.id)
        const studentText = studentAnswer?.answer_text?.trim() || ''
        let gradingResult: QuestionGradingResult | null = null
        let gradingMethod = 'rule-based'

        // Use batch result if available
        if (batchGradingResults && batchGradingResults.has(q.id)) {
          gradingResult = batchGradingResults.get(q.id)!
          gradingMethod = 'batch-gemini'
          console.log(`Question ${q.id} graded by BATCH Gemini: ${gradingResult.points_awarded}/${q.max_points} points`)
        }
        // Fallback to rule-based grading
        else {
          gradingResult = this.gradeQuestionWithRules(q, studentText, q.max_points)
          if (!batchGradingResults) {
            console.log(`Question ${q.id} graded by rules: ${gradingResult.points_awarded}/${q.max_points} points`)
          }
        }

        // Update counters
        const percentage = (gradingResult.points_awarded / q.max_points) * 100
        if (percentage >= 95) correctCount++
        else if (percentage >= 50) partialCount++
        else incorrectCount++

        totalPoints += gradingResult.points_awarded
        maxTotalPoints += q.max_points

        return {
          id: q.id,
          question_text: q.question_text,
          expected_answer: q.answer_text,
          student_answer: studentAnswer?.answer_text || '',
          points_awarded: gradingResult.points_awarded,
          max_points: q.max_points,
          feedback: gradingResult.feedback,
          percentage: gradingResult.percentage,
          question_type: q.question_type,
          options: q.options,
          grading_method: gradingMethod,
          usage_metadata: gradingResult.usage_metadata
        }
      })

      // Calculate final grade (Finnish scale 4-10)
      const percentage = (totalPoints / maxTotalPoints) * 100
      let finalGrade: string
      if (percentage >= 90) finalGrade = '10'
      else if (percentage >= 80) finalGrade = '9'
      else if (percentage >= 70) finalGrade = '8'
      else if (percentage >= 60) finalGrade = '7'
      else if (percentage >= 50) finalGrade = '6'
      else if (percentage >= 40) finalGrade = '5'
      else finalGrade = '4'

      // Calculate grading method statistics and API usage
      const geminiGradedCount = gradedQuestions.filter((q: any) => q.grading_method === 'batch-gemini' || q.grading_method === 'gemini').length
      const ruleBasedGradedCount = gradedQuestions.filter((q: any) => q.grading_method === 'rule-based').length
      
      // Aggregate Gemini API usage for cost tracking
      const totalGeminiUsage = gradedQuestions
        .filter((q: any) => q.usage_metadata)
        .reduce((acc: any, q: any) => {
          const usage = q.usage_metadata
          return {
            promptTokenCount: (acc.promptTokenCount || 0) + (usage?.promptTokenCount || 0),
            candidatesTokenCount: (acc.candidatesTokenCount || 0) + (usage?.candidatesTokenCount || 0),
            totalTokenCount: (acc.totalTokenCount || 0) + (usage?.totalTokenCount || 0),
            inputCost: (acc.inputCost || 0) + (usage?.inputCost || 0),
            outputCost: (acc.outputCost || 0) + (usage?.outputCost || 0),
            estimatedCost: (acc.estimatedCost || 0) + (usage?.estimatedCost || 0)
          }
        }, { 
          promptTokenCount: 0, 
          candidatesTokenCount: 0, 
          totalTokenCount: 0,
          inputCost: 0,
          outputCost: 0,
          estimatedCost: 0
        })

      const baseResult = {
        exam_id: examData.exam_id,
        subject: examData.subject,
        grade: examData.grade,
        status: 'graded' as const,
        final_grade: finalGrade,
        grade_scale: options.gradeScale || '4-10',
        total_points: totalPoints,
        max_total_points: maxTotalPoints,
        percentage: Math.round(percentage),
        questions: gradedQuestions,
        graded_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        created_at: examData.created_at,
        questions_count: questions.length,
        questions_correct: correctCount,
        questions_partial: partialCount,
        questions_incorrect: incorrectCount,
        grading_metadata: {
          gemini_graded: geminiGradedCount,
          rule_based_graded: ruleBasedGradedCount,
          primary_method: (geminiGradedCount > ruleBasedGradedCount ? 'gemini' : 'rule-based') as 'gemini' | 'rule-based',
          gemini_available: !!process.env.GEMINI_API_KEY,
          total_gemini_usage: totalGeminiUsage,
          grading_prompt: getGradingPrompt()
        },
        // NEW: Include batch grading usage for database storage
        grading_gemini_usage: batchGradingUsage
      }


      return baseResult

    } catch (error) {
      console.error('Error in exam grading:', error)
      return null
    }
  }
}